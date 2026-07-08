export type Company = {
  company_id: string; company_name: string; company_type: string; city: string; state: string;
  specialization: string; lead_status: string; lead_score: number; distance_from_base_miles: number;
  public_phone?: string; public_email?: string; website?: string; notes?: string;
  prequalification_url?: string; bid_portal_url?: string; source_url?: string;
  invite_list_status?: string; typical_scopes?: string; data_verified_at?: string;
};

export type Contact = {
  contact_id: string; company_id: string; first_name: string; last_name: string; title: string;
  email: string; phone: string; decision_maker: boolean; next_follow_up_at?: string;
};

export type Bid = {
  id: string;
  company: string;
  project: string;
  type: string;
  value: number;
  due: string;
  status: string;
  probability: number;
  source_url?: string;
};

export type FollowUp = {
  id: string;
  company: string;
  contact: string;
  task: string;
  due: string;
  priority: string;
  status: string;
};
