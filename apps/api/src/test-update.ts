import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    include: { subscriptions: true }
  });
  if (!org) {
    console.log("No organizations found");
    return;
  }
  
  console.log("Original org subscriptions:", org.subscriptions);
  
  const existingSub = await prisma.subscription.findFirst({
    where: { organizationId: org.id },
    orderBy: { updatedAt: 'desc' },
  });

  console.log("Found existing sub:", existingSub);

  const res = await prisma.subscription.updateMany({
    where: { organizationId: org.id },
    data: {
      plan: 'PRO',
      status: 'ACTIVE',
    },
  });
  
  console.log("Update result:", res);
  
  const updatedOrg = await prisma.organization.findFirst({
    where: { id: org.id },
    include: { subscriptions: true }
  });
  console.log("Updated org subscriptions:", updatedOrg?.subscriptions);
}

main().finally(() => prisma.$disconnect());
