"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { getTenderDisplayTitle } from "@/lib/tender-title";

export default function TenderListClient({ tenders }: { tenders: any[] }) {
  const [items, setItems] = useState(tenders);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteTender(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/tenders/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to delete tender");
      }
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete tender");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="border border-rule bg-surface">
      {items.length === 0 && <div className="p-6 text-sm text-inkFaint">No tenders analyzed yet.</div>}
      {items.map((t, i) => {
        const title = getTenderDisplayTitle(t);
        return (
          <div key={t.id} className={`flex items-center px-5 py-4 ${i ? "border-t border-ruleSoft" : ""}`}>
            <Link href={`/dashboard/tenders/${t.id}`} className="flex-1 min-w-0 pr-4">
              <div className="text-[14px] text-ink font-semibold truncate">{title}</div>
              <div className="text-xs text-inkSoft mt-0.5 flex items-center gap-2 flex-wrap">
                {t.organization && <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 border border-slate-200 text-[11px]">{t.organization}</span>}
                <span className="font-mono text-[11.5px] text-inkFaint">{t.refNumber ? (t.refNumber.includes("GEM") ? `Bid No: ${t.refNumber}` : `Ref: ${t.refNumber}`) : "—"}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-[11px] text-inkFaint">analyzed {t.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            </Link>
            {t.eligibilityStatus ? <StatusBadge status={t.eligibilityStatus} /> : <span className="text-xs text-inkFaint">{t.status}</span>}
            <div className="font-serif text-[17px] text-ink w-16 text-right font-medium">{t.overallScore ?? "—"}%</div>
            <a href={`/api/tenders/${t.id}/report`} className="ml-4" title="Download PDF"><Download size={15} color="#7C879C" /></a>
            <button type="button" onClick={() => deleteTender(t.id, title)} disabled={deletingId === t.id} className="ml-4 text-danger hover:text-red-800 disabled:opacity-50" title="Delete tender" aria-label={`Delete ${title}`}>
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
