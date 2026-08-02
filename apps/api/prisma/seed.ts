import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding default super admin user...');

  const email = 'mibot@skale.cl';
  const password = 'GuD3Ns@#';
  const orgName = 'Skale Admin';
  const userName = 'Super Admin';

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`⚠️ User "${email}" already exists. Updating role to SUPER_ADMIN...`);
    await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' },
    });
    return;
  }

  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    let organization = await tx.organization.findUnique({ where: { slug } });
    if (!organization) {
      organization = await tx.organization.create({
        data: {
          name: orgName,
          slug,
        },
      });
    }

    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: userName,
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
      },
    });

    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
      },
    });

    return { organization, user };
  });

  console.log(`✅ Organization created/verified: "${result.organization.name}" (${result.organization.id})`);
  console.log(`✅ Super Admin created: "${result.user.email}" (${result.user.id})`);
  console.log(`🔑 Super Admin login credentials: email=${email} password=${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
