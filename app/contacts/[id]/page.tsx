"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { contactTypes, useFabLeadStore } from "@/lib/local-store";
import { Contact } from "@/lib/types";

function value(text?: string | number) {
  return text || text === 0 ? String(text) : "Not added yet";
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addFollowUp, addOutreachLog, archiveContact, bids, companies, contacts, followUps, outreachLogs, updateContact } = useFabLeadStore();
  const foundContact = contacts.find((item) => item.contact_id === id);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  if (!foundContact) return <div className="card p-8"><p className="font-semibold">Contact not found.</p><Link href="/contacts" className="mt-3 inline-block text-sm font-bold text-brand">Back to Contacts</Link></div>;

  const activeContact = foundContact;
  const company = companies.find((item) => item.company_id === activeContact.company_id);
  const name = `${activeContact.first_name} ${activeContact.last_name}`.trim() || activeContact.email || "Unnamed contact";
  const relatedOutreach = outreachLogs.filter((log) => log.contact_id === activeContact.contact_id || (company && log.company_id === company.company_id && log.contact === name));
  const relatedFollowUps = followUps.filter((followUp) => followUp.contact_id === activeContact.contact_id || (company && followUp.company_id === company.company_id && followUp.contact === name));
  const relatedBids = bids.filter((bid) => bid.contact_id === activeContact.contact_id || (company && bid.company_id === company.company_id && bid.contact === name));

  function contactFromForm(form: FormData): Contact {
    return {
      ...activeContact,
      company_id: String(form.get("company_id") || activeContact.company_id),
      first_name: String(form.get("first_name") || "").trim(),
      last_name: String(form.get("last_name") || "").trim(),
      title: String(form.get("title") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      linkedin_url: String(form.get("linkedin_url") || ""),
      contact_type: String(form.get("contact_type") || "unknown"),
      source: String(form.get("source") || ""),
      confidence_level: String(form.get("confidence_level") || "Medium"),
      notes: String(form.get("notes") || ""),
      decision_maker: form.get("decision_maker") === "on",
      next_follow_up_at: String(form.get("next_follow_up_at") || ""),
    };
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateContact(contactFromForm(new FormData(event.currentTarget)));
    setEditing(false);
    setMessage("Contact updated.");
  }

  function archive() {
    if (!window.confirm("Are you sure you want to delete this? This can be restored from Deleted Items.")) return;
    archiveContact(activeContact.contact_id);
    router.push("/contacts");
  }

  function addOutreach() {
    addOutreachLog({
      company: company?.company_name || "Unknown buyer",
      company_id: company?.company_id,
      contact: name,
      contact_id: activeContact.contact_id,
      type: "Note",
      date: new Date().toISOString().slice(0, 10),
      result: "Outreach note started from contact detail",
      notes: "",
      nextFollowUpDate: "",
    });
    setMessage("Outreach note added.");
  }

  function addContactFollowUp() {
    addFollowUp({
      company: company?.company_name || "Unknown buyer",
      company_id: company?.company_id,
      contact: name,
      contact_id: activeContact.contact_id,
      task: `Follow up with ${name}`,
      due: activeContact.next_follow_up_at || new Date().toISOString().slice(0, 10),
      priority: "Medium",
      status: "Open",
      task_type: "Contact follow-up",
      notes: activeContact.notes || "",
    });
    setMessage("Follow-up added.");
  }

  const detailRows = [
    ["Company", company ? <Link className="font-semibold text-brand hover:underline" href={`/companies/${company.company_id}`}>{company.company_name}</Link> : "Not added yet"],
    ["Role / contact type", activeContact.contact_type || "Not added yet"],
    ["Title", value(activeContact.title)],
    ["Email", activeContact.email ? <a className="font-semibold text-brand hover:underline" href={`mailto:${activeContact.email}`}>{activeContact.email}</a> : "Not added yet"],
    ["Phone", value(activeContact.phone)],
    ["LinkedIn", activeContact.linkedin_url ? <a className="font-semibold text-brand hover:underline" href={activeContact.linkedin_url} target="_blank" rel="noreferrer">Open profile <ExternalLink size={13} className="inline" /></a> : "Not added yet"],
    ["Confidence", value(activeContact.confidence_level)],
    ["Source", value(activeContact.source)],
    ["Next follow-up", value(activeContact.next_follow_up_at)],
    ["Notes", value(activeContact.notes)],
  ] as const;

  return (
    <>
      <Link href="/contacts" className="mb-5 flex items-center gap-2 text-xs font-semibold text-slate-500"><ArrowLeft size={14} />Back to contacts</Link>
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      <section className="card p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Contact detail</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{name}</h1>
            <div className="mt-3 flex flex-wrap gap-2"><Badge>{activeContact.contact_type || "unknown"}</Badge>{activeContact.decision_maker && <Badge tone="green">Decision maker</Badge>}</div>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <button onClick={() => setEditing((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">{editing ? "Close edit" : "Edit contact"}</button>
            <button onClick={addOutreach} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Add outreach</button>
            <button onClick={addContactFollowUp} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Add follow-up</button>
            <button onClick={archive} className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700">Delete/Archive</button>
          </div>
        </div>
      </section>

      {editing && (
        <form onSubmit={save} className="card mt-6 grid gap-3 p-5 md:grid-cols-2">
          <select name="company_id" className="field md:col-span-2" defaultValue={activeContact.company_id} required>{companies.map((item) => <option key={item.company_id} value={item.company_id}>{item.company_name}</option>)}</select>
          <input name="first_name" className="field" placeholder="First name / department" defaultValue={activeContact.first_name} required />
          <input name="last_name" className="field" placeholder="Last name / office" defaultValue={activeContact.last_name} />
          <input name="title" className="field" placeholder="Title / role" defaultValue={activeContact.title} />
          <select name="contact_type" className="field" defaultValue={activeContact.contact_type || "unknown"}>{contactTypes.map((item) => <option key={item}>{item}</option>)}</select>
          <input name="email" className="field" placeholder="Public email" type="email" defaultValue={activeContact.email} />
          <input name="phone" className="field" placeholder="Public phone" defaultValue={activeContact.phone} />
          <input name="linkedin_url" className="field" placeholder="LinkedIn URL" defaultValue={activeContact.linkedin_url} />
          <input name="source" className="field" placeholder="Source" defaultValue={activeContact.source} />
          <select name="confidence_level" className="field" defaultValue={activeContact.confidence_level || "Medium"}><option>High</option><option>Medium</option><option>Low</option></select>
          <input name="next_follow_up_at" className="field" type="date" defaultValue={activeContact.next_follow_up_at} />
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600"><input name="decision_maker" type="checkbox" defaultChecked={activeContact.decision_maker} /> Decision maker</label>
          <textarea name="notes" className="field md:col-span-2" placeholder="Notes" defaultValue={activeContact.notes} />
          <div className="flex gap-2 md:col-span-2"><Button>Save changes</Button><button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      )}

      <section className="card mt-6 p-5">
        <h2 className="font-serif text-lg font-semibold">Contact information</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{detailRows.map(([label, content]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><div className="mt-1 text-sm font-medium text-slate-700">{content}</div></div>)}</div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Related outreach</h2><div className="mt-3 space-y-3">{relatedOutreach.length ? relatedOutreach.map((log) => <div key={log.id} className="rounded-lg bg-slate-50 p-3 text-sm"><Badge>{log.type}</Badge><p className="mt-2 font-semibold">{log.result || "Logged activity"}</p><p className="text-xs text-slate-400">{log.date}</p></div>) : <p className="text-sm text-slate-400">Not added yet</p>}</div></section>
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Related follow-ups</h2><div className="mt-3 space-y-3">{relatedFollowUps.length ? relatedFollowUps.map((followUp) => <div key={followUp.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">{followUp.task}</p><p className="text-xs text-slate-400">{followUp.due || "Not added yet"} · {followUp.status}</p></div>) : <p className="text-sm text-slate-400">Not added yet</p>}</div></section>
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Related bids</h2><div className="mt-3 space-y-3">{relatedBids.length ? relatedBids.map((bid) => <Link key={bid.id} href={`/bids/${bid.id}`} className="block rounded-lg bg-slate-50 p-3 text-sm hover:bg-slate-100"><p className="font-semibold">{bid.project}</p><p className="text-xs text-slate-400">${bid.value.toLocaleString()} · {bid.status}</p></Link>) : <p className="text-sm text-slate-400">Not added yet</p>}</div></section>
      </div>
    </>
  );
}
