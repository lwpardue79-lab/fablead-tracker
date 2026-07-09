"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Badge, Button, PageHeader } from "@/components/ui";
import { bidDateFields, bidMetrics, bidResults, bidYears, currentBidStatuses, filterBids, pastBidStatuses, weightedBidValue, type BidDateField, type BidPreset, type BidTab } from "@/lib/bid-utils";
import { bidStatuses, useFabLeadStore } from "@/lib/local-store";
import { Bid } from "@/lib/types";

const tabs: BidTab[] = ["Current Bids", "Past Bids", "All Bids"];
const presets: BidPreset[] = ["This week", "This month", "This quarter", "Year to date", "Last year", "All time", "Custom date range"];

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

export default function Bids() {
  const { addBid, archiveBid, bids, companies, contacts, updateBid } = useFabLeadStore();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<BidTab>("Current Bids");
  const [year, setYear] = useState("All years");
  const [preset, setPreset] = useState<BidPreset>("All time");
  const [dateField, setDateField] = useState<BidDateField>("due");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const years = useMemo(() => bidYears(bids), [bids]);
  const filteredBids = useMemo(() => filterBids(bids, { tab, year, preset, dateField, customStart, customEnd, includeArchived }), [bids, tab, year, preset, dateField, customStart, customEnd, includeArchived]);
  const metrics = useMemo(() => bidMetrics(filteredBids), [filteredBids]);

  function bidFromForm(form: FormData, existing?: Bid): Bid | Omit<Bid, "id"> {
    const companyId = String(form.get("company_id") || existing?.company_id || companies[0]?.company_id || "");
    const company = companies.find((item) => item.company_id === companyId);
    const contactId = String(form.get("contact_id") || "");
    const contact = contacts.find((item) => item.contact_id === contactId);
    const status = String(form.get("status") || "Found");
    return {
      ...(existing || {}),
      project: String(form.get("project") || "").trim(),
      company_id: companyId,
      company: company?.company_name || existing?.company || "",
      contact_id: contactId,
      contact: contact ? `${contact.first_name} ${contact.last_name}`.trim() : "",
      type: String(form.get("type") || "Miscellaneous Metals"),
      due: String(form.get("due") || ""),
      submitted_date: String(form.get("submitted_date") || ""),
      result_date: String(form.get("result_date") || ""),
      value: Number(form.get("value") || 0),
      final_submitted_value: Number(form.get("final_submitted_value") || 0),
      probability: Number(form.get("probability") || 25),
      status,
      result: String(form.get("result") || (["Won", "Lost", "No-Bid", "Canceled"].includes(status) ? status : "Pending")),
      location: String(form.get("location") || ""),
      source_url: String(form.get("source_url") || ""),
      notes: String(form.get("notes") || ""),
      created_at: existing?.created_at || new Date().toISOString().slice(0, 10),
    };
  }

  function submitBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bid = bidFromForm(new FormData(event.currentTarget));
    if (!bid.project) return;
    addBid(bid);
    event.currentTarget.reset();
    setShowForm(false);
    setMessage(`${bid.project} added.`);
  }

  function saveEdit(event: FormEvent<HTMLFormElement>, bid: Bid) {
    event.preventDefault();
    updateBid(bidFromForm(new FormData(event.currentTarget), bid) as Bid);
    setEditingId("");
    setMessage("Bid updated.");
  }

  function archive(bid: Bid) {
    if (!window.confirm("Are you sure you want to delete this? This can be restored from Deleted Items.")) return;
    archiveBid(bid.id);
    setMessage("Deleted successfully.");
  }

  function exportCsv() {
    const columns = ["project", "company", "type", "location", "due", "submitted_date", "result_date", "value", "final_submitted_value", "probability", "weighted_value", "status", "result", "source_url", "notes"];
    const rows = [
      columns.join(","),
      ...filteredBids.map((bid) => [bid.project, bid.company, bid.type, bid.location, bid.due, bid.submitted_date, bid.result_date, bid.value, bid.final_submitted_value, bid.probability, weightedBidValue(bid), bid.status, bid.result, bid.source_url, bid.notes].map(csvCell).join(",")),
    ];
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    anchor.download = "fablead-filtered-bids.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  const bidFields = (bid?: Bid) => (
    <>
      <input name="project" className="field md:col-span-2" placeholder="Project / opportunity name *" defaultValue={bid?.project} required />
      <select name="company_id" className="field" defaultValue={bid?.company_id}>{companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}</select>
      <select name="contact_id" className="field" defaultValue={bid?.contact_id || ""}><option value="">No contact</option>{contacts.map((contact) => <option key={contact.contact_id} value={contact.contact_id}>{contact.first_name} {contact.last_name}</option>)}</select>
      <input name="type" className="field" placeholder="Scope" defaultValue={bid?.type || "Miscellaneous Metals"} />
      <input name="location" className="field" placeholder="Project location" defaultValue={bid?.location} />
      <input name="due" className="field" type="date" defaultValue={bid?.due} />
      <input name="submitted_date" className="field" type="date" defaultValue={bid?.submitted_date} />
      <input name="result_date" className="field" type="date" defaultValue={bid?.result_date} />
      <input name="value" className="field" placeholder="Estimated value" type="number" min="0" defaultValue={bid?.value} />
      <input name="final_submitted_value" className="field" placeholder="Final submitted value" type="number" min="0" defaultValue={bid?.final_submitted_value} />
      <input name="probability" className="field" placeholder="Probability" type="number" min="0" max="100" defaultValue={bid?.probability || 25} />
      <select name="status" className="field" defaultValue={bid?.status || "Found"}>{bidStatuses.map((status) => <option key={status}>{status}</option>)}</select>
      <select name="result" className="field" defaultValue={bid?.result || "Pending"}>{bidResults.map((result) => <option key={result}>{result}</option>)}</select>
      <input name="source_url" className="field md:col-span-2" placeholder="Source URL" defaultValue={bid?.source_url} />
      <textarea name="notes" className="field md:col-span-3" placeholder="Notes" defaultValue={bid?.notes} />
    </>
  );

  const cards = [
    ["Total bid value", metrics.totalBidValue],
    ["Open bid value", metrics.openBidValue],
    ["Submitted value", metrics.submittedBidValue],
    ["Won value", metrics.wonBidValue],
    ["Lost value", metrics.lostBidValue],
    ["No-bid value", metrics.noBidValue],
    ["Weighted pipeline", metrics.weightedPipelineValue],
    ["Average bid", metrics.averageBidValue],
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow="Bid pipeline"
        title="Bid opportunities"
        description="Track current and past bids, filter by period, and measure bid value, submitted value, wins, losses, and pipeline."
        action={<div className="flex flex-wrap gap-2"><button onClick={exportCsv} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><span className="flex items-center gap-2"><Download size={15} />Export CSV</span></button><Link href="/bid-reports" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Bid Reports</Link><button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Add bid opportunity</button></div>}
      />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {showForm && (
        <form onSubmit={submitBid} className="card mb-5 grid gap-3 p-5 md:grid-cols-3">
          {bidFields()}
          <div className="flex gap-2 md:col-span-3"><Button>Save opportunity</Button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-2">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === item ? "bg-ink text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{item}</button>)}</div>

      <section className="card mb-5 grid gap-3 p-4 md:grid-cols-4 xl:grid-cols-7">
        <select className="field" value={year} onChange={(event) => setYear(event.target.value)}><option>All years</option><option>Current year</option><option>Previous year</option>{years.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="field" value={preset} onChange={(event) => setPreset(event.target.value as BidPreset)}>{presets.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="field" value={dateField} onChange={(event) => setDateField(event.target.value as BidDateField)}>{bidDateFields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <input className="field" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} disabled={preset !== "Custom date range"} />
        <input className="field" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} disabled={preset !== "Custom date range"} />
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Include archived</label>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">{filteredBids.length} bids</div>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => <div key={label} className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold">{money(value)}</p></div>)}
        <div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Win rate</p><p className="mt-2 text-2xl font-semibold">{metrics.winRate}%</p></div>
        <div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Number of bids</p><p className="mt-2 text-2xl font-semibold">{metrics.count}</p></div>
      </section>

      {filteredBids.length ? <div className="table-shell overflow-x-auto"><table><thead><tr><th>Project</th><th>Company</th><th>Scope</th><th>Due</th><th>Submitted</th><th>Value</th><th>Weighted</th><th>Status</th><th>Result</th><th>Actions</th></tr></thead><tbody>{filteredBids.map((bid) => {
        const company = companies.find((item) => item.company_id === bid.company_id || item.company_name === bid.company);
        return <tr key={bid.id} onClick={() => router.push(`/bids/${bid.id}`)} className="cursor-pointer hover:bg-slate-50">
          <td className="font-semibold text-ink"><Link onClick={(event) => event.stopPropagation()} href={`/bids/${bid.id}`} className="hover:text-brand hover:underline">{bid.project || "Unnamed opportunity"}</Link><p className="text-xs text-slate-400">{bid.location || "Not added yet"}</p></td>
          <td>{company ? <Link onClick={(event) => event.stopPropagation()} href={`/companies/${company.company_id}`} className="font-semibold text-brand hover:underline">{company.company_name}</Link> : bid.company || "Not added yet"}</td>
          <td>{bid.type || "Not added yet"}</td><td>{bid.due || "Not added yet"}</td><td>{bid.submitted_date || "Not added yet"}</td><td>{money(bid.value)}</td><td>{money(weightedBidValue(bid))}</td><td><Badge tone={currentBidStatuses.includes(bid.status) ? "green" : pastBidStatuses.includes(bid.status) ? "slate" : "blue"}>{bid.status}</Badge></td><td>{bid.result || "Pending"}</td>
          <td><div className="flex gap-2"><button onClick={(event) => { event.stopPropagation(); setEditingId(editingId === bid.id ? "" : bid.id); }} className="rounded-md border px-2 py-1 text-xs font-semibold">Edit</button><button onClick={(event) => { event.stopPropagation(); archive(bid); }} className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Delete</button></div></td>
        </tr>;
      })}</tbody></table></div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="font-serif text-xl font-semibold">No bid opportunities match these filters</p><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Try All Bids, All years, or All time to widen the view.</p></div>}

      {editingId && bids.filter((bid) => bid.id === editingId).map((bid) => (
        <form key={bid.id} onSubmit={(event) => saveEdit(event, bid)} className="card mt-5 grid gap-3 p-5 md:grid-cols-3">
          <h2 className="font-serif text-xl font-semibold md:col-span-3">Edit bid</h2>
          {bidFields(bid)}
          <div className="flex gap-2 md:col-span-3"><Button>Save changes</Button><button type="button" onClick={() => setEditingId("")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      ))}
    </>
  );
}
