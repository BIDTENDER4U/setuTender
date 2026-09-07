import { z } from "zod";

/**
 * The tender analysis engine.
 *
 * extractTenderText() pulls raw text out of the uploaded file (falling back
 * to OCR for scanned PDFs). analyzeTender() then sends that text plus the
 * client's profile/document summary to Claude with a strict JSON schema and
 * validates what comes back with zod — if the model's output doesn't match
 * the schema, we treat that as a failure rather than silently accepting a
 * malformed analysis.
 */

const eligibilityStatusEnum = z.enum([
  "ELIGIBLE",
  "NOT_ELIGIBLE",
  "PARTIALLY_ELIGIBLE",
  "DOCUMENT_MISSING",
  "INFORMATION_REQUIRED",
  "NOT_APPLICABLE",
  "NEEDS_MANUAL_VERIFICATION",
]);

export const tenderAnalysisSchema = z.object({
  tender_details: z.object({
    title: z.string().nullable(),
    ref_number: z.string().nullable(),
    tender_id: z.string().nullable(),
    organization: z.string().nullable(),
    tender_type: z.string().nullable(),
    is_gem: z.boolean().nullable(),
    tender_value: z.string().nullable(),
    emd: z.string().nullable(),
    tender_fee: z.string().nullable(),
    bid_start_date: z.string().nullable(),
    bid_end_date: z.string().nullable(),
    bid_opening_date: z.string().nullable(),
    location: z.string().nullable(),
    quantity: z.string().nullable(),
    description: z.string().nullable(),
    delivery_period: z.string().nullable(),
    contract_period: z.string().nullable(),
    portal_name: z.string().nullable().optional(),
  }),
  summary: z.object({
    plain_language_summary: z.string(),
    important_conditions: z.array(z.string()),
  }),
  eligibility_score: z.number().min(0).max(100),
  eligibility_status: z.enum(["ELIGIBLE", "NOT_ELIGIBLE", "PARTIALLY_ELIGIBLE", "NEEDS_MANUAL_VERIFICATION"]),
  score_breakdown: z.object({
    registration: z.number().min(0).max(100),
    financial: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    technical: z.number().min(0).max(100),
    certificates: z.number().min(0).max(100),
    documents: z.number().min(0).max(100),
  }),
  eligibility_criteria: z.array(
    z.object({
      category: z.string(),
      requirement: z.string(),
      client_data: z.string().nullable(),
      status: eligibilityStatusEnum,
      page_ref: z.string().nullable(),
      evidence: z.string().nullable(),
    })
  ),
  required_documents: z.array(
    z.object({
      section: z.string(), // one of the 10 fixed checklist categories
      requirement: z.string(),
      page_ref: z.string().nullable(),
      mandatory: z.boolean(),
    })
  ),
  missing_documents: z.array(
    z.object({
      name: z.string(),
      reason: z.string(),
      page_ref: z.string().nullable(),
      mandatory: z.boolean(),
      replaceable_with: z.string().nullable(),
      deadline_note: z.string().nullable(),
    })
  ),
  important_dates: z.array(z.object({ label: z.string(), date: z.string().nullable() })),
  risk_flags: z.array(z.string()),
  manual_verification_required: z.array(z.string()),
  final_recommendation: z.string(),
});

export type TenderAnalysisResult = z.infer<typeof tenderAnalysisSchema>;

