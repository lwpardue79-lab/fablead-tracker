"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, PageHeader } from "@/components/ui";
import { bidStatuses, useFabLeadStore } from "@/lib/local-store";
import { Bid } from "@/lib/types";

function isOpenBid(status: string) {
  return ["Found", "Reviewing", "Bidding", "Submitted", "Open"].includes(status);
}

export default function Bids() {
  const { addBid, archiveBid, bids, companies, contacts, updateBid } = useFabLeadStore();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const openBids = bids.filter((bid) => isOpenBid(bid.status));
  const totalValue = openBids.reduce((sum, bid) => sum + bid.value, 0);
  const weightedValue = openBids.reduce((sum, bid) => sum + bid.value * (bid.probability / 100), 0);
  const dueThisWeek = useMemo(() => {
    const today = new Date();
    const week = new Date();
    week.setDate(today.getDate() + 7);
    return openBids.filter((bid) => bid.due && new Date(bid.due) >= today && new Date(bid.due) <= week).length;
  }, [openBids]);
  const submitted = bids.filter((bid) => bid.status === "Submitted").length;
  const results = bids.filter((bid) => ["Won", "Lost", "No-Bid"].includes(bid.status)).length;

  function bidFromForm(form: FormData, existing?: Bid): Bid | Omit<Bid, "id"> {
    const companyId = String(form.get("company_id") || existing?.company_id || companies[0]?.company_id || "");
    const company = companies.find((item) => item.company_id === companyId);
    const contactId = String(form.get("contact_id") || "");
    const contact = contacts.find((item) => item.contact_id === contactId);
    return {
      ...(existing || {}),
      project: String(form.get("project") || "").trim(),
      company_id: companyId,
      company: company?.company_name || existing?.company || "",
      contact_id: contactId,
      contact: contact ? `${contact.first_name} ${contact.last_name}`.trim() : "",
      type: String(form.get("type") || "Miscellaneous Metals"),
      due: String(form.get("due") || ""),
      value: Number(form.get("value") || 0),
      probability: Number(form.get("probability") || 25),
      status: String(form.get("status") || "Found"),
      location: String(form.get("location") || ""),
      source_url: String(form.get("source_url") || ""),
      notes: String(form.get("notes") || ""),
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

  const bidFields = (bid?: Bid) => (
    <>
      <input name="project" className="field md:col-span-2" placeholder="Project / opportunity name *" defaultValue={bid?.project} required />
      <select name="company_id" className="field" defaultValue={bid?.company_id}>{companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}</select>
      <select name="contact_id" className="field" defaultValue={bid?.contact_id || ""}><option value="">No contact</option>{contacts.map((contact) => <option key={contact.contact_id} value={contact.contact_id}>{contact.first_name} {contact.last_name}</option>)}</select>
      <input name="type" className="field" placeholder="Scope" defaultValue={bid?.type || "Miscellaneous Metals"} />
      <input name="location" className="field" placeholder="Project location" defaultValue={bid?.location} />
      <input name="due" className="field" type="date" defaultValue={bid?.due} />
      <input name="value" className="field" placeholder="Estimated value" type="number" min="0" defaultValue={bid?.value} />
      <input name="probability" className="field" placeholder="Probability" type="number" min="0" max="100" defaultValue={bid?.probability || 25} />
      <select name="status" className="field" defaultValue={bid?.status || "Found"}>{bidStatuses.map((status) => <option key={status}>{status}</option>)}</select>
      <input name="source_url" className="field md:col-span-2" placeholder="Source URL" defaultValue={bid?.source_url} />
      <textarea name="notes" className="field md:col-span-3" placeholder="Notes" defaultValue={bid?.notes} />
    </>
  );

  return (
    <>
      <PageHeader eyebrow="Bid pipeline" title="Bid opportunities" description="Track found opportunities, go/no-go review, bidding, submitted work, and results." action={<button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Add bid opportunity</button>} />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {showForm && (
        <form onSubmit={submitBid} className="card mb-5 grid gap-3 p-5 md:grid-cols-3">
          {bidFields()}
          <div className="flex gap-2 md:col-span-3"><Button>Save opportunity</Button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      )}
      <div className="mb-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6"><div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Open bids</p><p className="mt-2 text-2xl font-semibold">{openBids.length}</p></div><div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Open value</p><p className="mt-2 text-2xl font-semibold">${totalValue.toLocaleString()}</p></div><div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Weighted value</p><p className="mt-2 text-2xl font-semibold">${Math.round(weightedValue).toLocaleString()}</p></div><div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Due this week</p><p className="mt-2 text-2xl font-semibold">{dueThisWeek}</p></div><div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Submitted</p><p className="mt-2 text-2xl font-semibold">{submitted}</p></div><div className="card p-5"><p className="text-xs font-bold uppercase text-slate-400">Results</p><p className="mt-2 text-2xl font-semibold">{results}</p></div></div>
      {bids.length ? <div className="table-shell overflow-x-auto"><table><thead><tr><th>Project</th><th>Company</th><th>Scope</th><th>Due</th><th>Value</th><th>Weighted</th><th>Status</th><th>Actions</th></tr></thead><tbody>{bids.map((bid) => {
        const company = companies.find((item) => item.company_id === bid.company_id || item.company_name === bid.company);
        return <tr key={bid.id} onClick={() => router.push(`/bids/${bid.id}`)} className="cursor-pointer hover:bg-slate-50">
          <td className="font-semibold text-ink"><Link onClick={(event) => event.stopPropagation()} href={`/bids/${bid.id}`} className="hover:text-brand hover:underline">{bid.project || "Unnamed opportunity"}</Link><p className="text-xs text-slate-400">{bid.location || "Not added yet"}</p></td>
          <td>{company ? <Link onClick={(event) => event.stopPropagation()} href={`/companies/${company.company_id}`} className="font-semibold text-brand hover:underline">{company.company_name}</Link> : bid.company || "Not added yet"}</td>
          <td>{bid.type || "Not added yet"}</td><td>{bid.due || "Not added yet"}</td><td>${bid.value.toLocaleString()}</td><td>${Math.round(bid.value * (bid.probability / 100)).toLocaleString()}</td><td><Badge tone={bid.status === "Submitted" ? "blue" : isOpenBid(bid.status) ? "green" : bid.status === "Lost" || bid.status === "No-Bid" ? "red" : "slate"}>{bid.status}</Badge></td>
          <td><div className="flex gap-2"><button onClick={(event) => { event.stopPropagation(); setEditingId(editingId === bid.id ? "" : bid.id); }} className="rounded-md border px-2 py-1 text-xs font-semibold">Edit</button><button onClick={(event) => { event.stopPropagation(); archive(bid); }} className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Delete</button></div></td>
        </tr>;
      })}</tbody></table></div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="font-serif text-xl font-semibold">No bid opportunities yet</p><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Add opportunities manually as soon as a buyer sends a bid invite or portal listing.</p></div>}
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
