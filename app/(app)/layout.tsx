import { Nav } from "@/src/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto w-full max-w-6xl p-4">{children}</main>
    </div>
  );
}



