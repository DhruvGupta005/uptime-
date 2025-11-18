"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data } = useSession();
  const authed = !!data?.user;
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-3xl font-semibold">Uptime Monitor</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Monitor your APIs and websites with ease.</p>
        <div className="flex gap-3">
          {authed ? (
            <Link className="rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black" href="/dashboard">
              Go to Dashboard
            </Link>
          ) : (
            <Link className="rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black" href="/login">
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
