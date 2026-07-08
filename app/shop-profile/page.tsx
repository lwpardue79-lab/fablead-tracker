"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";
import { defaultShopProfile, useFabLeadStore } from "@/lib/local-store";
import { ShopProfile } from "@/lib/types";

export default function ShopProfilePage() {
  const { shopProfile, updateShopProfile } = useFabLeadStore();
  const [profile, setProfile] = useState<ShopProfile>(defaultShopProfile);
  const [message, setMessage] = useState("");

  useEffect(() => setProfile(shopProfile), [shopProfile]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateShopProfile(profile);
    setMessage("Shop profile saved. Buyer fit scores and templates can use this profile.");
  }

  return (
    <>
      <PageHeader eyebrow="Fabrication shop profile" title="Shop Profile" description="Tell FabLead Tracker what work the shop wants so scoring, reports, and templates stay relevant." />
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      <form onSubmit={save} className="card grid gap-4 p-6 lg:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Shop name<input className="field mt-1.5" value={profile.shopName} onChange={(event) => setProfile({ ...profile, shopName: event.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600">Service radius<input className="field mt-1.5" value={profile.serviceRadius} onChange={(event) => setProfile({ ...profile, serviceRadius: event.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600 lg:col-span-2">Target cities/states<textarea className="field mt-1.5" rows={2} value={profile.targetCitiesStates} onChange={(event) => setProfile({ ...profile, targetCitiesStates: event.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600 lg:col-span-2">Trade scopes<textarea className="field mt-1.5" rows={2} value={profile.tradeScopes.join(", ")} onChange={(event) => setProfile({ ...profile, tradeScopes: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
        <label className="text-xs font-semibold text-slate-600 lg:col-span-2">Ideal project types<textarea className="field mt-1.5" rows={3} value={profile.idealProjectTypes} onChange={(event) => setProfile({ ...profile, idealProjectTypes: event.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600">Minimum project size<input className="field mt-1.5" type="number" value={profile.minimumProjectSize} onChange={(event) => setProfile({ ...profile, minimumProjectSize: Number(event.target.value) })} /></label>
        <label className="text-xs font-semibold text-slate-600">Maximum project size<input className="field mt-1.5" type="number" value={profile.maximumProjectSize} onChange={(event) => setProfile({ ...profile, maximumProjectSize: Number(event.target.value) })} /></label>
        <label className="text-xs font-semibold text-slate-600 lg:col-span-2">Insurance/certification notes<textarea className="field mt-1.5" rows={3} value={profile.insuranceCertificationNotes} onChange={(event) => setProfile({ ...profile, insuranceCertificationNotes: event.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600">Primary contact<input className="field mt-1.5" value={profile.primaryContact} onChange={(event) => setProfile({ ...profile, primaryContact: event.target.value })} /></label>
        <div className="lg:col-span-2"><button className="rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Save shop profile</button></div>
      </form>
    </>
  );
}
