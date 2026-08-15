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
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`⚠️ User "${email}" already exists. Updating role to SUPER_ADMIN, active status and password...`);
    await prisma.user.update({
      where: { email },
      data: {
        role: 'SUPER_ADMIN',
        passwordHash: passwordHash,
        isActive: true,
      },
    });
    console.log(`✅ Super Admin updated: "${email}" with password "${password}"`);
  } else {
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

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
  }

  console.log(`🔑 Super Admin login credentials: email=${email} password=${password}`);

  // Seed default plans if none exist
  console.log('📦 Seeding default sales plans...');
  const defaultPlans = [
    {
      name: 'Plan Starter',
      description: 'Ideal para pequeños negocios y profesionales independientes',
      price: 29000,
      maxBots: 1,
      maxDocs: 50,
      features: ['1 Agente de WhatsApp', 'Mensajes Ilimitados', 'RAG hasta 50 documentos', 'Soporte estándar'],
    },
    {
      name: 'Plan Pro',
      description: 'Para empresas en crecimiento con alto volumen de atención',
      price: 79000,
      maxBots: 5,
      maxDocs: 200,
      features: ['5 Agentes de WhatsApp', 'Mensajes Ilimitados', 'RAG hasta 200 documentos', 'Memoria semántica', 'Soporte prioritario 24/7'],
    },
    {
      name: 'Plan Enterprise',
      description: 'Solución a medida para grandes organizaciones',
      price: 199000,
      maxBots: 20,
      maxDocs: 1000,
      features: ['Bots Ilimitados', 'Documentos Ilimitados', 'IA dedicada', 'SLA garantizado', 'Account Manager exclusivo'],
    },
  ];

  for (const p of defaultPlans) {
    await prisma.plan.upsert({
      where: { name: p.name },
      create: p,
      update: {},
    });
  }
  console.log('✅ Default plans seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
