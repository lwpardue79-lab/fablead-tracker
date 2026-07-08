"use client";

import { useEffect, useMemo, useState } from "react";
import { bids as seedBids, companies as seedCompanies, contacts as seedContacts, followUps as seedFollowUps } from "./demo-data";
import { calculateLeadScore } from "./lead-scoring";
import { Bid, Company, Contact, FollowUp, WorkspaceSettings } from "./types";

export const defaultWorkspaceSettings: WorkspaceSettings = {
  companyName: "Shawnee Steel & Welding",
  userName: "Luke Pardue",
  baseMarket: "Kansas City Metro",
  coverage: "Missouri + Kansas",
  serviceRadius: "100 miles",
};

const keys = {
  companies: "fablead_companies_v1",
  contacts: "fablead_contacts_v1",
  bids: "fablead_bids_v1",
  followUps: "fablead_followups_v1",
  workspaceSettings: "fablead_workspace_settings_v1",
};

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useFabLeadStore() {
  const [companies, setCompanies] = useState<Company[]>(seedCompanies);
  const [contacts, setContacts] = useState<Contact[]>(seedContacts);
  const [bids, setBids] = useState<Bid[]>(seedBids);
  const [followUps, setFollowUps] = useState<FollowUp[]>(seedFollowUps);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>(defaultWorkspaceSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCompanies(readLocal(keys.companies, seedCompanies));
    setContacts(readLocal(keys.contacts, seedContacts));
    setBids(readLocal(keys.bids, seedBids));
    setFollowUps(readLocal(keys.followUps, seedFollowUps));
    setWorkspaceSettings(readLocal(keys.workspaceSettings, defaultWorkspaceSettings));
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) writeLocal(keys.companies, companies); }, [companies, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.contacts, contacts); }, [contacts, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.bids, bids); }, [bids, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.followUps, followUps); }, [followUps, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.workspaceSettings, workspaceSettings); }, [workspaceSettings, loaded]);

  return useMemo(() => ({
    companies,
    contacts,
    bids,
    followUps,
    workspaceSettings,
    addCompany(input: Omit<Company, "company_id">) {
      const company = { ...input, company_id: makeId("company") };
      setCompanies((current) => [company, ...current]);
      return company;
    },
    importCompanies(imported: Company[]) {
      setCompanies((current) => [...imported, ...current]);
    },
    importContacts(imported: Contact[]) {
      setContacts((current) => [...imported, ...current]);
    },
    addContact(input: Omit<Contact, "contact_id">) {
      const contact = { ...input, contact_id: makeId("contact") };
      setContacts((current) => [contact, ...current]);
      return contact;
    },
    addBid(input: Omit<Bid, "id">) {
      const bid = { ...input, id: makeId("bid") };
      setBids((current) => [bid, ...current]);
      return bid;
    },
    addFollowUp(input: Omit<FollowUp, "id">) {
      const followUp = { ...input, id: makeId("follow") };
      setFollowUps((current) => [followUp, ...current]);
      return followUp;
    },
    updateFollowUps(next: FollowUp[]) {
      setFollowUps(next);
    },
    updateWorkspaceSettings(next: WorkspaceSettings) {
      setWorkspaceSettings(next);
    },
    resetPilotData() {
      setCompanies(seedCompanies);
      setContacts(seedContacts);
      setBids(seedBids);
      setFollowUps(seedFollowUps);
      setWorkspaceSettings(defaultWorkspaceSettings);
    },
  }), [bids, companies, contacts, followUps, workspaceSettings]);
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);

  const [headers = [], ...body] = rows;
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function contactFromRow(row: Record<string, string>, companyId: string): Contact | null {
  const contactName = row.contact_name || row.contact || "";
  const [firstName = "", ...lastParts] = contactName.split(" ").filter(Boolean);
  const contact: Omit<Contact, "contact_id"> = {
    company_id: companyId,
    first_name: row.contact_first_name || firstName || row.first_name || "",
    last_name: row.contact_last_name || lastParts.join(" ") || row.last_name || "",
    title: row.contact_title || row.title || "",
    email: row.contact_email || row.email || row.public_email || "",
    phone: row.contact_phone || row.phone || "",
    decision_maker: ["true", "yes", "1", "y"].includes((row.decision_maker || "").toLowerCase()),
    next_follow_up_at: row.next_follow_up_at || "",
  };

  if (!contact.first_name && !contact.last_name && !contact.email && !contact.phone && !contact.title) return null;
  return { ...contact, contact_id: makeId("imported-contact") };
}

export function csvRowsToImportData(rows: Record<string, string>[]): { companies: Company[]; contacts: Contact[] } {
  const contacts: Contact[] = [];
  const companies = rows
    .filter((row) => row.company_name || row.company || row.buyer)
    .map((row) => {
      const companyId = makeId("imported-company");
      const importedContact = contactFromRow(row, companyId);
      if (importedContact) contacts.push(importedContact);
      const company: Company = {
        company_id: companyId,
        company_name: row.company_name || row.company || row.buyer || "Unnamed buyer",
        company_type: row.company_type || row.buyer_type || "Buyer",
        city: row.city || "Kansas City",
        state: row.state || "MO",
        specialization: row.specialization || row.project_market || row.industry_served || "Commercial Construction",
        lead_status: row.lead_status || "New",
        lead_score: 0,
        distance_from_base_miles: Number(row.distance_from_base_miles || 0),
        public_phone: row.public_phone || row.company_phone || "",
        public_email: row.public_email || row.company_email || "",
        website: row.website,
        source_url: row.source_url,
        prequalification_url: row.prequalification_url,
        bid_portal_url: row.bid_portal_url,
        invite_list_status: row.invite_list_status || "Imported",
        typical_scopes: row.typical_scopes,
        data_verified_at: row.data_verified_at || new Date().toISOString().slice(0, 10),
        notes: row.notes || "Imported from CSV.",
      };
      return { ...company, lead_score: calculateLeadScore(company, Boolean(importedContact)) };
    });
  return { companies, contacts };
}

export function csvRowsToCompanies(rows: Record<string, string>[]): Company[] {
  return csvRowsToImportData(rows).companies;
}
