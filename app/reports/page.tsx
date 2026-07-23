"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import { useFabLeadStore } from "@/lib/local-store";
import { bidDateFields, bidMetrics, bidYears, currentBidStatuses, filterBids, pastBidStatuses, weightedBidValue, type BidDateField } from "@/lib/bid-utils";
import { useMemo, useState } from "react";

function downloadCsv(rows: string[]) {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
  anchor.download = "fablead-weekly-owner-report.csv";
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

export default function ReportsPage() {
  const { bids, companies, contacts, followUps, outreachLogs } = useFabLeadStore();
  const [bidYear, setBidYear] = useState("Current year");
  const [bidDateField, setBidDateField] = useState<BidDateField>("due");
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = weekStart.toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  const nextWeekDate = nextWeek.toISOString().slice(0, 10);

  const contactedCompanyNames = new Set(outreachLogs.filter((log) => log.date >= thisWeek).map((log) => log.company));
  const nextPriorities = [
    ...followUps.filter((followUp) => followUp.status !== "Completed" && followUp.due && followUp.due <= nextWeekDate).map((followUp) => `${followUp.company}: ${followUp.task} (${followUp.due})`),
    ...companies.filter((company) => company.next_action && company.next_action_due_date && company.next_action_due_date <= nextWeekDate).map((company) => `${company.company_name}: ${company.next_action} (${company.next_action_due_date})`),
  ].slice(0, 8);

  const filteredBids = useMemo(() => filterBids(bids, { year: bidYear, preset: "All time", dateField: bidDateField }), [bids, bidYear, bidDateField]);
  const bidReportMetrics = useMemo(() => bidMetrics(filteredBids), [filteredBids]);
  const years = useMemo(() => bidYears(bids), [bids]);

  const metrics = [
    ["Companies contacted this week", contactedCompanyNames.size],
    ["Follow-ups completed", followUps.filter((followUp) => followUp.status === "Completed").length],
    ["Overdue follow-ups", followUps.filter((followUp) => followUp.status !== "Completed" && followUp.due && followUp.due < today).length],
    ["New contacts added", contacts.filter((contact) => (contact.next_follow_up_at || "") >= thisWeek).length],
    ["Bid-list registrations completed", outreachLogs.filter((log) => log.type === "Portal Registration" && log.date >= thisWeek).length + companies.filter((company) => company.lead_status === "Registered").length],
    ["Bid opportunities added", filteredBids.filter((bid) => bid.status === "Found" || bid.status === "Reviewing").length],
    ["Bid invites received", companies.filter((company) => company.lead_status === "Bid Invite Received").length],
    ["Bids submitted", filteredBids.filter((bid) => bid.status === "Submitted").length],
    ["Won/Lost/No-Bid results", filteredBids.filter((bid) => ["Won", "Lost", "No-Bid"].includes(bid.status)).length],
  ] as const;

  function exportReport() {
    downloadCsv(["metric,value", ...metrics.map(([label, value]) => `"${label}",${value}`), "", "next_week_top_priorities", ...nextPriorities.map((item) => `"${item.replaceAll("\"", "\"\"")}"`)]);
  }

  return (
    <>
      <PageHeader eyebrow="Owner reporting" title="Weekly Owner Report" description="A simple snapshot of business development activity and what needs to happen next." action={<button onClick={exportReport} className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white"><span className="flex items-center gap-2"><Download size={15} />Export CSV</span></button>} />
      <section className="card mb-5 grid gap-3 p-4 md:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">Bid year<select className="field mt-1.5" value={bidYear} onChange={(event) => setBidYear(event.target.value)}><option>All years</option><option>Current year</option><option>Previous year</option>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Bid date basis<select className="field mt-1.5" value={bidDateField} onChange={(event) => setBidDateField(event.target.value as BidDateField)}>{bidDateFields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected bid period</p><p className="mt-1 font-semibold text-ink">{filteredBids.length} bids · ${bidReportMetrics.totalBidValue.toLocaleString()} pursued · {bidReportMetrics.winRate}% win rate</p></div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value]) => <div key={label} className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></div>)}
      </section>
      <section className="card mt-6 p-6">
        <h2 className="font-serif text-xl font-semibold">Next week’s top priorities</h2>
        <div className="mt-4 space-y-2">
          {nextPriorities.length ? nextPriorities.map((priority) => <div key={priority} className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">{priority}</div>) : <p className="text-sm text-slate-500">No urgent priorities scheduled. Add next actions on Companies or Follow-Ups.</p>}
        </div>
      </section>
      <section className="card mt-6 p-6">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <h2 className="font-serif text-xl font-semibold">Bid records in this report period</h2>
            <p className="mt-1 text-sm text-slate-500">Past bids are still editable. Open a bid to update result, submitted value, dates, notes, or status.</p>
          </div>
          <Link href="/bid-reports" className="text-sm font-bold text-brand hover:underline">Open full bid reports</Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table>
            <thead><tr><th>Project</th><th>Company</th><th>Due</th><th>Submitted</th><th>Value</th><th>Weighted</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filteredBids.length ? filteredBids.slice(0, 12).map((bid) => (
                <tr key={bid.id} className="hover:bg-slate-50">
                  <td className="font-semibold text-ink"><Link href={`/bids/${bid.id}`} className="hover:text-brand hover:underline">{bid.project || "Unnamed opportunity"}</Link><p className="text-xs text-slate-400">{bid.type || "Not added yet"}</p></td>
                  <td>{bid.company || "Not added yet"}</td>
                  <td>{bid.due || "Not added yet"}</td>
                  <td>{bid.submitted_date || "Not added yet"}</td>
                  <td>${Number(bid.value || 0).toLocaleString()}</td>
                  <td>${weightedBidValue(bid).toLocaleString()}</td>
                  <td><Badge tone={currentBidStatuses.includes(bid.status) ? "green" : pastBidStatuses.includes(bid.status) ? "slate" : "blue"}>{bid.status || "Not added yet"}</Badge></td>
                  <td><Link href={`/bids/${bid.id}`} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white">Open/Edit</Link></td>
                </tr>
              )) : <tr><td colSpan={8}>No bid records match this report period.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card mt-6 p-6">
        <h2 className="font-serif text-xl font-semibold">Owner notes</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">Use this in a weekly 15-minute sales meeting: who was contacted, which bid-list registrations moved forward, what is overdue, and which bid opportunities need a go/no-go decision.</p>
        <button onClick={() => window.print()} className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Export PDF</button>
      </section>
    </>
  );
}
