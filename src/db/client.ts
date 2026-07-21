import { PrismaClient } from "@/generated/prisma";

// Reuse a single PrismaClient across hot reloads in dev to avoid exhausting
// database connections.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  /** Bumped when schema changes require discarding a cached singleton. */
  prismaSchemaRevision?: number;
};

/** Bump when generated client shape changes (e.g. Shop.apptWeeklyHours). */
const PRISMA_SCHEMA_REVISION = 12;

function withDevPoolParams(url: string): string {
  if (process.env.NODE_ENV !== "development") return url;
  try {
    const parsed = new URL(url);
    // Neon free/dev caps are low; extra browser tabs + HMR blow past the pool fast.
    // Prefer Neon's pooler host when available; keep limit modest either way.
    const usingPooler = parsed.hostname.includes("-pooler") || parsed.searchParams.get("pgbouncer") === "true";
    parsed.searchParams.set("connection_limit", usingPooler ? "10" : "8");
    parsed.searchParams.set("pool_timeout", "30");
    parsed.searchParams.set("connect_timeout", "15");
    return parsed.toString();
  } catch {
    return url;
  }
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(url
      ? {
          datasources: {
            db: { url: withDevPoolParams(url) },
          },
        }
      : {}),
  });
  // Neon idle compute often fails the first connect after sleep (P1001).
  // Warm the pool in the background so the first page load is less likely to 500.
  if (process.env.NODE_ENV === "development") {
    void client.$connect().catch(() => {
      /* first page load will retry via Neon wake */
    });
  }
  return client;
}

function isPrismaClientStale(cached: PrismaClient): boolean {
  if (!Object.hasOwn(cached, "maintenanceProgramService")) return true;
  if (!Object.hasOwn(cached, "depositRequest")) return true;
  if (!Object.hasOwn(cached, "motorCatalogNode")) return true;
  if (!Object.hasOwn(cached, "shopInspectionTemplate")) return true;
  return globalForPrisma.prismaSchemaRevision !== PRISMA_SCHEMA_REVISION;
}

export function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientStale(cached)) {
    void cached.$disconnect();
    delete globalForPrisma.prisma;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaRevision = PRISMA_SCHEMA_REVISION;
  }

  return globalForPrisma.prisma;
}

/** Always resolve the live singleton — avoids stale delegates after HMR/schema changes. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
