"use client";

import { FormEvent, useState } from "react";
import { Badge, PageHeader } from "@/components/ui";
import { useFabLeadStore } from "@/lib/local-store";
import { OutreachLog } from "@/lib/types";

export default function Outreach() {
  const { addOutreachLog, companies, contacts, outreachLogs } = useFabLeadStore();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const company = String(form.get("company") || "");
    const type = String(form.get("type") || "Call") as OutreachLog["type"];
    const log = addOutreachLog({
      company,
      contact: String(form.get("contact") || "No contact selected"),
      type,
      date: String(form.get("date") || new Date().toISOString().slice(0, 10)),
      result: String(form.get("result") || ""),
      notes: String(form.get("notes") || ""),
      nextFollowUpDate: String(form.get("nextFollowUpDate") || ""),
    });
    event.currentTarget.reset();
    setOpen(false);
    setMessage(`${log.type} logged. ${log.nextFollowUpDate ? "Follow-up created automatically." : ""}`);
  }

  return (
    <>
      <PageHeader eyebrow="Activity" title="Outreach" description="Log calls, emails, meetings, portal registrations, notes, and automatic follow-ups." action={<button onClick={() => setOpen(!open)} className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white">+ Log outreach</button>} />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {open && (
        <form onSubmit={submit} className="card mb-5 grid gap-3 p-5 md:grid-cols-2">
          <select name="company" className="field">{companies.map((company) => <option key={company.company_id}>{company.company_name}</option>)}</select>
          <select name="type" className="field"><option>Call</option><option>Email</option><option>Meeting</option><option>Portal Registration</option><option>Note</option></select>
          <select name="contact" className="field"><option>No contact selected</option>{contacts.map((contact) => <option key={contact.contact_id}>{contact.first_name} {contact.last_name}</option>)}</select>
          <input name="date" className="field" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <input name="result" className="field md:col-span-2" placeholder="Result, e.g. Requested prequal link / Left voicemail / Registered in portal" />
          <textarea name="notes" className="field md:col-span-2" placeholder="What happened?" rows={3} />
          <label className="text-xs font-semibold text-slate-600">Next follow-up date<input name="nextFollowUpDate" className="field mt-1.5" type="date" /></label>
          <div className="md:col-span-2"><button className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white">Save activity</button></div>
        </form>
      )}
      <div className="card divide-y divide-slate-100">
        {outreachLogs.map((log) => <div key={log.id} className="grid gap-3 p-5 md:grid-cols-[110px_140px_1fr_auto]"><p className="text-xs font-semibold text-slate-400">{log.date}</p><Badge tone={log.type === "Call" ? "green" : log.type === "Email" ? "blue" : log.type === "Portal Registration" ? "orange" : "slate"}>{log.type}</Badge><div><p className="text-sm font-semibold">{log.company}</p><p className="mt-1 text-sm text-slate-500">{log.result || log.notes}</p></div><span className="text-xs text-slate-400">{log.nextFollowUpDate ? `Follow up ${log.nextFollowUpDate}` : "Logged"}</span></div>)}
        {!outreachLogs.length && <div className="p-10 text-center text-sm text-slate-500">No outreach logged yet. Start with a bid-list request or portal registration.</div>}
      </div>
    </>
  );
}
