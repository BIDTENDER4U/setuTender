import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { TenderAnalysis, EligibilityCriterion, ChecklistItem, MissingDocument, CompanyProfile } from "@prisma/client";
import { getTenderPortal, isGeMReference } from "@/lib/tender-portal";

type FullAnalysis = TenderAnalysis & {
  criteria: EligibilityCriterion[];
  checklistItems: ChecklistItem[];
  missingDocuments: MissingDocument[];
};

/**
 * Renders the full executive tender summary & submission checklist PDF
 * styled precisely after official government compliance formats (e.g. BMC/GeM/CPPP).
 */
export async function generateReportPdf(analysis: FullAnalysis, profile: CompanyProfile | null): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const pageWidth = 595; // A4
  const pageHeight = 842;
  const contentWidth = pageWidth - margin * 2; // 515

  const darkNavy = rgb(0.06, 0.12, 0.22); // #0F1F38
  const headerBlue = rgb(0.08, 0.38, 0.74); // #1462BC
  const barBlue = rgb(0.05, 0.35, 0.70); // #0D5AB3
  const lightBarBg = rgb(0.94, 0.96, 0.98); // #F0F4F9
  const textDark = rgb(0.12, 0.15, 0.18); // #1E262E
  const textFaint = rgb(0.38, 0.43, 0.50); // #616E80
  const lineRule = rgb(0.85, 0.88, 0.91); // #D9E0E8

  const pages: any[] = [];
  let page = doc.addPage([pageWidth, pageHeight]);
  pages.push(page);
  let y = pageHeight - margin;

  function checkNewPage(needed: number) {
    if (y - needed < margin + 25) {
      page = doc.addPage([pageWidth, pageHeight]);
      pages.push(page);
      y = pageHeight - margin;
    }
  }

  function drawSectionBar(title: string) {
    checkNewPage(26);
    y -= 4;
    // Background rectangle
    page.drawRectangle({
      x: margin + 3.5,
      y: y - 14,
      width: contentWidth - 3.5,
      height: 18,
      color: lightBarBg,
    });
    // Left blue vertical accent line
    page.drawRectangle({
      x: margin,
      y: y - 14,
      width: 3.5,
      height: 18,
      color: barBlue,
    });
    // Section title
    page.drawText(title.toUpperCase(), {
      x: margin + 8,
      y: y - 10,
      size: 9.5,
      font: bold,
      color: darkNavy,
    });
    y -= 22;
  }

  function drawBodyText(text: string, size = 9) {
    const maxWidth = contentWidth - 10;
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) > maxWidth) {
        checkNewPage(size + 5);
        page.drawText(line, { x: margin + 4, y, size, font, color: textDark });
        y -= size + 4.5;
        line = w;
      } else {
        line = trial;
      }
    }
    if (line) {
      checkNewPage(size + 5);
      page.drawText(line, { x: margin + 4, y, size, font, color: textDark });
      y -= size + 4.5;
    }
  }

  // --- 1. Top Header ---
  const orgName = (analysis.organization || "GOVERNMENT E-TENDER AUTHORITY").toUpperCase();
  page.drawText(orgName, {
    x: margin,
    y: y - 6,
    size: 13.5,
    font: bold,
    color: darkNavy,
  });
  y -= 22;

  page.drawText("Tender Submission Checklist & Mandatory Requirements", {
    x: margin,
    y,
    size: 11.5,
    font: bold,
    color: headerBlue,
  });
  y -= 14;

  // Thin top rule for metadata
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + contentWidth, y },
    thickness: 0.75,
    color: lineRule,
  });
  y -= 10;

  // Metadata 2-Column Strip
  const col1X = margin;
  const col2X = margin + 250;
  const labelSize = 8.5;

  const isGem = isGeMReference(analysis);
  const idLabel = isGem ? "Bid Number:" : "Tender ID:";

  // Row 1: Work & Tender ID / Bid Number
  const workTitle = (analysis.title || analysis.sourceFileName || "Tender Work").slice(0, 48);
  const tenderId = analysis.tenderId || analysis.refNumber || (isGem ? "GEM/2026/B/1001" : "2026_TND_1001");
  
  page.drawText("Work:", { x: col1X, y, size: labelSize, font: bold, color: darkNavy });
  page.drawText(` ${workTitle}`, { x: col1X + 30, y, size: labelSize, font, color: textDark });

  page.drawText(idLabel, { x: col2X, y, size: labelSize, font: bold, color: darkNavy });
  page.drawText(` ${tenderId}`, { x: col2X + (isGem ? 54 : 46), y, size: labelSize, font, color: textDark });
  y -= 12;

  // Row 2: Estimated Cost & Portal
  const estCost = analysis.tenderValue || "As per BOQ / Schedule of Rates";

  page.drawText("Estimated Cost:", { x: col1X, y, size: labelSize, font: bold, color: darkNavy });
  page.drawText(` ${estCost}`, { x: col1X + 70, y, size: labelSize, font, color: textDark });

  y -= 10;

  // Thin bottom rule for metadata
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + contentWidth, y },
    thickness: 0.75,
    color: lineRule,
  });
  y -= 12;

  // --- 2. Sections and Requirements ---
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

  const bySection = new Map<string, ChecklistItem[]>();
  for (const item of analysis.checklistItems) {
    if (!bySection.has(item.section)) bySection.set(item.section, []);
    bySection.get(item.section)!.push(item);
  }

  // Fallback defaults if empty for any section
  const defaultItems: Record<string, string[]> = {
    "Eligibility Criteria": [
      "Bidder must be an established entity, Proprietary/Partnership Firm, LLP, Private Limited, or Public Limited Company registered under the Companies Act.",
      "Bidder must be registered with competent authority / municipal corporation or possess equivalent registration/experience with Central/State Govt. or PSUs.",
      "Technical capacity of having satisfactorily executed similar completed works in Govt./PSU in the last 5-7 years costing not less than prescribed threshold.",
      "Financial capacity of having achieved minimum required average annual turnover during the last 3 financial years.",
      "Bidder must not be under penal action, debarment, or blacklisting by any Govt. or PSU undertaking.",
    ],
    "Required Documents": [
      "Certified copy of Permanent Account Number (PAN) documents.",
      "Valid Goods and Services Tax (GST) Registration Certificate.",
      "Valid Bank Solvency Certificate / Financial Standing letter issued by a scheduled bank.",
      "Work completion certificate(s) and work order(s) establishing previous technical experience.",
      "MSME / Udyam Registration Certificate (if claiming exemption benefits).",
    ],
    "Tender Forms": [
      "Duly completed and signed Bidder Details Form with authorized signatory verification.",
      "Bill of Quantities (BOQ) with quoted percentage/rates submitted electronically on the tender portal.",
    ],
    "Declaration Forms": [
      "Non-Blacklisting Undertaking / Affidavit stating the firm is not banned or debarred by any Govt. body.",
      "Undertaking of Amount of Works in hand along with Purchase Orders / Work Orders.",
      "Undertaking for deployment of requisite manpower, machinery, and equipment during contract execution.",
    ],
    "Annexures": [
      "Annexure - I: Details of Key Technical and Supervisory Personnel proposed for this contract.",
      "Annexure - II: Bid Capacity / Technical Evaluation calculation statement.",
    ],
    "Certificates": [
      "Turnover Certificate for last 3 financial years duly certified by a practicing Chartered Accountant with UDIN.",
      "Valid Bank Solvency Certificate issued by a recognized scheduled commercial bank.",
    ],
    "Financial Documents": [
      `Proof of payment of online Earnest Money Deposit (EMD) / Bid Security (${analysis.emd || "As applicable"}).`,
      `Proof of payment of online Tender Fee / Scrutiny Fee (${analysis.tenderFee || "As applicable"}).`,
      "Audited Financial Statements (Balance Sheet and Profit & Loss Account) for the last 3 financial years.",
    ],
    "Technical Documents": [
      "Detailed Technical Specifications Compliance Sheet and manufacturer authorization (if applicable).",
      "Technical qualification credentials and client satisfaction certificates.",
    ],
    "GeM Upload Documents": [
      analysis.isGem 
        ? "Mandatory GeM Seller Undertaking, OEM Authorization Certificate, and Land Border declaration."
        : "Not Applicable (Procurement is being conducted online via official e-tendering portal).",
    ],
    "Other Mandatory Requirements": [
      "Complete digital submission of all bid documents before closing deadline with valid digital signature (DSC).",
      "Submission of Performance Bank Guarantee (PBG) and Security Deposit upon letter of acceptance (LOA).",
      "Compliance with standard integrity pact and statutory labor law regulations.",
    ],
  };

  for (const sectionName of ORDERED_SECTIONS) {
    drawSectionBar(sectionName);

    const dbItems = (bySection.get(sectionName) || []).filter((item) => item.mandatory);
    const itemsToPrint = dbItems.map((it) => it.requirement);
    if (itemsToPrint.length === 0) continue;

    itemsToPrint.forEach((reqText, idx) => {
      drawBodyText(`${idx + 1}. ${reqText}`);
      y -= 2; // Extra space between items
    });

    y -= 4; // Space between sections
  }

  // --- 3. Page Numbering (Footer) ---
  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = `Page ${i + 1} of ${totalPages}`;
    p.drawText(footerText, {
      x: pageWidth / 2 - 25,
      y: 18,
      size: 8,
      font,
      color: textFaint,
    });
  }

  return doc.save();
}
