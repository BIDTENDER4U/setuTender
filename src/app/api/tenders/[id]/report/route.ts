import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized, forbidden } from "@/lib/rbac";
import { generateReportPdf } from "@/lib/pdf";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const analysis = await db.tenderAnalysis.findUnique({
    where: { id: params.id },
    include: { criteria: true, checklistItems: true, missingDocuments: true },
  });
  if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (analysis.userId !== user.id && user.role !== "ADMIN") return forbidden();

  const profile = await db.companyProfile.findUnique({ where: { userId: analysis.userId } });
  const pdfBytes = await generateReportPdf(analysis, profile);

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tender-analysis-${analysis.id}.pdf"`,
    },
  });
}
