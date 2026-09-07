"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { CheckSquare } from "lucide-react";

const PAYMENT_UPI_ID = "SINGHBALDEV70368-1@OKHDFCBANK";

export default function SubscriptionPage() {
  const [data, setData] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [requested, setRequested] = useState(false);

  async function load() {
    const res = await fetch("/api/subscription");
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  if (!data) return <div className="p-9 text-sm text-inkFaint">Loading…</div>;

  return (
    <div>
      <TopBar
        title="Subscription"
        subtitle={`${data.subscription?.analysesUsed ?? 0} of ${data.subscription?.plan.analysesLimit === -1 ? "unlimited" : data.subscription?.plan.analysesLimit} analyses used this cycle`}
      />
      <div className="p-9 grid grid-cols-3 gap-5 max-w-4xl">
        {data.plans.map((p: any) => {
          const current = data.subscription?.planId === p.id;
          return (
            <div key={p.id} className={`border bg-surface p-6 ${current ? "border-accent" : "border-rule"}`}>
              <div className="font-serif text-lg text-ink">{p.name}</div>
              <div className="text-xl text-ink mt-2 mb-4.5">
                {p.priceInPaise === 0 ? "Custom" : `₹${(p.priceInPaise / 100).toLocaleString("en-IN")}/mo`}
              </div>
              {(p.features as string[]).map((f) => (
                <div key={f} className="flex gap-2 items-start py-1.5 text-xs text-inkSoft">
                  <CheckSquare size={13} color="#B4690E" className="mt-0.5 shrink-0" /> {f}
                </div>
              ))}
              <button
                disabled={current}
                onClick={() => setSelectedPlan(p)}
                className={`mt-4.5 w-full py-2.5 text-xs font-medium border border-ink ${current ? "bg-ink text-white" : "bg-transparent text-ink"}`}
              >
                {current ? "Current plan" : "Pay & get membership"}
              </button>
            </div>
          );
        })}
      </div>
      {selectedPlan && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/50 p-5" onClick={() => setSelectedPlan(null)}>
          <div className="w-full max-w-sm bg-surface border border-rule p-7 text-center" onClick={(event) => event.stopPropagation()}>
            <div className="font-serif text-xl text-ink">Pay for {selectedPlan.name}</div>
            <div className="text-sm text-inkSoft mt-1 mb-5">
              Amount: ₹{(selectedPlan.priceInPaise / 100).toLocaleString("en-IN")}
            </div>
            <img
              className="mx-auto w-56 h-56 border border-rule p-2"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${PAYMENT_UPI_ID}&pn=Setu&am=${selectedPlan.priceInPaise / 100}&cu=INR`)}`}
              alt="UPI payment QR code"
            />
            <div className="font-mono text-xs text-ink mt-4 break-all">{PAYMENT_UPI_ID}</div>
            <a
              href={`upi://pay?pa=${PAYMENT_UPI_ID}&pn=Setu&am=${selectedPlan.priceInPaise / 100}&cu=INR`}
              className="block mt-4 py-2.5 bg-accent text-white text-xs font-medium"
            >
              Open UPI app
            </a>
            <p className="text-[11px] text-inkFaint mt-4">
              Payment के बाद transaction screenshot/admin confirmation के लिए भेजें। Membership verification के बाद activate होगी।
            </p>
            <button
              onClick={async () => {
                await fetch("/api/subscription", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ planCode: selectedPlan.code }),
                });
                setRequested(true);
              }}
              disabled={requested}
              className="mt-3 text-xs text-accent underline"
            >
              {requested ? "Request sent to admin" : "I have completed payment"}
            </button>
            <button onClick={() => setSelectedPlan(null)} className="mt-4 text-xs text-inkSoft underline">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
