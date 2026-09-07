import { db } from "@/lib/db";
import type { TenderAnalysisResult } from "@/lib/ai";

/**
 * Persists an AI analysis result to the database, and — for
 * required_documents / missing_documents — cross-checks each item's name
 * against the client's actual document vault. The AI already sees the
 * vault when it produces its answer, but this second, deterministic pass
 * means a document's live status (e.g. it expired an hour ago) is never
 * stale by the time it's shown to the user, even if the AI call was cached
 * or slightly out of date.
 */
export async function persistAnalysis(analysisId: string, result: TenderAnalysisResult, userId: string) {
  const vault = await db.document.findMany({ where: { userId } });

  const matchDocument = (label: string) => {
    const needle = label.toLowerCase();
    return vault.find(
      (d) => d.name.toLowerCase().includes(needle) || needle.includes(d.name.toLowerCase())
    );
  };

  await db.$transaction(async (tx) => {
    await tx.tenderAnalysis.update({
      where: { id: analysisId },
      data: {
        status: result.eligibility_status === "NEEDS_MANUAL_VERIFICATION" ? "NEEDS_MANUAL_VERIFICATION" : "COMPLETE",
        title: result.tender_details.title,
        refNumber: result.tender_details.ref_number,
        tenderId: result.tender_details.tender_id,
        organization: result.tender_details.organization,
        tenderType: result.tender_details.tender_type,
        isGem: result.tender_details.is_gem,
        tenderValue: result.tender_details.tender_value,
        emd: result.tender_details.emd,
        tenderFee: result.tender_details.tender_fee,
        bidStartDate: parseDate(result.tender_details.bid_start_date),
        bidEndDate: parseDate(result.tender_details.bid_end_date),
        bidOpeningDate: parseDate(result.tender_details.bid_opening_date),
        location: result.tender_details.location,
        quantity: result.tender_details.quantity,
        description: result.tender_details.description,
        deliveryPeriod: result.tender_details.delivery_period,
        contractPeriod: result.tender_details.contract_period,
        summaryText: result.summary.plain_language_summary,
        overallScore: Math.round(result.eligibility_score),
        scoreBreakdown: result.score_breakdown,
        eligibilityStatus: result.eligibility_status,
        riskFlags: result.risk_flags,
        finalRecommendation: result.final_recommendation,
        rawAiResponse: result as any,
      },
    });

    await tx.eligibilityCriterion.createMany({
      data: result.eligibility_criteria.map((c) => ({
        analysisId,
        category: c.category,
        requirement: c.requirement,
        clientData: c.client_data,
        status: c.status,
        pageRef: c.page_ref,
        evidence: c.evidence,
      })),
    });

    await tx.checklistItem.createMany({
      data: result.required_documents.filter((d) => d.mandatory).map((d) => {
        const match = matchDocument(d.requirement);
        return {
          analysisId,
          section: d.section,
          requirement: d.requirement,
          pageRef: d.page_ref,
          mandatory: d.mandatory,
          clientStatus: match ? match.status : "Missing",
          documentId: match?.id,
        };
      }),
    });

    await tx.missingDocument.createMany({
      data: result.missing_documents.map((m) => ({
        analysisId,
        name: m.name,
        reason: m.reason,
        pageRef: m.page_ref,
        mandatory: m.mandatory,
        replaceableWith: m.replaceable_with,
        deadlineNote: m.deadline_note,
      })),
    });
  });
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Recomputes a document's status against its expiry date. Run on a schedule (e.g. daily cron) or on read. */
export function computeDocumentStatus(expiryDate: Date | null, currentStatus: string): string {
  if (!expiryDate) return currentStatus === "PENDING_VERIFICATION" ? currentStatus : "VALID";
  const daysLeft = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return "EXPIRED";
  if (daysLeft <= 30) return "EXPIRING";
  return "VALID";
}
