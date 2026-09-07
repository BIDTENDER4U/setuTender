import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import TopBar from "@/components/TopBar";
import TenderDetailClient from "./TenderDetailClient";
import { getTenderDisplayTitle } from "@/lib/tender-title";

export default async function TenderDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session!.user as any).id;

  const analysis = await db.tenderAnalysis.findUnique({
    where: { id: params.id },
    include: { criteria: true, checklistItems: true, missingDocuments: true },
  });
  if (!analysis) notFound();
  if (analysis.userId !== userId) redirect("/dashboard/tenders");

  if (analysis.status === "PROCESSING" || analysis.status === "QUEUED") {
    return (
      <div>
        <TopBar title="Analyzing…" subtitle={analysis.sourceFileName} />
        <div className="p-9 text-sm text-inkFaint">This tender is still being analyzed. Refresh in a moment.</div>
      </div>
    );
  }

  if (analysis.status === "FAILED") {
    return (
      <div>
        <TopBar title="Analysis failed" subtitle={analysis.sourceFileName} />
        <div className="p-9 max-w-lg bg-dangerSoft text-danger text-sm px-4 py-3">
          {analysis.errorMessage ?? "The tender could not be analyzed. Please try again or verify the document manually."}
        </div>
      </div>
    );
  }

  const bySection: Record<string, typeof analysis.checklistItems> = {};
  for (const item of analysis.checklistItems) {
    if (!bySection[item.section]) bySection[item.section] = [];
    bySection[item.section].push(item);
  }

  const grouped = {
    ELIGIBLE: analysis.criteria.filter((c) => c.status === "ELIGIBLE"),
    PARTIALLY_ELIGIBLE: analysis.criteria.filter((c) => c.status === "PARTIALLY_ELIGIBLE"),
    NOT_ELIGIBLE: analysis.criteria.filter((c) => c.status === "NOT_ELIGIBLE"),
    OTHER: analysis.criteria.filter((c) => !["ELIGIBLE", "PARTIALLY_ELIGIBLE", "NOT_ELIGIBLE"].includes(c.status)),
  };

  return (
    <div>
      <TopBar 
        title={getTenderDisplayTitle(analysis)} 
        subtitle={<span className="font-mono">{analysis.refNumber} · {analysis.organization}</span>} 
      />
      <TenderDetailClient 
        analysis={analysis} 
        bySection={bySection} 
        grouped={grouped} 
      />
    </div>
  );
}
