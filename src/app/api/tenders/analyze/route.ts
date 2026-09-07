import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/rbac";
import { saveFile } from "@/lib/storage";
import { scanFile } from "@/lib/scan";
import { extractTenderText, analyzeTender } from "@/lib/ai";
import { persistAnalysis } from "@/lib/eligibility";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();

    const membership = await db.subscription.findUnique({ where: { userId: user.id } });
    if (user.role !== "ADMIN" && membership?.status !== "ACTIVE") {
      return NextResponse.json({ error: "An active membership is required to analyze tenders." }, { status: 403 });
    }

    // --- Enforce plan limits before doing any expensive work ---
    const subscription = await db.subscription.findUnique({ where: { userId: user.id }, include: { plan: true } });
    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 402 });
    }
    const unlimited = subscription.plan.analysesLimit === -1;
    if (!unlimited && subscription.analysesUsed >= subscription.plan.analysesLimit) {
      return NextResponse.json(
        { error: `You've used all ${subscription.plan.analysesLimit} tender analyses on your ${subscription.plan.name} plan. Upgrade to analyze more tenders.` },
        { status: 402 }
      );
    }

    const form = await req.formData();
  // Support both multi-file ('files') and single-file ('file') keys
    let files = form.getAll("files") as File[];
    if (!files || files.length === 0) {
      const single = form.get("file") as File | null;
      if (single) files = [single];
    }
  
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "At least one tender file is required" }, { status: 400 });
    }

  // Scan and save all uploaded files
    const savedFiles: Array<{ name: string; fileKey: string; buffer: Buffer; mimeType: string }> = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const scan = await scanFile(buffer);
      if (!scan.clean) {
        return NextResponse.json(
          { error: `File "${file.name}" failed a malware scan and was not analyzed.` },
          { status: 422 }
        );
      }
      const mimeType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
      const stored = await saveFile(user.id, buffer, mimeType);
      savedFiles.push({ name: file.name, fileKey: stored.fileKey, buffer, mimeType });
    }

    const primaryFile = savedFiles[0];
  const fileSummaryName = savedFiles.length === 1 
    ? primaryFile.name 
    : `${primaryFile.name} (+${savedFiles.length - 1} other files)`;

    const analysis = await db.tenderAnalysis.create({
    data: {
      userId: user.id,
      sourceFileKey: primaryFile.fileKey,
      sourceFileName: fileSummaryName,
      status: "PROCESSING",
    },
  });

    try {
    const [profile, documents] = await Promise.all([
      db.companyProfile.findUnique({ where: { userId: user.id } }),
      db.document.findMany({ where: { userId: user.id } }),
    ]);

    // Extract and combine text from all tender files
    const textSegments: string[] = [];
    for (let i = 0; i < savedFiles.length; i++) {
      const item = savedFiles[i];
      const docText = await extractTenderText(item.buffer, item.mimeType, item.name);
      textSegments.push(
        `\n============================================================\n` +
        `TENDER DOCUMENT ${i + 1} OF ${savedFiles.length}: ${item.name}\n` +
        `============================================================\n\n` +
        docText
      );
    }
    const combinedTenderText = textSegments.join("\n\n");

    const result = await analyzeTender(combinedTenderText, {
      profile: (profile as any) ?? {},
      documents: documents.map((d) => ({
        name: d.name,
        category: d.category,
        status: d.status,
        expiryDate: d.expiryDate?.toISOString() ?? null,
      })),
    });

    await persistAnalysis(analysis.id, result, user.id);

    await db.subscription.update({
      where: { userId: user.id },
      data: { analysesUsed: { increment: 1 } },
    });

    await db.auditLog.create({
      data: { userId: user.id, action: "TENDER_ANALYZED", targetType: "TenderAnalysis", targetId: analysis.id },
    });

    return NextResponse.json({ analysisId: analysis.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown analysis error";
      await db.tenderAnalysis.update({
        where: { id: analysis.id },
        data: { status: "FAILED", errorMessage: message },
      });
      return NextResponse.json({ error: message, analysisId: analysis.id }, { status: 500 });
    }
  } catch (err: unknown) {
    console.error("Tender analysis request failed:", err);
    const message = err instanceof Error ? err.message : "";
    const isDatabaseError =
      message.includes("Can't reach database server") ||
      message.includes("Environment variable not found: DATABASE_URL") ||
      message.includes("PrismaClientInitializationError") ||
      message.includes("P1001");
    return NextResponse.json(
      {
        error: isDatabaseError
          ? "Production database is not configured. Add DATABASE_URL in Vercel > Project Settings > Environment Variables, then redeploy."
          : message || "Analysis failed. Please try again.",
      },
      { status: isDatabaseError ? 503 : 500 }
    );
  }
}
