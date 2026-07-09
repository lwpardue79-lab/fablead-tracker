"use client";

import { useEffect, useMemo, useState } from "react";
import { bids as seedBids, companies as seedCompanies, contacts as seedContacts, followUps as seedFollowUps } from "./demo-data";
import { calculateLeadScore } from "./lead-scoring";
import { createClient } from "./supabase/client";
import { Bid, Company, Contact, DeletedItem, FollowUp, OutreachLog, ShopProfile, WorkspaceSettings } from "./types";

export const companyStatuses = ["New", "Contacted", "Qualified", "Registered", "Bid Invite Received", "Customer", "Not Fit", "Archived"];
export const bidStatuses = ["Found", "Reviewing", "Bidding", "Submitted", "Won", "Lost", "No-Bid", "Canceled", "Archived"];
export const followUpStatuses = ["Open", "Completed", "Snoozed", "Canceled", "Archived"];
export const contactTypes = ["estimating", "procurement", "prequalification", "project manager", "owner/executive", "general office", "unknown"];
export const outreachTypes: OutreachLog["type"][] = ["Call", "Email", "Meeting", "Portal Registration", "Note", "Other"];

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
  phone: "",
  email: "",
  website: "",
  pastProjectExamples: "",
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

function isoNow() {
  return new Date().toISOString();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateDaysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isDeleted(item: { deleted_at?: string }) {
  return Boolean(item.deleted_at);
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
    next_action_due_date: row.next_action_due_date || "",
    next_action_owner: row.next_action_owner || "",
    next_action_priority: row.next_action_priority || "Medium",
    last_contacted_date: row.last_contacted_date || "",
    deleted_at: row.deleted_at || "",
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
    data_verified_at: company.data_verified_at || null,
    notes: company.notes,
    next_action: company.next_action,
    next_action_due_date: company.next_action_due_date || null,
    next_action_owner: company.next_action_owner,
    next_action_priority: company.next_action_priority,
    last_contacted_date: company.last_contacted_date || null,
    deleted_at: company.deleted_at || null,
  };
}

function fromSupabaseContact(row: Record<string, any>): Contact {
  return {
    contact_id: row.contact_id,
    company_id: row.company_id,
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    title: row.title || "",
    email: row.email || "",
    phone: row.phone || "",
    linkedin_url: row.linkedin_url || "",
    contact_type: row.contact_type || "unknown",
    source: row.source || "",
    confidence_level: row.confidence_level || "Medium",
    notes: row.notes || "",
    decision_maker: Boolean(row.decision_maker),
    next_follow_up_at: row.next_follow_up_at?.slice?.(0, 10) || "",
    deleted_at: row.deleted_at || "",
  };
}

function toSupabaseContact(contact: Contact, workspaceId: string) {
  return {
    contact_id: contact.contact_id,
    workspace_id: workspaceId,
    company_id: contact.company_id,
    first_name: contact.first_name,
    last_name: contact.last_name,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    linkedin_url: contact.linkedin_url,
    contact_type: contact.contact_type,
    source: contact.source,
    confidence_level: contact.confidence_level,
    notes: contact.notes,
    decision_maker: contact.decision_maker,
    next_follow_up_at: contact.next_follow_up_at || null,
    deleted_at: contact.deleted_at || null,
  };
}

function fromSupabaseBid(row: Record<string, any>, companies: Company[], contacts: Contact[]): Bid {
  const contact = contacts.find((item) => item.contact_id === row.contact_id);
  const status = row.bid_status === "Cancelled" ? "Canceled" : row.bid_status || "Found";
  return {
    id: row.bid_id,
    company_id: row.company_id,
    company: companies.find((company) => company.company_id === row.company_id)?.company_name || "Unknown buyer",
    contact_id: row.contact_id || "",
    contact: contact ? `${contact.first_name} ${contact.last_name}`.trim() : "",
    project: row.project_name || "",
    type: row.scope || row.project_type || "",
    value: Number(row.estimated_value || 0),
    due: row.bid_due_date || "",
    submitted_date: row.submitted_date || "",
    result_date: row.result_date || "",
    final_submitted_value: Number(row.final_submitted_value || 0),
    status,
    result: row.result || (["Won", "Lost", "No-Bid", "Canceled"].includes(status) ? status : "Pending"),
    probability: Number(row.probability_to_win || 0),
    source_url: row.source_link || "",
    location: row.location || "",
    notes: row.notes || "",
    created_at: row.created_at?.slice?.(0, 10) || "",
    deleted_at: row.deleted_at || "",
  };
}

