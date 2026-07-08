"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import { useFabLeadStore } from "@/lib/local-store";

export default function CapabilityPage() {
  const { shopProfile, workspaceSettings } = useFabLeadStore();
  const [message, setMessage] = useState("");

  const capability = useMemo(() => `${shopProfile.shopName}

${shopProfile.shopName} is a fabrication and welding shop serving ${shopProfile.targetCitiesStates}. Core scopes include ${shopProfile.tradeScopes.join(", ")}.

Ideal work:
${shopProfile.idealProjectTypes}

Typical project range:
$${shopProfile.minimumProjectSize.toLocaleString()} to $${shopProfile.maximumProjectSize.toLocaleString()}

Service radius:
${shopProfile.serviceRadius}

Insurance / certifications / notes:
${shopProfile.insuranceCertificationNotes}

Primary contact:
${shopProfile.primaryContact}`, [shopProfile]);

  const introEmail = `Subject: Fabrication support from ${shopProfile.shopName}

Hello,

My name is ${workspaceSettings.userName}. I’m reaching out from ${shopProfile.shopName}. We support contractors and project owners with ${shopProfile.tradeScopes.join(", ")}.

We would like to be considered for upcoming projects in ${shopProfile.targetCitiesStates}. Could you let me know the best way to get added to your bid list or prequalification system?

Thank you,
${shopProfile.primaryContact}`;

  const bidListEmail = `Subject: Request to be added to your bid invite list

Hello,

${shopProfile.shopName} would like to be added to your bid invite list for scopes including ${shopProfile.tradeScopes.join(", ")}.

We are especially interested in ${shopProfile.idealProjectTypes}. Our typical project range is $${shopProfile.minimumProjectSize.toLocaleString()} to $${shopProfile.maximumProjectSize.toLocaleString()}.

Please send any prequalification forms, portal registration links, or estimator contacts we should use.

Thank you,
${shopProfile.primaryContact}`;

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard.");
  }

  return (
    <>
      <PageHeader eyebrow="Sales templates" title="Capability Statement Generator" description="Generate simple, practical outreach materials from the shop profile." />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      <div className="grid gap-6 xl:grid-cols-3">
        {[["One-page capability statement", capability], ["Intro email template", introEmail], ["Bid-list request email", bidListEmail]].map(([title, text]) => (
          <section key={title} className="card flex flex-col p-5">
            <h2 className="font-serif text-lg font-semibold">{title}</h2>
            <pre className="mt-4 min-h-96 flex-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{text}</pre>
            <div className="mt-4 flex gap-2">
              <button onClick={() => copy(text)} className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white">Copy</button>
              <button onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Export PDF</button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
