"use client";

import { useEffect, useMemo, useState } from "react";
import { bids as seedBids, companies as seedCompanies, contacts as seedContacts, followUps as seedFollowUps } from "./demo-data";
import { calculateLeadScore } from "./lead-scoring";
import { createClient } from "./supabase/client";
import { Bid, Company, Contact, FollowUp, OutreachLog, ShopProfile, WorkspaceSettings } from "./types";

export const defaultWorkspaceSettings: WorkspaceSettings = {
  companyName: "Shawnee Steel & Welding",
  userName: "Luke Pardue",
  baseMarket: "Kansas City Metro",
  coverage: "Missouri + Kansas",
  serviceRadius: "100 miles",
};

export const defaultShopProfile: ShopProfile = {
  shopName: "Shawnee Steel & Welding",
  serviceRadius: "100 miles",
  targetCitiesStates: "Shawnee KS, Kansas City Metro, Overland Park KS, Olathe KS, Kansas City MO, Lee's Summit MO",
  tradeScopes: ["Structural steel", "Miscellaneous metals", "Stairs", "Rails", "Welding", "Fabrication", "Field installation"],
  idealProjectTypes: "Commercial buildings, public works, schools, industrial repairs, stairs, rails, structural steel, and miscellaneous metals.",
  minimumProjectSize: 5000,
  maximumProjectSize: 250000,
  insuranceCertificationNotes: "Add insurance, W-9, safety, bonding, certifications, and welding procedure notes here.",
  primaryContact: "Luke Pardue",
};

