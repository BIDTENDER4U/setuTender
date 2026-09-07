"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-serif text-2xl text-ink">Setu</div>
          <div className="font-mono text-[10px] text-inkFaint tracking-wide mt-1">BID TENDER 4 U</div>
        </div>
        <form onSubmit={handleSubmit} className="bg-surface border border-rule p-8">
          <h1 className="font-serif text-xl text-ink mb-2">Create your account</h1>
          <p className="text-xs text-inkFaint mb-6">Your first tender analysis is free.</p>
          {error && <div className="mb-4 text-sm text-danger bg-dangerSoft px-3 py-2">{error}</div>}
          <label className="block text-xs text-inkFaint mb-1">Work email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-rule px-3 py-2 mb-4 text-sm outline-none focus:border-ink"
          />
          <label className="block text-xs text-inkFaint mb-1">Password</label>
          <input
            type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-rule px-3 py-2 mb-6 text-sm outline-none focus:border-ink"
          />
          <button disabled={loading} className="w-full bg-ink text-white py-2.5 text-sm font-medium disabled:opacity-60">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <div className="text-center mt-5 text-sm text-inkFaint">
          Already registered? <Link href="/login" className="text-accent font-medium">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
