"use client";

import { useState } from "react";

export default function AdminUserActions({ userId, planCode, active, upgrade, plans = [] }: { userId: string; planCode: string; active: boolean; upgrade?: boolean; plans?: Array<{ code: string; name: string; analysesLimit: number }> }) {
  const [busy, setBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(planCode);

  async function updateStatus(action: "activate" | "suspend" | "upgrade") {
    setBusy(true);
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, action, planCode: selectedPlan, clearTenders: upgrade }),
    });
    setBusy(false);
    if (response.ok) window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
    {upgrade && (
      <select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)} className="border border-rule px-2 py-1 text-xs">
        {plans.filter((plan) => plan.analysesLimit !== -1).map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
      </select>
    )}
    <button
      onClick={() => {
        if (upgrade && !window.confirm("Upgrade this client and permanently delete their previous tender history?")) return;
        updateStatus(upgrade ? "upgrade" : active ? "suspend" : "activate");
      }}
      disabled={busy}
      className="border border-accent px-3 py-1 text-xs text-accent"
    >
      {busy ? "Updating…" : upgrade ? "Upgrade & clear tenders" : active ? "Deactivate" : "Activate"}
    </button>
    </div>
  );
}
