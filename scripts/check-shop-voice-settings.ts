import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const shopId = process.argv[2] ?? "shop_demo";
  const row = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      name: true,
      twilioPhoneNumber: true,
      aiVoiceAgentEnabled: true,
      aiSmsAgentEnabled: true,
      timezone: true,
      apptDayStart: true,
      apptDayEnd: true,
      plan: true,
    },
  });
  console.log(row);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
