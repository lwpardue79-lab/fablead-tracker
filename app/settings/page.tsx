"use client";

import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/ui";
import { useFabLeadStore } from "@/lib/local-store";

export default function Settings() {
  const { resetPilotData } = useFabLeadStore();
  const [message, setMessage] = useState("");

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Settings saved for this pilot session.");
  }

  function resetData() {
    resetPilotData();
    setMessage("Pilot data reset to the verified Kansas City seed list.");
  }

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Settings" description="Launch in Kansas City, then reuse the same territory model nationwide." />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <form onSubmit={saveSettings} className="card p-6">
          <h2 className="font-serif text-xl font-semibold">Business details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Company name<input className="field mt-1.5" defaultValue="Acme Fabrication" /></label>
            <label className="text-xs font-semibold text-slate-600">Your name<input className="field mt-1.5" defaultValue="Luke Pardue" /></label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Base market<input className="field mt-1.5" defaultValue="Kansas City Metro" /></label>
            <label className="text-xs font-semibold text-slate-600">Coverage<select className="field mt-1.5"><option>Missouri + Kansas</option><option>United States</option></select></label>
            <label className="text-xs font-semibold text-slate-600">Ideal service radius<select className="field mt-1.5"><option>100 miles</option><option>50 miles</option><option>250 miles</option></select></label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Save settings</button>
            <button type="button" onClick={resetData} className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">Reset pilot data</button>
          </div>
        </form>
        <section className="card p-6">
          <h2 className="font-serif text-xl font-semibold">Buyer fit scoring</h2>
          <p className="mt-1 text-sm text-slate-500">Weights total 100 points. Tune them as you learn which buyers invite and award work.</p>
          <div className="mt-5 space-y-4">
            {[
              ["Distance from base", 20],
              ["Buyer type fit", 15],
              ["Project market fit", 15],
              ["Public contact path", 10],
              ["Bid-list pathway", 10],
              ["Recent engagement", 10],
              ["Open opportunity", 10],
              ["Typical contract fit", 5],
              ["Source freshness", 5],
            ].map(([label, points]) => (
              <div key={label as string} className="flex items-center gap-3">
                <span className="flex-1 text-sm">{label}</span>
                <input className="field w-20 text-right" defaultValue={points} />
                <span className="text-xs text-slate-400">pts</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
