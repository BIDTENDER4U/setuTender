import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized, forbidden } from "@/lib/rbac";
import { readFile, deleteFile } from "@/lib/storage";

// Streams the file back only if the requesting user owns it — this is what
// "no public document URLs" means: every access goes through auth + an
// ownership check, never a bare storage URL.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const document = await db.document.findUnique({ where: { id: params.id } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (document.userId !== user.id && user.role !== "ADMIN") return forbidden();

  const buffer = await readFile(document.fileKey);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${document.fileName}"`,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const document = await db.document.findUnique({ where: { id: params.id } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (document.userId !== user.id) return forbidden();

  await deleteFile(document.fileKey);
  await db.document.delete({ where: { id: params.id } });
  await db.auditLog.create({ data: { userId: user.id, action: "DOCUMENT_DELETED", targetType: "Document", targetId: params.id } });

  return NextResponse.json({ ok: true });
}
