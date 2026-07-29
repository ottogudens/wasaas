import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding default user...');

  const email = 'skale@wasaas.com';
  const password = 'GuD3Ns@#';
  const orgName = 'Skale IA';
  const userName = 'skale';

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`⚠️ User "${email}" already exists. Skipping.`);
    return;
  }

  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: orgName,
        slug,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: userName,
        role: 'ADMIN',
        organizationId: organization.id,
      },
    });

    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        plan: 'STARTER',
        status: 'ACTIVE',
      },
    });

    return { organization, user };
  });

  console.log(`✅ Organization created: "${result.organization.name}" (${result.organization.id})`);
  console.log(`✅ User created: "${result.user.email}" (${result.user.id})`);
  console.log(`🔑 Login credentials: email=${email} password=${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
