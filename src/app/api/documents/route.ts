import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/rbac";
import { saveFile } from "@/lib/storage";
import { scanFile } from "@/lib/scan";
import { computeDocumentStatus } from "@/lib/eligibility";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const documents = await db.document.findMany({
    where: { userId: user.id },
    orderBy: { category: "asc" },
  });

  // Recompute status against current date at read-time so expiry never goes stale.
  const withLiveStatus = documents.map((d) => ({
    ...d,
    status: d.status === "MISSING" ? d.status : computeDocumentStatus(d.expiryDate, d.status),
  }));

  return NextResponse.json({ documents: withLiveStatus });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const name = form.get("name") as string | null;
  const category = form.get("category") as string | null;
  const expiryDate = form.get("expiryDate") as string | null;
  const notes = form.get("notes") as string | null;

  if (!file || !name || !category) {
    return NextResponse.json({ error: "file, name and category are required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const scan = await scanFile(buffer);
  if (!scan.clean) {
    return NextResponse.json({ error: "This file failed a malware scan and was not uploaded." }, { status: 422 });
  }

  const stored = await saveFile(user.id, buffer, file.type);

  const document = await db.document.create({
    data: {
      userId: user.id,
      name,
      category: category as any,
      fileKey: stored.fileKey,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: stored.sizeBytes,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes: notes ?? undefined,
      status: expiryDate ? (computeDocumentStatus(new Date(expiryDate), "VALID") as any) : "VALID",
    },
  });

  await db.auditLog.create({
    data: { userId: user.id, action: "DOCUMENT_UPLOADED", targetType: "Document", targetId: document.id },
  });

  return NextResponse.json({ document });
}
