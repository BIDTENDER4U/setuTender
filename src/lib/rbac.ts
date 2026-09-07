import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

/** Returns the session, or null. Use in API routes to require login. */
export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as { id: string; email: string; role: "USER" | "ADMIN" };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/** Use at the top of any /api/admin/* route. */
export async function requireAdmin() {
  const user = await requireUser();
  if (!user) return { user: null, error: unauthorized() };
  if (user.role !== "ADMIN") return { user: null, error: forbidden() };
  return { user, error: null };
}
