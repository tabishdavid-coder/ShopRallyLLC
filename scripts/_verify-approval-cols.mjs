const { PrismaClient } = require('./src/generated/prisma');
const p = new PrismaClient();
p.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'RepairOrder' AND column_name IN ('approvalSignerName', 'approvalSignedAt', 'approvalSignatureJson') ORDER BY column_name")
  .then(r => { console.log(JSON.stringify(r, null, 2)); return p.$disconnect(); })
  .catch(e => { console.error(e); process.exit(1); });
