"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";

const storageKey = "fablead_test_mode_checklist_v1";

const checklistItems = [
  ["companyAdded", "Company added"],
  ["contactAdded", "Contact added"],
  ["outreachLogged", "Outreach logged"],
  ["followUpCreated", "Follow-up created"],
  ["bidAdded", "Bid added"],
  ["itemDeleted", "Item deleted"],
  ["itemRestored", "Item restored"],
  ["reportGenerated", "Report generated"],
  ["csvExportTested", "CSV export tested"],
  ["pdfExportTested", "PDF export tested"],
  ["contactDetailOpened", "Contact detail opened"],
  ["bidDetailOpened", "Bid detail opened"],
  ["companyLinksTested", "Company links tested"],
  ["tableButtonsTested", "Table edit/delete buttons tested"],
] as const;

type ChecklistKey = typeof checklistItems[number][0];
type ChecklistState = Record<ChecklistKey, boolean>;

const emptyState = Object.fromEntries(checklistItems.map(([key]) => [key, false])) as ChecklistState;

export default function TestModeChecklistPage() {
  const [checked, setChecked] = useState<ChecklistState>(emptyState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setChecked({ ...emptyState, ...JSON.parse(raw) });
    } catch {
      setChecked(emptyState);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(storageKey, JSON.stringify(checked));
  }, [checked, loaded]);

  const completed = useMemo(() => checklistItems.filter(([key]) => checked[key]).length, [checked]);

  function toggle(key: ChecklistKey) {
    setChecked((current) => ({ ...current, [key]: !current[key] }));
  }

  function reset() {
    setChecked(emptyState);
  }

  return (
    <>
      <PageHeader
        eyebrow="Pilot QA"
        title="Test Mode Checklist"
        description="Use this while clicking through the Shawnee Steel pilot flow. Check each item only after you verify it works in the app."
        action={<Link href="/settings" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to Settings</Link>}
      />

      <section className="card p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilot readiness</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink">{completed} of {checklistItems.length} checks complete</p>
          </div>
          <button onClick={reset} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Reset checklist</button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {checklistItems.map(([key, label]) => (
            <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition ${checked[key] ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              <input type="checkbox" checked={checked[key]} onChange={() => toggle(key)} className="size-4 accent-emerald-600" />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
          Recommended test path: open a company, edit it, add a contact, open the contact detail page from the Contacts table, log outreach with a next follow-up date, complete that follow-up, add and edit a bid, open the bid detail page from the Bids table, confirm company links open Company Detail, archive one test record, restore it from Deleted Items, then export the weekly report as CSV and PDF.
        </p>
      </section>
    </>
  );
}
