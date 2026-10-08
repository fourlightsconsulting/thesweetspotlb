"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useRef } from "react";
import logo from "@/assets/images/logo-blueberry.png";
import { signOut } from "@/app/admin/login/actions";
import type { NavItem } from "@/app/admin/nav";
import { Icon } from "./icons";

type Props = {
  items: NavItem[];
  account: NavItem;
  staff: { name: string; role: string };
  children: ReactNode;
};

/** The current section: the longest nav path the URL starts with. */
const activeHref = (pathname: string, items: NavItem[]) =>
  items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

export function AdminShell({ items, account, staff, children }: Props) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const active = activeHref(pathname, [...items, account]);
  const close = () => drawerRef.current?.close();

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={close}
          aria-current={item.href === active ? "page" : undefined}
          className="flex min-h-10 items-center gap-3 rounded-[10px] px-3 font-medium text-muted transition-colors hover:bg-tint hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="flex flex-col gap-1 border-t border-line pt-3">
      <Link
        href={account.href}
        onClick={close}
        aria-current={account.href === active ? "page" : undefined}
        className="flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-tint aria-[current=page]:bg-accent-soft"
      >
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-strawberry-cream font-bold text-chocolate">
          {staff.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{staff.name}</span>
          <span className="block text-xs text-muted capitalize">{staff.role}</span>
        </span>
      </Link>
      <form action={signOut}>
        <button className="btn btn-ghost w-full justify-start gap-3 px-3">
          <Icon name="signOut" />
          Sign out
        </button>
      </form>
    </div>
  );

  const brand = (
    <Link href="/admin" onClick={close} className="flex items-center gap-2.5 px-2">
      <Image src={logo} alt="" sizes="36px" className="h-auto w-9" />
      <span className="leading-tight">
        <span className="block font-bold">The Sweet Spot</span>
        <span className="block text-xs text-muted">Admin</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-svh wide:grid wide:grid-cols-[240px_minmax(0,1fr)]">
      {/* Sidebar from 1024px */}
      <aside className="sticky top-0 hidden h-svh flex-col gap-6 border-e border-line bg-surface px-3 py-5 wide:flex">
        {brand}
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {footer}
      </aside>

      {/* Top bar and drawer below 1024px */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-3 wide:hidden">
        {brand}
        <button
          type="button"
          onClick={() => drawerRef.current?.showModal()}
          aria-label="Open the menu"
          className="btn btn-ghost size-10 p-0"
        >
          <Icon name="menu" />
        </button>
      </header>
      <dialog
        ref={drawerRef}
        aria-label="Admin menu"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="ms-auto me-0 h-svh max-h-none w-[min(300px,85vw)] bg-surface p-0 backdrop:bg-chocolate/30"
      >
        <div className="flex h-full flex-col gap-6 px-3 py-4">
          <div className="flex items-center justify-between">
            {brand}
            <button
              type="button"
              onClick={close}
              aria-label="Close the menu"
              className="btn btn-ghost size-10 p-0"
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{nav}</div>
          {footer}
        </div>
      </dialog>

      <main className="min-w-0 px-4 pt-6 pb-16 wide:px-8 wide:pt-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
