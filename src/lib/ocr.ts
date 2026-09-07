/**
 * OCR stub for scanned/image-based tender PDFs.
 *
 * pdf-parse (used in src/lib/ai.ts) only extracts text that is already
 * embedded in the PDF. When a tender PDF is a scan (no embedded text
 * layer), extractedText will come back empty or near-empty — that's your
 * signal to route the file through OCR before analysis.
 *
 * Wire this up to a real provider (Google Cloud Vision, AWS Textract,
 * Azure Document Intelligence, or a self-hosted Tesseract service) and set
 * OCR_PROVIDER in .env. Until then this throws, and the analyze route
 * marks the tender as NEEDS_MANUAL_VERIFICATION rather than guessing.
 */
export async function runOcr(fileBuffer: Buffer): Promise<string> {
  const provider = process.env.OCR_PROVIDER ?? "none";
  if (provider === "none") {
    throw new Error(
      "No OCR provider configured. This tender appears to be a scanned document " +
        "and needs OCR before it can be analyzed. Set OCR_PROVIDER in .env and implement runOcr()."
    );
  }
  // TODO: call your OCR provider here and return the extracted text.
  throw new Error(`OCR provider "${provider}" is not yet implemented — see src/lib/ocr.ts`);
}
