"use client";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data } = useSession();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded border p-4">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Logged in as</div>
        <div className="font-medium">{data?.user?.email}</div>
      </div>
    </div>
  );
}