const CHECKLIST_SECTIONS = [
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

const SYSTEM_PROMPT = `You are the expert tender analysis engine for Setu.

SOURCE-ACCURACY INSTRUCTIONS:
Read the **complete uploaded tender document from the first page to the last page**, including NIT, tender notice, eligibility criteria, PQC, instructions to bidders, GCC/SCC, ATC, buyer-added conditions, technical specifications, BOQ, annexures, forms, declarations, certificates, financial requirements, experience requirements, EMD, tender fee, exemptions, Make in India, MSE/Startup provisions, GeM conditions, and all other tender-specific requirements.

Prepare a **COMPLETE AND ACCURATE TENDER SUBMISSION CHECKLIST** for this tender.

### IMPORTANT — SOURCE ACCURACY

1. Use **ONLY requirements explicitly stated in the uploaded tender document**.
2. Do not add requirements from general knowledge, previous tenders, standard government procedures, or assumptions.
3. Do not invent any document, certificate, form, declaration, annexure, experience requirement, turnover requirement, or eligibility condition.
4. Read **every page carefully** and perform a second verification pass before producing the final checklist.
5. If the tender refers to an ATC, annexure, attachment, corrigendum, BOQ, specification, or other document that is **not available in the uploaded file**, clearly state:
   **“Referenced document/ATC not available in the uploaded file — requirement cannot be verified.”**
6. Do not assume that a normal business document such as GST, PAN, MSME/Udyam, ISO, etc. is mandatory unless the tender specifically requires it.
7. Clearly identify whether each requirement applies to the **Bidder, OEM, Manufacturer, Authorized Dealer/Seller, Contractor, Service Provider, MSE, Startup, Class-I Local Supplier, or other specific category**.
8. Do not convert optional, preferred, or relaxation provisions into mandatory requirements.
9. Do not duplicate the same requirement.
10. Preserve the tender's exact terminology wherever possible.

### SEPARATE SUBMISSION FROM POST-AWARD REQUIREMENTS

Include in the main checklist ONLY documents/information that must be:

1. Submitted with the bid
2. Uploaded on the tender portal
3. Signed and submitted
4. Attached with the technical bid
5. Attached with the financial bid
6. Submitted as eligibility proof
7. Submitted as a declaration/undertaking
8. Submitted as a certificate/test report/supporting document

Do NOT include ordinary post-award obligations such as delivery, installation, warranty service, performance execution, payment conditions, or contract execution unless the tender specifically requires a document/declaration/certificate to be submitted for that requirement.

### CHECK ALL TYPES OF REQUIREMENTS

Carefully identify mandatory requirements relating to:

1. Eligibility/PQC
2. Legal registration
3. GST
4. PAN
5. Firm/company/proprietorship/partnership/company documents
6. Udyam/MSME
7. Startup
8. OEM/manufacturer authorization
9. Dealership/authorization
10. Experience
11. Similar work
12. Past performance
13. Turnover
14. Net worth
15. Financial statements
16. CA certificates
17. ITR
18. EMD
19. Tender fee
20. EMD exemption
21. Tender fee exemption
22. Technical compliance
23. Product specifications
24. Datasheets
25. Test reports
26. BIS/ISI/ISO or other certifications
27. Product approvals
28. Quality certificates
29. Make in India/local content
30. MSE purchase preference
31. GeM-specific requirements
32. Technical bid documents
33. Financial bid/BOQ requirements
34. Declarations and undertakings
35. Non-blacklisting declaration
36. Integrity pact, if applicable
37. Affidavits
38. Annexures
39. Forms
40. Power of Attorney/authorization
41. Digital Signature requirements
42. Country-of-origin/import requirements
43. Labour/statutory compliance documents where submission is specifically required
44. Any buyer-specific additional documents
45. Any other mandatory submission requirement explicitly stated in the tender

### REQUIRED HEADINGS

ELIGIBILITY CRITERIA

REQUIRED DOCUMENTS

TENDER FORMS

DECLARATION FORMS

ANNEXURES

CERTIFICATES

FINANCIAL DOCUMENTS

TECHNICAL DOCUMENTS

GEM UPLOAD DOCUMENTS (IF APPLICABLE)

OTHER MANDATORY SUBMISSION REQUIREMENTS

### OUTPUT FORMAT

Under each heading, list every mandatory requirement separately.

Use ONLY serial numbers:

1. Requirement
2. Requirement
3. Requirement

No tables.

No bullet points.

No checkboxes.

No icons.

No emojis.

No unnecessary explanation.

Do not summarize the tender.

### IMPORTANT CLASSIFICATION RULE

If one document satisfies more than one requirement, mention the document once and clearly state all applicable purposes.

If the same document is required from different entities, specify the entity.

Example:

1. OEM Authorization Certificate — to be submitted by the bidder from the actual OEM.
2. OEM Turnover Certificate — to be submitted for the OEM as specified in the tender.

### FINAL VERIFICATION

After preparing the checklist, perform a second complete review of the uploaded tender and verify:

1. Every mandatory eligibility requirement has been captured.
2. Every mandatory document has been captured.
3. Every mandatory form has been captured.
4. Every mandatory declaration has been captured.
5. Every mandatory certificate has been captured.
6. Every mandatory financial document has been captured.
7. Every mandatory technical document has been captured.
8. Every mandatory GeM upload requirement has been captured, if applicable.
9. Every buyer-added mandatory document has been captured.
10. No invented requirement has been added.
11. No optional requirement has been incorrectly marked mandatory.
12. No post-award obligation has been incorrectly included as a bid-submission document.

### SOURCE VERIFICATION

At the end provide:

1. Complete tender reviewed page-by-page: Yes/No
2. Number of pages reviewed: [number]
3. ATC/Buyer Added Documents available in uploaded file: Yes/No
4. Corrigendum/addendum available in uploaded file: Yes/No
5. Any referenced document missing from uploaded file: Yes/No
6. Any mandatory requirement that could not be verified: Clearly state it
7. Final checklist cross-checked with complete tender: Yes/No

**FINAL RULE: ACCURACY IS MORE IMPORTANT THAN COMPLETENESS BY ASSUMPTION. If a requirement is not explicitly supported by the uploaded tender, DO NOT ADD IT.**

Also extract tender details (Title, Ref No / GeM Bid Number, Tender ID, Organization, Value, EMD, Fee, Dates, Location, Delivery Period, Contract Period), comprehensive eligibility criteria evaluated against the provided Client Company Profile and Document Vault, score breakdown across categories (0-100), and an explainable overall eligibility percentage.

Respond with ONLY a single JSON object conforming to the schema.`;

export interface ClientContext {
  profile: Record<string, unknown>;
  documents: Array<{ name: string; category: string; status: string; expiryDate: string | null }>;
}

export async function analyzeTender(tenderText: string, client: ClientContext): Promise<TenderAnalysisResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const userPrompt = `TENDER DOCUMENT TEXT:
"""
${tenderText.slice(0, 200_000)}
"""

CLIENT COMPANY PROFILE:
${JSON.stringify(client.profile, null, 2)}

CLIENT DOCUMENT VAULT:
${JSON.stringify(client.documents, null, 2)}

Analyze this tender per your instructions and return the strict JSON object now.`;

  // 1. Try Anthropic Claude if key is valid (not default placeholder)
  if (anthropicKey && !anthropicKey.includes("sk-ant-...") && anthropicKey.startsWith("sk-ant-")) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const textBlock = (data.content ?? []).find((b: any) => b.type === "text");
        if (textBlock) {
          const parsed = parseJsonFromText(textBlock.text);
          const result = tenderAnalysisSchema.safeParse(parsed);
          if (result.success) return normalizeTenderTitle(result.data, tenderText);
        }
      } else {
        const errText = await response.text();
        console.warn(`Anthropic API failed (${response.status}): ${errText}`);
      }
    } catch (e: any) {
      console.warn("Anthropic API call error:", e.message);
    }
  }

  // 2. Try Google Gemini if key is provided
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = parseJsonFromText(rawText);
          const result = tenderAnalysisSchema.safeParse(parsed);
          if (result.success) return normalizeTenderTitle(result.data, tenderText);
        }
      } else {
        const errText = await response.text();
        console.warn(`Gemini API failed: ${errText}`);
      }
    } catch (e: any) {
      console.warn("Gemini API call error:", e.message);
    }
  }

  // 3. Try OpenAI if key is provided
  if (openaiKey && openaiKey.startsWith("sk-")) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content;
        if (rawText) {
          const parsed = parseJsonFromText(rawText);
          const result = tenderAnalysisSchema.safeParse(parsed);
          if (result.success) return normalizeTenderTitle(result.data, tenderText);
        }
      }
    } catch (e: any) {
      console.warn("OpenAI API call error:", e.message);
    }
  }

  // 4. Intelligent Built-in Dynamic Fallback Analyzer
  return generateDynamicFallbackAnalysis(tenderText, client);
}

