"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    const { error: workspaceError } = await supabase.rpc("bootstrap_shawnee_workspace");
    if (workspaceError) {
      setMessage("Signed in, but workspace setup failed. Ask an admin to confirm your Shawnee Steel access.");
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next") || "/";
    router.replace(nextPath);
    router.refresh();
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get("reset_email") || "");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setMessage(error ? error.message : "Password reset email sent if that address has access.");
  }

  return (
    <>
      <PageHeader eyebrow="Secure access" title="Login" description="FabLead Tracker is private. Sign in with an approved Shawnee Steel account." />
      {message && <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{message}</div>}
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <form onSubmit={submit} className="card p-6">
          <h2 className="font-serif text-xl font-semibold">Approved user sign-in</h2>
          <p className="mt-1 text-sm text-slate-500">Public sign-up is intentionally disabled. Users should be invited or created by an admin in Supabase.</p>
          <div className="mt-5 grid gap-4">
            <input name="email" className="field" type="email" placeholder="Email" required />
            <input name="password" className="field" type="password" placeholder="Password" required minLength={6} />
            <button disabled={busy} className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Signing in..." : "Sign in"}</button>
          </div>
        </form>
        <form onSubmit={resetPassword} className="card p-6">
          <h2 className="font-serif text-xl font-semibold">Reset password</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your approved email and Supabase will send a reset link.</p>
          <div className="mt-5 grid gap-4">
            <input name="reset_email" className="field" type="email" placeholder="Email" required />
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Send reset email</button>
          </div>
        </form>
      </div>
    </>
  );
}
