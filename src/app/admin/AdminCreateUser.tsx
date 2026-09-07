"use client";

import { useState } from "react";

type Plan = { code: string; name: string; analysesLimit: number };

export default function AdminCreateUser({ plans }: { plans: Plan[] }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planCode, setPlanCode] = useState("basic");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, planCode }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "User could not be created.");
      return;
    }
    setMessage("User created successfully.");
    setEmail("");
    setPassword("");
    window.location.reload();
  }

  return (
    <form onSubmit={createUser} className="border border-rule bg-surface p-5 mb-10">
      <div className="font-mono text-[11px] text-inkFaint mb-3">ADD USER</div>
      <div className="grid grid-cols-4 gap-3">
        <input className="border border-rule px-3 py-2 text-sm" type="email" required placeholder="User email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="border border-rule px-3 py-2 text-sm" type="password" required minLength={8} placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select className="border border-rule px-3 py-2 text-sm" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
          {plans.filter((plan) => plan.analysesLimit !== -1).map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
        </select>
        <button disabled={busy} className="bg-accent text-white text-sm px-3 py-2" type="submit">{busy ? "Creating…" : "Create user"}</button>
      </div>
      {message && <div className="text-xs text-inkSoft mt-3">{message}</div>}
    </form>
  );
}
