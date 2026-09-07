"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-serif text-2xl text-ink">Setu</div>
          <div className="font-mono text-[10px] text-inkFaint tracking-wide mt-1">BID TENDER 4 U</div>
        </div>
        <form onSubmit={handleSubmit} className="bg-surface border border-rule p-8">
          <h1 className="font-serif text-xl text-ink mb-6">Sign in</h1>
          {error && <div className="mb-4 text-sm text-danger bg-dangerSoft px-3 py-2">{error}</div>}
          <label className="block text-xs text-inkFaint mb-1">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-rule px-3 py-2 mb-4 text-sm outline-none focus:border-ink"
          />
          <label className="block text-xs text-inkFaint mb-1">Password</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-rule px-3 py-2 mb-2 text-sm outline-none focus:border-ink"
          />
          <div className="text-right mb-6">
            <Link href="/forgot-password" className="text-xs text-accent">Forgot password?</Link>
          </div>
          <button disabled={loading} className="w-full bg-ink text-white py-2.5 text-sm font-medium disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="text-center mt-5 text-sm text-inkFaint">
          No account? <Link href="/register" className="text-accent font-medium">Register</Link>
        </div>
      </div>
    </div>
  );
}
