"use client";
import { SWRConfig } from "swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ fetcher: (url: string) => fetch(url).then((r) => r.json()) }}>{children}</SWRConfig>;
}



