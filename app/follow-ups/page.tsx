"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge, PageHeader } from "@/components/ui";
import { followUpStatuses, useFabLeadStore } from "@/lib/local-store";
import { FollowUp } from "@/lib/types";

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function FollowUps() {
  const { addFollowUp, archiveFollowUp, companies, contacts, followUps, updateFollowUp } = useFabLeadStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const openFollowUps = followUps.filter((item) => item.status === "Open" || item.status === "Snoozed");
  const dueNow = openFollowUps.filter((item) => item.due && item.due <= today).length;
  const completed = followUps.filter((item) => item.status === "Completed").length;

  const sortedFollowUps = useMemo(() => {
    const priorityRank: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    return [...followUps].sort((a, b) => {
      const dateCompare = (a.due || "9999-12-31").localeCompare(b.due || "9999-12-31");
      if (dateCompare !== 0) return dateCompare;
      return (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4);
    });
  }, [followUps]);

  function followUpFromForm(form: FormData, existing?: FollowUp): FollowUp | Omit<FollowUp, "id"> {
    const companyId = String(form.get("company_id") || existing?.company_id || companies[0]?.company_id || "");
    const company = companies.find((item) => item.company_id === companyId);
    const contactId = String(form.get("contact_id") || "");
    const contact = contacts.find((item) => item.contact_id === contactId);
    return {
      ...(existing || {}),
      company_id: companyId,
      company: company?.company_name || existing?.company || "Unassigned",
      contact_id: contactId,
      contact: contact ? `${contact.first_name} ${contact.last_name}`.trim() : String(form.get("contact_name") || existing?.contact || ""),
      task: String(form.get("task") || "").trim(),
      due: String(form.get("due") || ""),
      priority: String(form.get("priority") || "Medium"),
      task_type: String(form.get("task_type") || "Next action"),
      notes: String(form.get("notes") || ""),
      status: String(form.get("status") || "Open"),
    };
  }

  function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const followUp = followUpFromForm(new FormData(event.currentTarget));
    if (!followUp.task) return;
    addFollowUp(followUp);
    event.currentTarget.reset();
    setShowForm(false);
    setMessage("Follow-up added.");
  }

  function saveEdit(event: FormEvent<HTMLFormElement>, followUp: FollowUp) {
    event.preventDefault();
    updateFollowUp(followUpFromForm(new FormData(event.currentTarget), followUp) as FollowUp);
    setEditingId("");
    setMessage("Follow-up updated.");
  }

  function updateStatus(followUp: FollowUp, status: string, due?: string) {
    updateFollowUp({ ...followUp, status, due: due || followUp.due });
    setMessage(status === "Completed" ? "Follow-up completed." : "Follow-up updated.");
  }

  function archive(followUp: FollowUp) {
    if (!window.confirm("Are you sure you want to delete this? This can be restored from Deleted Items.")) return;
    archiveFollowUp(followUp.id);
    setMessage("Deleted successfully.");
  }

  const fields = (followUp?: FollowUp) => (
    <>
      <input name="task" className="field md:col-span-2" placeholder="Task, e.g. Ask to be added to bid invite list *" required defaultValue={followUp?.task} />
      <input name="due" className="field" type="date" defaultValue={followUp?.due} />
      <select name="company_id" className="field" defaultValue={followUp?.company_id}>{companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}</select>
      <select name="contact_id" className="field" defaultValue={followUp?.contact_id}><option value="">No specific contact</option>{contacts.map((contact) => <option key={contact.contact_id} value={contact.contact_id}>{contact.first_name} {contact.last_name} — {contact.title}</option>)}</select>
      <input name="contact_name" className="field" placeholder="Or type contact name" defaultValue={followUp?.contact} />
      <select name="priority" className="field" defaultValue={followUp?.priority || "Medium"}><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select>
      <input name="task_type" className="field" placeholder="Task type" defaultValue={followUp?.task_type || "Next action"} />
      <select name="status" className="field" defaultValue={followUp?.status || "Open"}>{followUpStatuses.map((status) => <option key={status}>{status}</option>)}</select>
      <textarea name="notes" className="field md:col-span-3" placeholder="Notes" defaultValue={followUp?.notes} />
    </>
  );

  return (
    <>
      <PageHeader eyebrow="Next actions" title="Follow-ups" description="A short, prioritized list of what to do next." action={<button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Add follow-up</button>} />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}

      {showForm && (
        <form onSubmit={submitFollowUp} className="card mb-5 grid gap-3 p-5 md:grid-cols-3">
          {fields()}
          <div className="flex gap-2 md:col-span-3"><button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Save follow-up</button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      )}

      <div className="mb-4 flex gap-2"><Badge tone={dueNow > 0 ? "red" : "green"}>{dueNow} overdue/due</Badge><Badge>{openFollowUps.length} open</Badge><Badge tone="green">{completed} completed</Badge></div>

      <div className="card divide-y divide-slate-100">
        {sortedFollowUps.map((followUp) => {
          const isDone = followUp.status === "Completed";
          const overdue = followUp.status !== "Completed" && followUp.due && followUp.due < today;
          return (
            <div key={followUp.id} className={`grid gap-3 p-5 md:grid-cols-[1fr_auto] ${isDone ? "opacity-50" : overdue ? "bg-red-50/70" : ""}`}>
              <div>
                <p className={`text-sm font-semibold ${isDone ? "line-through" : ""}`}>{followUp.task}</p>
                <p className="mt-1 text-xs text-slate-400">{followUp.company} · {followUp.contact || "No contact assigned"} · {followUp.task_type || "Task"}</p>
                {followUp.notes && <p className="mt-2 text-xs text-slate-500">{followUp.notes}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Badge tone={overdue ? "red" : followUp.priority === "High" || followUp.priority === "Urgent" ? "orange" : "slate"}>{followUp.priority}</Badge>
                <Badge>{followUp.due || "No date"}</Badge>
                <button onClick={() => updateStatus(followUp, "Completed")} className="rounded-md border px-2 py-1 text-xs font-semibold">Mark Complete</button>
                <button onClick={() => updateStatus(followUp, "Snoozed", addDays(7))} className="rounded-md border px-2 py-1 text-xs font-semibold">Snooze</button>
                <button onClick={() => setEditingId(editingId === followUp.id ? "" : followUp.id)} className="rounded-md border px-2 py-1 text-xs font-semibold">Edit</button>
                <button onClick={() => archive(followUp)} className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {editingId && followUps.filter((followUp) => followUp.id === editingId).map((followUp) => (
        <form key={followUp.id} onSubmit={(event) => saveEdit(event, followUp)} className="card mt-5 grid gap-3 p-5 md:grid-cols-3">
          <h2 className="font-serif text-xl font-semibold md:col-span-3">Edit follow-up</h2>
          {fields(followUp)}
          <div className="flex gap-2 md:col-span-3"><button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Save changes</button><button type="button" onClick={() => setEditingId("")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></div>
        </form>
      ))}
    </>
  );
}