function fromSupabaseFollowUp(row: Record<string, any>, companies: Company[], contacts: Contact[]): FollowUp {
  const contact = contacts.find((item) => item.contact_id === row.contact_id);
  return {
    id: row.follow_up_id,
    company_id: row.company_id,
    company: companies.find((company) => company.company_id === row.company_id)?.company_name || "Unknown buyer",
    contact_id: row.contact_id || "",
    contact: contact ? `${contact.first_name} ${contact.last_name}`.trim() : "",
    task: row.description || "",
    due: row.due_date || "",
    priority: row.priority || "Medium",
    status: row.status === "Cancelled" ? "Canceled" : row.status || "Open",
    task_type: row.task_type || "",
    notes: row.notes || "",
    deleted_at: row.deleted_at || "",
  };
}

function fromSupabaseOutreach(row: Record<string, any>, companies: Company[], contacts: Contact[]): OutreachLog {
  const contact = contacts.find((item) => item.contact_id === row.contact_id);
  return {
    id: row.outreach_log_id,
    company_id: row.company_id,
    company: companies.find((company) => company.company_id === row.company_id)?.company_name || "Unknown buyer",
    contact_id: row.contact_id || "",
    contact: contact ? `${contact.first_name} ${contact.last_name}`.trim() : "",
    type: row.outreach_type || "Note",
    date: row.outreach_date?.slice?.(0, 10) || "",
    result: row.result || "",
    notes: row.notes || "",
    nextFollowUpDate: row.next_follow_up_date || "",
    deleted_at: row.deleted_at || "",
  };
}

function bidStatusForSupabase(status?: string, legacy = false) {
  if (legacy && status === "Canceled") return "Cancelled";
  return status || "Found";
}

function supabaseBidPayload(bid: Bid, workspaceId?: string, legacy = false) {
  const payload: Record<string, any> = {
    ...(workspaceId ? { workspace_id: workspaceId, bid_id: bid.id } : {}),
    company_id: bid.company_id,
    contact_id: bid.contact_id || null,
    project_name: bid.project,
    scope: bid.type,
    location: bid.location,
    estimated_value: bid.value,
    bid_due_date: bid.due || null,
    submitted_date: bid.submitted_date || null,
    bid_status: bidStatusForSupabase(bid.status, legacy),
    result: bid.result || "Pending",
    probability_to_win: bid.probability,
    source_link: bid.source_url,
    notes: bid.notes,
  };
  if (!legacy) {
    payload.final_submitted_value = bid.final_submitted_value || null;
    payload.result_date = bid.result_date || null;
  }
  if (bid.deleted_at) payload.deleted_at = bid.deleted_at;
  if (workspaceId) payload.created_at = bid.created_at || isoNow();
  return payload;
}

function cloneLaunchDataForWorkspace() {
  const companyIdMap = new Map(seedCompanies.map((company) => [company.company_id, makeId("company")]));
  const seededCompanies = seedCompanies.map((company) => {
    const hasSeedContact = seedContacts.some((contact) => contact.company_id === company.company_id);
    const nextCompany: Company = {
      ...company,
      company_id: companyIdMap.get(company.company_id) || makeId("company"),
      next_action: company.next_action || "Request bid-list or prequalification path",
      next_action_due_date: dateDaysFromNow(3),
      next_action_owner: defaultWorkspaceSettings.userName,
      next_action_priority: company.lead_score >= 90 ? "High" : "Medium",
    };
    return { ...nextCompany, lead_score: calculateLeadScore(nextCompany, hasSeedContact, defaultShopProfile) };
  });

  const seededContacts = seedContacts
    .map((contact) => {
      const companyId = companyIdMap.get(contact.company_id);
      if (!companyId) return null;
      return { ...contact, contact_id: makeId("contact"), company_id: companyId, contact_type: "prequalification", confidence_level: "High", source: "Public website" };
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
        task_type: "Bid-list outreach",
        notes: "Starter pilot task.",
        contact: followUp.contact || seededContacts.find((contact) => contact.company_id === companyId)?.first_name || "",
        company_id: companyId,
        contact_id: contactId,
      };
    })
    .filter(Boolean) as FollowUp[];

  return { seededCompanies, seededContacts, seededFollowUps };
}

