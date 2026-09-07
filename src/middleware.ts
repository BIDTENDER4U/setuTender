import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
    const role = (req.nextauth.token as any)?.role;
    if (isAdminRoute && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-setu-pathname", req.nextUrl.pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
