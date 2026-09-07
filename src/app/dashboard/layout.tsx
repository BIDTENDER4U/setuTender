import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const sessionUser = session.user as any;
  const isAdmin = sessionUser.role === "ADMIN";
  const pathname = headers().get("x-setu-pathname") ?? "";
  const subscription = await db.subscription.findUnique({ where: { userId: sessionUser.id } });
  const hasMembership = subscription?.status === "ACTIVE";

  if (!isAdmin && !hasMembership && pathname !== "/dashboard/subscription") {
    redirect("/dashboard/subscription?required=1");
  }

  const profile = await db.companyProfile.findUnique({ where: { userId: sessionUser.id } });

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar companyName={profile?.companyName ?? session.user.email ?? "Account"} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
