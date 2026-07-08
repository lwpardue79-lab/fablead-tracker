"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge, Button, PageHeader } from "@/components/ui";
import { contactTypes, useFabLeadStore } from "@/lib/local-store";
import { Contact } from "@/lib/types";

export default function Contacts() {
  const { addContact, archiveContact, companies, contacts, updateContact } = useFabLeadStore();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");

  const rows = useMemo(() => contacts.filter((contact) => {
    const company = companies.find((item) => item.company_id === contact.company_id)?.company_name || "";
    return `${contact.first_name} ${contact.last_name} ${contact.title} ${contact.email} ${contact.phone} ${company} ${contact.contact_type}`.toLowerCase().includes(query.toLowerCase());
  }), [companies, contacts, query]);

  function contactFromForm(form: FormData, existing?: Contact): Contact | Omit<Contact, "contact_id"> {
    return {
      ...(existing || {}),
      company_id: String(form.get("company_id") || existing?.company_id || companies[0]?.company_id || ""),
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

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contact = contactFromForm(new FormData(event.currentTarget));
    if (!contact.company_id || (!contact.first_name && !contact.last_name && !contact.email)) return;
    addContact(contact);
    event.currentTarget.reset();
    setShowForm(false);
    setMessage("Contact added.");
  }

  function saveEdit(event: FormEvent<HTMLFormElement>, contact: Contact) {
    event.preventDefault();
    updateContact(contactFromForm(new FormData(event.currentTarget), contact) as Contact);
    setEditingId("");
    setMessage("Contact updated.");
  }

  function archive(contact: Contact) {
    if (!window.confirm("Are you sure you want to delete this? This can be restored from Deleted Items.")) return;
    archiveContact(contact.contact_id);
    setMessage("Deleted successfully.");
  }

  const formFields = (contact?: Contact) => (
    <>
      <select name="company_id" className="field md:col-span-2" defaultValue={contact?.company_id} required>{companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}</select>
      <input name="first_name" className="field" placeholder="First name / department" defaultValue={contact?.first_name} required />
      <input name="last_name" className="field" placeholder="Last name / office" defaultValue={contact?.last_name} />
      <input name="title" className="field" placeholder="Title / role" defaultValue={contact?.title} />
      <select name="contact_type" className="field" defaultValue={contact?.contact_type || "unknown"}>{contactTypes.map((item) => <option key={item}>{item}</option>)}</select>
      <input name="email" className="field" placeholder="Public email" type="email" defaultValue={contact?.email} />
      <input name="phone" className="field" placeholder="Public phone" defaultValue={contact?.phone} />
      <input name="linkedin_url" className="field" placeholder="LinkedIn URL" defaultValue={contact?.linkedin_url} />
      <input name="source" className="field" placeholder="Source" defaultValue={contact?.source} />
      <select name="confidence_level" className="field" defaultValue={contact?.confidence_level || "Medium"}><option>High</option><option>Medium</option><option>Low</option></select>
      <input name="next_follow_up_at" className="field" type="date" defaultValue={contact?.next_follow_up_at} />
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600"><input name="decision_maker" type="checkbox" defaultChecked={contact?.decision_maker} /> Decision maker</label>
      <textarea name="notes" className="field md:col-span-2" placeholder="Notes" defaultValue={contact?.notes} />
    </>
  );

  return (
    <>
      <PageHeader eyebrow="Public business contacts" title="Contacts" description="Estimating, procurement, prequalification, PM, and office contacts." action={<button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Add contact</button>} />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {showForm && (
        <form onSubmit={submitContact} className="card mb-5 grid gap-3 p-5 md:grid-cols-2">
          {formFields()}
          <div className="flex gap-2 md:col-span-2"><Button>Save contact</Button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      )}
      <div className="card mb-4 p-3"><input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, title, email, phone, or contact type..." /></div>
      <div className="table-shell overflow-x-auto"><table><thead><tr><th>Name</th><th>Company</th><th>Role</th><th>Email / phone</th><th>Confidence</th><th>Next follow-up</th><th>Actions</th></tr></thead><tbody>{rows.map((contact) => <tr key={contact.contact_id}><td className="font-semibold text-ink">{contact.first_name} {contact.last_name}<p className="text-xs text-slate-400">{contact.title}</p></td><td>{companies.find((company) => company.company_id === contact.company_id)?.company_name}</td><td><Badge>{contact.contact_type || "unknown"}</Badge>{contact.decision_maker && <span className="ml-1"><Badge tone="green">Decision maker</Badge></span>}</td><td>{contact.email ? <a className="text-brand" href={`mailto:${contact.email}`}>{contact.email}</a> : "—"}<p className="text-xs text-slate-400">{contact.phone}</p></td><td>{contact.confidence_level || "Medium"}</td><td>{contact.next_follow_up_at || "—"}</td><td><div className="flex gap-2"><button onClick={() => setEditingId(editingId === contact.contact_id ? "" : contact.contact_id)} className="rounded-md border px-2 py-1 text-xs font-semibold">Edit</button><button onClick={() => archive(contact)} className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Delete</button></div></td></tr>)}</tbody></table></div>
      {editingId && contacts.filter((contact) => contact.contact_id === editingId).map((contact) => (
        <form key={contact.contact_id} onSubmit={(event) => saveEdit(event, contact)} className="card mt-5 grid gap-3 p-5 md:grid-cols-2">
          <h2 className="font-serif text-xl font-semibold md:col-span-2">Edit contact</h2>
          {formFields(contact)}
          <div className="flex gap-2 md:col-span-2"><Button>Save changes</Button><button type="button" onClick={() => setEditingId("")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      ))}
    </>
  );
}
