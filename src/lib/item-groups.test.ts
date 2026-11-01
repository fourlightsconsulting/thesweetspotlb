import { describe, expect, it } from "vitest";
import {
  type GroupDraft,
  groupDraft,
  groupFromTemplate,
  groupsToSave,
  type ItemChoiceRow,
  type LinkRow,
  resolveGroup,
  type Template,
} from "./item-groups";

const choice = (id: string, price = 100) => ({
  id,
  key: id,
  nameEn: id,
  nameAr: `${id}-ar`,
  price,
  available: true,
});
const template: Template = {
  id: "11111111-1111-4111-8111-111111111111",
  key: "fruit",
  nameEn: "Fruit",
  nameAr: "فواكه",
  min: 0,
  max: 3,
  choices: [choice("banana", 150), choice("kiwi"), choice("mango")],
};
const templates = new Map([[template.id, template]]);
const link: LinkRow = {
  id: "link",
  group_id: template.id,
  key: "fruit",
  name_en: null,
  name_ar: null,
  min_select: null,
  max_select: null,
  default_options: [],
};
const row = (patch: Partial<ItemChoiceRow>): ItemChoiceRow => ({
  link_id: "link",
  option_id: "banana",
  key: "banana",
  name_en: null,
  name_ar: null,
  price_cents: null,
  is_available: true,
  is_removed: false,
  sort_order: null,
  ...patch,
});
const ids = (group: { options: { id: string }[] }) => group.options.map((o) => o.id);

describe("what the customer sees", () => {
  it("follows the template with nothing changed", () => {
    const group = resolveGroup(link, template, []);
    expect(group).toMatchObject({ id: "fruit", min: 0, max: 3, name: { en: "Fruit" } });
    expect(ids(group)).toEqual(["banana", "kiwi", "mango"]);
    expect(group.options[0].price).toBe(150);
  });

  it("changes only the fields changed on the item", () => {
    const changed = { ...template, nameEn: "Fresh fruit", max: 5 };
    const group = resolveGroup({ ...link, name_ar: "فاكهة", max_select: 2 }, changed, [
      row({ price_cents: 300 }),
    ]);
    expect(group.name).toEqual({ en: "Fresh fruit", ar: "فاكهة" });
    expect(group.max).toBe(2);
    expect(group.options[0]).toMatchObject({ price: 300, name: { en: "banana" } });
  });

  it("gives items a new template price unless they have their own", () => {
    const raised = {
      ...template,
      choices: [choice("banana", 200), choice("kiwi", 200), choice("mango")],
    };
    const group = resolveGroup(link, raised, [row({ price_cents: 300 })]);
    expect(group.options.map((o) => o.price)).toEqual([300, 200, 100]);
  });

  it("leaves out removed choices and those off on this item", () => {
    const group = resolveGroup(link, template, [
      row({ is_removed: true }),
      row({ option_id: "kiwi", key: "kiwi", is_available: false }),
    ]);
    expect(ids(group)).toEqual(["mango"]);
  });

  it("adds choices only on the item after the template's", () => {
    const own = row({
      option_id: null,
      key: "own-date",
      name_en: "Date",
      name_ar: "تمر",
      price_cents: 50,
      sort_order: 10,
    });
    expect(ids(resolveGroup(link, template, [own]))).toEqual([
      "banana",
      "kiwi",
      "mango",
      "own-date",
    ]);
  });

  it("keeps the item's own order, with new template choices last", () => {
    const rows = [row({ option_id: "kiwi", key: "kiwi", sort_order: 10 }), row({ sort_order: 20 })];
    expect(ids(resolveGroup(link, template, rows))).toEqual(["kiwi", "banana", "mango"]);
  });

  it("can't require more than it allows", () => {
    expect(resolveGroup({ ...link, min_select: 3, max_select: 1 }, template, [])).toMatchObject({
      min: 1,
      max: 1,
    });
  });
});

describe("what the item page saves", () => {
  const save = (draft: GroupDraft) => groupsToSave([draft], templates)[0];

  it("stores nothing for a group left as the template", () => {
    expect(save(groupFromTemplate(template))).toEqual({
      key: "fruit",
      groupId: template.id,
      nameEn: null,
      nameAr: null,
      min: null,
      max: null,
      defaults: [],
      choices: [],
    });
  });

  it("stores only the differences", () => {
    const draft = groupFromTemplate(template, "fruit");
    draft.nameEn = "Fresh fruit";
    draft.min = 1;
    draft.choices[0].price = 300;
    const saved = save(draft);
    expect(saved).toMatchObject({ nameEn: "Fresh fruit", nameAr: null, min: 1, max: null });
    expect(saved.choices).toEqual([
      {
        key: "banana",
        optionId: "banana",
        nameEn: null,
        nameAr: null,
        price: 300,
        available: true,
        removed: false,
        sort: null,
      },
    ]);
  });

  it("follows again when a value is put back", () => {
    const draft = groupDraft(link, template, [row({ price_cents: 300 })]);
    draft.choices[0].price = 150;
    expect(save(draft).choices).toEqual([]);
  });

  it("gives a new choice its own key, clear of the template's", () => {
    const draft = groupFromTemplate(template, "fruit");
    draft.choices.push({
      key: null,
      optionId: null,
      nameEn: "Mango",
      nameAr: "مانجو",
      price: 200,
      available: true,
      removed: false,
    });
    expect(save(draft).choices).toEqual([
      expect.objectContaining({ key: "own-mango", optionId: null, price: 200, sort: 10 }),
    ]);
  });

  it("stores the order only when it differs from the usual one", () => {
    const draft = groupFromTemplate(template, "fruit");
    [draft.choices[0], draft.choices[1]] = [draft.choices[1], draft.choices[0]];
    expect(save(draft).choices.map((c) => [c.key, c.sort])).toEqual([
      ["kiwi", 10],
      ["banana", 20],
      ["mango", 30],
    ]);
  });

  it("ignores a choice deleted from the template meanwhile", () => {
    const draft = groupFromTemplate(template, "fruit");
    draft.choices[0].optionId = "gone";
    draft.choices[0].key = "gone";
    draft.choices[0].price = 999;
    expect(save(draft).choices).toEqual([]);
  });

  it("keeps a blank group whole, with a key of its own", () => {
    const saved = save({
      key: null,
      templateId: null,
      nameEn: "Dips",
      nameAr: "تغميس",
      min: 1,
      max: 2,
      defaults: [],
      choices: [],
    });
    expect(saved).toMatchObject({ key: "own-dips", groupId: null, nameEn: "Dips", min: 1, max: 2 });
  });

  it("never preselects removed choices or more than the limit", () => {
    const draft = groupFromTemplate(template, "fruit");
    draft.max = 1;
    draft.defaults = ["banana", "kiwi", "mango"];
    draft.choices[0].removed = true;
    expect(save(draft).defaults).toEqual(["kiwi"]);
  });
});
