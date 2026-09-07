"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";

const BUSINESS_TYPES = ["PROPRIETORSHIP", "PARTNERSHIP", "LLP", "PRIVATE_LIMITED", "PUBLIC_LIMITED", "OTHER"];

const FIELD_GROUPS: [string, [string, string, string?][]][] = [
  ["Basic Information", [
    ["companyName", "Company / Firm Name", "text"],
    ["authorizedPerson", "Proprietor / Director / Authorized Person", "text"],
    ["businessType", "Business Type", "select"],
    ["registeredAddress", "Registered Address", "text"],
    ["city", "City", "text"],
    ["state", "State", "text"],
    ["pincode", "Pincode", "text"],
    ["mobile", "Mobile Number", "text"],
    ["email", "Email", "email"],
    ["website", "Website", "text"],
  ]],
  ["Registration Details", [
    ["gstNumber", "GST Number", "text"],
    ["panNumber", "PAN Number", "text"],
    ["udyamNumber", "MSME / Udyam Number", "text"],
    ["gemSellerId", "GeM Seller ID", "text"],
    ["nsicRegNo", "NSIC Registration", "text"],
    ["startupRegNo", "Startup Registration", "text"],
    ["cin", "CIN", "text"],
    ["tradeLicenseNo", "Trade License", "text"],
  ]],
  ["Financial Information", [
    ["annualTurnover", "Annual Turnover (₹)", "number"],
    ["avgTurnover3yr", "Average Turnover — 3yr (₹)", "number"],
    ["netWorth", "Net Worth (₹)", "number"],
    ["turnoverNotes", "Turnover Notes", "text"],
  ]],
  ["Technical / Experience", [
    ["yearsExperience", "Years of Experience", "number"],
    ["experienceNotes", "Experience Notes", "text"],
  ]],
];

export default function ProfilePage() {
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => {
      setForm(d.profile ?? { businessType: "PROPRIETORSHIP" });
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const payload = { ...form };
    ["annualTurnover", "avgTurnover3yr", "netWorth", "yearsExperience"].forEach((k) => {
      if (payload[k] !== undefined && payload[k] !== "") payload[k] = Number(payload[k]);
      else payload[k] = null;
    });
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  if (loading) return <div className="p-9 text-sm text-inkFaint">Loading…</div>;

  return (
    <div>
      <TopBar title="My Profile" subtitle="Used to assess eligibility for every tender you analyze" />
      <form onSubmit={handleSubmit} className="p-9 max-w-2xl">
        {FIELD_GROUPS.map(([groupLabel, fields]) => (
          <div key={groupLabel} className="mb-8">
            <div className="font-mono text-[11px] text-inkFaint mb-2.5">{groupLabel.toUpperCase()}</div>
            <div className="border border-rule bg-surface divide-y divide-ruleSoft">
              {fields.map(([key, label, type]) => (
                <div key={key} className="flex items-center px-5 py-3 gap-4">
                  <label className="text-[13px] text-inkFaint w-56 shrink-0">{label}</label>
                  {type === "select" ? (
                    <select
                      value={form[key] ?? ""}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="flex-1 text-sm outline-none bg-transparent"
                    >
                      {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
                    </select>
                  ) : (
                    <input
                      type={type ?? "text"}
                      value={form[key] ?? ""}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="flex-1 text-sm outline-none bg-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-4">
          <button disabled={saving} className="bg-ink text-white px-5 py-2.5 text-sm font-medium disabled:opacity-60">
            {saving ? "Saving…" : "Save profile"}
          </button>
          {saved && <span className="text-sm text-success">Saved</span>}
        </div>
      </form>
    </div>
  );
}
