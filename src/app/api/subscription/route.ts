import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/rbac";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const [subscription, allPlans] = await Promise.all([
    db.subscription.findUnique({ where: { userId: user.id }, include: { plan: true } }),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const plans = user.role === "ADMIN" ? allPlans : allPlans.filter((plan) => plan.analysesLimit !== -1);
  return NextResponse.json({ subscription, plans });
}

// Plan changes go through Razorpay checkout in production (see src/lib/payments.ts).
// This endpoint switches the plan directly — fine for free/basic-tier signup
// or admin-assisted upgrades; gate paid upgrades behind a verified payment
// before calling this once payments.ts is implemented.
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { planCode, paymentReference } = await req.json();
  const plan = await db.subscriptionPlan.findUnique({ where: { code: planCode } });
  if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  if (plan.analysesLimit === -1 && user.role !== "ADMIN") {
    return NextResponse.json({ error: "This plan is available only through administrator approval." }, { status: 403 });
  }
  if (user.role !== "ADMIN") {
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "MEMBERSHIP_PAYMENT_REQUESTED",
        targetType: "Subscription",
        targetId: plan.id,
        metadata: { planCode, paymentReference: paymentReference || null },
      },
    });
    return NextResponse.json({ requested: true });
  }

  const subscription = await db.subscription.update({
    where: { userId: user.id },
    data: { planId: plan.id, status: "ACTIVE", analysesUsed: 0, cycleStartedAt: new Date() },
  });

  return NextResponse.json({ subscription });
}
