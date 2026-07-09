"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { bidResults, weightedBidValue } from "@/lib/bid-utils";
import { bidStatuses, useFabLeadStore } from "@/lib/local-store";
import { Bid } from "@/lib/types";

function value(text?: string | number) {
  return text || text === 0 ? String(text) : "Not added yet";
}

function isOpenBid(status: string) {
  return ["Found", "Reviewing", "Bidding", "Submitted", "Open"].includes(status);
}

export default function BidDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addFollowUp, addOutreachLog, archiveBid, bids, companies, contacts, followUps, outreachLogs, updateBid } = useFabLeadStore();
  const foundBid = bids.find((item) => item.id === id);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  if (!foundBid) return <div className="card p-8"><p className="font-semibold">Bid opportunity not found.</p><Link href="/bids" className="mt-3 inline-block text-sm font-bold text-brand">Back to Bids</Link></div>;

  const activeBid = foundBid;
  const company = companies.find((item) => item.company_id === activeBid.company_id || item.company_name === activeBid.company);
  const contact = contacts.find((item) => item.contact_id === activeBid.contact_id);
  const contactName = contact ? `${contact.first_name} ${contact.last_name}`.trim() : activeBid.contact || "";
  const weightedValue = weightedBidValue(activeBid);
  const relatedOutreach = outreachLogs.filter((log) => (company && log.company_id === company.company_id) || (contact && log.contact_id === contact.contact_id));
  const relatedFollowUps = followUps.filter((followUp) => (company && followUp.company_id === company.company_id) || (contact && followUp.contact_id === contact.contact_id));

  function bidFromForm(form: FormData): Bid {
    const companyId = String(form.get("company_id") || activeBid.company_id || "");
    const nextCompany = companies.find((item) => item.company_id === companyId);
    const contactId = String(form.get("contact_id") || "");
    const nextContact = contacts.find((item) => item.contact_id === contactId);
    return {
      ...activeBid,
      project: String(form.get("project") || "").trim(),
      company_id: companyId,
      company: nextCompany?.company_name || activeBid.company,
      contact_id: contactId,
      contact: nextContact ? `${nextContact.first_name} ${nextContact.last_name}`.trim() : "",
      type: String(form.get("type") || "Miscellaneous Metals"),
      due: String(form.get("due") || ""),
      submitted_date: String(form.get("submitted_date") || ""),
      result_date: String(form.get("result_date") || ""),
      value: Number(form.get("value") || 0),
      final_submitted_value: Number(form.get("final_submitted_value") || 0),
      probability: Number(form.get("probability") || 25),
      status: String(form.get("status") || "Found"),
      result: String(form.get("result") || "Pending"),
      location: String(form.get("location") || ""),
      source_url: String(form.get("source_url") || ""),
      notes: String(form.get("notes") || ""),
    };
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateBid(bidFromForm(new FormData(event.currentTarget)));
    setEditing(false);
    setMessage("Bid updated.");
  }

  function changeStatus(status: string) {
    if (status === activeBid.status) return;
    updateBid({ ...activeBid, status });
    setMessage(`Bid status changed to ${status}.`);
  }

  function archive() {
    if (!window.confirm("Are you sure you want to delete this? This can be restored from Deleted Items.")) return;
    archiveBid(activeBid.id);
    router.push("/bids");
  }

  function addBidFollowUp() {
    addFollowUp({
      company: company?.company_name || activeBid.company || "Unknown buyer",
      company_id: company?.company_id || activeBid.company_id,
      contact: contactName,
      contact_id: activeBid.contact_id,
      task: `Follow up on bid: ${activeBid.project}`,
      due: activeBid.due || new Date().toISOString().slice(0, 10),
      priority: activeBid.due ? "High" : "Medium",
      status: "Open",
      task_type: "Bid follow-up",
      notes: activeBid.notes || "",
    });
    setMessage("Follow-up added.");
  }

  function addOutreachNote() {
    addOutreachLog({
      company: company?.company_name || activeBid.company || "Unknown buyer",
      company_id: company?.company_id || activeBid.company_id,
      contact: contactName,
      contact_id: activeBid.contact_id,
      type: "Note",
      date: new Date().toISOString().slice(0, 10),
      result: `Bid note added for ${activeBid.project}`,
      notes: activeBid.notes || "",
      nextFollowUpDate: "",
    });
    setMessage("Outreach note added.");
  }

  const detailRows = [
    ["Company", company ? <Link className="font-semibold text-brand hover:underline" href={`/companies/${company.company_id}`}>{company.company_name}</Link> : value(activeBid.company)],
    ["Contact", contact ? <Link className="font-semibold text-brand hover:underline" href={`/contacts/${contact.contact_id}`}>{contactName}</Link> : value(contactName)],
    ["Location", value(activeBid.location)],
    ["Scope", value(activeBid.type)],
    ["Due date", value(activeBid.due)],
    ["Submitted date", value(activeBid.submitted_date)],
    ["Result date", value(activeBid.result_date)],
    ["Estimated value", `$${activeBid.value.toLocaleString()}`],
    ["Final submitted value", `$${Number(activeBid.final_submitted_value || 0).toLocaleString()}`],
    ["Probability", `${activeBid.probability}%`],
    ["Weighted value", `$${weightedValue.toLocaleString()}`],
    ["Status", activeBid.status || "Not added yet"],
    ["Result", activeBid.result || "Pending"],
    ["Source link", activeBid.source_url ? <a className="font-semibold text-brand hover:underline" href={activeBid.source_url} target="_blank" rel="noreferrer">Open source <ExternalLink size={13} className="inline" /></a> : "Not added yet"],
    ["Notes", value(activeBid.notes)],
  ] as const;

  return (
    <>
      <Link href="/bids" className="mb-5 flex items-center gap-2 text-xs font-semibold text-slate-500"><ArrowLeft size={14} />Back to bids</Link>
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      <section className="card p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Bid opportunity</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{activeBid.project || "Unnamed bid opportunity"}</h1>
            <div className="mt-3 flex flex-wrap gap-2"><Badge tone={isOpenBid(activeBid.status) ? "green" : activeBid.status === "Lost" || activeBid.status === "No-Bid" ? "red" : "slate"}>{activeBid.status || "Not added yet"}</Badge><Badge>${weightedValue.toLocaleString()} weighted</Badge></div>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <select aria-label="Bid status" className="field w-auto min-w-36 py-2 text-sm font-semibold" value={activeBid.status || "Found"} onChange={(event) => changeStatus(event.target.value)}>{bidStatuses.map((status) => <option key={status}>{status}</option>)}</select>
            <button onClick={() => setEditing((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">{editing ? "Close edit" : "Edit bid"}</button>
            <button onClick={addBidFollowUp} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Add follow-up</button>
            <button onClick={addOutreachNote} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Add outreach note</button>
            <button onClick={archive} className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700">Delete/Archive</button>
          </div>
        </div>
      </section>

      {editing && (
        <form onSubmit={save} className="card mt-6 grid gap-3 p-5 md:grid-cols-3">
          <input name="project" className="field md:col-span-2" placeholder="Project / opportunity name *" defaultValue={activeBid.project} required />
          <select name="company_id" className="field" defaultValue={activeBid.company_id}>{companies.map((item) => <option key={item.company_id} value={item.company_id}>{item.company_name}</option>)}</select>
          <select name="contact_id" className="field" defaultValue={activeBid.contact_id || ""}><option value="">No contact</option>{contacts.map((item) => <option key={item.contact_id} value={item.contact_id}>{item.first_name} {item.last_name}</option>)}</select>
          <input name="type" className="field" placeholder="Scope" defaultValue={activeBid.type || "Miscellaneous Metals"} />
          <input name="location" className="field" placeholder="Project location" defaultValue={activeBid.location} />
          <input name="due" className="field" type="date" defaultValue={activeBid.due} />
          <input name="submitted_date" className="field" type="date" defaultValue={activeBid.submitted_date} />
          <input name="result_date" className="field" type="date" defaultValue={activeBid.result_date} />
          <input name="value" className="field" placeholder="Estimated value" type="number" min="0" defaultValue={activeBid.value} />
          <input name="final_submitted_value" className="field" placeholder="Final submitted value" type="number" min="0" defaultValue={activeBid.final_submitted_value} />
          <input name="probability" className="field" placeholder="Probability" type="number" min="0" max="100" defaultValue={activeBid.probability || 25} />
          <select name="status" className="field" defaultValue={activeBid.status || "Found"}>{bidStatuses.map((status) => <option key={status}>{status}</option>)}</select>
          <select name="result" className="field" defaultValue={activeBid.result || "Pending"}>{bidResults.map((result) => <option key={result}>{result}</option>)}</select>
          <input name="source_url" className="field md:col-span-2" placeholder="Source URL" defaultValue={activeBid.source_url} />
          <textarea name="notes" className="field md:col-span-3" placeholder="Notes" defaultValue={activeBid.notes} />
          <div className="flex gap-2 md:col-span-3"><Button>Save changes</Button><button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      )}

      <section className="card mt-6 p-5">
        <h2 className="font-serif text-lg font-semibold">Bid information</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{detailRows.map(([label, content]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><div className="mt-1 text-sm font-medium text-slate-700">{content}</div></div>)}</div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Related outreach</h2><div className="mt-3 space-y-3">{relatedOutreach.length ? relatedOutreach.map((log) => <div key={log.id} className="rounded-lg bg-slate-50 p-3 text-sm"><Badge>{log.type}</Badge><p className="mt-2 font-semibold">{log.result || "Logged activity"}</p><p className="text-xs text-slate-400">{log.date}</p></div>) : <p className="text-sm text-slate-400">Not added yet</p>}</div></section>
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Related follow-ups</h2><div className="mt-3 space-y-3">{relatedFollowUps.length ? relatedFollowUps.map((followUp) => <div key={followUp.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">{followUp.task}</p><p className="text-xs text-slate-400">{followUp.due || "Not added yet"} · {followUp.status}</p></div>) : <p className="text-sm text-slate-400">Not added yet</p>}</div></section>
      </div>
    </>
  );
}
