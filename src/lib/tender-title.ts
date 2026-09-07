type TenderTitleSource = {
  title?: string | null;
  description?: string | null;
  sourceFileName?: string | null;
  rawAiResponse?: unknown;
};

export function getTenderDisplayTitle(tender: TenderTitleSource): string {
  const title = tender.title?.trim() ?? "";
  if (title.length >= 12 && !/^(pab|work|title|subject|na|n\/a|nil)$/i.test(title)) return title;

  const raw = tender.rawAiResponse as { tender_details?: { description?: string | null } } | null;
  const brief = tender.description?.trim() || raw?.tender_details?.description?.trim();
  if (brief && brief.length >= 12) return brief.slice(0, 160);

  if (tender.sourceFileName) {
    return tender.sourceFileName
      .replace(/\.[^/.]+$/, "")
      .replace(/\s*\(\+\d+\s+other\s+files\)/i, "")
      .replaceAll("_", " ")
      .replaceAll("-", " ");
  }
  return "Government E-Tender Work";
}
