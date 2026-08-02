import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registrar nueva organización con usuario admin
   */
  async register(dto: RegisterDto) {
    // Verificar email único
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario registrado con este email.');
    }

    // Generar slug a partir del nombre de la organización
    const slug = dto.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Verificar slug único
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      throw new ConflictException('Ya existe una organización con un nombre similar.');
    }

    // Hash del password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Crear organización + usuario en una transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.userName || null,
          role: 'ADMIN',
          organizationId: organization.id,
        },
      });

      // Crear suscripción de prueba gratuita de 7 días (Plan TRIAL con 1 agente)
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          plan: 'TRIAL',
          status: 'ACTIVE',
          currentPeriodStart: trialStartDate,
          currentPeriodEnd: trialEndDate,
        },
      });

      return { organization, user };
    });

    // Generar JWT
    const token = this.generateToken(result.user.id, result.organization.id, result.user.role);

    this.logger.log(`✅ Nueva organización registrada: "${result.organization.name}" (${result.organization.id})`);

    return {
      accessToken: token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
    };
  }

  /**
   * Login con email y password
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (user.isActive === false || user.organization?.isActive === false) {
      throw new UnauthorizedException('Cuenta o acceso de la organización suspendido. Contacta al Administrador.');
    }

    const token = this.generateToken(user.id, user.organizationId, user.role);

    this.logger.log(`🔑 Login exitoso: ${user.email} (Org: ${user.organization.name})`);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
      },
    };
  }

  private generateToken(userId: string, orgId: string, role: string): string {
    return this.jwtService.sign({
      sub: userId,
      orgId,
      role,
    });
  }
}
