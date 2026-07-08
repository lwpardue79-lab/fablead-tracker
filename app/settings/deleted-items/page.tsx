"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, PageHeader } from "@/components/ui";
import { useFabLeadStore } from "@/lib/local-store";
import { DeletedItem } from "@/lib/types";

const labels: Record<DeletedItem["type"], string> = {
  company: "Company",
  contact: "Contact",
  bid: "Bid",
  followUp: "Follow-up",
  outreach: "Outreach",
};

export default function DeletedItemsPage() {
  const { deletedItems, permanentlyDeleteRecord, restoreRecord } = useFabLeadStore();
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"All" | DeletedItem["type"]>("All");
  const rows = deletedItems.filter((item) => filter === "All" || item.type === filter);

  function restore(item: DeletedItem) {
    restoreRecord(item.type, item.id);
    setMessage("Restored successfully.");
  }

  function permanentDelete(item: DeletedItem) {
    if (!window.confirm("Permanently delete this record? This cannot be undone.")) return;
    if (item.type === "company" && !window.confirm("This is a company record. Permanently deleting it may also remove related database history. Are you absolutely sure?")) return;
    permanentlyDeleteRecord(item.type, item.id);
    setMessage("Permanently deleted.");
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Deleted Items" description="Restore archived records or permanently delete records after careful review." action={<Link href="/settings" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Back to Settings</Link>} />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      <div className="card mb-4 flex flex-wrap gap-2 p-3">
        {(["All", "company", "contact", "bid", "followUp", "outreach"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${filter === item ? "bg-ink text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{item === "All" ? "All" : labels[item]}</button>)}
      </div>
      <div className="table-shell overflow-x-auto">
        <table>
          <thead><tr><th>Type</th><th>Record</th><th>Detail</th><th>Date deleted</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((item) => <tr key={`${item.type}-${item.id}`}><td><Badge>{labels[item.type]}</Badge></td><td className="font-semibold text-ink">{item.label}</td><td>{item.detail || "—"}</td><td>{item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "—"}</td><td><div className="flex gap-2"><button onClick={() => restore(item)} className="rounded-md border px-2 py-1 text-xs font-semibold">Restore</button><button onClick={() => permanentDelete(item)} className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Permanently Delete</button></div></td></tr>)}
            {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">No deleted items.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