const keys = {
  companies: "fablead_companies_v1",
  contacts: "fablead_contacts_v1",
  bids: "fablead_bids_v1",
  followUps: "fablead_followups_v1",
  workspaceSettings: "fablead_workspace_settings_v1",
  shopProfile: "fablead_shop_profile_v1",
  outreachLogs: "fablead_outreach_logs_v1",
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
  void prefix;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fromSupabaseCompany(row: Record<string, any>): Company {
  return {
    company_id: row.company_id,
    company_name: row.company_name,
    company_type: row.company_type || "",
    city: row.city || "",
    state: row.state || "",
    specialization: row.specialization || row.industry_served || "",
    lead_status: row.lead_status || "New",
    lead_score: row.lead_score || 0,
    distance_from_base_miles: Number(row.distance_from_base_miles || 0),
    public_phone: row.public_phone || "",
    public_email: row.public_email || row.estimating_email || "",
    estimating_email: row.estimating_email || row.public_email || "",
    website: row.website || "",
    source_url: row.source_url || "",
    prequalification_url: row.prequalification_url || "",
    bid_portal_url: row.bid_portal_url || "",
    invite_list_status: row.invite_list_status || "",
    typical_scopes: row.typical_scopes || "",
    data_verified_at: row.data_verified_at?.slice?.(0, 10) || "",
    notes: row.notes || "",
    next_action: row.next_action || "",
    last_contacted_date: row.last_contacted_date || "",
  };
}

function toSupabaseCompany(company: Company, workspaceId: string) {
  return {
    company_id: company.company_id,
    workspace_id: workspaceId,
    company_name: company.company_name,
    company_type: company.company_type,
    city: company.city,
    state: company.state,
    specialization: company.specialization,
    lead_status: company.lead_status,
    lead_score: company.lead_score,
    distance_from_base_miles: company.distance_from_base_miles,
    public_phone: company.public_phone,
    public_email: company.public_email,
    estimating_email: company.estimating_email,
    website: company.website,
    source_url: company.source_url,
    prequalification_url: company.prequalification_url,
    bid_portal_url: company.bid_portal_url,
    invite_list_status: company.invite_list_status,
    typical_scopes: company.typical_scopes,
    data_verified_at: company.data_verified_at,
    notes: company.notes,
    next_action: company.next_action,
    last_contacted_date: company.last_contacted_date,
  };
}

function dateDaysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function cloneLaunchDataForWorkspace() {
  const companyIdMap = new Map(seedCompanies.map((company) => [company.company_id, makeId("company")]));
  const seededCompanies = seedCompanies.map((company) => {
    const hasSeedContact = seedContacts.some((contact) => contact.company_id === company.company_id);
    const nextCompany = {
      ...company,
      company_id: companyIdMap.get(company.company_id) || makeId("company"),
    };
    return {
      ...nextCompany,
      lead_score: calculateLeadScore(nextCompany, hasSeedContact, defaultShopProfile),
    };
  });

  const seededContacts = seedContacts
    .map((contact) => {
      const companyId = companyIdMap.get(contact.company_id);
      if (!companyId) return null;
      return { ...contact, contact_id: makeId("contact"), company_id: companyId };
    })
    .filter(Boolean) as Contact[];

  const seededFollowUps = seedFollowUps
    .map((followUp, index) => {
      const companyId = seededCompanies.find((company) => company.company_name === followUp.company)?.company_id;
      if (!companyId) return null;
      const contactId = seededContacts.find((contact) => contact.company_id === companyId)?.contact_id;
      return {
        ...followUp,
        id: makeId("follow"),
        due: dateDaysFromNow(index + 1),
        contact: followUp.contact || seededContacts.find((contact) => contact.company_id === companyId)?.first_name || "",
        companyId,
        contactId,
      };
    })
    .filter(Boolean) as Array<FollowUp & { companyId: string; contactId?: string }>;

  return { seededCompanies, seededContacts, seededFollowUps };
}

export function useFabLeadStore() {
  const [companies, setCompanies] = useState<Company[]>(seedCompanies);
  const [contacts, setContacts] = useState<Contact[]>(seedContacts);
  const [bids, setBids] = useState<Bid[]>(seedBids);
  const [followUps, setFollowUps] = useState<FollowUp[]>(seedFollowUps);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>(defaultWorkspaceSettings);
  const [shopProfile, setShopProfile] = useState<ShopProfile>(defaultShopProfile);
  const [outreachLogs, setOutreachLogs] = useState<OutreachLog[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCompanies(readLocal(keys.companies, seedCompanies));
    setContacts(readLocal(keys.contacts, seedContacts));
    setBids(readLocal(keys.bids, seedBids));
    setFollowUps(readLocal(keys.followUps, seedFollowUps));
    setWorkspaceSettings(readLocal(keys.workspaceSettings, defaultWorkspaceSettings));
    setShopProfile(readLocal(keys.shopProfile, defaultShopProfile));
    setOutreachLogs(readLocal(keys.outreachLogs, []));
    setLoaded(true);
  }, []);

  useEffect(() => {
    const client = createClient();
    if (client === null) return;
    const supabase = client;
    let active = true;

    async function loadSupabaseWorkspace() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const { data: bootstrappedWorkspaceId } = await supabase.rpc("bootstrap_shawnee_workspace");
      const nextWorkspaceId = String(bootstrappedWorkspaceId || "");
      if (!nextWorkspaceId || !active) return;
      setWorkspaceId(nextWorkspaceId);

      const [companyResult, contactResult, followResult, bidResult, shopResult, outreachResult] = await Promise.all([
        supabase.from("companies").select("*").eq("workspace_id", nextWorkspaceId).order("lead_score", { ascending: false }),
        supabase.from("contacts").select("*").eq("workspace_id", nextWorkspaceId),
        supabase.from("follow_ups").select("*").eq("workspace_id", nextWorkspaceId).order("due_date", { ascending: true }),
        supabase.from("bid_opportunities").select("*").eq("workspace_id", nextWorkspaceId).order("bid_due_date", { ascending: true }),
        supabase.from("shop_profile").select("*").eq("workspace_id", nextWorkspaceId).maybeSingle(),
        supabase.from("outreach_logs").select("*").eq("workspace_id", nextWorkspaceId).order("outreach_date", { ascending: false }),
      ]);

      if (!active) return;
      let remoteCompanies = companyResult.data || [];
      let remoteContacts = contactResult.data || [];
      let remoteFollowUps = followResult.data || [];

      if (remoteCompanies.length === 0) {
        const { seededCompanies, seededContacts, seededFollowUps } = cloneLaunchDataForWorkspace();
        const { error: companySeedError } = await supabase.from("companies").insert(seededCompanies.map((company) => toSupabaseCompany(company, nextWorkspaceId)));

        if (!companySeedError) {
          if (seededContacts.length) {
            await supabase.from("contacts").insert(seededContacts.map((contact) => ({
              contact_id: contact.contact_id,
              workspace_id: nextWorkspaceId,
              company_id: contact.company_id,
              first_name: contact.first_name,
              last_name: contact.last_name,
              title: contact.title,
              email: contact.email,
              phone: contact.phone,
              decision_maker: contact.decision_maker,
              next_follow_up_at: contact.next_follow_up_at || null,
            })));
          }

          if (seededFollowUps.length) {
            await supabase.from("follow_ups").insert(seededFollowUps.map((followUp) => ({
              follow_up_id: followUp.id,
              workspace_id: nextWorkspaceId,
              company_id: followUp.companyId,
              contact_id: followUp.contactId || null,
              due_date: followUp.due,
              priority: followUp.priority,
              task_type: "Bid-list outreach",
              description: followUp.task,
              status: followUp.status === "Complete" ? "Completed" : "Open",
            })));
          }

          remoteCompanies = seededCompanies.map((company) => toSupabaseCompany(company, nextWorkspaceId));
          remoteContacts = seededContacts.map((contact) => ({
            ...contact,
            workspace_id: nextWorkspaceId,
          }));
          remoteFollowUps = seededFollowUps.map((followUp) => ({
            follow_up_id: followUp.id,
            workspace_id: nextWorkspaceId,
            company_id: followUp.companyId,
            contact_id: followUp.contactId || null,
            due_date: followUp.due,
            priority: followUp.priority,
            description: followUp.task,
            status: followUp.status === "Complete" ? "Completed" : "Open",
          }));
        }
      }

      if (remoteCompanies) setCompanies(remoteCompanies.map(fromSupabaseCompany));
      if (remoteContacts) setContacts(remoteContacts.map((row: any) => ({ contact_id: row.contact_id, company_id: row.company_id, first_name: row.first_name || "", last_name: row.last_name || "", title: row.title || "", email: row.email || "", phone: row.phone || "", decision_maker: Boolean(row.decision_maker), next_follow_up_at: row.next_follow_up_at?.slice?.(0, 10) || "" })));
      if (remoteFollowUps) setFollowUps(remoteFollowUps.map((row: any) => ({ id: row.follow_up_id, company: remoteCompanies.find((company: any) => company.company_id === row.company_id)?.company_name || "Unknown buyer", contact: remoteContacts.find((contact: any) => contact.contact_id === row.contact_id)?.first_name || "", task: row.description || "", due: row.due_date || "", priority: row.priority || "Medium", status: row.status === "Completed" ? "Complete" : row.status || "Open" })));
      if (bidResult.data) setBids(bidResult.data.map((row: any) => ({ id: row.bid_id, company: remoteCompanies.find((company: any) => company.company_id === row.company_id)?.company_name || "Unknown buyer", project: row.project_name || "", type: row.scope || row.project_type || "", value: Number(row.estimated_value || 0), due: row.bid_due_date || "", status: row.bid_status || "Found", probability: Number(row.probability_to_win || 0), source_url: row.source_link || "" })));
      if (shopResult.data) setShopProfile({ shopName: shopResult.data.shop_name || defaultShopProfile.shopName, serviceRadius: shopResult.data.service_radius || defaultShopProfile.serviceRadius, targetCitiesStates: shopResult.data.target_cities_states || defaultShopProfile.targetCitiesStates, tradeScopes: shopResult.data.trade_scopes || defaultShopProfile.tradeScopes, idealProjectTypes: shopResult.data.ideal_project_types || defaultShopProfile.idealProjectTypes, minimumProjectSize: Number(shopResult.data.minimum_project_size || 0), maximumProjectSize: Number(shopResult.data.maximum_project_size || 0), insuranceCertificationNotes: shopResult.data.insurance_certification_notes || "", primaryContact: shopResult.data.primary_contact || "" });
      if (outreachResult.data) setOutreachLogs(outreachResult.data.map((row: any) => ({ id: row.outreach_log_id, company: remoteCompanies.find((company: any) => company.company_id === row.company_id)?.company_name || "Unknown buyer", contact: remoteContacts.find((contact: any) => contact.contact_id === row.contact_id)?.first_name || "", type: row.outreach_type, date: row.outreach_date?.slice?.(0, 10) || "", result: row.result || "", notes: row.notes || "", nextFollowUpDate: row.next_follow_up_date || "" })));
    }

    loadSupabaseWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => { if (loaded) writeLocal(keys.companies, companies); }, [companies, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.contacts, contacts); }, [contacts, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.bids, bids); }, [bids, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.followUps, followUps); }, [followUps, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.workspaceSettings, workspaceSettings); }, [workspaceSettings, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.shopProfile, shopProfile); }, [shopProfile, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.outreachLogs, outreachLogs); }, [outreachLogs, loaded]);

  return useMemo(() => ({
    companies,
    contacts,
    bids,
    followUps,
    workspaceSettings,
    shopProfile,
    outreachLogs,
    addCompany(input: Omit<Company, "company_id">) {
      const company = { ...input, company_id: makeId("company") };
      setCompanies((current) => [company, ...current]);
      const supabase = createClient();
      if (supabase && workspaceId) supabase.from("companies").insert(toSupabaseCompany(company, workspaceId)).then(() => undefined);
      return company;
    },
    importCompanies(imported: Company[]) {
      setCompanies((current) => [...imported, ...current]);
      const supabase = createClient();
      if (supabase && workspaceId) supabase.from("companies").insert(imported.map((company) => toSupabaseCompany(company, workspaceId))).then(() => undefined);
    },
    updateCompany(next: Company) {
      setCompanies((current) => current.map((company) => company.company_id === next.company_id ? next : company));
      const supabase = createClient();
      if (supabase && workspaceId) supabase.from("companies").update(toSupabaseCompany(next, workspaceId)).eq("company_id", next.company_id).then(() => undefined);
    },
    deleteCompany(companyId: string) {
      setCompanies((current) => current.filter((company) => company.company_id !== companyId));
      setContacts((current) => current.filter((contact) => contact.company_id !== companyId));
      const supabase = createClient();
      if (supabase && workspaceId) supabase.from("companies").delete().eq("company_id", companyId).then(() => undefined);
    },
    importContacts(imported: Contact[]) {
      setContacts((current) => [...imported, ...current]);
      const supabase = createClient();
      if (supabase && workspaceId) supabase.from("contacts").insert(imported.map((contact) => ({ workspace_id: workspaceId, company_id: contact.company_id, first_name: contact.first_name, last_name: contact.last_name, title: contact.title, email: contact.email, phone: contact.phone, decision_maker: contact.decision_maker, next_follow_up_at: contact.next_follow_up_at || null }))).then(() => undefined);
    },
    addContact(input: Omit<Contact, "contact_id">) {
      const contact = { ...input, contact_id: makeId("contact") };
      setContacts((current) => [contact, ...current]);
      const supabase = createClient();
      if (supabase && workspaceId) supabase.from("contacts").insert({ workspace_id: workspaceId, company_id: contact.company_id, first_name: contact.first_name, last_name: contact.last_name, title: contact.title, email: contact.email, phone: contact.phone, decision_maker: contact.decision_maker, next_follow_up_at: contact.next_follow_up_at || null }).then(() => undefined);
      return contact;
    },
    addBid(input: Omit<Bid, "id">) {
      const bid = { ...input, id: makeId("bid") };
      setBids((current) => [bid, ...current]);
      const supabase = createClient();
      const companyId = companies.find((company) => company.company_name === bid.company)?.company_id;
      if (supabase && workspaceId && companyId) supabase.from("bid_opportunities").insert({ workspace_id: workspaceId, company_id: companyId, project_name: bid.project, scope: bid.type, estimated_value: bid.value, bid_due_date: bid.due || null, bid_status: bid.status, probability_to_win: bid.probability, source_link: bid.source_url }).then(() => undefined);
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
    updateShopProfile(next: ShopProfile) {
      setShopProfile(next);
      setWorkspaceSettings((current) => ({ ...current, companyName: next.shopName, serviceRadius: next.serviceRadius }));
      const supabase = createClient();
      if (supabase && workspaceId) supabase.from("shop_profile").upsert({ workspace_id: workspaceId, shop_name: next.shopName, service_radius: next.serviceRadius, target_cities_states: next.targetCitiesStates, trade_scopes: next.tradeScopes, ideal_project_types: next.idealProjectTypes, minimum_project_size: next.minimumProjectSize, maximum_project_size: next.maximumProjectSize, insurance_certification_notes: next.insuranceCertificationNotes, primary_contact: next.primaryContact }, { onConflict: "workspace_id" }).then(() => undefined);
    },
    addOutreachLog(input: Omit<OutreachLog, "id">) {
      const log = { ...input, id: makeId("outreach") };
      setOutreachLogs((current) => [log, ...current]);
      if (input.nextFollowUpDate) {
        setFollowUps((current) => [{
          id: makeId("follow"),
          company: input.company,
          contact: input.contact,
          task: `Follow up after ${input.type.toLowerCase()}: ${input.result || "Check next step"}`,
          due: input.nextFollowUpDate || "",
          priority: "Medium",
          status: "Open",
        }, ...current]);
      }
      setCompanies((current) => current.map((company) => company.company_name === input.company ? { ...company, lead_status: company.lead_status === "New" ? "Contacted" : company.lead_status, last_contacted_date: input.date, next_action: input.nextFollowUpDate ? "Follow up" : company.next_action } : company));
      const supabase = createClient();
      const companyId = companies.find((company) => company.company_name === input.company)?.company_id;
      const contactId = contacts.find((contact) => `${contact.first_name} ${contact.last_name}`.trim() === input.contact)?.contact_id;
      if (supabase && workspaceId && companyId) supabase.from("outreach_logs").insert({ workspace_id: workspaceId, company_id: companyId, contact_id: contactId || null, outreach_type: input.type, outreach_date: input.date, result: input.result, notes: input.notes, next_follow_up_date: input.nextFollowUpDate || null }).then(() => undefined);
      return log;
    },
    resetPilotData() {
      setCompanies(seedCompanies);
      setContacts(seedContacts);
      setBids(seedBids);
      setFollowUps(seedFollowUps);
      setWorkspaceSettings(defaultWorkspaceSettings);
      setShopProfile(defaultShopProfile);
      setOutreachLogs([]);
    },
  }), [bids, companies, contacts, followUps, outreachLogs, shopProfile, workspaceId, workspaceSettings]);
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
