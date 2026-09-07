import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.subscriptionPlan.upsert({
    where: { code: "basic" },
    update: {},
    create: {
      code: "basic",
      name: "Basic",
      priceInPaise: 149900,
      analysesLimit: 5,
      sortOrder: 1,
      features: [
        "5 tender analyses / month",
        "Company document vault",
        "Eligibility check",
        "Tender summary",
        "Submission checklist",
      ],
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: "professional" },
    update: {},
    create: {
      code: "professional",
      name: "Professional",
      priceInPaise: 399900,
      analysesLimit: 20,
      sortOrder: 2,
      features: [
        "20 tender analyses / month",
        "Everything in Basic",
        "Missing-document detection",
        "Advanced tender analysis",
        "Downloadable PDF reports",
      ],
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: "business" },
    update: {},
    create: {
      code: "business",
      name: "Business",
      priceInPaise: 0, // sales-assisted / custom pricing
      analysesLimit: -1,
      sortOrder: 3,
      features: [
        "Unlimited tender analyses",
        "Multiple users",
        "Priority processing",
        "Admin & reporting features",
      ],
    },
  });

  const adminEmail = "admin@example.com";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: "ADMIN", emailVerified: true },
    });
    console.log(`Seeded admin user: ${adminEmail} / ChangeMe123! (change this immediately)`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
