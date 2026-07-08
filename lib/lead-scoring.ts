import { Company, ShopProfile } from "./types";

function includesAny(value: string | undefined, terms: string[]) {
  const haystack = (value || "").toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

export function calculateLeadScore(company: Partial<Company>, hasContact = false, shopProfile?: Partial<ShopProfile>) {
  let score = 0;
  const distance = Number(company.distance_from_base_miles || 0);

  if (distance <= 25) score += 20;
  else if (distance <= 100) score += 15;
  else if (distance <= 250) score += 8;
  else score += 3;

  if (includesAny(company.company_type, ["general contractor", "contractor", "cm", "construction manager", "procurement", "agency", "school", "county", "city", "epc"])) score += 15;
  else if (includesAny(company.company_type, ["engineering", "owner", "developer", "supplier"])) score += 10;
  else score += 5;

  if (includesAny(company.specialization, ["construction", "industrial", "infrastructure", "public", "facilities", "civic", "education", "healthcare", "water", "transportation", "commercial"])) score += 15;
  else score += 7;

  const shopFitText = `${shopProfile?.tradeScopes?.join(" ") || ""} ${shopProfile?.idealProjectTypes || ""}`.toLowerCase();
  const companyFitText = `${company.specialization || ""} ${company.typical_scopes || ""} ${company.notes || ""}`.toLowerCase();
  if (shopFitText && companyFitText && shopFitText.split(/\W+/).filter((term) => term.length > 4).some((term) => companyFitText.includes(term))) score += 8;

  if (company.prequalification_url || company.bid_portal_url || includesAny(company.invite_list_status, ["prequalification", "registration", "portal", "trade partner", "public bid"])) score += 15;
  else if (includesAny(company.invite_list_status, ["outreach", "research"])) score += 7;

  if (company.website) score += 4;
  if (company.public_phone || company.public_email) score += 4;
  if (company.source_url) score += 4;

  if (hasContact) score += 10;
  if (includesAny(company.lead_status, ["qualified", "contacted", "customer"])) score += 6;
  if (company.data_verified_at) score += 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}
