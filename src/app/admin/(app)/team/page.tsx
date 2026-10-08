import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff, type StaffRole } from "@/server/admin/session";
import { AddMember, MemberRow } from "./team-forms";

export const metadata: Metadata = { title: "Team" };

export type Member = {
  user_id: string;
  email: string;
  display_name: string;
  role: StaffRole;
  is_active: boolean;
  last_sign_in_at: string | null;
};

export default async function Team() {
  const me = await requireStaff("owner");
  const db = await adminClient();
  const { data, error } = await db.rpc("staff_directory");
  const members = (data ?? []) as Member[];

  return (
    <>
      <PageHeader
        title="Team"
        description="Who can sign in to the admin. Staff work the orders and mark items sold out; managers also run the menu, prices, offers, site and store settings and see the dashboards; owners also manage the team and connections."
      />

      <div className="grid items-start gap-6 wide:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card overflow-hidden">
          {error ? (
            <p className="p-5 text-bad">The team couldn’t be loaded. Refresh to try again.</p>
          ) : (
            <ul className="divide-y divide-line">
              {members.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  isMe={member.user_id === me.userId}
                />
              ))}
            </ul>
          )}
        </section>

        <AddMember />
      </div>
    </>
  );
}
