import { Bid } from "./types";

export const currentBidStatuses = ["Found", "Reviewing", "Bidding", "Submitted"];
export const pastBidStatuses = ["Won", "Lost", "No-Bid", "Canceled", "Archived"];
export const bidResults = ["Pending", "Won", "Lost", "No-Bid", "Canceled"];
export const bidDateFields = [
  ["due", "Due date"],
  ["submitted_date", "Submitted date"],
  ["result_date", "Result date"],
  ["created_at", "Created date"],
] as const;

export type BidDateField = typeof bidDateFields[number][0];
export type BidTab = "Current Bids" | "Past Bids" | "All Bids";
export type BidPreset = "This week" | "This month" | "This quarter" | "Year to date" | "Last year" | "All time" | "Custom date range";

export type BidFilters = {
  tab?: BidTab;
  year?: string;
  preset?: BidPreset;
  dateField?: BidDateField;
  customStart?: string;
  customEnd?: string;
  includeArchived?: boolean;
  company?: string;
  status?: string;
  scope?: string;
  result?: string;
};

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setDate(date.getDate() - date.getDay());
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfYear(year: number) {
  return `${year}-12-31`;
}

function startOfQuarter(date: Date) {
  const next = new Date(date);
  next.setMonth(Math.floor(date.getMonth() / 3) * 3, 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function bidDate(bid: Bid, field: BidDateField) {
  const value = bid[field];
  return value ? String(value).slice(0, 10) : "";
}

export function bidSubmittedValue(bid: Bid) {
  return Number(bid.final_submitted_value || bid.value || 0);
}

export function weightedBidValue(bid: Bid) {
  return Math.round(Number(bid.value || 0) * (Number(bid.probability || 0) / 100));
}

export function isCurrentBid(bid: Bid) {
  return currentBidStatuses.includes(bid.status);
}

export function isPastBid(bid: Bid) {
  return pastBidStatuses.includes(bid.status);
}

export function bidResult(bid: Bid) {
  if (bid.result) return bid.result;
  if (["Won", "Lost", "No-Bid", "Canceled"].includes(bid.status)) return bid.status;
  return "Pending";
}

export function bidYears(bids: Bid[]) {
  const years = new Set<string>();
  bids.forEach((bid) => {
    [bid.due, bid.submitted_date, bid.result_date, bid.created_at].forEach((date) => {
      if (date) years.add(String(date).slice(0, 4));
    });
  });
  return Array.from(years).filter(Boolean).sort((a, b) => Number(b) - Number(a));
}

export function presetRange(preset: BidPreset, customStart = "", customEnd = "") {
  const now = new Date();
  const currentYear = now.getFullYear();
  if (preset === "This week") {
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: iso(start), end: iso(end) };
  }
  if (preset === "This month") return { start: `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, end: iso(now) };
  if (preset === "This quarter") return { start: iso(startOfQuarter(now)), end: iso(now) };
  if (preset === "Year to date") return { start: `${currentYear}-01-01`, end: iso(now) };
  if (preset === "Last year") return { start: `${currentYear - 1}-01-01`, end: endOfYear(currentYear - 1) };
  if (preset === "Custom date range") return { start: customStart, end: customEnd };
  return { start: "", end: "" };
}

export function filterBids(bids: Bid[], filters: BidFilters) {
  const tab = filters.tab || "All Bids";
  const dateField = filters.dateField || "due";
  const range = presetRange(filters.preset || "All time", filters.customStart, filters.customEnd);
  const currentYear = String(new Date().getFullYear());
  const selectedYear = filters.year === "Current year" ? currentYear : filters.year === "Previous year" ? String(Number(currentYear) - 1) : filters.year;

  return bids.filter((bid) => {
    if (!filters.includeArchived && bid.status === "Archived") return false;
    if (tab === "Current Bids" && !isCurrentBid(bid)) return false;
    if (tab === "Past Bids" && !isPastBid(bid)) return false;
    if (filters.company && filters.company !== "All companies" && bid.company !== filters.company && bid.company_id !== filters.company) return false;
    if (filters.status && filters.status !== "All statuses" && bid.status !== filters.status) return false;
    if (filters.scope && filters.scope !== "All scopes" && bid.type !== filters.scope) return false;
    if (filters.result && filters.result !== "All results" && bidResult(bid) !== filters.result) return false;
    const date = bidDate(bid, dateField);
    if (selectedYear && selectedYear !== "All years" && date.slice(0, 4) !== selectedYear) return false;
    if (range.start && (!date || date < range.start)) return false;
    if (range.end && (!date || date > range.end)) return false;
    return true;
  });
}

export function bidMetrics(bids: Bid[]) {
  const count = bids.length;
  const totalBidValue = bids.reduce((sum, bid) => sum + Number(bid.value || 0), 0);
  const openBidValue = bids.filter(isCurrentBid).reduce((sum, bid) => sum + Number(bid.value || 0), 0);
  const submittedBidValue = bids.filter((bid) => ["Submitted", "Won", "Lost"].includes(bid.status)).reduce((sum, bid) => sum + bidSubmittedValue(bid), 0);
  const wonBidValue = bids.filter((bid) => bidResult(bid) === "Won").reduce((sum, bid) => sum + bidSubmittedValue(bid), 0);
  const lostBidValue = bids.filter((bid) => bidResult(bid) === "Lost").reduce((sum, bid) => sum + bidSubmittedValue(bid), 0);
  const noBidValue = bids.filter((bid) => bidResult(bid) === "No-Bid").reduce((sum, bid) => sum + Number(bid.value || 0), 0);
  const weightedPipelineValue = bids.filter(isCurrentBid).reduce((sum, bid) => sum + weightedBidValue(bid), 0);
  const averageBidValue = count ? Math.round(totalBidValue / count) : 0;
  const decided = bids.filter((bid) => ["Won", "Lost"].includes(bidResult(bid)));
  const won = decided.filter((bid) => bidResult(bid) === "Won").length;
  const winRate = decided.length ? Math.round((won / decided.length) * 100) : 0;
  return { count, totalBidValue, openBidValue, submittedBidValue, wonBidValue, lostBidValue, noBidValue, weightedPipelineValue, averageBidValue, winRate };
}

export function groupBidValue(bids: Bid[], key: "status" | "company" | "month" | "scope") {
  const rows = new Map<string, { label: string; count: number; value: number }>();
  bids.forEach((bid) => {
    const label = key === "status" ? bid.status || "Not added yet" : key === "company" ? bid.company || "Not added yet" : key === "scope" ? bid.type || "Not added yet" : (bid.due || bid.submitted_date || bid.created_at || "Not dated").slice(0, 7);
    const current = rows.get(label) || { label, count: 0, value: 0 };
    current.count += 1;
    current.value += Number(bid.value || 0);
    rows.set(label, current);
  });
  return Array.from(rows.values()).sort((a, b) => b.value - a.value);
}
