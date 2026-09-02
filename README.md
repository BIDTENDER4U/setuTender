# Setu — Tender Eligibility & Document Analysis

A SaaS application for Indian businesses bidding on GeM and non-GeM government
tenders: company profile, a permanent document vault, AI-driven tender
summary and eligibility scoring, a submission checklist, and downloadable
PDF reports.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **PostgreSQL** via **Prisma**
- **NextAuth** (credentials + JWT sessions) for auth
- **Claude (Anthropic API)** as the analysis engine, called server-side with
  a strict JSON schema (`src/lib/ai.ts`)
- **pdf-lib** for report generation, **pdf-parse** for text extraction
- **Tailwind CSS**

## What's fully implemented

- Registration, login, logout, forgot/reset password, session expiry
- Company profile (all fields from the spec)
- Document vault: upload, categorize, track expiry, live status
  (Valid / Expiring / Expired / Missing), auth-gated file access (no public
  URLs — every read goes through an ownership check in
  `/api/documents/[id]`)
- Tender upload → text extraction → AI analysis → structured eligibility
  criteria, score breakdown, submission checklist (10 fixed categories),
  missing-document report, page references
- Eligibility score persisted per-criterion, cross-checked against the live
  document vault at read time
- Subscription plans with configurable pricing/limits (nothing hard-coded
  in the UI) and enforced analysis limits per plan
- PDF report download
- Tender history
- Role-based admin view (user list, usage, plan management) — protected by
  middleware, not just page-level checks
- Audit log for profile edits, uploads, deletions, analyses, admin actions

## What's stubbed and needs your credentials

These are built against clean interfaces so wiring in a real provider is a
contained change, not a rewrite:

| Feature | File | What to do |
|---|---|---|
| OCR for scanned tender PDFs | `src/lib/ocr.ts` | Implement `runOcr()` with Google Vision / AWS Textract / Azure Document Intelligence |
| Malware/virus scanning | `src/lib/scan.ts` | Implement `scanFile()` with ClamAV / VirusTotal / a cloud scanner |
| Razorpay payments | `src/lib/payments.ts` | Implement `createOrder()` / `verifyPaymentSignature()` with the Razorpay SDK; add a webhook route |
| S3-compatible file storage | `src/lib/storage.ts` | Implement the `s3` branch of `saveFile`/`readFile`/`deleteFile` (local disk works out of the box for a single-instance deploy) |
| DOC/DOCX text extraction | `src/lib/ai.ts` (`extractTenderText`) | Add a parser such as `mammoth` for `.doc`/`.docx` — PDF is fully implemented |
| Transactional email (password reset) | `src/lib/email.ts` | Works today if you set `SMTP_*` env vars; without them it logs the reset link to the server console (fine for local dev only) |

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY at minimum
npx prisma migrate dev --name init
npm run prisma:seed    # creates the 3 subscription plans + an admin user (admin@example.com / ChangeMe123!)
npm run dev
```

Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

**Change the seeded admin password immediately** — it exists only so the
`/admin` route has something to sign into on first run.

## Deploying

- **App**: Vercel, Railway, Render, or any Node host. If you deploy to a
  serverless platform, switch `STORAGE_DRIVER` to `s3` first — local disk
  storage doesn't persist across serverless invocations.
- **Database**: any managed Postgres (Neon, Supabase, RDS, Railway).
- **File storage**: any S3-compatible bucket (S3, Cloudflare R2, Backblaze B2).
- Never commit `.env` — all secrets are read from environment variables only,
  and API keys are never sent to the client.

## Security notes

- Passwords are hashed with bcrypt (cost factor 12); sessions are JWTs with
  an 8-hour expiry.
- `middleware.ts` protects `/dashboard/*` and `/admin/*` at the routing
  layer; `/admin/*` additionally requires `role: ADMIN`.
- Every document read/delete checks `document.userId === session.user.id`
  (or admin) before touching storage — see `/api/documents/[id]/route.ts`.
- Uploaded file type and size are validated in `src/lib/storage.ts`
  (`assertUploadAllowed`) before anything is written to disk.
- `AuditLog` records profile edits, document uploads/deletions, tender
  analyses, and admin actions.

## Not yet built (natural next steps)

- Email verification on registration
- Expiry-reminder notifications (a daily cron hitting `computeDocumentStatus`
  and emailing users with items expiring soon)
- Rate limiting on auth endpoints
- Automated tests
