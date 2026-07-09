"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarCheck, ChartNoAxesCombined, ClipboardList, ClipboardCheck, Contact, FileText, FileUp, Mail, Settings, Store, UserRound, BarChart3 } from "lucide-react";
import { useFabLeadStore } from "@/lib/local-store";

const links = [
  ["/", "Dashboard", ChartNoAxesCombined], ["/companies", "Companies", Building2], ["/contacts", "Contacts", Contact],
  ["/outreach", "Outreach", Mail], ["/bids", "Bids", ClipboardList], ["/follow-ups", "Follow-Ups", CalendarCheck],
  ["/shop-profile", "Shop Profile", Store], ["/capability", "Capability", FileText], ["/bid-reports", "Bid Reports", BarChart3], ["/reports", "Reports", ClipboardCheck],
  ["/pilot", "Pilot Test", ClipboardCheck], ["/import-export", "Import / Export", FileUp], ["/login", "Login", UserRound], ["/settings", "Settings", Settings],
] as const;

export function Sidebar() {
  const path = usePathname();
  const { companies, contacts } = useFabLeadStore();
  return <><aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-steel text-white lg:flex">
    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
      <div className="relative grid size-11 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-sky-400 shadow-lg shadow-brand/25">
        <div className="absolute inset-x-2 top-3 h-1 rounded-full bg-white/80" />
        <div className="absolute bottom-2 left-2 h-1 w-7 rotate-[-28deg] rounded-full bg-white/60" />
        <span className="relative mt-1 font-serif text-lg font-black tracking-tight text-white">FL</span>
      </div>
      <div><p className="font-serif text-lg font-semibold leading-none">FabLead</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.2em] text-blue-200/70">Tracker</p></div>
    </div>
    <nav className="flex-1 space-y-1 px-3 py-6">{links.map(([href, label, Icon]) => { const active = href === "/" ? path === "/" : path.startsWith(href); return <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}><Icon size={17}/>{label}</Link>; })}</nav>
    <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-semibold">Live workspace</p><p className="mt-1 text-xs leading-relaxed text-white/45">{companies.length} companies · {contacts.length} contacts · publish-ready</p><div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full w-3/5 rounded-full bg-brand"/></div></div>
  </aside><nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-black/10 bg-steel px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 text-white shadow-2xl lg:hidden">{links.map(([href,label,Icon])=>{const active=href==="/"?path==="/":path.startsWith(href);return <Link key={href} href={href} className={`flex min-w-[76px] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold ${active?"bg-white/10 text-white":"text-white/55"}`}><Icon size={16}/><span className="whitespace-nowrap">{label.replace("Import / Export","Import")}</span></Link>})}</nav></>;
}
