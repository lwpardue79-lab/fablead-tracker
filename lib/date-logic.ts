export const businessTimeZone = "America/Chicago";

export type DueBucket = "Overdue" | "Due Today" | "Due Tomorrow" | "Due This Week" | "Upcoming" | "No Due Date" | "Snoozed" | "Completed";

export function chicagoDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: businessTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function addChicagoDays(days: number, value = new Date()) {
  const date = new Date(`${chicagoDate(value)}T12:00:00`);
  date.setDate(date.getDate() + days);
  return chicagoDate(date);
}

export function dueBucket(input: {
  due?: string;
  status?: string;
  snoozedUntil?: string;
  now?: Date;
}): DueBucket {
  const today = chicagoDate(input.now);
  const tomorrow = addChicagoDays(1, input.now);
  const weekEnd = addChicagoDays(7, input.now);
  const status = input.status || "Open";

  if (status === "Completed" || status === "Cancelled" || status === "Canceled") return "Completed";
  if (input.snoozedUntil && input.snoozedUntil > today) return "Snoozed";
  if (!input.due) return "No Due Date";
  const due = input.due.slice(0, 10);
  if (due < today) return "Overdue";
  if (due === today) return "Due Today";
  if (due === tomorrow) return "Due Tomorrow";
  if (due <= weekEnd) return "Due This Week";
  return "Upcoming";
}

export function isOverdue(input: { due?: string; status?: string; snoozedUntil?: string; now?: Date }) {
  return dueBucket(input) === "Overdue";
}
