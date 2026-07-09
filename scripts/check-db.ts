import { prisma } from "../src/db/client";

async function main() {
  const shops = await prisma.shop.findMany({
    select: { id: true, name: true, _count: { select: { customers: true } } },
  });
  console.log("SHOPS:", JSON.stringify(shops, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isPlatformAdmin: true,
    },
  });
  console.log("USERS:", JSON.stringify(users, null, 2));

  const memberships = await prisma.membership.findMany({
    select: { userId: true, shopId: true, active: true, role: true },
  });
  console.log("MEMBERSHIPS:", JSON.stringify(memberships, null, 2));

  const demoCount = await prisma.customer.count({ where: { shopId: "shop_demo" } });
  console.log("shop_demo customer count:", demoCount);
}

main()
  .catch((e) => {
    console.error("DB ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
