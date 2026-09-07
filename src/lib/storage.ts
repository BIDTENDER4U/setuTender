/**
 * File storage abstraction.
 *
 * "local" driver writes to ./uploads on the server's disk — fine for a
 * single-instance deployment or a demo, but won't survive redeploys on most
 * serverless hosts (e.g. Vercel). For production, set STORAGE_DRIVER=s3 and
 * fill in the S3_* env vars; this file is the only place that needs to
 * change to point at S3, R2, Backblaze, or any S3-compatible provider.
 *
 * Whichever driver is used, callers only ever get back an opaque `fileKey`
 * — never a public URL. Documents are served through the authenticated
 * `/api/documents/[id]` route (see that file), which checks ownership
 * before streaming bytes back. This is what "no public document URLs" in
 * the spec means in practice.
 */
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";

// Vercel's deployed filesystem is read-only except for the temporary directory.
// Use UPLOAD_DIR for a persistent volume or S3-compatible driver in production.
const UPLOAD_ROOT =
  process.env.UPLOAD_DIR ??
  (process.env.VERCEL ? path.join(os.tmpdir(), "setu-uploads") : path.join(process.cwd(), "uploads"));

export interface StoredFile {
  fileKey: string;
  sizeBytes: number;
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export function assertUploadAllowed(mimeType: string, sizeBytes: number) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }
  if (sizeBytes > MAX_FILE_BYTES) {
    throw new Error(`File exceeds maximum size of ${MAX_FILE_BYTES / (1024 * 1024)}MB`);
  }
}

export async function saveFile(userId: string, buffer: Buffer, mimeType: string): Promise<StoredFile> {
  assertUploadAllowed(mimeType, buffer.byteLength);

  const driver = process.env.STORAGE_DRIVER ?? "local";
  const key = `${userId}/${randomUUID()}`;

  if (driver === "s3") {
    // TODO: implement with your S3-compatible SDK, e.g.:
    //   const client = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, ... });
    //   await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: mimeType }));
    throw new Error("S3 storage driver not yet implemented — see src/lib/storage.ts");
  }

  const fullPath = path.join(UPLOAD_ROOT, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);

  return { fileKey: key, sizeBytes: buffer.byteLength };
}

export async function readFile(fileKey: string): Promise<Buffer> {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "s3") {
    throw new Error("S3 storage driver not yet implemented — see src/lib/storage.ts");
  }
  return fs.readFile(path.join(UPLOAD_ROOT, fileKey));
}

export async function deleteFile(fileKey: string): Promise<void> {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "s3") {
    throw new Error("S3 storage driver not yet implemented — see src/lib/storage.ts");
  }
  await fs.rm(path.join(UPLOAD_ROOT, fileKey), { force: true });
}
