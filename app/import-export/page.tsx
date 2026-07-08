"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { csvRowsToImportData, parseCsv, useFabLeadStore } from "@/lib/local-store";
import { Bid, Company, Contact, FollowUp } from "@/lib/types";

const exportColumns: (keyof Company)[] = [
  "company_name",
  "company_type",
  "city",
  "state",
  "specialization",
  "lead_status",
  "lead_score",
  "distance_from_base_miles",
  "public_phone",
  "public_email",
  "website",
  "source_url",
  "prequalification_url",
  "bid_portal_url",
  "invite_list_status",
  "typical_scopes",
  "notes",
];

function downloadCsv(fileName: string, rows: string[]) {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

export default function ImportExport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addBid, addFollowUp, bids, companies, contacts, followUps, importCompanies, importContacts, outreachLogs } = useFabLeadStore();
  const [fileName, setFileName] = useState("");
  const [pastedCsv, setPastedCsv] = useState("");
  const [pendingCompanies, setPendingCompanies] = useState<Company[]>([]);
  const [pendingContacts, setPendingContacts] = useState<Contact[]>([]);
  const [pendingBids, setPendingBids] = useState<Omit<Bid, "id">[]>([]);
  const [pendingFollowUps, setPendingFollowUps] = useState<Omit<FollowUp, "id">[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function template() {
    downloadCsv("fablead-import-template.csv", [
      "company_name,company_type,city,state,specialization,lead_status,distance_from_base_miles,public_phone,public_email,website,source_url,prequalification_url,bid_portal_url,invite_list_status,typical_scopes,contact_name,contact_title,contact_email,contact_phone,decision_maker,notes",
      "Example General Contractor,General Contractor,Kansas City,MO,Commercial Construction,New,12,816-555-0100,info@example.com,https://example.com,https://example.com/source,https://example.com/prequal,https://example.com/bids,Needs Invite List,\"stairs; railings; misc metals\",Estimating Office,Preconstruction,estimating@example.com,816-555-0199,yes,Imported example row",
    ]);
  }

  function exportRows<T extends Record<string, any>>(fileName: string, records: T[], columns: string[]) {
    downloadCsv(fileName, [columns.join(","), ...records.map((record) => columns.map((column) => csvCell(record[column])).join(","))]);
  }

  function exportAll() {
    const rows = [
      exportColumns.join(","),
      ...companies.map((company) => exportColumns.map((column) => csvCell(company[column])).join(",")),
    ];
    downloadCsv("fablead-companies-export.csv", rows);
    setMessage(`Exported ${companies.length} companies.`);
    setError("");
  }

  function exportAllData() {
    exportRows("fablead-contacts-export.csv", contacts as any, ["first_name", "last_name", "title", "email", "phone", "contact_type", "source", "confidence_level"]);
    exportRows("fablead-outreach-export.csv", outreachLogs as any, ["date", "company", "contact", "type", "result", "notes", "nextFollowUpDate"]);
    exportRows("fablead-followups-export.csv", followUps as any, ["company", "contact", "task", "due", "priority", "task_type", "status", "notes"]);
    exportRows("fablead-bids-export.csv", bids as any, ["project", "company", "type", "location", "value", "due", "probability", "status", "source_url", "notes"]);
    setMessage("Exported contacts, outreach, follow-ups, and bids CSV files.");
  }

  function parseExtraImports(rows: Record<string, string>[]) {
    const parsedBids: Omit<Bid, "id">[] = [];
    const parsedFollowUps: Omit<FollowUp, "id">[] = [];
    rows.forEach((row) => {
      const companyName = row.company_name || row.company || row.buyer || "";
      const company = companies.find((item) => item.company_name.toLowerCase() === companyName.toLowerCase());
      if (row.project_name || row.bid_project || row.project) {
        parsedBids.push({
          company: company?.company_name || companyName,
          company_id: company?.company_id,
          project: row.project_name || row.bid_project || row.project,
          type: row.scope || row.project_type || "Miscellaneous Metals",
          location: row.location || "",
          value: Number(row.estimated_value || row.value || 0),
          due: row.bid_due_date || row.due_date || "",
          status: row.bid_status || "Found",
          probability: Number(row.probability || row.probability_to_win || 25),
          source_url: row.source_link || row.source_url || "",
          notes: row.bid_notes || row.notes || "",
        });
      }
      if (row.follow_up_task || row.task || row.next_action) {
        parsedFollowUps.push({
          company: company?.company_name || companyName,
          company_id: company?.company_id,
          contact: row.contact_name || "",
          task: row.follow_up_task || row.task || row.next_action,
          due: row.follow_up_due_date || row.due_date || row.next_action_due_date || "",
          priority: row.priority || "Medium",
          status: row.follow_up_status || "Open",
          task_type: row.task_type || "Imported",
          notes: row.follow_up_notes || "",
        });
      }
    });
    return { parsedBids, parsedFollowUps };
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setMessage("");
    setError("");
    setPendingCompanies([]);
    setPendingContacts([]);
    if (!file) return;
    setFileName(file.name);

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const parsed = csvRowsToImportData(rows);
      const extras = parseExtraImports(rows);
      const duplicateExisting = parsed.companies.filter((item) => companies.some((company) => company.company_name.toLowerCase() === item.company_name.toLowerCase())).map((item) => item.company_name);
      if (!parsed.companies.length && !extras.parsedBids.length && !extras.parsedFollowUps.length) {
        setError("No importable records found. Make sure your CSV has company_name, project_name, or follow_up_task columns.");
        return;
      }
      setPendingCompanies(parsed.companies);
      setPendingContacts(parsed.contacts);
      setPendingBids(extras.parsedBids);
      setPendingFollowUps(extras.parsedFollowUps);
      setWarnings([...parsed.errors, ...parsed.duplicateNames.map((name) => `Duplicate in file: ${name}`), ...duplicateExisting.map((name) => `Already exists: ${name}`)]);
      setMessage(`Ready to import ${parsed.companies.length} companies, ${parsed.contacts.length} contacts, ${extras.parsedBids.length} bids, and ${extras.parsedFollowUps.length} follow-ups from ${file.name}.`);
    } catch {
      setError("Could not read this CSV. Please try a standard UTF-8 comma-separated file.");
    }
  }

  function parsePastedCsv() {
    setMessage("");
    setError("");
    setPendingCompanies([]);
    setPendingContacts([]);
    const rows = parseCsv(pastedCsv);
    const parsed = csvRowsToImportData(rows);
    const extras = parseExtraImports(rows);
    const duplicateExisting = parsed.companies.filter((item) => companies.some((company) => company.company_name.toLowerCase() === item.company_name.toLowerCase())).map((item) => item.company_name);
    if (!parsed.companies.length && !extras.parsedBids.length && !extras.parsedFollowUps.length) {
      setError("No importable records found. Paste CSV with company_name, project_name, or follow_up_task columns.");
      return;
    }
    setPendingCompanies(parsed.companies);
    setPendingContacts(parsed.contacts);
    setPendingBids(extras.parsedBids);
    setPendingFollowUps(extras.parsedFollowUps);
    setWarnings([...parsed.errors, ...parsed.duplicateNames.map((name) => `Duplicate in file: ${name}`), ...duplicateExisting.map((name) => `Already exists: ${name}`)]);
    setFileName("Pasted CSV");
    setMessage(`Ready to import ${parsed.companies.length} companies, ${parsed.contacts.length} contacts, ${extras.parsedBids.length} bids, and ${extras.parsedFollowUps.length} follow-ups from pasted CSV.`);
  }

  function commitImport() {
    if (!pendingCompanies.length && !pendingBids.length && !pendingFollowUps.length) return;
    if (pendingCompanies.length) importCompanies(pendingCompanies);
    if (pendingContacts.length) importContacts(pendingContacts);
    pendingBids.forEach((bid) => addBid(bid));
    pendingFollowUps.forEach((followUp) => addFollowUp(followUp));
    setMessage(`Imported ${pendingCompanies.length} companies, ${pendingContacts.length} contacts, ${pendingBids.length} bids, and ${pendingFollowUps.length} follow-ups.`);
    cancelImport();
    setError("");
  }

  function cancelImport() {
    setPendingCompanies([]);
    setPendingContacts([]);
    setPendingBids([]);
    setPendingFollowUps([]);
    setWarnings([]);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <PageHeader eyebrow="Data tools" title="Import / Export" description="Bring in a buyer/prospect list or take a clean copy of your data with you." />

      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {warnings.length > 0 && <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700"><p>Review before importing:</p><ul className="mt-2 list-disc pl-5">{warnings.slice(0, 8).map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand"><Upload size={20} /></div>
          <h2 className="mt-4 font-serif text-xl font-semibold">Import buyers / companies</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">Upload public business information for general contractors, public agencies, steel buyers, estimators, and other bid-list targets.</p>
          <button onClick={() => inputRef.current?.click()} className="mt-5 w-full rounded-xl border-2 border-dashed border-slate-200 px-5 py-10 text-center hover:border-brand">
            <FileSpreadsheet className="mx-auto text-slate-400" />
            <p className="mt-3 text-sm font-semibold">{fileName || "Choose a CSV file"}</p>
            <p className="mt-1 text-xs text-slate-400">UTF-8 CSV · public business contact info only</p>
          </button>
          <input ref={inputRef} hidden type="file" accept=".csv,text/csv" onChange={handleFile} />
          <textarea
            value={pastedCsv}
            onChange={(event) => setPastedCsv(event.target.value)}
            className="field mt-4 min-h-32"
            placeholder="Or paste CSV here for quick pilot testing..."
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={template} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Download template</button>
            <button onClick={parsePastedCsv} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Preview pasted CSV</button>
            {(pendingCompanies.length > 0 || pendingBids.length > 0 || pendingFollowUps.length > 0) && <button onClick={commitImport} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Import previewed records</button>}
            {(pendingCompanies.length > 0 || pendingBids.length > 0 || pendingFollowUps.length > 0) && <button onClick={cancelImport} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel import</button>}
          </div>

          {pendingCompanies.length > 0 && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">Preview</p>
              <p className="mt-1 text-xs text-slate-400">{pendingCompanies.length} companies · {pendingContacts.length} contacts · {pendingBids.length} bids · {pendingFollowUps.length} follow-ups. Fit scores are recalculated automatically.</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {pendingCompanies.slice(0, 5).map((company) => (
                  <div key={company.company_id} className="flex justify-between gap-4">
                    <span>{company.company_name}</span>
                    <span className="text-slate-400">{company.city}, {company.state} · Fit {company.lead_score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="card p-6">
          <div className="grid size-11 place-items-center rounded-xl bg-moss/10 text-moss"><Download size={20} /></div>
          <h2 className="mt-4 font-serif text-xl font-semibold">Export your database</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">Download your company data as a standard CSV. Your data is never locked in.</p>
          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span>Companies</span><strong>{companies.length} records</strong></div>
            <div className="mt-3 flex justify-between"><span>Contacts</span><strong>{contacts.length} records</strong></div>
            <div className="mt-3 flex justify-between"><span>Follow-ups</span><strong>{followUps.length} records</strong></div>
            <div className="mt-3 flex justify-between"><span>Bids</span><strong>{bids.length} records</strong></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><button onClick={exportAll} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Export companies CSV</button><button onClick={exportAllData} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Export contacts/outreach/follow-ups/bids</button></div>
        </section>
      </div>
    </>
  );
}
