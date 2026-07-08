"use client";

import { Download } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { useFabLeadStore } from "@/lib/local-store";

function downloadCsv(rows: string[]) {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
  anchor.download = "fablead-weekly-owner-report.csv";
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

export default function ReportsPage() {
  const { bids, companies, followUps, outreachLogs } = useFabLeadStore();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = weekStart.toISOString().slice(0, 10);

  const metrics = [
    ["Buyers added this week", companies.filter((company) => (company.data_verified_at || "") >= thisWeek).length],
    ["Outreach completed", outreachLogs.filter((log) => log.date >= thisWeek).length],
    ["Follow-ups overdue", followUps.filter((followUp) => followUp.status !== "Complete" && followUp.due && followUp.due < now.toISOString().slice(0, 10)).length],
    ["Portals registered", outreachLogs.filter((log) => log.type === "Portal Registration" && log.date >= thisWeek).length],
    ["Bid opportunities found", bids.filter((bid) => bid.status === "Found" || bid.status === "Open").length],
    ["Bid invites received", companies.filter((company) => company.lead_status === "Bid Invite Received").length],
    ["Bids submitted", bids.filter((bid) => bid.status === "Submitted").length],
    ["Won bids", bids.filter((bid) => bid.status === "Won").length],
    ["Lost bids", bids.filter((bid) => bid.status === "Lost").length],
    ["No-bid results", bids.filter((bid) => bid.status === "No-Bid" || bid.status === "No Bid").length],
  ] as const;

  function exportReport() {
    downloadCsv(["metric,value", ...metrics.map(([label, value]) => `"${label}",${value}`)]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Owner reporting"
        title="Weekly Owner Report"
        description="A simple snapshot of business development activity and bid pipeline health."
        action={<button onClick={exportReport} className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white"><span className="flex items-center gap-2"><Download size={15} />Export CSV</span></button>}
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value]) => <div key={label} className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></div>)}
      </section>
      <section className="card mt-6 p-6">
        <h2 className="font-serif text-xl font-semibold">Owner notes</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">Use this report in a weekly 15-minute sales meeting: what buyers were added, who was contacted, what follow-ups are overdue, and which bid opportunities need a go/no-go decision.</p>
        <button onClick={() => window.print()} className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Export PDF</button>
      </section>
    </>
  );
}
