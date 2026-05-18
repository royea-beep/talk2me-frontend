import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "TALK2ME - Empire Control",
  description: "Read-only dashboard for Empire project pipeline, G-PROMPTs, knowledge, and ZPM sessions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-900 text-slate-100 min-h-screen antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
              <h1 className="text-base font-medium text-slate-200">TALK2ME - Empire Control</h1>
              <div className="text-xs text-slate-500">Roye - single-user - iteration 1</div>
            </header>
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