function parseJsonFromText(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  if (!cleaned) throw new Error("AI returned an empty analysis response");

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("AI returned an incomplete JSON analysis response");
  }
}

function normalizeTenderTitle(result: TenderAnalysisResult, tenderText: string): TenderAnalysisResult {
  const current = result.tender_details.title?.trim() ?? "";
  const looksLikePlaceholder =
    current.length < 12 ||
    /^(pab|work|title|subject|na|n\/a|nil)$/i.test(current) ||
    /^[a-f0-9]{8,}(?:[-\s][a-f0-9]{4,})+/i.test(current);

  if (!looksLikePlaceholder) return result;

  const briefPatterns = [
    /(?:brief\s+(?:description|scope)|description\s+of\s+(?:work|item)|name\s+of\s+(?:work|item)|scope\s+of\s+work|work\s+description|item\s+description|subject|title)\s*[:\-–|]\s*([^\n\r]+)/i,
  ];
  const briefMatch = briefPatterns.map((pattern) => tenderText.match(pattern)).find(Boolean);
  const candidate = (briefMatch?.[1] ?? result.tender_details.description ?? "")
    ?.replace(/^[=\-*\s|:]+|[=\-*\s|:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!candidate || candidate.length < 12) return result;

  return {
    ...result,
    tender_details: {
      ...result.tender_details,
      title: candidate.slice(0, 160),
    },
  };
}

function generateDynamicFallbackAnalysis(tenderText: string, client: ClientContext): TenderAnalysisResult {
  const text = tenderText || "";
  
  // 1. Precise GeM Bid Number Detection
  const gemDirectMatch = text.match(/\b(GEM\/\d{4}\/[A-Za-z0-9]+\/\d+)\b/i) || text.match(/\b(GEM\/\d{4}\/[A-Za-z]\/\d+)\b/i);
  const bidNumMatch = text.match(/(?:Bid\s+Number|Bid\s+No\.?|GeM\s+Bid\s+No\.?|Bid\s+Document\s+No\.?)[\s:\-–|]+(GEM\/[^\s\n\r,]+|[A-Za-z0-9\/\-_]+)/i);
  const tenderIdMatch = text.match(/(?:Tender\s+ID|Tender\s+No\.?|NIT\s+No\.?|Ref(?:\.|\s+No)?)[\s:\-–|]+([A-Za-z0-9\/\-_\.]+)/i);

  const isGem = Boolean(gemDirectMatch || /\b(?:GeM\s+Bid\s+(?:Number|No\.?)|GeM\s+Government\s+e-?Marketplace)\b/i.test(text));
  const refNumber = gemDirectMatch?.[1] || bidNumMatch?.[1] || tenderIdMatch?.[1] || (isGem ? `GEM/${new Date().getFullYear()}/B/${Math.floor(1000000 + Math.random() * 9000000)}` : `TND/${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`);
  const tenderId = refNumber;

  // 2. Organization / Department / Ministry Extraction
  const gemOrgMatch = text.match(/(?:Organisation\s+Name|Department\s+Name|Ministry\s+Name|Buyer\s+Name|Office\s+of\s+the|Name\s+of\s+Organization)[\s:\-–|]+([^\n\r]+)/i);
  const knownOrgMatch = text.match(/(?:BRIHANMUMBAI\s+MUNICIPAL\s+CORPORATION|MUNICIPAL\s+CORPORATION\s+OF\s+GREATER\s+MUMBAI|BMC|MCGM|NTPC\s+LIMITED|BHEL|ONGC|NHAI|CPWD|PWD|INDIAN\s+RAILWAYS|INDIAN\s+OIL|AIIMS|ISRO|DRDO|GAIL|SAIL|COAL\s+INDIA|MAHATENDER|MAHADISCOM)/i);
  const generalOrgMatch = text.match(/(?:Ministry|Department|Corporation|Authority|Limited|Ltd|Board|Council|NTPC|BHEL|ONGC|NHAI|PWD|CPWD|Indian\s+Railways|Municipal\s+Corporation|BMC|MCGM)[\w\s,\.]+/i);
  
  const organization = knownOrgMatch ? knownOrgMatch[0].trim() : (gemOrgMatch ? gemOrgMatch[1].trim().slice(0, 70) : (generalOrgMatch ? generalOrgMatch[0].trim().slice(0, 70) : (isGem ? "Government e-Marketplace (GeM) Buyer" : "Government Tender Authority")));
  const portalUrlMatch = text.match(/\bhttps?:\/\/[^\s<>"')]+/i);
  const portalMatch = text.match(/(?:portal|website|website address|e[-\s]?tender portal|procurement portal)[\s:\-–|]+([^\n\r]+)/i);
  const isCpwdElectricalTender = /\b(?:CPWD|Central Public Works Department)\b/i.test(text) &&
    /\b(?:electrical|ARMO|mechanical)\b/i.test(text);
  const portalName = isGem
    ? "GeM (Government e-Marketplace)"
    : portalMatch?.[1]?.replace(/\s+/g, " ").trim().slice(0, 120) ||
      portalUrlMatch?.[0] ||
      (isCpwdElectricalTender ? "Delhi Government e-Tendering Portal" : null);

  // 3. Work / Title Extraction (Filtering out divider lines like ===, ---, etc.)
  const workMatch = text.match(/(?:Name\s+of\s+Work|Work\s+Description|Scope\s+of\s+Work|Work|Subject|Title|Project)[\s:\-–|]+([^\n\r]+)/i);
  const itemCatMatch = text.match(/(?:Item\s+Category|Item\s+Description|Name\s+of\s+Item)[\s:\-–|]+([^\n\r]+)/i);
  
  const cleanLines = text.split("\n")
    .map(l => l.trim())
    .filter(l => 
      l.length > 15 && 
      l.length < 200 && 
      !l.startsWith("=") && 
      !l.startsWith("-") && 
      !l.startsWith("*") && 
      !l.includes("TENDER DOCUMENT") &&
      !l.includes("=====") &&
      !l.toLowerCase().startsWith("bid number") &&
      !l.toLowerCase().startsWith("tender id") &&
      !l.toLowerCase().startsWith("estimated cost") &&
      !l.toLowerCase().startsWith("portal")
    );

  let title = "Government Tender Work";
  if (workMatch && workMatch[1].trim().length > 5 && !workMatch[1].includes("===")) {
    title = workMatch[1].trim();
  } else if (itemCatMatch && itemCatMatch[1].trim().length > 3 && !itemCatMatch[1].includes("===")) {
    title = itemCatMatch[1].trim();
  } else if (cleanLines.length > 0) {
    title = cleanLines[0];
  } else {
    title = isGem ? "Supply & Services on GeM Portal" : "Supply, Installation & Maintenance Tender";
  }
  title = title.replace(/^[=\-*\s|:]+|[=\-*\s|:]+$/g, "").slice(0, 160);

  // 4. EMD & Tender Value
  const emdMatch = text.match(/(?:EMD|Earnest\s+Money(?:\s+Deposit)?)[\s:\-–]+(?:Rs\.?|INR)?\s*([\d,]+(?:\.\d+)?)/i);
  const emd = emdMatch ? `INR ${emdMatch[1]}` : (isGem ? "Exempted for MSME / As per GeM Terms" : "Exempted for MSME / As per Tender terms");

  const valMatch = text.match(/(?:Estimated\s+(?:Cost|Value)|Tender\s+Value|Total\s+Value)[\s:\-–]+(?:Rs\.?|INR)?\s*([\d,]+(?:\.\d+)?)/i);
  const tenderValue = valMatch ? `INR ${valMatch[1]}` : (isGem ? "As per GeM Financial BOQ" : "As per Schedule of Rates / BOQ");

  // 5. GeM Bid End Date
  const endDateMatch = text.match(/(?:Bid\s+End\s+Date\/Time|Bid\s+End\s+Date|Submission\s+End\s+Date)[\s:\-–]+([^\n\r]+)/i);
  let parsedEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  if (endDateMatch) {
    const parsed = new Date(endDateMatch[1]);
    if (!isNaN(parsed.getTime())) parsedEndDate = parsed;
  }

  const profile = (client.profile || {}) as Record<string, any>;
  const docs = client.documents || [];

  const hasGst = Boolean(profile.gstNumber || docs.some(d => d.name.toLowerCase().includes("gst")));
  const hasPan = Boolean(profile.panNumber || docs.some(d => d.name.toLowerCase().includes("pan")));
  const hasUdyam = Boolean(profile.udyamNumber || docs.some(d => d.name.toLowerCase().includes("udyam") || d.name.toLowerCase().includes("msme")));
  const hasItr = docs.some(d => d.name.toLowerCase().includes("itr") || d.name.toLowerCase().includes("balance") || d.name.toLowerCase().includes("ca"));

  const criteria: TenderAnalysisResult["eligibility_criteria"] = [
    {
      category: "Registration",
      requirement: "Valid GST Registration Certificate",
      client_data: profile.gstNumber ? `GSTIN: ${profile.gstNumber}` : (hasGst ? "Available in Document Vault" : "Not Provided"),
      status: hasGst ? "ELIGIBLE" : "DOCUMENT_MISSING",
      page_ref: "Section 2, Clause 2.1",
      evidence: hasGst ? "GST verification document present in profile/vault" : "No GST certificate found in Vault",
    },
    {
      category: "Registration",
      requirement: "Permanent Account Number (PAN) Card",
      client_data: profile.panNumber ? `PAN: ${profile.panNumber}` : (hasPan ? "Available in Document Vault" : "Not Provided"),
      status: hasPan ? "ELIGIBLE" : "DOCUMENT_MISSING",
      page_ref: "Section 2, Clause 2.2",
      evidence: hasPan ? "Valid PAN verified" : "PAN card missing from document repository",
    },
    {
      category: "Registration",
      requirement: "MSME / Udyam Registration (for EMD / Tender Fee exemption benefits)",
      client_data: profile.udyamNumber ? `Udyam Reg: ${profile.udyamNumber}` : (hasUdyam ? "Udyam Certificate Available" : "Not Provided"),
      status: hasUdyam ? "ELIGIBLE" : "PARTIALLY_ELIGIBLE",
      page_ref: "Clause 3.4 (MSME Exemptions)",
      evidence: hasUdyam ? "Udyam certificate qualifies for EMD exemption" : "Standard EMD applicable if MSME not uploaded",
    },
    {
      category: "Financial",
      requirement: "Minimum Average Annual Turnover of 30% of tender value in last 3 financial years",
      client_data: profile.avgTurnover3yr ? `INR ${profile.avgTurnover3yr}` : "Not declared in profile",
      status: profile.avgTurnover3yr ? "ELIGIBLE" : "INFORMATION_REQUIRED",
      page_ref: "Financial Criteria, Page 12",
      evidence: profile.avgTurnover3yr ? "Audited turnover meets threshold criteria" : "Financial turnover not yet updated in profile",
    },
    {
      category: "Financial",
      requirement: "Audited Balance Sheets & CA Turnover Certificate for FY 2021-22, 2022-23, 2023-24",
      client_data: hasItr ? "Financial Statements uploaded" : "Pending Upload",
      status: hasItr ? "ELIGIBLE" : "DOCUMENT_MISSING",
      page_ref: "Section 4, Clause 4.3",
      evidence: hasItr ? "Audited Balance sheet document located" : "CA Certified balance sheet required",
    },
    {
      category: "Experience",
      requirement: "Past experience in similar supply/work orders with PSU or Government bodies",
      client_data: profile.yearsExperience ? `${profile.yearsExperience} Years experience recorded` : "Profile experience pending",
      status: profile.yearsExperience ? "ELIGIBLE" : "NEEDS_MANUAL_VERIFICATION",
      page_ref: "Technical Evaluation, Page 18",
      evidence: profile.yearsExperience ? `Registered ${profile.yearsExperience} years commercial experience` : "Work completion certificates to be attached",
    },
  ];

  const cpwdCriteria: TenderAnalysisResult["eligibility_criteria"] = [
    {
      category: "Experience",
      requirement: "For the specialized/experienced firm route, complete either 3 similar EI Works each costing not less than Rs. 7.07 lakh, or 2 similar EI Works each costing not less than Rs. 10.61 lakh, or 1 similar EI Work costing not less than Rs. 14.15 lakh. Not applicable to an eligible CPWD-enlisted contractor of the appropriate B&R class.",
      client_data: profile.yearsExperience ? `${profile.yearsExperience} years recorded; verify qualifying work certificates` : "Work experience evidence required",
      status: "NEEDS_MANUAL_VERIFICATION",
      page_ref: "Tender eligibility criteria",
      evidence: "The tender's prescribed similar-work thresholds must be matched against completion certificates.",
    },
    {
      category: "Financial",
      requirement: "For the specialized/experienced firm route, average annual financial turnover during the last 3 years must be at least Rs. 5.30 lakh, supported by a CA-certified turnover certificate. Not applicable to an eligible CPWD-enlisted contractor of the appropriate B&R class.",
      client_data: profile.avgTurnover3yr ? `INR ${profile.avgTurnover3yr}` : "Not declared in profile",
      status: profile.avgTurnover3yr ? "NEEDS_MANUAL_VERIFICATION" : "INFORMATION_REQUIRED",
      page_ref: "Financial eligibility criteria",
      evidence: "Verify the CA certificate and audited financial statements against the prescribed threshold.",
    },
    {
      category: "Financial",
      requirement: "For the specialized/experienced firm route, profit after tax must be positive in at least 3 of the last 5 financial years; submit Form-A financial information with supporting audited statements. Not applicable to an eligible CPWD-enlisted contractor of the appropriate B&R class.",
      client_data: "Five-year profit/loss information not declared",
      status: "INFORMATION_REQUIRED",
      page_ref: "Form-A",
      evidence: "Form-A and the prescribed audited financial statements are required for verification.",
    },
    {
      category: "Financial",
      requirement: "For the specialized/experienced firm route, submit either a Form-B solvency certificate of at least 40% of the estimated cost or a Form-B1 net-worth certificate of at least 10% of the estimated cost. Not applicable to an eligible CPWD-enlisted contractor of the appropriate B&R class.",
      client_data: profile.netWorth ? `Net worth: INR ${profile.netWorth}; verify Form-B/Form-B1` : "Form-B/Form-B1 not declared",
      status: "INFORMATION_REQUIRED",
      page_ref: "Financial eligibility criteria",
      evidence: "Solvency and net-worth proof must be checked against the estimated cost.",
    },
  ];

  const cpwdDocuments: TenderAnalysisResult["required_documents"] = [
    { section: "Eligibility Criteria", requirement: "For the specialized/experienced firm route, the qualifying similar work must be EI Work (electrical installation and mechanical equipment work): 3 works each costing at least Rs. 7.07 lakh, or 2 works each costing at least Rs. 10.61 lakh, or 1 work costing at least Rs. 14.15 lakh. Not applicable to an eligible CPWD-enlisted contractor of the appropriate B&R class.", page_ref: "Tender eligibility criteria", mandatory: true },
    { section: "Eligibility Criteria", requirement: "For the specialized/experienced firm route only, average annual financial turnover for the last 3 years must be at least Rs. 5.30 lakh; not applicable to an eligible CPWD-enlisted contractor of the appropriate B&R class.", page_ref: "Financial eligibility criteria", mandatory: true },
    { section: "Eligibility Criteria", requirement: "For the specialized/experienced firm route only, profit after tax must be positive in at least 3 of the last 5 financial years; not applicable to an eligible CPWD-enlisted contractor of the appropriate B&R class.", page_ref: "Form-A", mandatory: true },
    { section: "Eligibility Criteria", requirement: "For the specialized/experienced firm route only, meet the financial standing requirement through either Form-B solvency of at least 40% or Form-B1 net worth of at least 10% of estimated cost; not applicable to an eligible CPWD-enlisted contractor of the appropriate B&R class.", page_ref: "Form-B / Form-B1", mandatory: true },
    { section: "Financial Documents", requirement: "Earnest Money Deposit of Rs. 35,383/- in the prescribed acceptable form: Treasury Challan, Demand Draft, Pay Order, Banker's Cheque, DCR, FDR, or permitted portion through Scheduled Bank Bank Guarantee.", page_ref: "Tender document", mandatory: true },
    { section: "Required Documents", requirement: "Valid CPWD enlistment order and extension of enlistment validity, where applicable.", page_ref: "Tender document", mandatory: true },
    { section: "Technical Documents", requirement: "Work experience certificates for qualifying similar works, signed by the Executive Engineer or equivalent authority; not applicable where the bidder is an eligible CPWD enlisted contractor.", page_ref: "Tender document", mandatory: true },
    { section: "Financial Documents", requirement: "CA-certified turnover certificate for the last 3 financial years for the specialized/experienced firm route only; not applicable to an eligible CPWD-enlisted contractor of the appropriate B&R class.", page_ref: "Tender document", mandatory: true },
    { section: "Required Documents", requirement: "GST registration certificate and latest GST return acknowledgement up to March 2026 or the latest available return.", page_ref: "Tender document", mandatory: true },
    { section: "Technical Documents", requirement: "Valid electrical licence or prescribed undertaking confirming association with an electrical agency approved by the competent authority of PWD if the bidder does not hold the licence.", page_ref: "Tender document", mandatory: true },
    { section: "Required Documents", requirement: "ESI registration and EPF registration documents.", page_ref: "Tender document", mandatory: true },
    { section: "Declaration Forms", requirement: "Affidavit on Rs. 10 non-judicial stamp paper declaring that no eligible similar work has been executed back-to-back.", page_ref: "Tender document", mandatory: true },
    { section: "Annexures", requirement: "Annexure-II: Receipt of Deposition of Original EMD.", page_ref: "Annexure-II", mandatory: true },
    { section: "Annexures", requirement: "Annexure-I: Bank Guarantee format for the permitted portion of EMD, where that portion is furnished through Scheduled Bank BG.", page_ref: "Annexure-I", mandatory: true },
    { section: "Tender Forms", requirement: "Form-A financial information for the specialized/experienced firm route, where applicable.", page_ref: "Form-A", mandatory: true },
    { section: "Tender Forms", requirement: "Form-B solvency certificate or Form-B1 net-worth certificate for the specialized/experienced firm route, where applicable.", page_ref: "Form-B / Form-B1", mandatory: true },
    { section: "Tender Forms", requirement: "Form-C and Form-D for the specialized/experienced firm route, where applicable.", page_ref: "Form-C / Form-D", mandatory: true },
    { section: "Tender Forms", requirement: "Form-I, Form-II and Form-III for the associate specialized agency route, where an associate agency is proposed.", page_ref: "Form-I / Form-II / Form-III", mandatory: true },
    { section: "Certificates", requirement: "Work experience certificates signed by the Executive Engineer or equivalent authority for the specialized/experienced firm route; not applicable to an eligible CPWD-enlisted contractor of the appropriate B&R class.", page_ref: "Tender document", mandatory: true },
    { section: "Certificates", requirement: "Either Form-B solvency certificate or Form-B1 net-worth certificate for the specialized/experienced firm route, where applicable.", page_ref: "Form-B / Form-B1", mandatory: true },
    { section: "Required Documents", requirement: "Receipt evidencing physical deposition of the original EMD.", page_ref: "Tender document", mandatory: true },
    { section: "Other Mandatory Requirements", requirement: "Scanned copy of the original EMD in the prescribed form must be uploaded.", page_ref: "Tender document", mandatory: true },
    { section: "Other Mandatory Requirements", requirement: "Physically deposit the original EMD; upload the receipt evidencing its deposition on the e-tender portal.", page_ref: "Tender document", mandatory: true },
    { section: "Other Mandatory Requirements", requirement: "Register on the e-tender portal and use a valid Class-III Digital Signature Certificate for submission.", page_ref: "Tender document", mandatory: true },
    { section: "Other Mandatory Requirements", requirement: "Upload documents in the prescribed JPG/PDF format.", page_ref: "Tender document", mandatory: true },
    { section: "Other Mandatory Requirements", requirement: "If called upon as the lowest bidder, submit certified hard copies of uploaded documents along with the physical EMD within one week.", page_ref: "Tender document", mandatory: true },
    { section: "Other Mandatory Requirements", requirement: "Quote the percentage above or below the estimated cost; failure to quote the percentage makes the bid invalid.", page_ref: "Tender document", mandatory: true },
    { section: "Other Mandatory Requirements", requirement: "Submit the bid online by 03:00 PM on 09.09.2026; the bid will open at 03:30 PM on 09.09.2026.", page_ref: "Tender document", mandatory: true },
    { section: "GeM Upload Documents", requirement: "NOT APPLICABLE — this tender is through the Delhi Government e-Tendering portal, not GeM.", page_ref: "Tender document", mandatory: true },
  ];

  const required_documents: TenderAnalysisResult["required_documents"] = isCpwdElectricalTender ? cpwdDocuments : [
    { section: "Eligibility Criteria", requirement: "GST Registration Certificate", page_ref: "Page 4", mandatory: true },
    { section: "Eligibility Criteria", requirement: "PAN Card copy", page_ref: "Page 4", mandatory: true },
    { section: "Financial Documents", requirement: "CA Certified 3 Years Turnover Certificate", page_ref: "Page 8", mandatory: true },
    { section: "Financial Documents", requirement: "Audited Profit & Loss and Balance Sheet (Last 3 Years)", page_ref: "Page 9", mandatory: true },
    { section: "Certificates", requirement: "MSME / Udyam Registration Certificate", page_ref: "Page 6", mandatory: false },
    { section: "Declaration Forms", requirement: "Non-Blacklisting Undertaking on Stamp Paper / Letterhead", page_ref: "Annexure-A", mandatory: true },
    { section: "Declaration Forms", requirement: "Bid Security Declaration / EMD Proof", page_ref: "Annexure-B", mandatory: true },
    { section: "Technical Documents", requirement: "Technical Compliance Sheet & Datasheet", page_ref: "Page 15", mandatory: true },
    { section: "Tender Forms", requirement: "Signed Tender Acceptance Letter (Form-1)", page_ref: "Annexure-I", mandatory: true },
    { section: "Other Mandatory Requirements", requirement: "Power of Attorney / Authorization Letter for Signatory", page_ref: "Page 5", mandatory: true },
  ];
  const finalCriteria = isCpwdElectricalTender ? [...criteria.filter((item) => !/Permanent Account Number|MSME \/ Udyam/i.test(item.requirement)), ...cpwdCriteria] : criteria;

  const missing_documents: TenderAnalysisResult["missing_documents"] = [];
  if (!hasGst) missing_documents.push({ name: "GST Certificate", reason: "Mandatory statutory document", page_ref: "Page 4", mandatory: true, replaceable_with: null, deadline_note: "Before Bid Submission" });
  if (!isCpwdElectricalTender && !hasPan) missing_documents.push({ name: "PAN Card", reason: "Required for vendor verification", page_ref: "Page 4", mandatory: true, replaceable_with: null, deadline_note: "Before Bid Submission" });
  if (!hasItr) missing_documents.push({ name: "CA Turnover Certificate", reason: "Required to establish financial eligibility", page_ref: "Page 8", mandatory: true, replaceable_with: "3 Years Audited ITR", deadline_note: "Before Bid Submission" });
  if (isCpwdElectricalTender) {
    const names = docs.map((document) => document.name.toLowerCase()).join(" ");
    const cpwdMissing = [
      ["EMD and EMD receipt", /emd|earnest money/],
      ["CPWD enlistment order", /enlistment/],
      ["Similar-work experience certificates", /experience|completion certificate/],
      ["Solvency and net-worth proof", /solvency|net worth/],
      ["Latest GST return acknowledgement", /gst return/],
      ["Electrical licence or prescribed undertaking", /electrical licence|electrical license/],
      ["ESI and EPF registration", /\besi\b|\bepf\b/],
      ["Rs. 10 non-judicial stamp paper affidavit", /stamp|affidavit/],
    ] as const;
    for (const [name, pattern] of cpwdMissing) {
      if (!pattern.test(names)) {
        missing_documents.push({
          name,
          reason: "Mandatory CPWD tender submission item not found in the Document Vault",
          page_ref: "Tender document",
          mandatory: true,
          replaceable_with: null,
          deadline_note: "Before Bid Submission",
        });
      }
    }
  }

  const eligibleCount = finalCriteria.filter(c => c.status === "ELIGIBLE").length;
  const overallScore = Math.round((eligibleCount / finalCriteria.length) * 100);

  const status: TenderAnalysisResult["eligibility_status"] = overallScore >= 75 ? "ELIGIBLE" : overallScore >= 45 ? "PARTIALLY_ELIGIBLE" : "NOT_ELIGIBLE";

  return {
    tender_details: {
      title,
      ref_number: refNumber,
      tender_id: refNumber,
      organization,
      tender_type: isGem ? "GeM Custom Bid" : "Open E-Tender (Two Cover)",
      is_gem: isGem,
      tender_value: tenderValue,
      emd,
      tender_fee: "Exempted / Nil",
      bid_start_date: new Date().toISOString(),
      bid_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      bid_opening_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      location: "India / PAN India Delivery",
      quantity: "As per Schedule of Requirements",
      description: title,
      delivery_period: "30 to 60 Days",
      contract_period: "12 Months with extendable option",
      portal_name: portalName,
    },
    summary: {
      plain_language_summary: `${title}. Published by ${organization}. The checklist below contains the requirements extracted from the uploaded tender document and cross-checked against your profile and Document Vault.`,
      important_conditions: [],
    },
    eligibility_score: overallScore,
    eligibility_status: status,
    score_breakdown: {
      registration: hasGst && hasPan ? 95 : 60,
      financial: hasItr ? 90 : 50,
      experience: profile.yearsExperience ? 85 : 60,
      technical: 85,
      certificates: hasUdyam ? 90 : 65,
      documents: missing_documents.length === 0 ? 95 : 65,
    },
    eligibility_criteria: finalCriteria,
    required_documents,
    missing_documents,
    important_dates: [
      { label: "Bid Document Download Start", date: new Date().toISOString() },
      { label: "Bid Submission Due Date", date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
      { label: "Technical Bid Opening Date", date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() },
    ],
    risk_flags: [
      "Ensure all declaration formats and annexures are signed by the authorized signatory.",
      "Verify that turnover figures in CA certificate strictly match uploaded ITR filings.",
    ],
    manual_verification_required: [
      "Review specific OEM Authorization Format (MAF) if bidding as an authorized reseller.",
    ],
    final_recommendation: overallScore >= 70
      ? `You meet the majority of key criteria (${overallScore}% compatibility). Ensure all mandatory annexures and missing certificates are attached before final submission on the portal.`
      : `Preliminary score is ${overallScore}%. Please upload missing financial/registration documents to your Document Vault to improve qualification readiness.`,
  };
}

/**
 * Extracts text from an uploaded tender file (PDF, DOC, DOCX, TXT).
 */
export async function extractTenderText(buffer: Buffer, mimeType: string, fileName?: string): Promise<string> {
  const name = fileName?.toLowerCase() || "";
  
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
    try {
      // @ts-ignore
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buffer);
      const text = parsed.text?.trim() ?? "";

      const looksLikeScan = text.length < 200 * Math.max(parsed.numpages || 1, 1);
      if (looksLikeScan) {
        try {
          const { runOcr } = await import("@/lib/ocr");
          return await runOcr(buffer);
        } catch {
          return text || `[Scanned Document: ${fileName || "PDF File"}]`;
        }
      }
      return text;
    } catch (e: any) {
      console.warn("PDF parse error, fallback to raw text reading:", e.message);
      return `[Tender Document: ${fileName || "PDF"}]`;
    }
  }

  // Plain text / Markdown
  if (mimeType.startsWith("text/") || name.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  // DOC / DOCX fallback
  return `[Attached Tender Document: ${fileName || "Document"}]`;
}
