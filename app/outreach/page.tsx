"use client";

import { FormEvent, useState } from "react";
import { Badge, PageHeader } from "@/components/ui";
import { outreachTypes, useFabLeadStore } from "@/lib/local-store";
import { OutreachLog } from "@/lib/types";

export default function Outreach() {
  const { addOutreachLog, archiveOutreachLog, companies, contacts, outreachLogs, updateOutreachLog } = useFabLeadStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");

  function logFromForm(form: FormData, existing?: OutreachLog): OutreachLog | Omit<OutreachLog, "id"> {
    const companyId = String(form.get("company_id") || existing?.company_id || companies[0]?.company_id || "");
    const company = companies.find((item) => item.company_id === companyId);
    const contactId = String(form.get("contact_id") || "");
    const contact = contacts.find((item) => item.contact_id === contactId);
    return {
      ...(existing || {}),
      company_id: companyId,
      company: company?.company_name || existing?.company || "",
      contact_id: contactId,
      contact: contact ? `${contact.first_name} ${contact.last_name}`.trim() : "No contact selected",
      type: String(form.get("type") || "Call") as OutreachLog["type"],
      date: String(form.get("date") || new Date().toISOString().slice(0, 10)),
      result: String(form.get("result") || ""),
      notes: String(form.get("notes") || ""),
      nextFollowUpDate: String(form.get("nextFollowUpDate") || ""),
    };
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const log = addOutreachLog(logFromForm(new FormData(event.currentTarget)));
    event.currentTarget.reset();
    setOpen(false);
    setMessage(`${log.type} logged. ${log.nextFollowUpDate ? "Follow-up created automatically." : ""}`);
  }

  function saveEdit(event: FormEvent<HTMLFormElement>, log: OutreachLog) {
    event.preventDefault();
    updateOutreachLog(logFromForm(new FormData(event.currentTarget), log) as OutreachLog);
    setEditingId("");
    setMessage("Outreach log updated.");
  }

  function archive(log: OutreachLog) {
    if (!window.confirm("Are you sure you want to delete this? This can be restored from Deleted Items.")) return;
    archiveOutreachLog(log.id);
    setMessage("Deleted successfully.");
  }

  const fields = (log?: OutreachLog) => (
    <>
      <select name="company_id" className="field" defaultValue={log?.company_id}>{companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}</select>
      <select name="type" className="field" defaultValue={log?.type || "Call"}>{outreachTypes.map((type) => <option key={type}>{type}</option>)}</select>
      <select name="contact_id" className="field" defaultValue={log?.contact_id}><option value="">No contact selected</option>{contacts.map((contact) => <option key={contact.contact_id} value={contact.contact_id}>{contact.first_name} {contact.last_name}</option>)}</select>
      <input name="date" className="field" type="date" defaultValue={log?.date || new Date().toISOString().slice(0, 10)} />
      <input name="result" className="field md:col-span-2" placeholder="Result, e.g. Requested prequal link / Left voicemail / Registered in portal" defaultValue={log?.result} />
      <textarea name="notes" className="field md:col-span-2" placeholder="What happened?" rows={3} defaultValue={log?.notes} />
      <label className="text-xs font-semibold text-slate-600">Next follow-up date<input name="nextFollowUpDate" className="field mt-1.5" type="date" defaultValue={log?.nextFollowUpDate} /></label>
    </>
  );

  return (
    <>
      <PageHeader eyebrow="Activity" title="Outreach" description="Log calls, emails, meetings, portal registrations, notes, other activity, and automatic follow-ups." action={<button onClick={() => setOpen(!open)} className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white">+ Log outreach</button>} />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {open && (
        <form onSubmit={submit} className="card mb-5 grid gap-3 p-5 md:grid-cols-2">
          {fields()}
          <div className="md:col-span-2"><button className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white">Save activity</button></div>
        </form>
      )}
      <div className="card divide-y divide-slate-100">
        {outreachLogs.map((log) => <div key={log.id} className="grid gap-3 p-5 md:grid-cols-[110px_140px_1fr_auto]"><p className="text-xs font-semibold text-slate-400">{log.date}</p><Badge tone={log.type === "Call" ? "green" : log.type === "Email" ? "blue" : log.type === "Portal Registration" ? "orange" : "slate"}>{log.type}</Badge><div><p className="text-sm font-semibold">{log.company}</p><p className="mt-1 text-sm text-slate-500">{log.result || log.notes}</p><p className="mt-1 text-xs text-slate-400">{log.contact || "No contact selected"}</p></div><div className="flex flex-col gap-2 text-right"><span className="text-xs text-slate-400">{log.nextFollowUpDate ? `Follow up ${log.nextFollowUpDate}` : "Logged"}</span><div className="flex justify-end gap-2"><button onClick={() => setEditingId(editingId === log.id ? "" : log.id)} className="rounded-md border px-2 py-1 text-xs font-semibold">Edit</button><button onClick={() => archive(log)} className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Delete</button></div></div></div>)}
        {!outreachLogs.length && <div className="p-10 text-center text-sm text-slate-500">No outreach logged yet. Start with a bid-list request or portal registration.</div>}
      </div>
      {editingId && outreachLogs.filter((log) => log.id === editingId).map((log) => (
        <form key={log.id} onSubmit={(event) => saveEdit(event, log)} className="card mt-5 grid gap-3 p-5 md:grid-cols-2">
          <h2 className="font-serif text-xl font-semibold md:col-span-2">Edit outreach log</h2>
          {fields(log)}
          <div className="md:col-span-2"><button className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white">Save changes</button></div>
        </form>
      ))}
    </>
  );
}
