import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from './prisma.service';

export const mockPrismaService = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaService>;
