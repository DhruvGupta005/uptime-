"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "@/src/components/ThemeToggle";

export function Nav() {
  const pathname = usePathname();
  const { data } = useSession();
  return (
    <header className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="font-semibold">Uptime</Link>
        <nav className="hidden gap-3 sm:flex">
          <Link className={pathname?.startsWith("/dashboard") ? "font-medium" : "text-zinc-600"} href="/dashboard">Dashboard</Link>
          <Link className={pathname === "/incidents" ? "font-medium" : "text-zinc-600"} href="/incidents">Incidents</Link>
          <Link className={pathname === "/settings" ? "font-medium" : "text-zinc-600"} href="/settings">Settings</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {data?.user ? (
          <button className="rounded-md border px-2 py-1 text-sm" onClick={() => signOut({ callbackUrl: "/" })}>Logout</button>
        ) : (
          <Link className="rounded-md border px-2 py-1 text-sm" href="/login">Login</Link>
        )}
      </div>
    </header>
  );
}



