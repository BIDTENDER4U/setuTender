type TenderPortalSource = {
  isGem?: boolean | null;
  tenderId?: string | null;
  refNumber?: string | null;
  organization?: string | null;
  rawAiResponse?: unknown;
};

export function isGeMReference(tender: TenderPortalSource): boolean {
  const identifiers = [tender.tenderId, tender.refNumber].filter(Boolean).join(" ");
  return /\bGEM\/\d{4}\/[A-Z0-9]+\/\d+\b/i.test(identifiers);
}

export function getTenderPortal(tender: TenderPortalSource): string {
  if (isGeMReference(tender)) return "GeM (Government e-Marketplace)";

  const raw = tender.rawAiResponse as { tender_details?: { portal_name?: string | null } } | null;
  if (raw?.tender_details?.portal_name?.trim()) return raw.tender_details.portal_name.trim();

  if (tender.organization && /\bCPWD\b/i.test(tender.organization)) return "CPWD e-Tender Portal";
  return "Portal not specified in tender document";
}
