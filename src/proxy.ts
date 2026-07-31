import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth?.user ? req.auth : null;

  const isAuthPage =
    pathname.startsWith("/connexion") || pathname.startsWith("/inscription");
  const isProtectedPage =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isAuthPage && session) {
    const role = session.user?.role;
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
    if (role === "PROVIDER") return NextResponse.redirect(new URL("/dashboard/prestataire", req.url));
    return NextResponse.redirect(new URL("/dashboard/client", req.url));
  }

  if (isProtectedPage && !session) {
    return NextResponse.redirect(new URL("/connexion", req.url));
  }

  if (pathname.startsWith("/admin") && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard/client", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/connexion", "/inscription"],
};
