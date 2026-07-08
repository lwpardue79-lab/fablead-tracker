"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge, PageHeader } from "@/components/ui";
import { useFabLeadStore } from "@/lib/local-store";

export default function FollowUps() {
  const { followUps, companies, contacts, addFollowUp, updateFollowUps } = useFabLeadStore();
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const openFollowUps = followUps.filter((item) => item.status !== "Complete");
  const dueNow = openFollowUps.filter((item) => item.due && item.due <= today).length;
  const upcoming = openFollowUps.filter((item) => !item.due || item.due > today).length;
  const completed = followUps.length - openFollowUps.length;

  const sortedFollowUps = useMemo(() => {
    const priorityRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    return [...followUps].sort((a, b) => {
      const dateCompare = (a.due || "9999-12-31").localeCompare(b.due || "9999-12-31");
      if (dateCompare !== 0) return dateCompare;
      return (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3);
    });
  }, [followUps]);

  function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const task = String(form.get("task") || "").trim();
    if (!task) return;

    const companyName = String(form.get("company") || companies[0]?.company_name || "Unassigned");
    const selectedContactId = String(form.get("contact_id") || "");
    const selectedContact = contacts.find((contact) => contact.contact_id === selectedContactId);

    addFollowUp({
      company: companyName,
      contact: selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}`.trim() : String(form.get("contact_name") || "Unassigned"),
      task,
      due: String(form.get("due") || ""),
      priority: String(form.get("priority") || "Medium"),
      status: "Open",
    });

    event.currentTarget.reset();
    setShowForm(false);
    setMessage("Follow-up added. This is now saved in this browser for pilot testing.");
  }

  function toggleComplete(id: string) {
    updateFollowUps(followUps.map((item) => item.id === id ? { ...item, status: item.status === "Complete" ? "Open" : "Complete" } : item));
  }

  return (
    <>
      <PageHeader
        eyebrow="Next actions"
        title="Follow-ups"
        description="A short, prioritized list of what to do next."
        action={<button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">+ Add follow-up</button>}
      />

      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}

      {showForm && (
        <form onSubmit={submitFollowUp} className="card mb-5 grid gap-3 p-5 md:grid-cols-3">
          <input name="task" className="field md:col-span-2" placeholder="Task, e.g. Ask to be added to bid invite list *" required />
          <input name="due" className="field" type="date" />
          <select name="company" className="field">
            {companies.map((company) => <option key={company.company_id}>{company.company_name}</option>)}
          </select>
          <select name="contact_id" className="field">
            <option value="">No specific contact</option>
            {contacts.map((contact) => <option key={contact.contact_id} value={contact.contact_id}>{contact.first_name} {contact.last_name} — {contact.title}</option>)}
          </select>
          <input name="contact_name" className="field" placeholder="Or type contact name" />
          <select name="priority" className="field">
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <div className="flex gap-2 md:col-span-3">
            <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Save follow-up</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="mb-4 flex gap-2">
        <Badge tone={dueNow > 0 ? "red" : "green"}>{dueNow} due now</Badge>
        <Badge>{upcoming} upcoming</Badge>
        <Badge tone="green">{completed} completed</Badge>
      </div>

      <div className="card divide-y divide-slate-100">
        {sortedFollowUps.map((followUp) => {
          const isDone = followUp.status === "Complete";
          return (
            <div key={followUp.id} className={`flex items-center gap-4 p-5 ${isDone ? "opacity-40" : ""}`}>
              <button onClick={() => toggleComplete(followUp.id)} aria-label="Mark complete" className={`size-5 rounded-full border-2 ${isDone ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${isDone ? "line-through" : ""}`}>{followUp.task}</p>
                <p className="mt-1 text-xs text-slate-400">{followUp.company} · {followUp.contact || "No contact assigned"}</p>
              </div>
              <Badge tone={followUp.priority === "High" ? "red" : followUp.priority === "Medium" ? "orange" : "slate"}>{followUp.priority}</Badge>
              <p className="w-24 text-right text-xs font-semibold text-slate-500">{followUp.due || "No date"}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
