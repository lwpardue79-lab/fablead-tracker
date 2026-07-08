"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, ExternalLink, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { useFabLeadStore } from "@/lib/local-store";
import { Company } from "@/lib/types";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { contacts, deleteCompany, shopProfile, updateCompany, companies } = useFabLeadStore();
  const company = companies.find((item) => item.company_id === id);
  const [editing, setEditing] = useState(false);
  const people = contacts.filter((contact) => contact.company_id === id);

  if (!company) return <div className="card p-8"><p className="font-semibold">Buyer not found.</p><Link href="/companies" className="mt-3 inline-block text-sm font-bold text-brand">Back to Companies</Link></div>;

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
      estimating_email: String(form.get("estimating_email") || ""),
      prequalification_url: String(form.get("prequalification_url") || ""),
      bid_portal_url: String(form.get("bid_portal_url") || ""),
      specialization: String(form.get("specialization") || ""),
      lead_status: String(form.get("lead_status") || "New"),
      next_action: String(form.get("next_action") || ""),
      notes: String(form.get("notes") || ""),
    };
    updateCompany({ ...next, lead_score: calculateLeadScore(next, people.length > 0, shopProfile) });
    setEditing(false);
  }

  function remove() {
    if (!company) return;
    deleteCompany(company.company_id);
    router.push("/companies");
  }

  return (
    <>
      <Link href="/companies" className="mb-5 flex items-center gap-2 text-xs font-semibold text-slate-500"><ArrowLeft size={14} />Back to buyer directory</Link>
      <div className="card p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row">
          <div><div className="mb-3 flex items-center gap-3"><div className="grid size-12 place-items-center rounded-xl bg-moss/10 font-bold text-moss">{company.company_name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div><div><h1 className="font-serif text-3xl font-semibold">{company.company_name}</h1><p className="text-sm text-slate-400">{company.company_type} · {company.specialization}</p></div></div><div className="flex flex-wrap gap-4 text-sm text-slate-500"><span className="flex items-center gap-1.5"><MapPin size={14} />{company.city}, {company.state} · {company.distance_from_base_miles} mi</span>{company.public_phone && <span className="flex items-center gap-1.5"><Phone size={14} />{company.public_phone}</span>}</div></div>
          <div className="flex items-start gap-3"><div className="text-center"><div className="grid size-14 place-items-center rounded-full bg-ink text-xl font-bold text-white">{company.lead_score}</div><p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Fit score</p></div><button onClick={() => setEditing(!editing)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">{editing ? "Close edit" : "Edit buyer"}</button><button onClick={remove} className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700">Delete</button></div>
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="card mt-6 grid gap-3 p-5 md:grid-cols-2">
          <input name="company_name" className="field md:col-span-2" defaultValue={company.company_name} />
          <input name="company_type" className="field" defaultValue={company.company_type} />
          <input name="specialization" className="field" defaultValue={company.specialization} />
          <input name="city" className="field" defaultValue={company.city} />
          <input name="state" className="field" defaultValue={company.state} />
          <input name="website" className="field" defaultValue={company.website} placeholder="Website" />
          <input name="public_phone" className="field" defaultValue={company.public_phone} placeholder="Public phone" />
          <input name="estimating_email" className="field" defaultValue={company.estimating_email || company.public_email} placeholder="Estimating email" />
          <input name="prequalification_url" className="field" defaultValue={company.prequalification_url} placeholder="Prequalification link" />
          <input name="bid_portal_url" className="field" defaultValue={company.bid_portal_url} placeholder="Bid portal link" />
          <select name="lead_status" className="field" defaultValue={company.lead_status}><option>New</option><option>Contacted</option><option>Qualified</option><option>Registered</option><option>Bid Invite Received</option><option>Customer</option><option>Not Fit</option></select>
          <input name="next_action" className="field" defaultValue={company.next_action} placeholder="Next action" />
          <textarea name="notes" className="field md:col-span-2" rows={4} defaultValue={company.notes} />
          <button className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white md:col-span-2">Save changes</button>
        </form>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="card p-5"><h2 className="font-serif text-lg font-semibold">How to get on the bid list</h2><div className="mt-4 rounded-lg bg-emerald-50 p-4"><Badge tone="green">{company.invite_list_status || "Research needed"}</Badge><p className="mt-3 text-sm leading-relaxed text-slate-700">{company.notes}</p>{company.bid_portal_url && <a className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand" href={company.bid_portal_url} target="_blank" rel="noreferrer">Open bid portal <ExternalLink size={13} /></a>}</div></section>
        <aside className="card p-5"><h2 className="font-serif text-lg font-semibold">Contacts</h2><div className="mt-4 divide-y divide-slate-100">{people.length ? people.map((person) => <div key={person.contact_id} className="py-3"><p className="text-sm font-semibold">{person.first_name} {person.last_name}</p><p className="text-xs text-slate-400">{person.title}{person.phone ? ` · ${person.phone}` : ""}{person.email ? ` · ${person.email}` : ""}</p></div>) : <p className="py-5 text-sm text-slate-400">No contact yet. Add one on the Contacts page or import via CSV.</p>}</div></aside>
      </div>
    </>
  );
}
