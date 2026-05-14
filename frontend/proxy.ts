import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/api/auth/register"];

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const path = request.nextUrl.pathname;

  // Si es una ruta API, dejar pasar (la autenticación se maneja en cada endpoint)
  if (path.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Si es ruta pública, dejar pasar
  if (PUBLIC_ROUTES.includes(path)) {
    return NextResponse.next();
  }

  // Si no hay token, redirigir al login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
