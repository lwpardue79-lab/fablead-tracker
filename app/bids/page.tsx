"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge, Button, PageHeader } from "@/components/ui";
import { useFabLeadStore } from "@/lib/local-store";

export default function Bids() {
  const { bids, companies, addBid } = useFabLeadStore();
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const openBids = bids.filter((bid) => ["Found", "Reviewing", "Bidding", "Open", "Submitted"].includes(bid.status));
  const totalValue = openBids.reduce((sum, bid) => sum + bid.value, 0);
  const weightedValue = openBids.reduce((sum, bid) => sum + bid.value * (bid.probability / 100), 0);
  const dueThisWeek = useMemo(() => {
    const today = new Date();
    const week = new Date();
    week.setDate(today.getDate() + 7);
    return openBids.filter((bid) => bid.due && new Date(bid.due) >= today && new Date(bid.due) <= week).length;
  }, [openBids]);

  function submitBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const project = String(form.get("project") || "").trim();
    if (!project) return;
    addBid({
      project,
      company: String(form.get("company") || ""),
      type: String(form.get("type") || "Miscellaneous Metals"),
      due: String(form.get("due") || ""),
      value: Number(form.get("value") || 0),
      probability: Number(form.get("probability") || 25),
      status: String(form.get("status") || "Found"),
      source_url: String(form.get("source_url") || ""),
    });
    event.currentTarget.reset();
    setShowForm(false);
    setMessage(`${project} added to verified opportunities.`);
  }

  return (
    <>
      <PageHeader eyebrow="Bid pipeline" title="Bid opportunities" description="Track found opportunities, go/no-go review, bidding, submitted work, and results." action={<button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Add bid opportunity</button>} />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {showForm && (
        <form onSubmit={submitBid} className="card mb-5 grid gap-3 p-5 md:grid-cols-3">
          <input name="project" className="field md:col-span-2" placeholder="Project / opportunity name *" required />
          <select name="company" className="field">{companies.map((company) => <option key={company.company_id}>{company.company_name}</option>)}</select>
          <input name="type" className="field" placeholder="Scope" defaultValue="Miscellaneous Metals" />
          <input name="due" className="field" type="date" />
          <input name="value" className="field" placeholder="Estimated value" type="number" min="0" />
          <input name="probability" className="field" placeholder="Probability" type="number" min="0" max="100" defaultValue="25" />
          <select name="status" className="field"><option>Found</option><option>Reviewing</option><option>Bidding</option><option>Submitted</option><option>Won</option><option>Lost</option><option>No-Bid</option></select>
          <input name="source_url" className="field" placeholder="Source URL" />
          <div className="flex gap-2 md:col-span-3"><Button>Save opportunity</Button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      )}
      <div className="mb-5 grid gap-3 sm:grid-cols-4"><div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Open bids</p><p className="mt-2 text-2xl font-semibold">{openBids.length}</p></div><div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Open bid value</p><p className="mt-2 text-2xl font-semibold">${totalValue.toLocaleString()}</p></div><div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Weighted value</p><p className="mt-2 text-2xl font-semibold">${Math.round(weightedValue).toLocaleString()}</p></div><div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Due this week</p><p className="mt-2 text-2xl font-semibold">{dueThisWeek}</p></div></div>
      {bids.length ? <div className="table-shell overflow-x-auto"><table><thead><tr><th>Project</th><th>Company</th><th>Type</th><th>Due date</th><th>Estimated value</th><th>Probability</th><th>Status</th></tr></thead><tbody>{bids.map((bid) => <tr key={bid.id}><td className="font-semibold text-ink">{bid.project}</td><td>{bid.company}</td><td>{bid.type}</td><td>{bid.due || "—"}</td><td>${bid.value.toLocaleString()}</td><td>{bid.probability}%</td><td><Badge tone={bid.status === "Submitted" ? "blue" : bid.status === "Open" ? "green" : "slate"}>{bid.status}</Badge></td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="font-serif text-xl font-semibold">Waiting for verified opportunity feeds</p><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">You can add a verified opportunity manually now. Feed automation comes later.</p></div>}
    </>
  );
}
