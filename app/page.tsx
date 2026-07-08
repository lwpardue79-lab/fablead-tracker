"use client";

import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, CircleDollarSign, Target, TrendingUp, Users } from "lucide-react";
import { Badge, PageHeader } from "@/components/ui";
import { useFabLeadStore } from "@/lib/local-store";

function isOpenBid(status: string) {
  return ["Open", "Submitted"].includes(status);
}

export default function Dashboard() {
  const { bids, companies, contacts, followUps, workspaceSettings } = useFabLeadStore();
  const openFollowUps = followUps.filter((followUp) => followUp.status !== "Complete");
  const openBids = bids.filter((bid) => isOpenBid(bid.status));
  const averageScore = companies.length ? Math.round(companies.reduce((sum, company) => sum + company.lead_score, 0) / companies.length) : 0;
  const registrationReady = companies.filter((company) => {
    const status = `${company.invite_list_status || ""} ${company.prequalification_url || ""} ${company.bid_portal_url || ""}`.toLowerCase();
    return ["registration", "portal", "prequalification", "trade partner", "public bid"].some((term) => status.includes(term));
  }).length;
  const totalBidValue = openBids.reduce((sum, bid) => sum + bid.value, 0);
  const topLeads = [...companies].sort((a, b) => b.lead_score - a.lead_score).slice(0, 5);

  const metrics = [
    ["Companies", String(companies.length), "Live workspace records", Building2],
    ["Contacts", String(contacts.length), "Imported or manually added", Users],
    ["Bid-list paths", String(registrationReady), "Registration or portal found", Target],
    ["Open bid value", `$${totalBidValue.toLocaleString()}`, "Tracked opportunities", CircleDollarSign],
    ["Open follow-ups", String(openFollowUps.length), "Needs attention", CalendarClock],
    ["Average fit", String(averageScore), "Auto-scored leads", TrendingUp],
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow="Live sales workspace"
        title={`${workspaceSettings.companyName}'s buyer pipeline`}
        description="A practical CRM for tracking buyers, contacts, bid-list paths, opportunities, and follow-ups."
        action={<Link href="/companies" className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">Browse buyers</Link>}
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map(([label, value, sub, Icon]) => (
          <div className="card p-4" key={label}>
            <div className="mb-4 flex items-center justify-between"><Icon size={17} className="text-moss" /><span className="size-1.5 rounded-full bg-emerald-400" /></div>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700">{label}</p>
            <p className={`mt-2 text-[11px] ${label === "Open follow-ups" && openFollowUps.length ? "text-red-600" : "text-slate-400"}`}>{sub}</p>
          </div>
        ))}
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div><h2 className="font-serif text-lg font-semibold">Highest-scoring leads</h2><p className="text-xs text-slate-400">Best opportunities based on current scoring rules</p></div>
            <Link href="/companies" className="text-xs font-bold text-brand">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {topLeads.map((company, index) => (
              <Link href={`/companies/${company.company_id}`} key={company.company_id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                <span className="w-4 text-xs text-slate-300">{index + 1}</span>
                <div className="grid size-9 place-items-center rounded-lg bg-moss/10 text-xs font-bold text-moss">{company.company_name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{company.company_name}</p><p className="truncate text-xs text-slate-400">{company.specialization} · {company.city}, {company.state}</p></div>
                <Badge tone={company.lead_status === "Qualified" ? "green" : company.lead_status === "New" ? "orange" : "blue"}>{company.lead_status}</Badge>
                <div className="w-9 text-right text-lg font-bold text-ink">{company.lead_score}</div>
              </Link>
            ))}
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div><h2 className="font-serif text-lg font-semibold">Upcoming follow-ups</h2><p className="text-xs text-slate-400">Your next actions</p></div>
            <Link href="/follow-ups" className="text-xs font-bold text-brand">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {openFollowUps.slice(0, 5).map((followUp) => (
              <div key={followUp.id} className="p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{followUp.task}</p><p className="mt-1 text-xs text-slate-400">{followUp.company} · {followUp.contact}</p></div><Badge tone={followUp.priority === "High" ? "red" : "orange"}>{followUp.due || followUp.priority}</Badge></div>
              </div>
            ))}
            {!openFollowUps.length && <div className="p-8 text-center text-sm text-slate-500">No open follow-ups. Add one after your next buyer call.</div>}
          </div>
        </div>
      </section>
      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div><h2 className="font-serif text-lg font-semibold">Bid opportunities</h2><p className="text-xs text-slate-400">Tracked project opportunities and bid-list targets</p></div>
          <Link href="/bids" className="flex items-center gap-1 text-xs font-bold text-brand">Bid board <ArrowRight size={13} /></Link>
        </div>
        {bids.length ? <div className="overflow-x-auto"><table><thead><tr><th>Project</th><th>Company</th><th>Due</th><th>Value</th><th>Probability</th><th>Status</th></tr></thead><tbody>{bids.map((bid) => <tr key={bid.id}><td className="font-semibold text-ink">{bid.project}</td><td>{bid.company}</td><td>{bid.due || "—"}</td><td>${bid.value.toLocaleString()}</td><td>{bid.probability}%</td><td><Badge tone={isOpenBid(bid.status) ? "green" : "slate"}>{bid.status}</Badge></td></tr>)}</tbody></table></div> : <div className="p-8 text-center"><p className="font-semibold">No bid opportunities yet</p><p className="mt-1 text-sm text-slate-500">Add verified opportunities as they come in from buyer portals, bid invites, and estimating conversations.</p></div>}
      </section>
    </>
  );
}
