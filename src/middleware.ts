import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { isClerkConfigured } from "@/lib/clerk-auth-client";
import { isPrimaryAppHost, slugFromSitesSubdomain } from "@/lib/custom-domain";
import {
  ACTIVE_SHOP_COOKIE,
  DEMO_SHOP_ID,
  EMPTY_DEMO_SHOP_ID,
} from "@/lib/shop-constants";

/** CRM app routes — set default demo shop when cookie is missing or points at empty tenant. */
const CRM_PREFIXES = [
  "/dashboard",
  "/customers",
  "/job-board",
  "/repair-orders",
  "/appointments",
  "/employees",
  "/canned-jobs",
  "/settings",
];

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing(.*)",
  "/features(.*)",
  "/launch(.*)",
  "/demo(.*)",
  "/signup(.*)",
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/approve(.*)",
  "/invoice(.*)",
  "/onboard(.*)",
  "/sites(.*)",
  "/api/webhooks(.*)",
  "/api/sites(.*)",
]);

function isCrmRoute(pathname: string): boolean {
  return CRM_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function rewriteToMicrosite(
  request: NextRequest,
  slug: string,
  pathname: string,
  requestHeaders: Headers,
): Promise<NextResponse> {
  const url = request.nextUrl.clone();
  url.pathname = `/sites/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

async function resolveCustomHostRewrite(
  request: NextRequest,
  host: string,
  pathname: string,
  requestHeaders: Headers,
): Promise<NextResponse | null> {
  const subSlug = slugFromSitesSubdomain(host);
  if (subSlug) {
    return rewriteToMicrosite(request, subSlug, pathname, requestHeaders);
  }

  try {
    const resolveUrl = new URL("/api/sites/resolve-host", request.url);
    resolveUrl.searchParams.set("host", host.split(":")[0]!);
    const res = await fetch(resolveUrl, {
      headers: { "x-middleware-resolve": "1" },
    });
    if (res.ok) {
      const body = (await res.json()) as { slug?: string | null };
      if (body.slug) {
        return rewriteToMicrosite(request, body.slug, pathname, requestHeaders);
      }
    }
  } catch {
    // fall through — unknown host serves the app normally
  }

  return null;
}

async function shoprallyMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (!isPrimaryAppHost(host) && !pathname.startsWith("/api/")) {
    const rewrite = await resolveCustomHostRewrite(request, host, pathname, requestHeaders);
    if (rewrite) return rewrite;
  }

  if (!isCrmRoute(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const cookie = request.cookies.get(ACTIVE_SHOP_COOKIE)?.value;
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!cookie && !isClerkConfigured()) {
    response.cookies.set(ACTIVE_SHOP_COOKIE, DEMO_SHOP_ID, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  if (cookie === EMPTY_DEMO_SHOP_ID && !isClerkConfigured()) {
    response.cookies.set(ACTIVE_SHOP_COOKIE, DEMO_SHOP_ID, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export default isClerkConfigured()
  ? clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
      return shoprallyMiddleware(request);
    })
  : shoprallyMiddleware;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
