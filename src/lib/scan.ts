/**
 * Malware/virus scanning stub for uploaded files.
 *
 * Wire this to ClamAV (self-hosted or clamav-rest), VirusTotal's API, or
 * your cloud provider's file-scanning service. Call scanFile() from the
 * upload routes (documents + tender analyze) before saveFile() persists
 * the bytes, and reject the upload if it comes back unclean.
 */
export async function scanFile(buffer: Buffer): Promise<{ clean: boolean; details?: string }> {
  const provider = process.env.SCAN_PROVIDER ?? "none";
  if (provider === "none") {
    // No scanner configured — fail open in dev, but this should be treated
    // as a blocking TODO before handling real, untrusted client uploads in production.
    return { clean: true, details: "No scan provider configured (SCAN_PROVIDER=none)" };
  }
  // TODO: implement the real scan call here.
  return { clean: true };
}
