import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized, forbidden } from "@/lib/rbac";
import { deleteFile } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const analysis = await db.tenderAnalysis.findUnique({
    where: { id: params.id },
    include: { criteria: true, checklistItems: true, missingDocuments: true },
  });
  if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (analysis.userId !== user.id && user.role !== "ADMIN") return forbidden();

  return NextResponse.json({ analysis });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const analysis = await db.tenderAnalysis.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, sourceFileKey: true },
  });
  if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (analysis.userId !== user.id && user.role !== "ADMIN") return forbidden();

  await deleteFile(analysis.sourceFileKey);
  await db.tenderAnalysis.delete({ where: { id: analysis.id } });
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "TENDER_DELETED",
      targetType: "TenderAnalysis",
      targetId: analysis.id,
    },
  });

  return NextResponse.json({ ok: true });
}
