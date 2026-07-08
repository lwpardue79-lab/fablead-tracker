"use client";

import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setMessage("Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    await supabase.rpc("bootstrap_shawnee_workspace");
    setMessage(mode === "sign-up" ? "Account created. Check email if confirmation is required." : "Signed in. Workspace ready.");
  }

  return (
    <>
      <PageHeader eyebrow="Secure access" title="Login" description="Use Supabase email/password auth for the internal FabLead Tracker workspace." />
      {message && <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{message}</div>}
      <form onSubmit={submit} className="card max-w-xl p-6">
        <div className="grid gap-4">
          <input name="email" className="field" type="email" placeholder="Email" required />
          <input name="password" className="field" type="password" placeholder="Password" required minLength={6} />
          <button className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">{mode === "sign-in" ? "Sign in" : "Create account"}</button>
          <button type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")} className="text-sm font-semibold text-brand">
            {mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </form>
    </>
  );
}
