import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { mockPrismaService } from '../prisma/prisma.mock';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked_jwt_token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      organizationName: 'Test Org',
      userName: 'Test User',
    };

    it('should throw ConflictException if email is already taken', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: '1' } as any);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
    });

    it('should throw ConflictException if organization slug is taken', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.organization.findUnique.mockResolvedValueOnce({ id: '1' } as any);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should successfully register a new organization and user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.organization.findUnique.mockResolvedValueOnce(null);

      mockPrismaService.$transaction.mockImplementationOnce(async (cb) => {
        return cb(mockPrismaService as any);
      });

      const mockOrg = { id: 'org_1', name: 'Test Org', slug: 'test-org' };
      const mockUser = { id: 'user_1', email: registerDto.email, role: 'ADMIN' };

      mockPrismaService.organization.create.mockResolvedValueOnce(mockOrg as any);
      mockPrismaService.user.create.mockResolvedValueOnce(mockUser as any);
      mockPrismaService.subscription.create.mockResolvedValueOnce({} as any);

      const result = await service.register(registerDto);

      expect(result.accessToken).toBe('mocked_jwt_token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.organization.id).toBe(mockOrg.id);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        orgId: mockOrg.id,
        role: mockUser.role,
      });
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      const user = {
        id: '1',
        email: loginDto.email,
        passwordHash: 'hashed_password',
        organization: { id: 'org_1' },
      };
      mockPrismaService.user.findUnique.mockResolvedValueOnce(user as any);
      
      jest.spyOn(bcrypt, 'compare').mockImplementationOnce(() => Promise.resolve(false) as any);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should successfully login and return token', async () => {
      const user = {
        id: '1',
        email: loginDto.email,
        passwordHash: 'hashed_password',
        role: 'ADMIN',
        isActive: true,
        organization: { id: 'org_1', name: 'Test Org', slug: 'test-org', isActive: true },
      };
      mockPrismaService.user.findUnique.mockResolvedValueOnce(user as any);
      
      jest.spyOn(bcrypt, 'compare').mockImplementationOnce(() => Promise.resolve(true) as any);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mocked_jwt_token');
      expect(result.user.id).toBe(user.id);
      expect(result.organization.id).toBe(user.organization.id);
    });
  });
});
