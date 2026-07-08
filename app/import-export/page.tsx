"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { csvRowsToCompanies, parseCsv, useFabLeadStore } from "@/lib/local-store";
import { Company } from "@/lib/types";

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
  const { companies, importCompanies } = useFabLeadStore();
  const [fileName, setFileName] = useState("");
  const [pastedCsv, setPastedCsv] = useState("");
  const [pendingCompanies, setPendingCompanies] = useState<Company[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function template() {
    downloadCsv("fablead-import-template.csv", [
      "company_name,company_type,city,state,specialization,lead_status,lead_score,distance_from_base_miles,public_phone,public_email,website,source_url,prequalification_url,bid_portal_url,invite_list_status,typical_scopes,notes",
      "Example General Contractor,General Contractor,Kansas City,MO,Commercial Construction,New,82,12,816-555-0100,estimating@example.com,https://example.com,https://example.com/bids,https://example.com/prequal,https://example.com/vendors,Needs Invite List,\"stairs; railings; misc metals\",Imported example row",
    ]);
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

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setMessage("");
    setError("");
    setPendingCompanies([]);
    if (!file) return;
    setFileName(file.name);

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const parsedCompanies = csvRowsToCompanies(rows);
      if (!parsedCompanies.length) {
        setError("No companies found. Make sure your CSV has a company_name, company, or buyer column.");
        return;
      }
      setPendingCompanies(parsedCompanies);
      setMessage(`Ready to import ${parsedCompanies.length} companies from ${file.name}.`);
    } catch {
      setError("Could not read this CSV. Please try a standard UTF-8 comma-separated file.");
    }
  }

  function parsePastedCsv() {
    setMessage("");
    setError("");
    setPendingCompanies([]);
    const parsedCompanies = csvRowsToCompanies(parseCsv(pastedCsv));
    if (!parsedCompanies.length) {
      setError("No companies found. Paste CSV with a company_name, company, or buyer column.");
      return;
    }
    setPendingCompanies(parsedCompanies);
    setFileName("Pasted CSV");
    setMessage(`Ready to import ${parsedCompanies.length} companies from pasted CSV.`);
  }

  function commitImport() {
    if (!pendingCompanies.length) return;
    importCompanies(pendingCompanies);
    setMessage(`Imported ${pendingCompanies.length} companies. They are now available on the Companies page.`);
    setPendingCompanies([]);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
    setError("");
  }

  return (
    <>
      <PageHeader eyebrow="Data tools" title="Import / Export" description="Bring in a buyer/prospect list or take a clean copy of your data with you." />

      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

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
            {pendingCompanies.length > 0 && <button onClick={commitImport} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Import {pendingCompanies.length} buyers</button>}
          </div>

          {pendingCompanies.length > 0 && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">Preview</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {pendingCompanies.slice(0, 5).map((company) => (
                  <div key={company.company_id} className="flex justify-between gap-4">
                    <span>{company.company_name}</span>
                    <span className="text-slate-400">{company.city}, {company.state}</span>
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
            <div className="mt-3 flex justify-between"><span>Storage</span><strong>Browser pilot data</strong></div>
          </div>
          <button onClick={exportAll} className="mt-4 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Export companies CSV</button>
        </section>
      </div>
    </>
  );
}
