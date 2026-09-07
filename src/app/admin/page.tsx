import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import TopBar from "@/components/TopBar";
import AdminUserActions from "./AdminUserActions";
import AdminCreateUser from "./AdminCreateUser";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const [users, totalTenders, plans, paymentRequests] = await Promise.all([
    db.user.findMany({
      select: {
        id: true, email: true, role: true, createdAt: true,
        profile: { select: { companyName: true } },
        subscription: { select: { status: true, analysesUsed: true, plan: { select: { name: true } } } },
        _count: { select: { tenders: true, documents: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.tenderAnalysis.count(),
    db.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } }),
    db.auditLog.findMany({
      where: { action: "MEMBERSHIP_PAYMENT_REQUESTED" },
      include: { user: { select: { email: true, profile: { select: { companyName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="min-h-screen bg-paper">
      <TopBar title="Admin" subtitle={`${users.length} users · ${totalTenders} tender analyses run`} />
      <div className="p-9">
        <AdminCreateUser plans={plans.map((plan) => ({ code: plan.code, name: plan.name, analysesLimit: plan.analysesLimit }))} />
        <div className="font-mono text-[11px] text-inkFaint mb-2.5">USERS</div>
        <div className="border border-rule bg-surface mb-10">
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center px-5 py-3 ${i ? "border-t border-ruleSoft" : ""}`}>
              <div className="flex-1">
                <div className="text-sm text-ink">{u.profile?.companyName ?? u.email}</div>
                <div className="text-xs text-inkFaint">{u.email} · joined {u.createdAt.toDateString()}</div>
              </div>
              <div className="text-xs text-inkFaint w-32">{u.subscription?.plan.name ?? "—"}</div>
              <div className="text-xs text-inkFaint w-24">{u._count.tenders} tenders</div>
              <div className="text-xs text-inkFaint w-24">{u._count.documents} docs</div>
              <span className="text-xs font-medium mr-4">{u.subscription?.status}</span>
              {u.subscription?.status === "ACTIVE" && u.role !== "ADMIN" && (
                <AdminUserActions userId={u.id} planCode="professional" active upgrade plans={plans.map((plan) => ({ code: plan.code, name: plan.name, analysesLimit: plan.analysesLimit }))} />
              )}
              <AdminUserActions userId={u.id} planCode="basic" active={u.subscription?.status === "ACTIVE"} />
            </div>
          ))}
        </div>

        <div className="font-mono text-[11px] text-inkFaint mb-2.5">PENDING PAYMENT REQUESTS</div>
        <div className="border border-rule bg-surface mb-10">
          {paymentRequests.length === 0 && <div className="p-5 text-sm text-inkFaint">No payment requests yet.</div>}
          {paymentRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between px-5 py-3 border-b border-ruleSoft">
              <div>
                <div className="text-sm text-ink">{request.user?.profile?.companyName ?? request.user?.email}</div>
                <div className="text-xs text-inkFaint">{request.user?.email} · {request.createdAt.toLocaleString("en-IN")}</div>
              </div>
              <AdminUserActions userId={request.userId!} planCode={(request.metadata as any)?.planCode ?? "basic"} active={false} />
            </div>
          ))}
        </div>

        <div className="font-mono text-[11px] text-inkFaint mb-2.5">SUBSCRIPTION PLANS (pricing configurable — see /api/admin/plans)</div>
        <div className="border border-rule bg-surface">
          {plans.map((p, i) => (
            <div key={p.id} className={`flex items-center px-5 py-3 ${i ? "border-t border-ruleSoft" : ""}`}>
              <div className="flex-1 text-sm text-ink">{p.name}</div>
              <div className="text-xs text-inkFaint w-32">{p.priceInPaise === 0 ? "Custom" : `₹${p.priceInPaise / 100}/mo`}</div>
              <div className="text-xs text-inkFaint w-40">{p.analysesLimit === -1 ? "Unlimited" : `${p.analysesLimit} analyses`}</div>
              <span className={`text-xs ${p.isActive ? "text-success" : "text-inkFaint"}`}>{p.isActive ? "Active" : "Inactive"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