export function useFabLeadStore() {
  const [allCompanies, setAllCompanies] = useState<Company[]>(seedCompanies);
  const [allContacts, setAllContacts] = useState<Contact[]>(seedContacts);
  const [allBids, setAllBids] = useState<Bid[]>(seedBids);
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>(seedFollowUps);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>(defaultWorkspaceSettings);
  const [shopProfile, setShopProfile] = useState<ShopProfile>(defaultShopProfile);
  const [allOutreachLogs, setAllOutreachLogs] = useState<OutreachLog[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const normalizedCompanies = readLocal(keys.companies, seedCompanies).map((company) => ({
      ...company,
      next_action: company.next_action || "Request bid-list or prequalification path",
      next_action_due_date: company.next_action_due_date || "",
      next_action_priority: company.next_action_priority || "Medium",
    }));
    setAllCompanies(normalizedCompanies);
    setAllContacts(readLocal(keys.contacts, seedContacts));
    setAllBids(readLocal(keys.bids, seedBids));
    setAllFollowUps(readLocal(keys.followUps, seedFollowUps));
    setWorkspaceSettings(readLocal(keys.workspaceSettings, defaultWorkspaceSettings));
    setShopProfile(readLocal(keys.shopProfile, defaultShopProfile));
    setAllOutreachLogs(readLocal(keys.outreachLogs, []));
    setLoaded(true);
  }, []);

  useEffect(() => {
    const client = createClient();
    setSupabaseConfigured(client !== null);
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
      let remoteCompanies = (companyResult.data || []).map(fromSupabaseCompany);
      let remoteContacts = (contactResult.data || []).map(fromSupabaseContact);
      let remoteFollowUps: FollowUp[] = [];

      if (remoteCompanies.length === 0) {
        const { seededCompanies, seededContacts, seededFollowUps } = cloneLaunchDataForWorkspace();
        const { error: companySeedError } = await supabase.from("companies").insert(seededCompanies.map((company) => toSupabaseCompany(company, nextWorkspaceId)));

        if (!companySeedError) {
          if (seededContacts.length) await supabase.from("contacts").insert(seededContacts.map((contact) => toSupabaseContact(contact, nextWorkspaceId)));
          if (seededFollowUps.length) {
            await supabase.from("follow_ups").insert(seededFollowUps.map((followUp) => ({
              follow_up_id: followUp.id,
              workspace_id: nextWorkspaceId,
              company_id: followUp.company_id,
              contact_id: followUp.contact_id || null,
              due_date: followUp.due,
              priority: followUp.priority,
              task_type: followUp.task_type || "Bid-list outreach",
              description: followUp.task,
              notes: followUp.notes,
              status: followUp.status === "Complete" ? "Completed" : followUp.status || "Open",
            })));
          }
          remoteCompanies = seededCompanies;
          remoteContacts = seededContacts;
          remoteFollowUps = seededFollowUps;
        }
      }

      if (remoteFollowUps.length === 0) remoteFollowUps = (followResult.data || []).map((row: any) => fromSupabaseFollowUp(row, remoteCompanies, remoteContacts));
      setAllCompanies(remoteCompanies);
      setAllContacts(remoteContacts);
      setAllFollowUps(remoteFollowUps);
      setAllBids((bidResult.data || []).map((row: any) => fromSupabaseBid(row, remoteCompanies, remoteContacts)));
      setAllOutreachLogs((outreachResult.data || []).map((row: any) => fromSupabaseOutreach(row, remoteCompanies, remoteContacts)));
      if (shopResult.data) setShopProfile({
        shopName: shopResult.data.shop_name || defaultShopProfile.shopName,
        serviceRadius: shopResult.data.service_radius || defaultShopProfile.serviceRadius,
        targetCitiesStates: shopResult.data.target_cities_states || defaultShopProfile.targetCitiesStates,
        tradeScopes: shopResult.data.trade_scopes || defaultShopProfile.tradeScopes,
        idealProjectTypes: shopResult.data.ideal_project_types || defaultShopProfile.idealProjectTypes,
        minimumProjectSize: Number(shopResult.data.minimum_project_size || 0),
        maximumProjectSize: Number(shopResult.data.maximum_project_size || 0),
        insuranceCertificationNotes: shopResult.data.insurance_certification_notes || "",
        primaryContact: shopResult.data.primary_contact || "",
        phone: shopResult.data.phone || "",
        email: shopResult.data.email || "",
        website: shopResult.data.website || "",
        pastProjectExamples: shopResult.data.past_project_examples || "",
      });
    }

    loadSupabaseWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => { if (loaded) writeLocal(keys.companies, allCompanies); }, [allCompanies, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.contacts, allContacts); }, [allContacts, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.bids, allBids); }, [allBids, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.followUps, allFollowUps); }, [allFollowUps, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.workspaceSettings, workspaceSettings); }, [workspaceSettings, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.shopProfile, shopProfile); }, [shopProfile, loaded]);
  useEffect(() => { if (loaded) writeLocal(keys.outreachLogs, allOutreachLogs); }, [allOutreachLogs, loaded]);

  const activeCompanies = allCompanies.filter((company) => !isDeleted(company));
  const activeCompanyIds = new Set(activeCompanies.map((company) => company.company_id));
  const activeContacts = allContacts.filter((contact) => !isDeleted(contact) && activeCompanyIds.has(contact.company_id));
  const activeBids = allBids.filter((bid) => !isDeleted(bid) && (!bid.company_id || activeCompanyIds.has(bid.company_id)));
  const activeFollowUps = allFollowUps.filter((followUp) => !isDeleted(followUp) && (!followUp.company_id || activeCompanyIds.has(followUp.company_id)) && followUp.status !== "Archived");
  const activeOutreachLogs = allOutreachLogs.filter((log) => !isDeleted(log) && (!log.company_id || activeCompanyIds.has(log.company_id)));

  const deletedItems: DeletedItem[] = [
    ...allCompanies.filter(isDeleted).map((item) => ({ id: item.company_id, type: "company" as const, label: item.company_name, detail: item.lead_status, deletedAt: item.deleted_at || "" })),
    ...allContacts.filter(isDeleted).map((item) => ({ id: item.contact_id, type: "contact" as const, label: `${item.first_name} ${item.last_name}`.trim() || item.email || "Unnamed contact", detail: activeCompanies.find((company) => company.company_id === item.company_id)?.company_name, deletedAt: item.deleted_at || "" })),
    ...allBids.filter(isDeleted).map((item) => ({ id: item.id, type: "bid" as const, label: item.project, detail: item.company, deletedAt: item.deleted_at || "" })),
    ...allFollowUps.filter(isDeleted).map((item) => ({ id: item.id, type: "followUp" as const, label: item.task, detail: item.company, deletedAt: item.deleted_at || "" })),
    ...allOutreachLogs.filter(isDeleted).map((item) => ({ id: item.id, type: "outreach" as const, label: `${item.type}: ${item.company}`, detail: item.result || item.notes, deletedAt: item.deleted_at || "" })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

  function supabaseClient() {
    return createClient();
  }

  function updateCompanySupabase(company: Company) {
    const supabase = supabaseClient();
    if (supabase && workspaceId) supabase.from("companies").update(toSupabaseCompany(company, workspaceId)).eq("company_id", company.company_id).then(() => undefined);
  }

  function archiveRecord(type: DeletedItem["type"], id: string) {
    const deleted_at = isoNow();
    const supabase = supabaseClient();

    if (type === "company") {
      setAllCompanies((current) => current.map((item) => item.company_id === id ? { ...item, deleted_at, lead_status: "Archived" } : item));
      if (supabase && workspaceId) supabase.from("companies").update({ deleted_at, lead_status: "Archived" }).eq("company_id", id).then(() => undefined);
    }
    if (type === "contact") {
      setAllContacts((current) => current.map((item) => item.contact_id === id ? { ...item, deleted_at } : item));
      if (supabase && workspaceId) supabase.from("contacts").update({ deleted_at }).eq("contact_id", id).then(() => undefined);
    }
    if (type === "bid") {
      setAllBids((current) => current.map((item) => item.id === id ? { ...item, deleted_at, status: "Archived" } : item));
      if (supabase && workspaceId) supabase.from("bid_opportunities").update({ deleted_at, bid_status: "Archived" }).eq("bid_id", id).then(() => undefined);
    }
    if (type === "followUp") {
      setAllFollowUps((current) => current.map((item) => item.id === id ? { ...item, deleted_at, status: "Archived" } : item));
      if (supabase && workspaceId) supabase.from("follow_ups").update({ deleted_at, status: "Archived" }).eq("follow_up_id", id).then(() => undefined);
    }
    if (type === "outreach") {
      setAllOutreachLogs((current) => current.map((item) => item.id === id ? { ...item, deleted_at } : item));
      if (supabase && workspaceId) supabase.from("outreach_logs").update({ deleted_at }).eq("outreach_log_id", id).then(() => undefined);
    }
  }

  function restoreRecord(type: DeletedItem["type"], id: string) {
    const supabase = supabaseClient();
    if (type === "company") {
      setAllCompanies((current) => current.map((item) => item.company_id === id ? { ...item, deleted_at: "", lead_status: item.lead_status === "Archived" ? "New" : item.lead_status } : item));
      if (supabase && workspaceId) supabase.from("companies").update({ deleted_at: null, lead_status: "New" }).eq("company_id", id).then(() => undefined);
    }
    if (type === "contact") {
      setAllContacts((current) => current.map((item) => item.contact_id === id ? { ...item, deleted_at: "" } : item));
      if (supabase && workspaceId) supabase.from("contacts").update({ deleted_at: null }).eq("contact_id", id).then(() => undefined);
    }
    if (type === "bid") {
      setAllBids((current) => current.map((item) => item.id === id ? { ...item, deleted_at: "", status: item.status === "Archived" ? "Found" : item.status } : item));
      if (supabase && workspaceId) supabase.from("bid_opportunities").update({ deleted_at: null, bid_status: "Found" }).eq("bid_id", id).then(() => undefined);
    }
    if (type === "followUp") {
      setAllFollowUps((current) => current.map((item) => item.id === id ? { ...item, deleted_at: "", status: item.status === "Archived" ? "Open" : item.status } : item));
      if (supabase && workspaceId) supabase.from("follow_ups").update({ deleted_at: null, status: "Open" }).eq("follow_up_id", id).then(() => undefined);
    }
    if (type === "outreach") {
      setAllOutreachLogs((current) => current.map((item) => item.id === id ? { ...item, deleted_at: "" } : item));
      if (supabase && workspaceId) supabase.from("outreach_logs").update({ deleted_at: null }).eq("outreach_log_id", id).then(() => undefined);
    }
  }

  function permanentlyDeleteRecord(type: DeletedItem["type"], id: string) {
    const supabase = supabaseClient();
    if (type === "company") {
      setAllCompanies((current) => current.filter((item) => item.company_id !== id));
      if (supabase && workspaceId) supabase.from("companies").delete().eq("company_id", id).then(() => undefined);
    }
    if (type === "contact") {
      setAllContacts((current) => current.filter((item) => item.contact_id !== id));
      if (supabase && workspaceId) supabase.from("contacts").delete().eq("contact_id", id).then(() => undefined);
    }
    if (type === "bid") {
      setAllBids((current) => current.filter((item) => item.id !== id));
      if (supabase && workspaceId) supabase.from("bid_opportunities").delete().eq("bid_id", id).then(() => undefined);
    }
    if (type === "followUp") {
      setAllFollowUps((current) => current.filter((item) => item.id !== id));
      if (supabase && workspaceId) supabase.from("follow_ups").delete().eq("follow_up_id", id).then(() => undefined);
    }
    if (type === "outreach") {
      setAllOutreachLogs((current) => current.filter((item) => item.id !== id));
      if (supabase && workspaceId) supabase.from("outreach_logs").delete().eq("outreach_log_id", id).then(() => undefined);
    }
  }

  return useMemo(() => ({
    companies: activeCompanies,
    contacts: activeContacts,
    bids: activeBids,
    followUps: activeFollowUps,
    workspaceSettings,
    shopProfile,
    outreachLogs: activeOutreachLogs,
    deletedItems,
    storageStatus: supabaseConfigured ? (workspaceId ? "Database connected" : "Supabase configured — sign in to sync") : "Browser storage mode",
    addCompany(input: Omit<Company, "company_id">) {
      const company = { ...input, company_id: makeId("company"), next_action_priority: input.next_action_priority || "Medium" };
      setAllCompanies((current) => [company, ...current]);
      const supabase = supabaseClient();
      if (supabase && workspaceId) supabase.from("companies").insert(toSupabaseCompany(company, workspaceId)).then(() => undefined);
      return company;
    },
    importCompanies(imported: Company[]) {
      setAllCompanies((current) => [...imported, ...current]);
      const supabase = supabaseClient();
      if (supabase && workspaceId) supabase.from("companies").insert(imported.map((company) => toSupabaseCompany(company, workspaceId))).then(() => undefined);
    },
    updateCompany(next: Company) {
      setAllCompanies((current) => current.map((company) => company.company_id === next.company_id ? next : company));
      updateCompanySupabase(next);
    },
    addCompanyStatusHistory(company: Company, oldStatus: string, newStatus: string, user = workspaceSettings.userName) {
      if (oldStatus === newStatus) return;
      const log: OutreachLog = {
        id: makeId("status-history"),
        company: company.company_name,
        company_id: company.company_id,
        contact: user || "System",
        contact_id: "",
        type: "Note",
        date: today(),
        result: `Status changed from ${oldStatus || "Unknown"} to ${newStatus}.`,
        notes: `Status history · changed by ${user || "Unknown user"} on ${today()}.`,
        nextFollowUpDate: "",
      };
      setAllOutreachLogs((current) => [log, ...current]);
      const supabase = supabaseClient();
      if (supabase && workspaceId) supabase.from("outreach_logs").insert({
        outreach_log_id: log.id,
        workspace_id: workspaceId,
        company_id: company.company_id,
        contact_id: null,
        outreach_type: "Note",
        outreach_date: log.date,
        result: log.result,
        notes: log.notes,
        next_follow_up_date: null,
      }).then(() => undefined);
    },
    archiveCompany(companyId: string) {
      archiveRecord("company", companyId);
    },
    deleteCompany(companyId: string) {
      archiveRecord("company", companyId);
    },
    importContacts(imported: Contact[]) {
      setAllContacts((current) => [...imported, ...current]);
      const supabase = supabaseClient();
      if (supabase && workspaceId) supabase.from("contacts").insert(imported.map((contact) => toSupabaseContact(contact, workspaceId))).then(() => undefined);
    },
    addContact(input: Omit<Contact, "contact_id">) {
      const contact = { ...input, contact_id: makeId("contact"), contact_type: input.contact_type || "unknown", confidence_level: input.confidence_level || "Medium" };
      setAllContacts((current) => [contact, ...current]);
      const supabase = supabaseClient();
      if (supabase && workspaceId) supabase.from("contacts").insert(toSupabaseContact(contact, workspaceId)).then(() => undefined);
      return contact;
    },
    updateContact(next: Contact) {
      setAllContacts((current) => current.map((contact) => contact.contact_id === next.contact_id ? next : contact));
      const supabase = supabaseClient();
      if (supabase && workspaceId) supabase.from("contacts").update(toSupabaseContact(next, workspaceId)).eq("contact_id", next.contact_id).then(() => undefined);
    },
    archiveContact(contactId: string) {
      archiveRecord("contact", contactId);
    },
    addBid(input: Omit<Bid, "id">) {
      const company = activeCompanies.find((item) => item.company_id === input.company_id || item.company_name === input.company);
      const bid = { ...input, id: makeId("bid"), company_id: input.company_id || company?.company_id, company: input.company || company?.company_name || "Unknown buyer" };
      setAllBids((current) => [bid, ...current]);
      const supabase = supabaseClient();
      if (supabase && workspaceId && bid.company_id) supabase.from("bid_opportunities").insert(supabaseBidPayload(bid, workspaceId)).then(({ error }) => {
        if (error) supabase.from("bid_opportunities").insert(supabaseBidPayload(bid, workspaceId, true)).then(() => undefined);
      });
      return bid;
    },
    updateBid(next: Bid) {
      setAllBids((current) => current.map((bid) => bid.id === next.id ? next : bid));
      const supabase = supabaseClient();
      if (supabase && workspaceId) supabase.from("bid_opportunities").update({ ...supabaseBidPayload(next), deleted_at: next.deleted_at || null }).eq("bid_id", next.id).then(({ error }) => {
        if (error) supabase.from("bid_opportunities").update({ ...supabaseBidPayload(next, undefined, true), deleted_at: next.deleted_at || null }).eq("bid_id", next.id).then(() => undefined);
      });
    },
    archiveBid(bidId: string) {
      archiveRecord("bid", bidId);
    },
    addFollowUp(input: Omit<FollowUp, "id">) {
      const company = activeCompanies.find((item) => item.company_id === input.company_id || item.company_name === input.company);
      const followUp = { ...input, id: makeId("follow"), company_id: input.company_id || company?.company_id, company: input.company || company?.company_name || "Unknown buyer" };
      setAllFollowUps((current) => [followUp, ...current]);
      const supabase = supabaseClient();
      if (supabase && workspaceId && followUp.company_id) supabase.from("follow_ups").insert({ follow_up_id: followUp.id, workspace_id: workspaceId, company_id: followUp.company_id, contact_id: followUp.contact_id || null, due_date: followUp.due || today(), priority: followUp.priority, task_type: followUp.task_type, description: followUp.task, notes: followUp.notes, status: followUp.status === "Canceled" ? "Cancelled" : followUp.status }).then(() => undefined);
      return followUp;
    },
    updateFollowUp(next: FollowUp) {
      setAllFollowUps((current) => current.map((followUp) => followUp.id === next.id ? next : followUp));
      const supabase = supabaseClient();
      if (supabase && workspaceId) supabase.from("follow_ups").update({ company_id: next.company_id, contact_id: next.contact_id || null, due_date: next.due || today(), priority: next.priority, task_type: next.task_type, description: next.task, notes: next.notes, status: next.status === "Canceled" ? "Cancelled" : next.status, deleted_at: next.deleted_at || null, completed_at: next.status === "Completed" ? isoNow() : null }).eq("follow_up_id", next.id).then(() => undefined);
    },
    updateFollowUps(next: FollowUp[]) {
      setAllFollowUps(next);
    },
    archiveFollowUp(followUpId: string) {
      archiveRecord("followUp", followUpId);
    },
    updateWorkspaceSettings(next: WorkspaceSettings) {
      setWorkspaceSettings(next);
    },
    updateShopProfile(next: ShopProfile) {
      setShopProfile(next);
      setWorkspaceSettings((current) => ({ ...current, companyName: next.shopName, serviceRadius: next.serviceRadius }));
      const supabase = supabaseClient();
      if (supabase && workspaceId) supabase.from("shop_profile").upsert({ workspace_id: workspaceId, shop_name: next.shopName, service_radius: next.serviceRadius, target_cities_states: next.targetCitiesStates, trade_scopes: next.tradeScopes, ideal_project_types: next.idealProjectTypes, minimum_project_size: next.minimumProjectSize, maximum_project_size: next.maximumProjectSize, insurance_certification_notes: next.insuranceCertificationNotes, primary_contact: next.primaryContact, phone: next.phone, email: next.email, website: next.website, past_project_examples: next.pastProjectExamples }, { onConflict: "workspace_id" }).then(() => undefined);
    },
    addOutreachLog(input: Omit<OutreachLog, "id">) {
      const company = activeCompanies.find((item) => item.company_id === input.company_id || item.company_name === input.company);
      const log = { ...input, id: makeId("outreach"), company_id: input.company_id || company?.company_id, company: input.company || company?.company_name || "Unknown buyer" };
      let followUpToSave: FollowUp | null = null;
      setAllOutreachLogs((current) => [log, ...current]);
      if (input.nextFollowUpDate) {
        followUpToSave = {
          id: makeId("follow"),
          company: log.company,
          company_id: log.company_id,
          contact: input.contact,
          contact_id: input.contact_id,
          task: `Follow up after ${input.type.toLowerCase()}: ${input.result || "Check next step"}`,
          due: input.nextFollowUpDate || "",
          priority: "Medium",
          status: "Open",
          task_type: "Outreach",
          notes: input.notes,
        };
        setAllFollowUps((current) => followUpToSave ? [followUpToSave, ...current] : current);
      }
      if (company) {
        const nextCompany = {
          ...company,
          lead_status: company.lead_status === "New" ? "Contacted" : company.lead_status,
          last_contacted_date: input.date,
          next_action: input.nextFollowUpDate ? "Follow up" : company.next_action,
          next_action_due_date: input.nextFollowUpDate || company.next_action_due_date,
        };
        setAllCompanies((current) => current.map((item) => item.company_id === company.company_id ? nextCompany : item));
        updateCompanySupabase(nextCompany);
      }
      const supabase = supabaseClient();
      if (supabase && workspaceId && log.company_id) supabase.from("outreach_logs").insert({ outreach_log_id: log.id, workspace_id: workspaceId, company_id: log.company_id, contact_id: log.contact_id || null, outreach_type: input.type, outreach_date: input.date, result: input.result, notes: input.notes, next_follow_up_date: input.nextFollowUpDate || null }).then(() => undefined);
      if (supabase && workspaceId && followUpToSave?.company_id) supabase.from("follow_ups").insert({
        follow_up_id: followUpToSave.id,
        workspace_id: workspaceId,
        company_id: followUpToSave.company_id,
        contact_id: followUpToSave.contact_id || null,
        due_date: followUpToSave.due || today(),
        priority: followUpToSave.priority,
        task_type: followUpToSave.task_type,
        description: followUpToSave.task,
        notes: followUpToSave.notes,
        status: followUpToSave.status,
      }).then(() => undefined);
      return log;
    },
    updateOutreachLog(next: OutreachLog) {
      setAllOutreachLogs((current) => current.map((log) => log.id === next.id ? next : log));
      const supabase = supabaseClient();
      if (supabase && workspaceId) supabase.from("outreach_logs").update({ company_id: next.company_id, contact_id: next.contact_id || null, outreach_type: next.type, outreach_date: next.date, result: next.result, notes: next.notes, next_follow_up_date: next.nextFollowUpDate || null, deleted_at: next.deleted_at || null }).eq("outreach_log_id", next.id).then(() => undefined);
    },
    archiveOutreachLog(outreachId: string) {
      archiveRecord("outreach", outreachId);
    },
    restoreRecord,
    permanentlyDeleteRecord,
    resetPilotData() {
      setAllCompanies(seedCompanies);
      setAllContacts(seedContacts);
      setAllBids(seedBids);
      setAllFollowUps(seedFollowUps);
      setWorkspaceSettings(defaultWorkspaceSettings);
      setShopProfile(defaultShopProfile);
      setAllOutreachLogs([]);
    },
  }), [activeBids, activeCompanies, activeContacts, activeFollowUps, activeOutreachLogs, deletedItems, shopProfile, supabaseConfigured, workspaceId, workspaceSettings]);
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      i += 1;
    } else if (char === "\"") {
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
    linkedin_url: row.linkedin_url || "",
    contact_type: row.contact_type || "unknown",
    source: row.source || row.contact_source || "CSV import",
    confidence_level: row.confidence_level || "Medium",
    notes: row.contact_notes || "",
    decision_maker: ["true", "yes", "1", "y"].includes((row.decision_maker || "").toLowerCase()),
    next_follow_up_at: row.next_follow_up_at || "",
  };

  if (!contact.first_name && !contact.last_name && !contact.email && !contact.phone && !contact.title) return null;
  return { ...contact, contact_id: makeId("imported-contact") };
}

