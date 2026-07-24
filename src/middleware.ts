import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { isClerkConfigured } from "@/lib/clerk-auth-client";
import { isPrimaryAppHost, slugFromSitesSubdomain } from "@/lib/custom-domain";
import {
  isMarketingOnlyProduction,
  isMarketingPublicPath,
  MARKETING_GATE_REDIRECT,
} from "@/lib/marketing-prod-gate";
import {
  ACTIVE_SHOP_COOKIE,
  DEMO_SHOP_ID,
  EMPTY_DEMO_SHOP_ID,
  readActiveShopCookie,
  SHOP_COOKIE_OPTIONS,
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
  "/compare(.*)",
  "/launch(.*)",
  "/demo(.*)",
  "/signup(.*)",
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/legal(.*)",
  "/crm-unavailable(.*)",
  "/sitemap.xml",
  "/robots.txt",
  "/opengraph-image(.*)",
  "/approve(.*)",
  "/invoice(.*)",
  "/onboard(.*)",
  "/sites(.*)",
  "/api/webhooks(.*)",
  "/api/sites(.*)",
  // Static lab prototypes (no CRM shell / Clerk) — e.g. taxonomy fitment mockup
  "/lab(.*)",
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

/**
 * Hard marketing-only gate (Vercel Production / MARKETING_ONLY=true).
 * Runs before Clerk so adding Clerk keys cannot open CRM by accident.
 */
function marketingOnlyProdGate(request: NextRequest): NextResponse | null {
  if (!isMarketingOnlyProduction()) return null;

  const { pathname } = request.nextUrl;

  if (isMarketingPublicPath(pathname)) return null;

  // Block all APIs on the marketing surface (waitlist/demo use Server Actions on page paths).
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error:
          "ShopRally CRM is not available on this host. Use local development, or reserve a founding seat at /launch.",
      },
      { status: 404 },
    );
  }

  // CRM / platform / share / microsite paths → clean unavailable page (not the app shell).
  const url = request.nextUrl.clone();
  url.pathname = MARKETING_GATE_REDIRECT;
  url.search = "";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url, 307);
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

  const cookie = readActiveShopCookie(request.cookies);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!cookie && !isClerkConfigured()) {
    response.cookies.set(ACTIVE_SHOP_COOKIE, DEMO_SHOP_ID, SHOP_COOKIE_OPTIONS);
    return response;
  }

  if (cookie === EMPTY_DEMO_SHOP_ID && !isClerkConfigured()) {
    response.cookies.set(ACTIVE_SHOP_COOKIE, DEMO_SHOP_ID, SHOP_COOKIE_OPTIONS);
  }

  return response;
}

const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  return shoprallyMiddleware(request);
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // Gate first — before Clerk protect can send users into the CRM sign-in flow.
  const gate = marketingOnlyProdGate(request);
  if (gate) return gate;

  if (isClerkConfigured()) {
    return clerkHandler(request, event);
  }

  return shoprallyMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
