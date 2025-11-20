import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(app)/dashboard/page";

vi.stubGlobal("fetch", (url: string) => {
  if (url.startsWith("/api/monitors")) {
    return Promise.resolve({ json: () => Promise.resolve({ items: [] }) } as any);
  }
  return Promise.resolve({ json: () => Promise.resolve({}) } as any);
});

describe("DashboardPage", () => {
  it("renders heading", async () => {
    render(<DashboardPage />);
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });
});



