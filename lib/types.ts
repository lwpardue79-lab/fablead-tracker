export type CompanyStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Registered"
  | "Bid Invite Received"
  | "Customer"
  | "Not Fit"
  | "Archived";

export type Company = {
  company_id: string;
  company_name: string;
  company_type: string;
  city: string;
  state: string;
  specialization: string;
  lead_status: string;
  lead_score: number;
  distance_from_base_miles: number;
  public_phone?: string;
  public_email?: string;
  website?: string;
  notes?: string;
  prequalification_url?: string;
  bid_portal_url?: string;
  source_url?: string;
  invite_list_status?: string;
  typical_scopes?: string;
  data_verified_at?: string;
  estimating_email?: string;
  next_action?: string;
  next_action_due_date?: string;
  next_action_owner?: string;
  next_action_priority?: string;
  last_contacted_date?: string;
  deleted_at?: string;
};

export type Contact = {
  contact_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  phone: string;
  decision_maker: boolean;
  next_follow_up_at?: string;
  linkedin_url?: string;
  contact_type?: string;
  source?: string;
  confidence_level?: string;
  notes?: string;
  deleted_at?: string;
};

export type Bid = {
  id: string;
  company: string;
  company_id?: string;
  contact_id?: string;
  contact?: string;
  project: string;
  type: string;
  value: number;
  due: string;
  status: string;
  probability: number;
  source_url?: string;
  location?: string;
  notes?: string;
  deleted_at?: string;
};

export type FollowUp = {
  id: string;
  company: string;
  company_id?: string;
  contact: string;
  contact_id?: string;
  task: string;
  due: string;
  priority: string;
  status: string;
  task_type?: string;
  notes?: string;
  deleted_at?: string;
};

export type WorkspaceSettings = {
  companyName: string;
  userName: string;
  baseMarket: string;
  coverage: string;
  serviceRadius: string;
};

export type ShopProfile = {
  shopName: string;
  serviceRadius: string;
  targetCitiesStates: string;
  tradeScopes: string[];
  idealProjectTypes: string;
  minimumProjectSize: number;
  maximumProjectSize: number;
  insuranceCertificationNotes: string;
  primaryContact: string;
  phone?: string;
  email?: string;
  website?: string;
  pastProjectExamples?: string;
};

export type OutreachLog = {
  id: string;
  company: string;
  company_id?: string;
  contact: string;
  contact_id?: string;
  type: "Call" | "Email" | "Meeting" | "Portal Registration" | "Note" | "Other";
  date: string;
  result: string;
  notes: string;
  nextFollowUpDate?: string;
  deleted_at?: string;
};

export type DeletedItem = {
  id: string;
  type: "company" | "contact" | "bid" | "followUp" | "outreach";
  label: string;
  detail?: string;
  deletedAt: string;
};
