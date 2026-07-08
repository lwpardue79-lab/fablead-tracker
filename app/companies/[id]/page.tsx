"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, ExternalLink, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { companyStatuses, contactTypes, useFabLeadStore } from "@/lib/local-store";
import { Company } from "@/lib/types";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addBid, addContact, addFollowUp, addOutreachLog, archiveCompany, bids, contacts, followUps, outreachLogs, shopProfile, updateCompany, companies } = useFabLeadStore();
  const company = companies.find((item) => item.company_id === id);
  const [editing, setEditing] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [message, setMessage] = useState("");
  const people = contacts.filter((contact) => contact.company_id === id);
  const companyBids = bids.filter((bid) => bid.company_id === id || bid.company === company?.company_name);
  const companyFollowUps = followUps.filter((followUp) => followUp.company_id === id || followUp.company === company?.company_name);
  const companyOutreach = outreachLogs.filter((log) => log.company_id === id || log.company === company?.company_name);

  if (!company) return <div className="card p-8"><p className="font-semibold">Buyer not found.</p><Link href="/companies" className="mt-3 inline-block text-sm font-bold text-brand">Back to Companies</Link></div>;
  const activeCompany = company;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company) return;
    const form = new FormData(event.currentTarget);
    const next: Company = {
      ...company,
      company_name: String(form.get("company_name") || company.company_name),
      company_type: String(form.get("company_type") || company.company_type),
      city: String(form.get("city") || ""),
      state: String(form.get("state") || ""),
      website: String(form.get("website") || ""),
      public_phone: String(form.get("public_phone") || ""),
      public_email: String(form.get("public_email") || ""),
      estimating_email: String(form.get("estimating_email") || ""),
      prequalification_url: String(form.get("prequalification_url") || ""),
      bid_portal_url: String(form.get("bid_portal_url") || ""),
      specialization: String(form.get("specialization") || ""),
      lead_status: String(form.get("lead_status") || "New"),
      next_action: String(form.get("next_action") || ""),
      next_action_due_date: String(form.get("next_action_due_date") || ""),
      next_action_owner: String(form.get("next_action_owner") || ""),
      next_action_priority: String(form.get("next_action_priority") || "Medium"),
      notes: String(form.get("notes") || ""),
    };
    updateCompany({ ...next, lead_score: calculateLeadScore(next, people.length > 0, shopProfile) });
    setEditing(false);
    setMessage("Company updated.");
  }

  function archive() {
    if (!window.confirm("Are you sure you want to delete this? This can be restored from Deleted Items.")) return;
    archiveCompany(activeCompany.company_id);
    setMessage("Deleted successfully.");
    router.push("/companies");
  }

  function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company) return;
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get("first_name") || "").trim();
    const lastName = String(form.get("last_name") || "").trim();
    const email = String(form.get("email") || "").trim();
    if (!firstName && !lastName && !email) {
      setMessage("Add at least a contact name or public email.");
      return;
    }
    addContact({
      company_id: company.company_id,
      first_name: firstName,
      last_name: lastName,
      title: String(form.get("title") || ""),
      email,
      phone: String(form.get("phone") || ""),
      linkedin_url: String(form.get("linkedin_url") || ""),
      contact_type: String(form.get("contact_type") || "unknown"),
      source: String(form.get("source") || "Company detail"),
      confidence_level: String(form.get("confidence_level") || "Medium"),
      notes: String(form.get("notes") || ""),
      decision_maker: form.get("decision_maker") === "on",
      next_follow_up_at: String(form.get("next_follow_up_at") || ""),
    });
    event.currentTarget.reset();
    setAddingContact(false);
    setMessage("Contact added.");
  }

  function quickFollowUp() {
    addFollowUp({ company: activeCompany.company_name, company_id: activeCompany.company_id, contact: "", task: activeCompany.next_action || "Follow up on bid-list request", due: activeCompany.next_action_due_date || new Date().toISOString().slice(0, 10), priority: activeCompany.next_action_priority || "Medium", status: "Open", task_type: "Next action", notes: activeCompany.notes || "" });
    setMessage("Follow-up added.");
  }

  function quickBid() {
    addBid({ company: activeCompany.company_name, company_id: activeCompany.company_id, project: "New opportunity to qualify", type: activeCompany.typical_scopes || "Miscellaneous metals", value: 0, due: "", status: "Found", probability: 25, location: `${activeCompany.city}, ${activeCompany.state}`, source_url: activeCompany.bid_portal_url || activeCompany.prequalification_url || "", notes: "Created from company detail." });
    setMessage("Bid opportunity added.");
  }

  function quickOutreach(type: "Call" | "Email") {
    addOutreachLog({ company: activeCompany.company_name, company_id: activeCompany.company_id, contact: "", type, date: new Date().toISOString().slice(0, 10), result: `${type} logged from company detail`, notes: "", nextFollowUpDate: "" });
    setMessage(`${type} logged.`);
  }

  return (
    <>
      <Link href="/companies" className="mb-5 flex items-center gap-2 text-xs font-semibold text-slate-500"><ArrowLeft size={14} />Back to buyer directory</Link>
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      <div className="card p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row">
          <div>
            <div className="mb-3 flex items-center gap-3"><div className="grid size-12 place-items-center rounded-xl bg-moss/10 font-bold text-moss">{company.company_name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div><div><h1 className="font-serif text-3xl font-semibold">{company.company_name}</h1><p className="text-sm text-slate-400">{company.company_type} · {company.specialization}</p></div></div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500"><span className="flex items-center gap-1.5"><MapPin size={14} />{company.city}, {company.state} · {company.distance_from_base_miles} mi</span>{company.public_phone && <span className="flex items-center gap-1.5"><Phone size={14} />{company.public_phone}</span>}</div>
            <div className="mt-4 flex flex-wrap gap-2"><Badge>{company.lead_status}</Badge>{company.next_action && <Badge tone={company.next_action_due_date && company.next_action_due_date < new Date().toISOString().slice(0, 10) ? "red" : "orange"}>{company.next_action} · {company.next_action_due_date || "no due date"}</Badge>}</div>
          </div>
          <div className="flex flex-wrap items-start gap-2"><div className="text-center"><div className="grid size-14 place-items-center rounded-full bg-ink text-xl font-bold text-white">{company.lead_score}</div><p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Fit score</p></div><button onClick={() => quickOutreach("Call")} className="rounded-lg border px-3 py-2 text-sm font-semibold">Log Call</button><button onClick={() => quickOutreach("Email")} className="rounded-lg border px-3 py-2 text-sm font-semibold">Log Email</button><button onClick={quickFollowUp} className="rounded-lg border px-3 py-2 text-sm font-semibold">Add Follow-Up</button><button onClick={quickBid} className="rounded-lg border px-3 py-2 text-sm font-semibold">Add Bid</button><button onClick={() => setEditing(!editing)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">{editing ? "Close edit" : "Edit"}</button><button onClick={archive} className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700">Delete/Archive</button></div>
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="card mt-6 grid gap-3 p-5 md:grid-cols-3">
          <input name="company_name" className="field md:col-span-2" defaultValue={company.company_name} />
          <select name="company_type" className="field" defaultValue={company.company_type}><option>GC</option><option>CM</option><option>EPC</option><option>Public agency</option><option>School district</option><option>Owner/developer</option><option>Industrial buyer</option><option>Other</option></select>
          <input name="specialization" className="field md:col-span-2" defaultValue={company.specialization} />
          <select name="lead_status" className="field" defaultValue={company.lead_status}>{companyStatuses.map((status) => <option key={status}>{status}</option>)}</select>
          <input name="city" className="field" defaultValue={company.city} />
          <input name="state" className="field" defaultValue={company.state} />
          <input name="website" className="field" defaultValue={company.website} placeholder="Website" />
          <input name="public_phone" className="field" defaultValue={company.public_phone} placeholder="Public phone" />
          <input name="public_email" className="field" defaultValue={company.public_email} placeholder="Public email" />
          <input name="estimating_email" className="field" defaultValue={company.estimating_email || company.public_email} placeholder="Estimating email" />
          <input name="prequalification_url" className="field" defaultValue={company.prequalification_url} placeholder="Prequalification link" />
          <input name="bid_portal_url" className="field" defaultValue={company.bid_portal_url} placeholder="Bid portal link" />
          <input name="next_action" className="field" defaultValue={company.next_action} placeholder="Next action" />
          <input name="next_action_due_date" className="field" type="date" defaultValue={company.next_action_due_date} />
          <input name="next_action_owner" className="field" defaultValue={company.next_action_owner} placeholder="Owner" />
          <select name="next_action_priority" className="field" defaultValue={company.next_action_priority || "Medium"}><option>High</option><option>Medium</option><option>Low</option></select>
          <textarea name="notes" className="field md:col-span-3" rows={4} defaultValue={company.notes} />
          <button className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white md:col-span-3">Save changes</button>
        </form>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Company information</h2><div className="mt-4 rounded-lg bg-emerald-50 p-4"><Badge tone="green">{company.invite_list_status || "Research needed"}</Badge><p className="mt-3 text-sm leading-relaxed text-slate-700">{company.notes || "No notes yet."}</p><div className="mt-3 flex flex-wrap gap-3 text-sm">{company.website && <a className="font-bold text-brand" href={company.website} target="_blank" rel="noreferrer">Website <ExternalLink size={13} className="inline" /></a>}{company.prequalification_url && <a className="font-bold text-brand" href={company.prequalification_url} target="_blank" rel="noreferrer">Prequal link <ExternalLink size={13} className="inline" /></a>}{company.bid_portal_url && <a className="font-bold text-brand" href={company.bid_portal_url} target="_blank" rel="noreferrer">Bid portal <ExternalLink size={13} className="inline" /></a>}</div></div></section>
        <aside className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold">Contacts</h2>
            <button onClick={() => setAddingContact((value) => !value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{addingContact ? "Close" : "+ Add contact"}</button>
          </div>
          {addingContact && (
            <form onSubmit={saveContact} className="mt-4 grid gap-2">
              <input name="first_name" className="field" placeholder="First name / department" />
              <input name="last_name" className="field" placeholder="Last name / office" />
              <input name="title" className="field" placeholder="Title / role" />
              <select name="contact_type" className="field" defaultValue="unknown">{contactTypes.map((item) => <option key={item}>{item}</option>)}</select>
              <input name="email" className="field" type="email" placeholder="Public email" />
              <input name="phone" className="field" placeholder="Public phone" />
              <input name="linkedin_url" className="field" placeholder="LinkedIn URL" />
              <input name="source" className="field" placeholder="Source" defaultValue="Company detail" />
              <select name="confidence_level" className="field" defaultValue="Medium"><option>High</option><option>Medium</option><option>Low</option></select>
              <input name="next_follow_up_at" className="field" type="date" />
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"><input name="decision_maker" type="checkbox" /> Decision maker</label>
              <textarea name="notes" className="field" placeholder="Notes" rows={3} />
              <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">Save contact</button>
            </form>
          )}
          <div className="mt-4 divide-y divide-slate-100">{people.length ? people.map((person) => <div key={person.contact_id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{person.first_name} {person.last_name}</p><p className="text-xs text-slate-400">{person.title}{person.phone ? ` · ${person.phone}` : ""}{person.email ? ` · ${person.email}` : ""}</p></div><Link href="/contacts" className="text-xs font-bold text-brand">Edit</Link></div></div>) : <p className="py-5 text-sm text-slate-400">No contact yet.</p>}</div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Outreach history</h2><div className="mt-3 space-y-3">{companyOutreach.length ? companyOutreach.map((log) => <div key={log.id} className="rounded-lg bg-slate-50 p-3 text-sm"><Badge>{log.type}</Badge><p className="mt-2 font-semibold">{log.result || "Logged activity"}</p><p className="text-xs text-slate-400">{log.date}</p></div>) : <p className="text-sm text-slate-400">No outreach yet.</p>}</div></section>
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Follow-ups</h2><div className="mt-3 space-y-3">{companyFollowUps.length ? companyFollowUps.map((followUp) => <div key={followUp.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">{followUp.task}</p><p className="text-xs text-slate-400">{followUp.due || "No due date"} · {followUp.priority}</p></div>) : <p className="text-sm text-slate-400">No follow-ups.</p>}</div></section>
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">Bid opportunities</h2><div className="mt-3 space-y-3">{companyBids.length ? companyBids.map((bid) => <div key={bid.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">{bid.project}</p><p className="text-xs text-slate-400">${bid.value.toLocaleString()} · {bid.status}</p></div>) : <p className="text-sm text-slate-400">No bids yet.</p>}</div></section>
      </div>
    </>
  );
}
