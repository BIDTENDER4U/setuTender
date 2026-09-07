import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const plans = await db.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ plans });
}

// Admin-configurable pricing — nothing is hard-coded in the UI (spec §6).
export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id, priceInPaise, analysesLimit, isActive, features } = await req.json();
  const plan = await db.subscriptionPlan.update({
    where: { id },
    data: { priceInPaise, analysesLimit, isActive, features },
  });

  return NextResponse.json({ plan });
}
