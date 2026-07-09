import { PrismaClient } from "../src/generated/prisma";
import { customerSearchWhere } from "../src/lib/customer-search";

const prisma = new PrismaClient();
const shopId = "shop_demo";

async function bench<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  const r = await fn();
  const ms = (performance.now() - t0).toFixed(0);
  const extra =
    typeof r === "number"
      ? `(count=${r})`
      : Array.isArray(r)
        ? `(rows=${r.length})`
        : "";
  console.log(`${label}: ${ms}ms ${extra}`);
  return r;
}

async function main() {
  await bench("count all", () => prisma.customer.count({ where: { shopId } }));
  await bench("page 1 (10 rows)", () =>
    prisma.customer.findMany({
      where: { shopId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 10,
      skip: 0,
      select: { id: true, firstName: true, lastName: true },
    }),
  );
  await bench("page 50 @ 100/page", () =>
    prisma.customer.findMany({
      where: { shopId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 100,
      skip: 4900,
      select: { id: true, firstName: true, lastName: true },
    }),
  );
  await bench("search Smith", () =>
    prisma.customer.findMany({
      where: customerSearchWhere(shopId, "Smith"),
      take: 10,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  );
  await bench("search phone 518-200", () =>
    prisma.customer.count({ where: customerSearchWhere(shopId, "518-200") }),
  );
  await bench("search email dummy.0500", () =>
    prisma.customer.count({ where: customerSearchWhere(shopId, "dummy.customer.0500") }),
  );
  await bench("load-test tag count", () =>
    prisma.customer.count({ where: { shopId, tags: { has: "CRM Load Test" } } }),
  );
}

main()
  .finally(() => prisma.$disconnect());
