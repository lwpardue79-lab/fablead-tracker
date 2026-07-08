"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge, Button, PageHeader } from "@/components/ui";
import { useFabLeadStore } from "@/lib/local-store";

export default function Contacts() {
  const { companies, contacts, addContact } = useFabLeadStore();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const rows = useMemo(() => contacts.filter((contact) => {
    const company = companies.find((item) => item.company_id === contact.company_id)?.company_name || "";
    return `${contact.first_name} ${contact.last_name} ${contact.title} ${contact.email} ${contact.phone} ${company}`.toLowerCase().includes(query.toLowerCase());
  }), [companies, contacts, query]);

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const companyId = String(form.get("company_id") || companies[0]?.company_id || "");
    const firstName = String(form.get("first_name") || "").trim();
    const lastName = String(form.get("last_name") || "").trim();
    if (!companyId || (!firstName && !lastName)) return;
    addContact({
      company_id: companyId,
      first_name: firstName,
      last_name: lastName,
      title: String(form.get("title") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      decision_maker: form.get("decision_maker") === "on",
      next_follow_up_at: String(form.get("next_follow_up_at") || ""),
    });
    event.currentTarget.reset();
    setShowForm(false);
    setMessage(`${firstName} ${lastName}`.trim() + " added.");
  }

  return (
    <>
      <PageHeader eyebrow="Public business contacts" title="Contacts" description="Organization-level and publicly listed estimating contacts only." action={<button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Add contact</button>} />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {showForm && (
        <form onSubmit={submitContact} className="card mb-5 grid gap-3 p-5 md:grid-cols-2">
          <select name="company_id" className="field md:col-span-2" required>{companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}</select>
          <input name="first_name" className="field" placeholder="First name / department" required />
          <input name="last_name" className="field" placeholder="Last name / office" />
          <input name="title" className="field" placeholder="Title" />
          <input name="email" className="field" placeholder="Public email" type="email" />
          <input name="phone" className="field" placeholder="Public phone" />
          <input name="next_follow_up_at" className="field" type="date" />
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600"><input name="decision_maker" type="checkbox" /> Decision maker</label>
          <div className="flex gap-2 md:col-span-2"><Button>Save contact</Button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      )}
      <div className="card mb-4 p-3"><input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, title, email, or phone..." /></div>
      <div className="table-shell overflow-x-auto"><table><thead><tr><th>Name</th><th>Company</th><th>Title</th><th>Email</th><th>Phone</th><th>Role</th><th>Next follow-up</th></tr></thead><tbody>{rows.map((contact) => <tr key={contact.contact_id}><td className="font-semibold text-ink">{contact.first_name} {contact.last_name}</td><td>{companies.find((company) => company.company_id === contact.company_id)?.company_name}</td><td>{contact.title}</td><td>{contact.email ? <a className="text-brand" href={`mailto:${contact.email}`}>{contact.email}</a> : "—"}</td><td>{contact.phone}</td><td>{contact.decision_maker ? <Badge tone="green">Decision maker</Badge> : <Badge>Public office</Badge>}</td><td>{contact.next_follow_up_at || "—"}</td></tr>)}</tbody></table></div>
    </>
  );
}
