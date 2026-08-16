const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany({ include: { subscriptions: true }});
  for (const o of orgs) {
    console.log(o.name, o.subscriptions.length, o.subscriptions.map(s => s.plan));
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect());
