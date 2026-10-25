import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveStoreSettings } from "./actions";
import type { StoreDraft } from "./store-settings";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), requireStaff: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/server/admin/session", () => ({ requireStaff: mocks.requireStaff }));
vi.mock("@/lib/supabase/server", () => ({ adminClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("@/server/catalog", () => ({ catalogTags: { store: "store" } }));
vi.mock("@/server/order-alerts", () => ({ sendOrderAlerts: vi.fn() }));
const id = "00000000-0000-4000-8000-000000000001";
const draft = (): StoreDraft => ({
  branchId: id,
  ordering: "paused",
  pickupMin: "10",
  pickupMax: "15",
  deliveryMin: "30",
  deliveryMax: "45",
  zones: [],
  areas: [],
  hours: [
    {
      branchId: id,
      branchName: "Tripoli",
      lastOrderMinutes: "15",
      week: Array.from({ length: 7 }, () => ({ open: true, opens: "12:00", closes: "00:00" })),
    },
  ],
  closures: [],
  removedZoneIds: [],
  removedAreaIds: [],
  removedClosureIds: [],
  alerts: null,
});
beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({ error: null });
  mocks.requireStaff.mockReset().mockResolvedValue({ role: "manager" });
  mocks.updateTag.mockReset();
});
describe("single Store save action", () => {
  it("saves the whole page through one manager-authorised database transaction", async () => {
    expect(await saveStoreSettings(draft())).toMatchObject({ status: "saved" });
    expect(mocks.requireStaff).toHaveBeenCalledWith("manager");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("save_store_settings", {
      payload: expect.objectContaining({
        ordering: "paused",
        pickupMin: 10,
        zones: [],
        areas: [],
        hours: expect.any(Array),
      }),
    });
    expect(mocks.updateTag).toHaveBeenCalledWith("store");
  });
  it("writes nothing when a field is invalid", async () => {
    expect(await saveStoreSettings({ ...draft(), pickupMin: "" })).toMatchObject({
      status: "error",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not invalidate the cache when the transaction fails", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "23503" } });
    expect(await saveStoreSettings(draft())).toMatchObject({ status: "error" });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
  it("refuses unauthorised saves before reading or writing settings", async () => {
    mocks.requireStaff.mockRejectedValue(new Error("Not authorised"));
    await expect(saveStoreSettings(draft())).rejects.toThrow("Not authorised");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
