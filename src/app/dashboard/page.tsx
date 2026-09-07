import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import StatusBadge from "@/components/StatusBadge";
import { PlusCircle, ChevronRight } from "lucide-react";
import { getTenderDisplayTitle } from "@/lib/tender-title";

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);
  const userId = (session!.user as any).id;

  const [subscription, tenders, expiringDocs] = await Promise.all([
    db.subscription.findUnique({ where: { userId }, include: { plan: true } }),
    db.tenderAnalysis.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.document.count({ where: { userId, status: { in: ["EXPIRING", "EXPIRED"] } } }),
  ]);

  const avgScore = tenders.length
    ? Math.round(tenders.reduce((a, t) => a + (t.overallScore ?? 0), 0) / tenders.length)
    : null;

  return (
    <div>
      <TopBar
        title="Welcome back"
        subtitle={`${tenders.length} tender${tenders.length === 1 ? "" : "s"} analyzed · ${expiringDocs} document${expiringDocs === 1 ? "" : "s"} need attention`}
      />
      <div className="p-9">
        <Link
          href="/dashboard/analyze"
          className="flex items-center justify-between w-full px-[26px] py-[22px] bg-ink mb-7"
        >
          <div className="flex items-center gap-3.5">
            <PlusCircle size={22} color="#B4690E" strokeWidth={1.6} />
            <div className="text-left">
              <div className="font-serif text-lg text-white">Analyze a new tender</div>
              <div className="text-[12.5px] text-[#B7BFCF] mt-0.5">Upload a tender PDF — we'll check it against your saved profile</div>
            </div>
          </div>
          <ChevronRight size={18} color="#B7BFCF" />
        </Link>

        <div className="grid grid-cols-3 gap-px bg-rule mb-8">
          <div className="bg-surface px-5 py-4.5">
            <div className="font-mono text-[11px] text-inkFaint mb-2">ANALYSES USED</div>
            <div className="font-serif text-[26px] text-ink">
              {subscription?.analysesUsed ?? 0} / {subscription?.plan.analysesLimit === -1 ? "∞" : subscription?.plan.analysesLimit ?? "—"}
            </div>
            <div className="text-xs text-inkFaint mt-0.5">{subscription?.plan.name} plan</div>
          </div>
          <div className="bg-surface px-5 py-4.5">
            <div className="font-mono text-[11px] text-inkFaint mb-2">DOCUMENTS EXPIRING</div>
            <div className="font-serif text-[26px] text-ink">{expiringDocs}</div>
            <div className="text-xs text-inkFaint mt-0.5">within 30 days or overdue</div>
          </div>
          <div className="bg-surface px-5 py-4.5">
            <div className="font-mono text-[11px] text-inkFaint mb-2">AVG. ELIGIBILITY</div>
            <div className="font-serif text-[26px] text-ink">{avgScore !== null ? `${avgScore}%` : "—"}</div>
            <div className="text-xs text-inkFaint mt-0.5">across {tenders.length} tender{tenders.length === 1 ? "" : "s"}</div>
          </div>
        </div>

        <div className="font-mono text-[11px] text-inkFaint mb-2.5">RECENT ANALYSES</div>
        <div className="border border-rule bg-surface">
          {tenders.length === 0 && (
            <div className="p-6 text-sm text-inkFaint">No tenders analyzed yet — upload one to get started.</div>
          )}
          {tenders.map((t, i) => (
            <Link
              key={t.id} href={`/dashboard/tenders/${t.id}`}
              className={`flex items-center justify-between px-5 py-3.5 ${i ? "border-t border-ruleSoft" : ""}`}
            >
              <div>
                <div className="text-sm text-ink font-medium">{getTenderDisplayTitle(t)}</div>
                <div className="font-mono text-[11px] text-inkFaint mt-0.5">{t.refNumber ?? "—"} · {t.createdAt.toDateString()}</div>
              </div>
              <div className="flex items-center gap-4">
                {t.eligibilityStatus && <StatusBadge status={t.eligibilityStatus} />}
                <div className="font-serif text-base text-ink w-10 text-right">{t.overallScore ?? "—"}%</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
