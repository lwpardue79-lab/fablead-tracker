"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { Badge, Button, PageHeader } from "@/components/ui";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { useFabLeadStore } from "@/lib/local-store";
import { Company } from "@/lib/types";

export default function CompaniesPage() {
  const { companies, addCompany } = useFabLeadStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const rows = useMemo(() => companies.filter((company) =>
    (company.company_name + company.city + company.specialization + company.company_type)
      .toLowerCase()
      .includes(q.toLowerCase()) &&
    (status === "All" || company.lead_status === status)
  ), [companies, q, status]);

  function exportCsv() {
    const cols = ["company_name", "company_type", "city", "state", "specialization", "invite_list_status", "lead_status", "lead_score", "website", "prequalification_url", "bid_portal_url"];
    const data = [cols.join(","), ...rows.map((company) => cols.map((key) => `"${String(company[key as keyof typeof company] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
    link.download = "fablead-buyers.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function submitBuyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const companyName = String(form.get("company_name") || "").trim();
    if (!companyName) return;
    const company: Omit<Company, "company_id"> = {
      company_name: companyName,
      company_type: String(form.get("company_type") || "Buyer"),
      city: String(form.get("city") || "Kansas City"),
      state: String(form.get("state") || "MO"),
      specialization: String(form.get("specialization") || "Commercial Construction"),
      lead_status: String(form.get("lead_status") || "New"),
      lead_score: 0,
      distance_from_base_miles: Number(form.get("distance_from_base_miles") || 0),
      public_phone: String(form.get("public_phone") || ""),
      website: String(form.get("website") || ""),
      prequalification_url: String(form.get("prequalification_url") || ""),
      bid_portal_url: String(form.get("bid_portal_url") || ""),
      invite_list_status: String(form.get("invite_list_status") || "Research needed"),
      typical_scopes: String(form.get("typical_scopes") || ""),
      data_verified_at: new Date().toISOString().slice(0, 10),
      notes: String(form.get("notes") || ""),
    };
    addCompany({ ...company, lead_score: calculateLeadScore(company) });
    event.currentTarget.reset();
    setShowForm(false);
    setMessage(`${companyName} added to the buyer directory.`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Buyer directory"
        title="Companies that can buy your work"
        description="Search and manage public buyer pathways, bid-list targets, agencies, contractors, and procurement systems."
        action={<div className="flex gap-2"><span onClick={exportCsv}><Button variant="secondary"><span className="flex items-center gap-2"><Download size={15} />Export</span></Button></span><button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Add buyer</button></div>}
      />

      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}

      {showForm && (
        <form onSubmit={submitBuyer} className="card mb-5 grid gap-3 p-5 md:grid-cols-3">
          <input name="company_name" className="field md:col-span-2" placeholder="Buyer / company name *" required />
          <input name="company_type" className="field" placeholder="Buyer type" defaultValue="General Contractor" />
          <input name="city" className="field" placeholder="City" defaultValue="Kansas City" />
          <input name="state" className="field" placeholder="State" defaultValue="MO" />
          <input name="distance_from_base_miles" className="field" placeholder="Distance from base" type="number" defaultValue="0" />
          <input name="specialization" className="field md:col-span-2" placeholder="Project market" defaultValue="Commercial Construction" />
          <select name="lead_status" className="field"><option>New</option><option>Contacted</option><option>Qualified</option><option>Customer</option><option>Lost</option></select>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">Fit score auto-calculates</div>
          <input name="public_phone" className="field" placeholder="Public phone" />
          <input name="website" className="field" placeholder="Website" />
          <input name="prequalification_url" className="field" placeholder="Prequalification URL" />
          <input name="bid_portal_url" className="field" placeholder="Bid portal URL" />
          <input name="invite_list_status" className="field" placeholder="Bid-list pathway" defaultValue="Research needed" />
          <input name="typical_scopes" className="field md:col-span-3" placeholder="Likely fabrication scopes" />
          <textarea name="notes" className="field md:col-span-3" placeholder="Notes / how to get invited" rows={3} />
          <div className="flex gap-2 md:col-span-3"><Button>Save buyer</Button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      )}

      <div className="card mb-4 flex flex-col gap-3 p-3 md:flex-row">
        <label className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input className="field pl-9" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search buyer, city, or project market..." /></label>
        <select className="field md:w-44" value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>New</option><option>Contacted</option><option>Qualified</option><option>Customer</option></select>
        <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600"><SlidersHorizontal size={15} />More filters</button>
      </div>
      <div className="table-shell overflow-x-auto"><table><thead><tr><th>Buyer</th><th>Location</th><th>Type</th><th>Project market</th><th>Bid-list pathway</th><th>Status</th><th className="text-right">Fit</th></tr></thead><tbody>{rows.map((company) => <tr key={company.company_id} className="hover:bg-slate-50"><td><Link href={`/companies/${company.company_id}`} className="font-semibold text-ink hover:text-brand">{company.company_name}</Link></td><td>{company.city}, {company.state}</td><td>{company.company_type}</td><td>{company.specialization}</td><td>{company.invite_list_status || "Research needed"}</td><td><Badge tone={company.lead_status === "Qualified" ? "green" : company.lead_status === "New" ? "orange" : company.lead_status === "Customer" ? "blue" : "slate"}>{company.lead_status}</Badge></td><td className="text-right"><span className="inline-grid size-9 place-items-center rounded-full bg-ink text-xs font-bold text-white">{company.lead_score}</span></td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-slate-400">Showing {rows.length} of {companies.length} buyer records</p>
    </>
  );
}
