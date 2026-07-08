import { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-brand">{eyebrow}</p>}<h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{title}</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p></div>{action}</div>;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "green" | "orange" | "red" | "blue" | "slate" }) {
  const styles = { green: "bg-emerald-50 text-emerald-700 ring-emerald-200", orange: "bg-orange-50 text-orange-700 ring-orange-200", red: "bg-red-50 text-red-700 ring-red-200", blue: "bg-blue-50 text-blue-700 ring-blue-200", slate: "bg-slate-50 text-slate-600 ring-slate-200" };
  return <span className={`inline-flex w-fit max-w-full shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 ring-inset ${styles[tone]}`}>{children}</span>;
}

export function Button({ children, variant = "primary" }: { children: ReactNode; variant?: "primary" | "secondary" }) {
  return <button className={variant === "primary" ? "rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" : "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"}>{children}</button>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><p className="font-semibold text-ink">{title}</p><p className="mt-1 text-sm text-slate-500">{body}</p></div>;
}
