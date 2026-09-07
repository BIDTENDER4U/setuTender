import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/rbac";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const tenders = await db.tenderAnalysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, refNumber: true, status: true,
      eligibilityStatus: true, overallScore: true, createdAt: true,
    },
  });

  return NextResponse.json({ tenders });
}
