import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
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
  return <html lang="en"><body><Sidebar/><div className="min-h-screen lg:pl-64"><AppHeader/><main className="mx-auto max-w-[1500px] p-5 pb-24 lg:p-8">{children}</main></div></body></html>;
}
