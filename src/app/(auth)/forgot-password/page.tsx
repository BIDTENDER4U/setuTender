"use client";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-serif text-2xl text-ink">Setu</div>
          <div className="font-mono text-[10px] text-inkFaint tracking-wide mt-1">BID TENDER 4 U</div>
        </div>
        <div className="bg-surface border border-rule p-8">
          <h1 className="font-serif text-xl text-ink mb-2">Reset your password</h1>
          {sent ? (
            <p className="text-sm text-inkSoft mt-4">
              If an account exists for that email, a reset link is on its way.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-xs text-inkFaint mb-6">We'll email you a link to reset your password.</p>
              <label className="block text-xs text-inkFaint mb-1">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-rule px-3 py-2 mb-6 text-sm outline-none focus:border-ink"
              />
              <button className="w-full bg-ink text-white py-2.5 text-sm font-medium">Send reset link</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