export function csvRowsToImportData(rows: Record<string, string>[]): { companies: Company[]; contacts: Contact[]; errors: string[]; duplicateNames: string[] } {
  const contacts: Contact[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const duplicateNames: string[] = [];
  const companies = rows
    .filter((row) => row.company_name || row.company || row.buyer)
    .map((row, index) => {
      const companyId = makeId("imported-company");
      const name = row.company_name || row.company || row.buyer || "Unnamed buyer";
      const normalizedName = name.trim().toLowerCase();
      if (seen.has(normalizedName)) duplicateNames.push(name);
      seen.add(normalizedName);
      if (!row.city && !row.state) errors.push(`Row ${index + 2}: missing city/state.`);
      const importedContact = contactFromRow(row, companyId);
      if (importedContact) contacts.push(importedContact);
      const company: Company = {
        company_id: companyId,
        company_name: name,
        company_type: row.company_type || row.buyer_type || "Buyer",
        city: row.city || "Kansas City",
        state: row.state || "MO",
        specialization: row.specialization || row.project_market || row.industry_served || "Commercial Construction",
        lead_status: row.lead_status || "New",
        lead_score: 0,
        distance_from_base_miles: Number(row.distance_from_base_miles || 0),
        public_phone: row.public_phone || row.company_phone || "",
        public_email: row.public_email || row.company_email || "",
        estimating_email: row.estimating_email || row.public_email || "",
        website: row.website,
        source_url: row.source_url,
        prequalification_url: row.prequalification_url,
        bid_portal_url: row.bid_portal_url,
        invite_list_status: row.invite_list_status || "Imported",
        typical_scopes: row.typical_scopes,
        next_action: row.next_action || "Review and request bid-list path",
        next_action_due_date: row.next_action_due_date || "",
        next_action_owner: row.next_action_owner || defaultWorkspaceSettings.userName,
        next_action_priority: row.next_action_priority || "Medium",
        data_verified_at: row.data_verified_at || today(),
        notes: row.notes || "Imported from CSV.",
      };
      return { ...company, lead_score: calculateLeadScore(company, Boolean(importedContact)) };
    });
  return { companies, contacts, errors, duplicateNames };
}

export function csvRowsToCompanies(rows: Record<string, string>[]): Company[] {
  return csvRowsToImportData(rows).companies;
}
