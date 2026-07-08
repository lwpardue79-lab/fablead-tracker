import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://fablead-tracker.localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "FabLead Tracker | Buyer & Bid Pipeline",
    template: "%s | FabLead Tracker",
  },
  description: "A practical buyer, bid-list, and follow-up tracker for fabrication shops and steel contractors.",
  applicationName: "FabLead Tracker",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Sidebar/><div className="min-h-screen lg:pl-64"><header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-5 backdrop-blur lg:px-8"><p className="font-serif font-semibold lg:hidden">FabLead Tracker</p><p className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 lg:block">Launch market · Kansas City Metro · 25 verified buyer paths</p><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold">Acme Fabrication</p><p className="text-[11px] text-slate-400">Business development</p></div><div className="grid size-9 place-items-center rounded-full bg-steel text-xs font-bold text-white ring-2 ring-brand/15">AF</div></div></header><main className="mx-auto max-w-[1500px] p-5 pb-24 lg:p-8">{children}</main></div></body></html>;
}
