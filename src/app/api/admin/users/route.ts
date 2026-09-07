import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Admin can see account/usage metadata, never raw document contents —
// that still requires the ownership check in /api/documents/[id].
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await db.user.findMany({
    select: {
      id: true, email: true, role: true, createdAt: true,
      profile: { select: { companyName: true } },
      subscription: { select: { status: true, analysesUsed: true, plan: { select: { name: true, analysesLimit: true } } } },
      _count: { select: { tenders: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    planCode: z.string().min(1),
  }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  const plan = await db.subscriptionPlan.findUnique({ where: { code: parsed.data.planCode } });
  if (!plan || plan.analysesLimit === -1) return NextResponse.json({ error: "Choose a standard membership plan." }, { status: 400 });

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      subscription: { create: { planId: plan.id, status: "ACTIVE", analysesUsed: 0 } },
    },
  });
  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
}

// Suspend / unsuspend a user by flipping their subscription status.
export async function PATCH(req: NextRequest) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const { userId, action, planCode, clearTenders } = await req.json();
  if (action === "suspend") {
    await db.subscription.update({ where: { userId }, data: { status: "CANCELLED" } });
  } else if (action === "reactivate") {
    await db.subscription.update({ where: { userId }, data: { status: "ACTIVE" } });
  } else if (action === "activate") {
    const plan = await db.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    await db.subscription.update({
      where: { userId },
      data: { planId: plan.id, status: "ACTIVE", analysesUsed: 0, cycleStartedAt: new Date() },
    });
  } else if (action === "upgrade") {
    const plan = await db.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan || plan.analysesLimit === -1) {
      return NextResponse.json({ error: "Choose a standard membership plan." }, { status: 400 });
    }
    await db.$transaction(async (transaction) => {
      if (clearTenders) {
        await transaction.tenderAnalysis.deleteMany({ where: { userId } });
      }
      await transaction.subscription.update({
        where: { userId },
        data: { planId: plan.id, status: "ACTIVE", analysesUsed: 0, cycleStartedAt: new Date() },
      });
    });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await db.auditLog.create({
    data: { userId: admin!.id, action: `ADMIN_${action?.toUpperCase()}_USER`, targetType: "User", targetId: userId, metadata: { planCode: planCode || null, clearTenders: Boolean(clearTenders) } },
  });

  return NextResponse.json({ ok: true });
}
