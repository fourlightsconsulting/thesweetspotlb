import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/server/admin/session";
import { AccountForms } from "./account-forms";

export const metadata: Metadata = { title: "Your account" };

export default async function Account() {
  const me = await requireStaff();
  return (
    <>
      <PageHeader title="Your account" description={`Signed in as ${me.email}.`} />
      <AccountForms name={me.name} />
    </>
  );
}
