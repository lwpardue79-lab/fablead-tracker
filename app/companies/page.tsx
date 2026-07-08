"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { Download, Search } from "lucide-react";
import { Badge, Button, PageHeader } from "@/components/ui";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { companyStatuses, useFabLeadStore } from "@/lib/local-store";
import { Company } from "@/lib/types";

const priorities = ["High", "Medium", "Low"];

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function isOverdue(date?: string) {
  return Boolean(date && date < new Date().toISOString().slice(0, 10));
}

export default function CompaniesPage() {
  const { addBid, addCompany, addCompanyStatusHistory, addFollowUp, addOutreachLog, archiveCompany, companies, contacts, updateCompany, workspaceSettings } = useFabLeadStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [cityState, setCityState] = useState("");
  const [fit, setFit] = useState("All");
  const [missing, setMissing] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [undo, setUndo] = useState<{ company: Company; previousStatus: string; text: string } | null>(null);
  const [pendingUnregister, setPendingUnregister] = useState<Company | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const companyTypes = useMemo(() => ["All", ...Array.from(new Set(companies.map((company) => company.company_type).filter(Boolean))).sort()], [companies]);

  function missingReasons(company: Company) {
    const hasContact = contacts.some((contact) => contact.company_id === company.company_id);
    return [
      !hasContact && "no contact",
      !company.public_email && !company.estimating_email && !company.public_phone && "no email/phone",
      !company.prequalification_url && !company.bid_portal_url && "no bid-list link",
      !company.next_action && "no next action",
    ].filter(Boolean) as string[];
  }

  const rows = useMemo(() => companies.filter((company) => {
    const haystack = `${company.company_name} ${company.city} ${company.state} ${company.specialization} ${company.company_type}`.toLowerCase();
    const reasons = missingReasons(company);
    const scoreOk = fit === "All" || (fit === "80+" && company.lead_score >= 80) || (fit === "60-79" && company.lead_score >= 60 && company.lead_score < 80) || (fit === "<60" && company.lead_score < 60);
    const missingOk = missing === "All" ||
      (missing === "Missing contact" && reasons.includes("no contact")) ||
      (missing === "Missing contact info" && reasons.includes("no email/phone")) ||
      (missing === "Missing bid-list link" && reasons.includes("no bid-list link")) ||
      (missing === "Missing next action" && reasons.includes("no next action")) ||
      (missing === "Overdue next action" && isOverdue(company.next_action_due_date));
    return haystack.includes(q.toLowerCase()) &&
      (status === "All" || company.lead_status === status) &&
      (type === "All" || company.company_type === type) &&
      (!cityState || `${company.city} ${company.state}`.toLowerCase().includes(cityState.toLowerCase())) &&
      scoreOk &&
      missingOk;
  }), [companies, contacts, q, status, type, cityState, fit, missing]);

  function exportCsv() {
    const cols: (keyof Company)[] = ["company_name", "company_type", "city", "state", "specialization", "invite_list_status", "lead_status", "lead_score", "next_action", "next_action_due_date", "next_action_owner", "website", "prequalification_url", "bid_portal_url"];
    const data = [cols.join(","), ...rows.map((company) => cols.map((key) => csvCell(company[key])).join(","))].join("\n");
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
      company_type: String(form.get("company_type") || "GC"),
      city: String(form.get("city") || "Kansas City"),
      state: String(form.get("state") || "MO"),
      specialization: String(form.get("specialization") || "Commercial Construction"),
      lead_status: String(form.get("lead_status") || "New"),
      lead_score: 0,
      distance_from_base_miles: Number(form.get("distance_from_base_miles") || 0),
      public_phone: String(form.get("public_phone") || ""),
      estimating_email: String(form.get("estimating_email") || ""),
      website: String(form.get("website") || ""),
      prequalification_url: String(form.get("prequalification_url") || ""),
      bid_portal_url: String(form.get("bid_portal_url") || ""),
      invite_list_status: String(form.get("invite_list_status") || "Research needed"),
      typical_scopes: String(form.get("typical_scopes") || ""),
      next_action: String(form.get("next_action") || "Request bid-list path"),
      next_action_due_date: String(form.get("next_action_due_date") || ""),
      next_action_owner: String(form.get("next_action_owner") || "Luke"),
      next_action_priority: String(form.get("next_action_priority") || "Medium"),
      data_verified_at: new Date().toISOString().slice(0, 10),
      notes: String(form.get("notes") || ""),
    };
    addCompany({ ...company, lead_score: calculateLeadScore(company) });
    event.currentTarget.reset();
    setShowForm(false);
    setMessage(`${companyName} added.`);
  }

  function logQuick(company: Company, type: "Call" | "Email") {
    addOutreachLog({ company: company.company_name, company_id: company.company_id, contact: "", type, date: new Date().toISOString().slice(0, 10), result: `${type} logged from Companies page`, notes: "", nextFollowUpDate: "" });
    setMessage(`${type} logged for ${company.company_name}.`);
  }

  function showUndoToast(company: Company, previousStatus: string, text: string) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setMessage(text);
    setUndo({ company, previousStatus, text });
    undoTimer.current = setTimeout(() => setUndo(null), 7000);
  }

  function changeStatus(company: Company, nextStatus: string, options: { confirmUnregister?: boolean; registeredDefaults?: boolean } = {}) {
    const oldStatus = company.lead_status || "New";
    if (oldStatus === nextStatus) return;
    if (options.confirmUnregister && oldStatus === "Registered" && nextStatus !== "Registered") {
      const confirmed = window.confirm("Mark this company as not registered? This will change the status but keep all outreach history.");
      if (!confirmed) return;
    }
    const nextCompany = {
      ...company,
      lead_status: nextStatus,
      invite_list_status: options.registeredDefaults ? "Registered / prequalification started" : company.invite_list_status,
      next_action: options.registeredDefaults ? "Watch for bid invites or follow up with estimating" : company.next_action,
      next_action_due_date: company.next_action_due_date || "",
    };
    updateCompany(nextCompany);
    addCompanyStatusHistory(company, oldStatus, nextStatus, workspaceSettings.userName);
    showUndoToast(nextCompany, oldStatus, nextStatus === "Registered" ? "Company marked as Registered." : `Company status changed to ${nextStatus}.`);
  }

  function undoStatusChange() {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    updateCompany({ ...undo.company, lead_status: undo.previousStatus });
    addCompanyStatusHistory(undo.company, undo.company.lead_status, undo.previousStatus, workspaceSettings.userName);
    setMessage(`Status restored to ${undo.previousStatus}.`);
    setUndo(null);
  }

  function markRegistered(company: Company) {
    changeStatus(company, "Registered", { registeredDefaults: true });
  }

  function markNotRegistered(company: Company) {
    setPendingUnregister(company);
  }

  function confirmMarkNotRegistered() {
    if (!pendingUnregister) return;
    changeStatus(pendingUnregister, "Contacted");
    setPendingUnregister(null);
  }

  function addQuickFollowUp(company: Company) {
    addFollowUp({ company: company.company_name, company_id: company.company_id, contact: "", task: company.next_action || "Follow up on bid-list request", due: company.next_action_due_date || new Date().toISOString().slice(0, 10), priority: company.next_action_priority || "Medium", status: "Open", task_type: "Next action", notes: company.notes || "" });
    setMessage(`Follow-up added for ${company.company_name}.`);
  }

  function addQuickBid(company: Company) {
    addBid({ company: company.company_name, company_id: company.company_id, project: "New opportunity to qualify", type: company.typical_scopes || "Miscellaneous metals", value: 0, due: "", status: "Found", probability: 25, location: `${company.city}, ${company.state}`, source_url: company.bid_portal_url || company.prequalification_url || "", notes: "Created from company quick action." });
    setMessage(`Bid opportunity started for ${company.company_name}.`);
  }

  function archive(company: Company) {
    if (!window.confirm("Are you sure you want to delete this? This can be restored from Deleted Items.")) return;
    archiveCompany(company.company_id);
    setMessage("Deleted successfully.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Buyer directory"
        title="Companies that can buy your work"
        description="Manage bid-list targets, missing info, next actions, and buyer status."
        action={<div className="flex flex-wrap gap-2"><span onClick={exportCsv}><Button variant="secondary"><span className="flex items-center gap-2"><Download size={15} />Export</span></Button></span><button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Add buyer</button></div>}
      />

      {pendingUnregister && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="font-serif text-xl font-semibold text-ink">Mark Not Registered?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Mark this company as not registered? This will change the status but keep all outreach history.</p>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">{pendingUnregister.company_name}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setPendingUnregister(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmMarkNotRegistered} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Mark Not Registered</button>
            </div>
          </div>
        </div>
      )}

      {message && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><span>{message}</span>{undo && <button onClick={undoStatusChange} className="rounded-md border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100">Undo</button>}</div>}

      {showForm && (
        <form onSubmit={submitBuyer} className="card mb-5 grid gap-3 p-5 md:grid-cols-3">
          <input name="company_name" className="field md:col-span-2" placeholder="Buyer / company name *" required />
          <select name="company_type" className="field"><option>GC</option><option>CM</option><option>EPC</option><option>Public agency</option><option>School district</option><option>Owner/developer</option><option>Industrial buyer</option><option>Other</option></select>
          <input name="city" className="field" placeholder="City" defaultValue="Kansas City" />
          <input name="state" className="field" placeholder="State" defaultValue="MO" />
          <input name="distance_from_base_miles" className="field" placeholder="Distance" type="number" defaultValue="0" />
          <input name="specialization" className="field md:col-span-2" placeholder="Project markets" defaultValue="Commercial Construction" />
          <select name="lead_status" className="field">{companyStatuses.map((item) => <option key={item}>{item}</option>)}</select>
          <input name="public_phone" className="field" placeholder="Public phone" />
          <input name="estimating_email" className="field" placeholder="Estimating email" />
          <input name="website" className="field" placeholder="Website" />
          <input name="prequalification_url" className="field" placeholder="Prequalification URL" />
          <input name="bid_portal_url" className="field" placeholder="Bid portal URL" />
          <input name="invite_list_status" className="field" placeholder="Bid-list pathway" defaultValue="Research needed" />
          <input name="typical_scopes" className="field md:col-span-3" placeholder="Likely fabrication scopes" />
          <input name="next_action" className="field" placeholder="Next action" defaultValue="Request bid-list path" />
          <input name="next_action_due_date" className="field" type="date" />
          <select name="next_action_priority" className="field">{priorities.map((item) => <option key={item}>{item}</option>)}</select>
          <input name="next_action_owner" className="field" placeholder="Owner" defaultValue="Luke" />
          <textarea name="notes" className="field md:col-span-3" placeholder="Notes / how to get invited" rows={3} />
          <div className="flex gap-2 md:col-span-3"><Button>Save buyer</Button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      )}

      <div className="card mb-4 grid gap-3 p-3 md:grid-cols-6">
        <label className="relative md:col-span-2"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input className="field pl-9" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search buyer, city, market..." /></label>
        <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option>{companyStatuses.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="field" value={fit} onChange={(event) => setFit(event.target.value)}><option>All</option><option>80+</option><option>60-79</option><option>{"<60"}</option></select>
        <select className="field" value={type} onChange={(event) => setType(event.target.value)}>{companyTypes.map((item) => <option key={item}>{item}</option>)}</select>
        <input className="field" value={cityState} onChange={(event) => setCityState(event.target.value)} placeholder="City/state" />
        <select className="field md:col-span-2" value={missing} onChange={(event) => setMissing(event.target.value)}><option>All</option><option>Missing contact</option><option>Missing contact info</option><option>Missing bid-list link</option><option>Missing next action</option><option>Overdue next action</option></select>
      </div>

      <div className="table-shell overflow-x-auto">
        <table>
          <thead><tr><th>Buyer</th><th>Next action</th><th>Missing info</th><th>Status</th><th>Fit</th><th>Quick actions</th></tr></thead>
          <tbody>{rows.map((company) => {
            const reasons = missingReasons(company);
            const overdue = isOverdue(company.next_action_due_date);
            return <tr key={company.company_id} className={overdue ? "bg-red-50/60" : "hover:bg-slate-50"}>
              <td><Link href={`/companies/${company.company_id}`} className="font-semibold text-ink hover:text-brand">{company.company_name}</Link><p className="mt-1 text-xs text-slate-400">{company.city}, {company.state} · {company.company_type}</p></td>
              <td><p className="text-sm font-semibold">{company.next_action || "No next action"}</p><p className={`mt-1 text-xs ${overdue ? "font-bold text-red-600" : "text-slate-400"}`}>{company.next_action_due_date || "No due date"} · {company.next_action_owner || "Unassigned"} · {company.next_action_priority || "Medium"}</p></td>
              <td>{reasons.length ? <div className="flex flex-wrap gap-1">{reasons.map((reason) => <Badge key={reason} tone="orange">{reason}</Badge>)}</div> : <Badge tone="green">Complete enough</Badge>}</td>
              <td><div className="space-y-2"><select aria-label={`Status for ${company.company_name}`} className="field min-w-40 py-1.5 text-xs font-semibold" value={company.lead_status || "New"} onChange={(event) => changeStatus(company, event.target.value, { confirmUnregister: true })}>{companyStatuses.map((item) => <option key={item}>{item}</option>)}</select>{company.lead_status === "Registered" && <button onClick={() => markNotRegistered(company)} className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-100">Mark Not Registered</button>}</div></td>
              <td><span className="inline-grid size-9 place-items-center rounded-full bg-ink text-xs font-bold text-white">{company.lead_score}</span></td>
              <td><div className="flex flex-wrap gap-1.5 text-xs">
                <button onClick={() => logQuick(company, "Call")} className="rounded-md border px-2 py-1 font-semibold">Log Call</button>
                <button onClick={() => logQuick(company, "Email")} className="rounded-md border px-2 py-1 font-semibold">Log Email</button>
                {company.lead_status === "Registered" ? <button onClick={() => markNotRegistered(company)} className="rounded-md border border-orange-200 px-2 py-1 font-semibold text-orange-800">Mark Not Registered</button> : <button onClick={() => markRegistered(company)} className="rounded-md border px-2 py-1 font-semibold">Mark Registered</button>}
                <button onClick={() => addQuickFollowUp(company)} className="rounded-md border px-2 py-1 font-semibold">Follow-Up</button>
                <button onClick={() => addQuickBid(company)} className="rounded-md border px-2 py-1 font-semibold">Add Bid</button>
                <Link href={`/companies/${company.company_id}`} className="rounded-md border px-2 py-1 font-semibold">Edit</Link>
                <button onClick={() => archive(company)} className="rounded-md border border-red-200 px-2 py-1 font-semibold text-red-700">Delete</button>
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">Showing {rows.length} of {companies.length} active buyer records</p>
    </>
  );
}
