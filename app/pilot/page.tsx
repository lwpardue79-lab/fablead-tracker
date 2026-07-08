"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Download, Factory, MessageSquareText, Target } from "lucide-react";
import { Button, PageHeader } from "@/components/ui";
import { companies, followUps } from "@/lib/demo-data";
import { pilotQuestions, pilotTasks, successMetrics } from "@/lib/pilot-data";

type Feedback = {
  shopName: string;
  testerName: string;
  workType: string;
  serviceRadius: string;
  usefulBuyers: string;
  missingData: string;
  willingToPay: string;
  notes: string;
};

const defaultFeedback: Feedback = {
  shopName: "",
  testerName: "",
  workType: "Miscellaneous metals, rails, stairs, structural steel",
  serviceRadius: "100 miles from Kansas City",
  usefulBuyers: "",
  missingData: "",
  willingToPay: "",
  notes: "",
};

export default function PilotPage() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(defaultFeedback);

  useEffect(() => {
    const savedTasks = window.localStorage.getItem("fablead_pilot_tasks");
    const savedFeedback = window.localStorage.getItem("fablead_pilot_feedback");
    if (savedTasks) setCompleted(JSON.parse(savedTasks));
    if (savedFeedback) setFeedback({ ...defaultFeedback, ...JSON.parse(savedFeedback) });
  }, []);

  useEffect(() => {
    window.localStorage.setItem("fablead_pilot_tasks", JSON.stringify(completed));
  }, [completed]);

  useEffect(() => {
    window.localStorage.setItem("fablead_pilot_feedback", JSON.stringify(feedback));
  }, [feedback]);

  const progress = Math.round((completed.length / pilotTasks.length) * 100);
  const nextTask = pilotTasks.find((task) => !completed.includes(task.id));

  const pilotSummary = useMemo(() => {
    return [
      ["Verified KC buyer records", companies.length],
      ["Registration-ready pathways", companies.filter((company) => company.prequalification_url || company.bid_portal_url).length],
      ["Priority follow-ups", followUps.length],
      ["Pilot tasks complete", `${completed.length}/${pilotTasks.length}`],
    ];
  }, [completed.length]);

  function toggleTask(id: string) {
    setCompleted((current) => current.includes(id) ? current.filter((taskId) => taskId !== id) : [...current, id]);
  }

  function updateFeedback(field: keyof Feedback, value: string) {
    setFeedback((current) => ({ ...current, [field]: value }));
  }

  function exportPilotReport() {
    const lines = [
      "FabLead Tracker Pilot Report",
      `Shop: ${feedback.shopName || "Not entered"}`,
      `Tester: ${feedback.testerName || "Not entered"}`,
      `Work type: ${feedback.workType}`,
      `Service radius: ${feedback.serviceRadius}`,
      `Progress: ${progress}%`,
      "",
      "Completed tasks:",
      ...pilotTasks.map((task) => `${completed.includes(task.id) ? "[x]" : "[ ]"} ${task.title} - ${task.success}`),
      "",
      "Useful buyers:",
      feedback.usefulBuyers || "Not entered",
      "",
      "Missing data:",
      feedback.missingData || "Not entered",
      "",
      "Willingness to pay:",
      feedback.willingToPay || "Not entered",
      "",
      "Notes:",
      feedback.notes || "Not entered",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "fablead-pilot-report.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <>
      <PageHeader
        eyebrow="Company pilot"
        title="Test FabLead with a real fab shop"
        description="A one-week pilot workflow to prove whether the buyer data creates useful business-development action."
        action={<span onClick={exportPilotReport}><Button><span className="flex items-center gap-2"><Download size={15} />Export report</span></Button></span>}
      />

      <section className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <div className="card p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">Pilot progress</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold">Goal: get on more bid lists</h2>
              <p className="mt-1 text-sm text-slate-500">The test is successful if the shop starts registrations, outreach, and follow-ups it would not have done otherwise.</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-ink">{progress}%</p>
              <p className="text-xs font-semibold text-slate-400">complete</p>
            </div>
          </div>
          <div className="mt-5 h-3 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
          {nextTask && <p className="mt-4 text-sm text-slate-600"><strong>Next best action:</strong> {nextTask.title}</p>}
        </div>

        <div className="card p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilot snapshot</p>
          <div className="mt-4 space-y-3">
            {pilotSummary.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 text-sm">
                <span className="text-slate-500">{label}</span>
                <strong className="text-ink">{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-serif text-xl font-semibold">One-week test checklist</h2>
            <p className="mt-1 text-sm text-slate-500">Use this while sitting with a company. It saves automatically in this browser.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {pilotTasks.map((task) => {
              const done = completed.includes(task.id);
              return (
                <button key={task.id} onClick={() => toggleTask(task.id)} className="flex w-full gap-4 p-5 text-left transition hover:bg-slate-50">
                  <span className={`mt-1 grid size-6 shrink-0 place-items-center rounded-full border ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent"}`}>
                    <CheckCircle2 size={16} />
                  </span>
                  <span className="flex-1">
                    <span className={`block text-sm font-semibold ${done ? "line-through text-slate-400" : "text-ink"}`}>{task.title}</span>
                    <span className="mt-1 block text-xs text-slate-400">{task.owner} · {task.time}</span>
                    <span className="mt-2 block text-sm text-slate-600">{task.success}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <Factory size={18} className="text-moss" />
              <h2 className="font-serif text-xl font-semibold">Shop profile</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <input className="field" placeholder="Company name" value={feedback.shopName} onChange={(event) => updateFeedback("shopName", event.target.value)} />
              <input className="field" placeholder="Tester name" value={feedback.testerName} onChange={(event) => updateFeedback("testerName", event.target.value)} />
              <input className="field" placeholder="Primary work type" value={feedback.workType} onChange={(event) => updateFeedback("workType", event.target.value)} />
              <input className="field" placeholder="Service radius" value={feedback.serviceRadius} onChange={(event) => updateFeedback("serviceRadius", event.target.value)} />
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-moss" />
              <h2 className="font-serif text-xl font-semibold">Success scorecard</h2>
            </div>
            <div className="mt-4 space-y-3">
              {successMetrics.map(([label, description]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-slate-500">{description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="card mt-6 p-6">
        <div className="flex items-center gap-2">
          <MessageSquareText size={18} className="text-moss" />
          <h2 className="font-serif text-xl font-semibold">Pilot feedback</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">Capture blunt feedback. This is the gold in the mine.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Useful buyers<textarea className="field mt-1.5" rows={4} value={feedback.usefulBuyers} onChange={(event) => updateFeedback("usefulBuyers", event.target.value)} placeholder="Which buyers were worth pursuing?" /></label>
          <label className="text-xs font-semibold text-slate-600">Missing data<textarea className="field mt-1.5" rows={4} value={feedback.missingData} onChange={(event) => updateFeedback("missingData", event.target.value)} placeholder="What contact, portal, or source was missing?" /></label>
          <label className="text-xs font-semibold text-slate-600">Willingness to pay<textarea className="field mt-1.5" rows={4} value={feedback.willingToPay} onChange={(event) => updateFeedback("willingToPay", event.target.value)} placeholder="Would they pay? How much? For what refresh frequency?" /></label>
          <label className="text-xs font-semibold text-slate-600">Other notes<textarea className="field mt-1.5" rows={4} value={feedback.notes} onChange={(event) => updateFeedback("notes", event.target.value)} placeholder="Objections, requested features, data quality notes..." /></label>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {pilotQuestions.map((question) => <div key={question} className="rounded-lg border border-slate-200 p-3 text-xs text-slate-500">{question}</div>)}
        </div>
      </section>

      <section className="card mt-6 p-6">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-moss" />
          <h2 className="font-serif text-xl font-semibold">Pilot decision rule</h2>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Keep building if one shop says the buyer list saved time, at least three buyer records caused a concrete action, and the owner can name a price they would pay for a refreshed Kansas City package. If not, fix the data before adding more CRM features.
        </p>
      </section>
    </>
  );
}

