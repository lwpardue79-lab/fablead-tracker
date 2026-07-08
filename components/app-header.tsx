"use client";

import { useFabLeadStore } from "@/lib/local-store";

function initials(name: string) {
  return name
    .split(/\s|&/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SS";
}

export function AppHeader() {
  const { companies, contacts, workspaceSettings } = useFabLeadStore();
  const companyName = workspaceSettings.companyName || "Shawnee Steel & Welding";

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-5 backdrop-blur lg:px-8">
      <p className="font-serif font-semibold lg:hidden">FabLead Tracker</p>
      <p className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 lg:block">Buyer pipeline · {companies.length} companies · {contacts.length} contacts</p>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold">{companyName}</p>
          <p className="text-[11px] text-slate-400">Business development</p>
        </div>
        <div className="grid size-9 place-items-center rounded-full bg-steel text-xs font-bold text-white ring-2 ring-brand/15">{initials(companyName)}</div>
      </div>
    </header>
  );
}
