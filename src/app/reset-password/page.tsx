"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-surface border border-rule p-8">
        <h1 className="font-serif text-xl text-ink mb-6">Set a new password</h1>
        {done ? (
          <p className="text-sm text-success">Password updated. Redirecting to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="mb-4 text-sm text-danger bg-dangerSoft px-3 py-2">{error}</div>}
            <label className="block text-xs text-inkFaint mb-1">New password</label>
            <input
              type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-rule px-3 py-2 mb-6 text-sm outline-none focus:border-ink"
            />
            <button className="w-full bg-ink text-white py-2.5 text-sm font-medium">Update password</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
