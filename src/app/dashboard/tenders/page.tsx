import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import TopBar from "@/components/TopBar";
import TenderListClient from "./TenderListClient";

export default async function TendersPage() {
  const session = await getServerSession(authOptions);
  const userId = (session!.user as any).id;
  const tenders = await db.tenderAnalysis.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <TopBar title="My Tenders" subtitle="Every tender you've analyzed, with its result on file" />
      <div className="p-9">
        <TenderListClient tenders={tenders} />
      </div>
    </div>
  );
}
