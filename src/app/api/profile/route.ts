import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/rbac";

const profileSchema = z.object({
  companyName: z.string().min(1),
  authorizedPerson: z.string().min(1),
  businessType: z.enum(["PROPRIETORSHIP", "PARTNERSHIP", "LLP", "PRIVATE_LIMITED", "PUBLIC_LIMITED", "OTHER"]),
  registeredAddress: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  mobile: z.string().min(1),
  email: z.string().email(),
  website: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  panNumber: z.string().optional().nullable(),
  udyamNumber: z.string().optional().nullable(),
  startupRegNo: z.string().optional().nullable(),
  nsicRegNo: z.string().optional().nullable(),
  gemSellerId: z.string().optional().nullable(),
  cin: z.string().optional().nullable(),
  tradeLicenseNo: z.string().optional().nullable(),
  annualTurnover: z.number().optional().nullable(),
  avgTurnover3yr: z.number().optional().nullable(),
  netWorth: z.number().optional().nullable(),
  turnoverNotes: z.string().optional().nullable(),
  yearsExperience: z.number().optional().nullable(),
  experienceNotes: z.string().optional().nullable(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const profile = await db.companyProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const profile = await db.companyProfile.upsert({
    where: { userId: user.id },
    update: parsed.data,
    create: { ...parsed.data, userId: user.id },
  });

  await db.auditLog.create({
    data: { userId: user.id, action: "PROFILE_UPDATED", targetType: "CompanyProfile", targetId: profile.id },
  });

  return NextResponse.json({ profile });
}
