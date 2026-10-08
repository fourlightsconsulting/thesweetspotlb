import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import logo from "@/assets/images/logo-blueberry.png";
import { getSession } from "@/server/admin/session";
import { signOut } from "./actions";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: PageProps<"/admin/login">) {
  const { next, denied } = await searchParams;
  const session = await getSession();
  if (session.status === "staff") redirect("/admin");

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="card w-full max-w-[380px] p-7">
        <Image src={logo} alt="The Sweet Spot" sizes="72px" className="mb-5 h-auto w-[72px]" />
        <h1 className="text-xl leading-7 font-bold">Sign in to the admin</h1>

        {session.status === "no-access" || denied ? (
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-muted">
              {session.status === "no-access" ? (
                <>
                  <span className="font-semibold text-ink">{session.email}</span> doesn’t have
                  access to the admin. Ask the owner to add you to the team.
                </>
              ) : (
                "This account doesn’t have access to the admin."
              )}
            </p>
            {session.status === "no-access" && (
              <form action={signOut}>
                <button className="btn btn-secondary w-full">Use another account</button>
              </form>
            )}
          </div>
        ) : (
          <>
            <p className="mt-1 text-muted">Accounts are added by the owner.</p>
            <SignInForm next={typeof next === "string" ? next : ""} />
          </>
        )}
      </div>
    </main>
  );
}
