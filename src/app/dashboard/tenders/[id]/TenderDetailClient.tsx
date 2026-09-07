"use client";
import { useState } from "react";
import { Download, FileText, CheckSquare, BarChart3, AlertTriangle, Printer } from "lucide-react";
import { getTenderDisplayTitle } from "@/lib/tender-title";
import { getTenderPortal, isGeMReference } from "@/lib/tender-portal";

interface TenderDetailClientProps {
  analysis: any;
  bySection: Record<string, any[]>;
  grouped: {
    ELIGIBLE: any[];
    PARTIALLY_ELIGIBLE: any[];
    NOT_ELIGIBLE: any[];
    OTHER: any[];
  };
}

const TONE: Record<string, string> = {
  ELIGIBLE: "success", PARTIALLY_ELIGIBLE: "warning", NOT_ELIGIBLE: "danger",
  DOCUMENT_MISSING: "danger", INFORMATION_REQUIRED: "warning",
  NOT_APPLICABLE: "info", NEEDS_MANUAL_VERIFICATION: "info",
};
const DOT: Record<string, string> = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", info: "bg-info" };
const TEXT: Record<string, string> = { success: "text-success", warning: "text-warning", danger: "text-danger", info: "text-info" };

export default function TenderDetailClient({ analysis, bySection, grouped }: TenderDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "eligibility" | "missing">("summary");

  const ORDERED_SECTIONS = [
    "Eligibility Criteria",
    "Required Documents",
    "Tender Forms",
    "Declaration Forms",
    "Annexures",
    "Certificates",
    "Financial Documents",
    "Technical Documents",
    "GeM Upload Documents",
    "Other Mandatory Requirements",
  ];

  const defaultItems: Record<string, string[]> = {
    "Eligibility Criteria": [
      "Bidder must be an eminent firm, Proprietary/Partnership Firm, Private Limited Company, Public Limited Company, or Company registered under the Indian Companies Act 2013.",
      "Bidder must be registered with competent authority / municipal corporation in required class or possess equivalent registration/experience with Central/State Government, Semi-Govt. Organizations, or Central/State PSUs.",
      "For non-registered vendors, undertaking to register within 45 days (or apply within three months from the date of issue of work order).",
      "Technical capacity of having satisfactorily executed one similar completed work in Govt. / Semi Govt. / PSU in the last 5 years costing not less than 40% of estimated cost (or two works of 25%, or three works of 20%).",
      "Financial capacity of having achieved an average annual financial turnover of at least 30% of the estimated cost during the last 3 financial years.",
      "Bidder must possess adequate Assessed Available Bid Capacity calculated as (A * N * 2 - B).",
      "Bidder must not be under penal action, debarment, or blacklisting by any Govt., Semi Govt., or Govt. Undertaking.",
    ],
    "Required Documents": [
      "Certified copy of Permanent Account Number (PAN) documents.",
      "Equivalent Class of Valid Registration Certificate of competent authority or other Government Authorities.",
      "Valid Bank Solvency Certificate issued by a recognized bank.",
      "Valid Goods and Services Tax (GST) Registration Certificate.",
      "Partnership Deed / Incorporation Certificate (if applicable).",
      "Work completion certificate(s) and work order(s) showing similar completed work in the last 5 years costing not less than 40% of estimated cost.",
      "Proof of Vendor Registration details / Vendor Number.",
    ],
    "Tender Forms": [
      "Duly completed and signed Bidder Details form (containing Name of work, Bid Number, Premium/Rebate quoted, and personal contact details).",
      "Bill of Quantities (BOQ) with quoted percentage/rates submitted online on the e-tender portal.",
    ],
    "Declaration Forms": [
      "Undertaking for obtaining required Class registration within 45 days (applicable for new/unregistered vendors).",
      "Undertaking of Amount of Works in hand with Purchase Order (P.O.) numbers.",
      "Statement showing value of existing commitments and on-going works with stipulated completion periods, duly certified by an Engineer-in-Charge.",
      "Undertaking of arrangement of requisite equipment and manpower during commencement of work.",
      "Undertaking cum indemnity bond in prescribed format stating that the firm is not under penal action by any Govt., Semi-Govt., or PSU.",
    ],
    "Annexures": [
      "Annexure - I: Details of Key Personnel with tenderer who are proposed for this contract along with Vendor Number.",
      "Annexure - II: Bid Capacity calculation sheet duly certified by a Chartered Accountant.",
      "Annexure - III: Scrutiny Report document checklist.",
    ],
    "Certificates": [
      "Turnover Certificate for the last 3 financial years duly certified by a Chartered Accountant with UDIN.",
      "Bid Capacity Certificate duly certified by a Chartered Accountant.",
      "Valid Bank Solvency Certificate issued by a recognized scheduled bank.",
    ],
    "Financial Documents": [
      `Proof of payment of online Earnest Money Deposit (EMD) / Bid Security Deposit (${analysis.emd || "Exempted for MSME"}).`,
      `Proof of payment of online Tender Fee / Scrutiny Fee (${analysis.tenderFee || "Exempted / Nil"}).`,
      "Audited Financial Statements / Balance Sheets and Profit & Loss statements for the last 3 financial years.",
    ],
    "Technical Documents": [
      "Detailed Rate Analysis in prescribed format (mandatory if the bidder quotes a rebate exceeding 15% below estimated cost).",
      "Technical qualification credentials and experience certificates confirming execution of similar nature works.",
    ],
    "GeM Upload Documents": [
      analysis.isGem 
        ? "Mandatory GeM Seller Undertaking, OEM Authorization Certificate, and Land Border declaration."
        : "Not Applicable (Procurement is being conducted online via official e-tendering portal).",
    ],
    "Other Mandatory Requirements": [
      "Complete digital submission of all bid documents through the e-tender portal before closing deadline (no physical submissions allowed).",
      "Acceptance to submit an affidavit on Rs. 200/- stamp paper agreeing to provide valid insurance policies (Work Contract Policy, CAR Policy).",
      "Acceptance to deposit Contract Deposit @ 5% of total contract price either online or via Demand Draft upon award.",
      "Acceptance to submit Performance Bank Guarantee (PBG) and Additional Security Deposit (ASD) if quoting at a rebate.",
    ],
  };

  const isGem = isGeMReference(analysis);
  const orgName = (analysis.organization || (isGem ? "GOVERNMENT E-MARKETPLACE (GeM) BUYER" : "GOVERNMENT E-TENDER AUTHORITY")).toUpperCase();
  const tenderTitle = getTenderDisplayTitle(analysis);
  const tenderId = analysis.tenderId || analysis.refNumber || (isGem ? "GEM/2026/B/1001" : "2026_MCGM_1334056_1");
  const idLabel = isGem ? "Bid Number" : "Tender ID";
  const estCost = analysis.tenderValue || "As per BOQ (Excl. GST)";
  const aiSummary = analysis.rawAiResponse?.summary;
  const importantConditions: string[] = Array.isArray(aiSummary?.important_conditions)
    ? aiSummary.important_conditions
    : [];
  const importantDates: Array<{ label: string; date: string | null }> = Array.isArray(
    analysis.rawAiResponse?.important_dates
  )
    ? analysis.rawAiResponse.important_dates
    : [];
  const riskFlags: string[] = Array.isArray(analysis.riskFlags)
    ? analysis.riskFlags
    : Array.isArray(analysis.rawAiResponse?.risk_flags)
      ? analysis.rawAiResponse.risk_flags
      : [];
  const storedSummary = analysis.summaryText?.trim() ?? "";
  const summaryIsGeneratedPlaceholder =
    !storedSummary ||
    storedSummary.startsWith("This is an official government e-tender") ||
    storedSummary.startsWith("Comprehensive compliance and eligibility analysis");
  const executiveSummary = summaryIsGeneratedPlaceholder
    ? analysis.description || tenderTitle
    : storedSummary;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* --- TOP TABBED NAVIGATION BAR --- */}
      <div className="bg-white border-b border-rule sticky top-0 z-20 px-8 shadow-sm">
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-1 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "summary"
                  ? "border-[#0D5AB3] text-[#0D5AB3] bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <FileText size={16} />
              <span>Executive Tender Summary & Checklist</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("eligibility")}
              className={`flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "eligibility"
                  ? "border-[#0D5AB3] text-[#0D5AB3] bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <BarChart3 size={16} />
              <span>Eligibility Score ({analysis.overallScore}%)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("missing")}
              className={`flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "missing"
                  ? "border-[#0D5AB3] text-[#0D5AB3] bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <AlertTriangle size={16} />
              <span>Missing Documents ({analysis.missingDocuments?.length || 0})</span>
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 border border-slate-300 bg-white text-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm rounded-none"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>
            <a
              href={`/api/tenders/${analysis.id}/report`}
              className="inline-flex items-center gap-1.5 bg-[#0D5AB3] text-white px-3.5 py-1.5 text-xs font-medium hover:bg-[#0A468C] transition-colors shadow-sm rounded-none"
            >
              <Download size={13} />
              <span>Download PDF</span>
            </a>
          </div>
        </div>
      </div>

      <div className="py-8 px-4 flex justify-center">
        {/* ========================================================================= */}
        {/* EXACT OFFICIAL GOVERNMENT TENDER DOCUMENT VIEW (A4 CONTAINER)            */}
        {/* ========================================================================= */}
        {activeTab === "summary" && (
          <div className="bg-white border border-slate-300 shadow-md max-w-[840px] w-full p-10 md:p-14 text-[#1E262E] font-sans">
            
            {/* Header */}
            <div className="mb-4">
              <h1 className="text-[20px] font-bold text-[#0F1F38] tracking-tight mb-1">
                {orgName}
              </h1>
              <h2 className="text-[16px] font-bold text-[#1462BC] tracking-tight">
                Tender Submission Checklist & Mandatory Requirements
              </h2>
            </div>

            {/* Metadata 2-Column Key-Value Strip with thin borders */}
            <div className="border-t border-b border-slate-300 py-2.5 my-4 text-[13px] leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <div>
                  <span className="font-bold text-[#0F1F38]">Work: </span>
                  <span className="text-slate-800">{tenderTitle}</span>
                </div>
                <div>
                  <span className="font-bold text-[#0F1F38]">{idLabel}: </span>
                  <span className="text-slate-800 font-mono font-medium">{tenderId}</span>
                </div>
                <div>
                  <span className="font-bold text-[#0F1F38]">Estimated Cost: </span>
                  <span className="text-slate-800">{estCost}</span>
                </div>
              </div>
            </div>

            {/* Executive overview */}
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-5 mb-7">
              <section className="border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-2">
                  Executive overview
                </h3>
                <p className="text-[13px] leading-relaxed text-slate-800">
                  {executiveSummary}
                </p>
              </section>
              <section className="border border-slate-200 bg-white p-4">
                <h3 className="font-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-2">
                  Important dates
                </h3>
                <div className="space-y-1.5 text-[12px]">
                  {importantDates.length > 0 ? (
                    importantDates.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="flex justify-between gap-3">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-mono text-slate-900 text-right">{item.date || "Not specified"}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500">No dates were extracted from this tender.</span>
                  )}
                </div>
              </section>
            </div>

            {(importantConditions.length > 0 || riskFlags.length > 0 || analysis.finalRecommendation) && (
              <section className="border border-slate-200 p-4 mb-7">
                <h3 className="font-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-3">
                  Conditions and recommendation
                </h3>
                {importantConditions.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-[12.5px] leading-relaxed text-slate-800">
                    {importantConditions.map((condition, index) => <li key={`${condition}-${index}`}>{condition}</li>)}
                  </ul>
                )}
                {riskFlags.length > 0 && (
                  <div className="mt-3 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                    <span className="font-semibold">Review flags:</span> {riskFlags.join(" · ")}
                  </div>
                )}
                {analysis.finalRecommendation && (
                  <p className="mt-3 text-[12.5px] leading-relaxed text-slate-800">
                    <span className="font-semibold text-[#0F1F38]">Recommendation: </span>
                    {analysis.finalRecommendation}
                  </p>
                )}
              </section>
            )}

            {/* All 10 Categories Formatted with Exact Blue Bar + Light Background */}
            <div className="space-y-6 mt-6">
              {ORDERED_SECTIONS.map((sectionName) => {
                const dbItems = (bySection[sectionName] || []).filter((item: any) => item.mandatory);
                const itemsToDisplay = dbItems.map((it: any) => it.requirement);
                if (itemsToDisplay.length === 0) return null;

                return (
                  <div key={sectionName} className="space-y-2.5">
                    {/* Section Header with Left Blue Accent Bar */}
                    <div className="border-l-[4px] border-[#0D5AB3] bg-[#F0F4F9] px-3.5 py-1.5 flex items-center">
                      <span className="font-bold text-[#0F1F38] text-[13px] tracking-wide uppercase">
                        {sectionName}
                      </span>
                    </div>

                    {/* Numbered Items List without tables/bullets */}
                    <div className="space-y-2 pl-1 pr-2">
                      {itemsToDisplay.map((reqText: string, idx: number) => (
                        <div key={idx} className="text-[13px] text-slate-800 leading-relaxed flex items-start">
                          <span className="font-bold text-slate-900 mr-2 shrink-0">{idx + 1}.</span>
                          <span>{reqText}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Document Footer */}
            <div className="border-t border-slate-200 mt-12 pt-4 text-center text-xs text-slate-400">
              Page 1 of 2 · Setu Official Compliance Engine
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ELIGIBILITY CRITERIA & SCORE BREAKDOWN                            */}
        {/* ========================================================================= */}
        {activeTab === "eligibility" && (
          <div className="bg-white border border-slate-300 shadow-md max-w-[840px] w-full p-8 md:p-12">
            <div className="flex items-center gap-8 mb-8 bg-slate-50 border border-slate-200 p-6">
              <div className="text-center shrink-0 pr-6 border-r border-slate-200">
                <div className="font-serif text-5xl text-slate-900 font-bold">{analysis.overallScore}%</div>
                <div className="font-mono text-[10px] text-slate-500 mt-1 uppercase tracking-wider">COMPATIBILITY SCORE</div>
              </div>
              <div className="flex-1">
                {Object.entries((analysis.scoreBreakdown as any) ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 py-1">
                    <div className="text-xs text-slate-700 w-28 capitalize font-medium">{k}</div>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0D5AB3]" style={{ width: `${v}%` }} />
                    </div>
                    <div className="font-mono text-xs text-slate-500 w-10 text-right">{v as number}%</div>
                  </div>
                ))}
              </div>
            </div>

            {([
              ["ELIGIBLE", "success"], ["PARTIALLY_ELIGIBLE", "warning"], ["NOT_ELIGIBLE", "danger"], ["OTHER", "info"],
            ] as const).map(([key, tone]) => {
              const items = grouped[key as keyof typeof grouped];
              if (!items || !items.length) return null;
              return (
                <div key={key} className="mb-6">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className={`w-2 h-2 ${DOT[tone]}`} />
                    <span className={`text-xs font-semibold ${TEXT[tone]}`}>{key.replaceAll("_", " ")}</span>
                  </div>
                  <div className="border border-slate-200 bg-white divide-y divide-slate-100">
                    {items.map((c: any) => (
                      <div key={c.id} className="px-4.5 py-3">
                        <div className="flex justify-between gap-3">
                          <div className="text-[13.5px] text-slate-800">{c.requirement}</div>
                          {c.pageRef && <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200 shrink-0">{c.pageRef}</span>}
                        </div>
                        {c.clientData && <div className="text-xs text-slate-500 mt-1">{c.clientData}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MISSING DOCUMENTS & GAPS                                          */}
        {/* ========================================================================= */}
        {activeTab === "missing" && (
          <div className="bg-white border border-slate-300 shadow-md max-w-[840px] w-full p-8 md:p-12">
            <div className="font-mono text-[11px] text-slate-500 mb-3 uppercase tracking-wider font-semibold">
              DOCUMENTS REQUIRING YOUR ATTENTION BEFORE SUBMISSION
            </div>
            <div className="border border-slate-200 bg-white divide-y divide-slate-100">
              {analysis.missingDocuments?.map((d: any) => (
                <div key={d.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 ${d.mandatory ? "bg-red-600" : "bg-amber-500"}`} />
                      <span className="text-sm font-semibold text-slate-900">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {d.pageRef && <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200">{d.pageRef}</span>}
                      <span className={`text-[11.5px] font-semibold ${d.mandatory ? "text-red-600" : "text-amber-600"}`}>
                        {d.mandatory ? "Mandatory" : "Recommended"}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 ml-4">{d.reason}</div>
                </div>
              ))}
              {(!analysis.missingDocuments || analysis.missingDocuments.length === 0) && (
                <div className="px-5 py-6 text-sm text-green-700 text-center font-semibold">
                  ✓ All mandatory documents are satisfied from your Document Vault.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
