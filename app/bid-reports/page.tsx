"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { bidDateFields, bidMetrics, bidResults, bidYears, filterBids, groupBidValue, type BidDateField, type BidPreset } from "@/lib/bid-utils";
import { bidStatuses, useFabLeadStore } from "@/lib/local-store";

const presets: BidPreset[] = ["This week", "This month", "This quarter", "Year to date", "Last year", "All time", "Custom date range"];

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function BarChart({ rows }: { rows: { label: string; value: number; count: number }[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <div className="space-y-3">{rows.slice(0, 8).map((row) => <div key={row.label}><div className="mb-1 flex justify-between gap-3 text-xs font-semibold text-slate-500"><span>{row.label}</span><span>{money(row.value)} · {row.count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(5, (row.value / max) * 100)}%` }} /></div></div>)}</div>;
}

function SummaryTable({ title, rows }: { title: string; rows: { label: string; count: number; value: number }[] }) {
  return <section className="card p-5"><h2 className="font-serif text-lg font-semibold">{title}</h2><div className="mt-4 overflow-x-auto"><table><thead><tr><th>Group</th><th>Bids</th><th>Value</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.label}><td className="font-semibold text-ink">{row.label}</td><td>{row.count}</td><td>{money(row.value)}</td></tr>) : <tr><td colSpan={3}>No bids match these filters.</td></tr>}</tbody></table></div></section>;
}

export default function BidReportsPage() {
  const { bids, companies } = useFabLeadStore();
  const [year, setYear] = useState("All years");
  const [preset, setPreset] = useState<BidPreset>("Year to date");
  const [dateField, setDateField] = useState<BidDateField>("due");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [company, setCompany] = useState("All companies");
  const [status, setStatus] = useState("All statuses");
  const [scope, setScope] = useState("All scopes");
  const [result, setResult] = useState("All results");
  const [includeArchived, setIncludeArchived] = useState(false);

  const years = useMemo(() => bidYears(bids), [bids]);
  const scopes = useMemo(() => ["All scopes", ...Array.from(new Set(bids.map((bid) => bid.type).filter(Boolean))).sort()], [bids]);
  const companyOptions = useMemo(() => ["All companies", ...companies.map((item) => item.company_name).sort()], [companies]);
  const filteredBids = useMemo(() => filterBids(bids, { year, preset, dateField, customStart, customEnd, includeArchived, company, status, scope, result }), [bids, year, preset, dateField, customStart, customEnd, includeArchived, company, status, scope, result]);
  const metrics = useMemo(() => bidMetrics(filteredBids), [filteredBids]);
  const byStatus = useMemo(() => groupBidValue(filteredBids, "status"), [filteredBids]);
  const byCompany = useMemo(() => groupBidValue(filteredBids, "company"), [filteredBids]);
  const byMonth = useMemo(() => groupBidValue(filteredBids, "month").sort((a, b) => a.label.localeCompare(b.label)), [filteredBids]);
  const byScope = useMemo(() => groupBidValue(filteredBids, "scope"), [filteredBids]);
  const resultBreakdown = useMemo(() => {
    const rows = new Map<string, { label: string; count: number; value: number }>();
    filteredBids.forEach((bid) => {
      const label = bid.result || (["Won", "Lost", "No-Bid", "Canceled"].includes(bid.status) ? bid.status : "Pending");
      const current = rows.get(label) || { label, count: 0, value: 0 };
      current.count += 1;
      current.value += Number(bid.value || 0);
      rows.set(label, current);
    });
    return Array.from(rows.values()).sort((a, b) => b.value - a.value);
  }, [filteredBids]);

  function exportCsv() {
    const rows = [
      "project,company,scope,due,submitted_date,result_date,status,result,value,final_submitted_value,probability",
      ...filteredBids.map((bid) => [bid.project, bid.company, bid.type, bid.due, bid.submitted_date, bid.result_date, bid.status, bid.result, bid.value, bid.final_submitted_value, bid.probability].map(csvCell).join(",")),
    ];
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    anchor.download = "fablead-bid-report.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  const cards = [
    ["Total bid value", metrics.totalBidValue],
    ["Won value", metrics.wonBidValue],
    ["Lost value", metrics.lostBidValue],
    ["Open value", metrics.openBidValue],
    ["Submitted value", metrics.submittedBidValue],
    ["Weighted value", metrics.weightedPipelineValue],
  ] as const;

  return (
    <>
      <PageHeader eyebrow="Bid reporting" title="Bid Reports" description="Measure bid volume, value pursued, open pipeline, submitted value, win rate, and which buyers/scopes are producing opportunities." action={<div className="flex flex-wrap gap-2"><button onClick={exportCsv} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><span className="flex items-center gap-2"><Download size={15} />Export CSV</span></button><button onClick={() => window.print()} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">Export PDF</button></div>} />

      <section className="card mb-5 grid gap-3 p-4 md:grid-cols-4 xl:grid-cols-8">
        <select className="field" value={year} onChange={(event) => setYear(event.target.value)}><option>All years</option><option>Current year</option><option>Previous year</option>{years.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="field" value={preset} onChange={(event) => setPreset(event.target.value as BidPreset)}>{presets.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="field" value={dateField} onChange={(event) => setDateField(event.target.value as BidDateField)}>{bidDateFields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <input className="field" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} disabled={preset !== "Custom date range"} />
        <input className="field" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} disabled={preset !== "Custom date range"} />
        <select className="field" value={company} onChange={(event) => setCompany(event.target.value)}>{companyOptions.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{bidStatuses.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="field" value={scope} onChange={(event) => setScope(event.target.value)}>{scopes.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="field" value={result} onChange={(event) => setResult(event.target.value)}><option>All results</option>{bidResults.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Include archived</label>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => <div key={label} className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold">{money(value)}</p></div>)}
        <div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Win rate</p><p className="mt-2 text-2xl font-semibold">{metrics.winRate}%</p></div>
        <div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Number of bids</p><p className="mt-2 text-2xl font-semibold">{metrics.count}</p></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Monthly bid value</h2><div className="mt-4"><BarChart rows={byMonth} /></div></section>
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Bids by status</h2><div className="mt-4"><BarChart rows={byStatus} /></div></section>
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Won / Lost / No-Bid</h2><div className="mt-4"><BarChart rows={resultBreakdown} /></div></section>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SummaryTable title="Bids by status" rows={byStatus} />
        <SummaryTable title="Bids by company" rows={byCompany} />
        <SummaryTable title="Bids by month" rows={byMonth} />
        <SummaryTable title="Bids by scope" rows={byScope} />
      </div>
    </>
  );
}
