"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SWRConfig value={{ fetcher: (url: string) => fetch(url).then((r) => r.json()) }}>
          {children}
        </SWRConfig>
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  );
}



