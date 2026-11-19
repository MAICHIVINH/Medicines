import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma, ensureDatabaseConfigured } from '@/infrastructure/database/prisma';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { enforceRateLimit, resetRateLimit } from '@/lib/rate-limit';

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập Tên đăng nhập hoặc Email.'),
  password: z
    .string()
    .min(1, 'Vui lòng nhập Mật khẩu.'),
});

export const updateAdminProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
    .max(255, 'Họ và tên không vượt quá 255 ký tự.'),
  email: z
    .string()
    .trim()
    .email('Địa chỉ Email không hợp lệ.')
    .max(255, 'Email không vượt quá 255 ký tự.'),
});

export const changeAdminPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự.')
      .max(128, 'Mật khẩu mới không vượt quá 128 ký tự.')
      .regex(/[A-Z]/, 'Mật khẩu mới phải chứa ít nhất 1 chữ cái in hoa.')
      .regex(/[a-z]/, 'Mật khẩu mới phải chứa ít nhất 1 chữ cái thường.')
      .regex(/[0-9]/, 'Mật khẩu mới phải chứa ít nhất 1 chữ số.'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp với mật khẩu mới.',
    path: ['confirmPassword'],
  });

export interface AuthenticatedAdminDto {
  id: string;
  username: string;
  email: string;
  fullName: string;
  lastLoginAt: Date | null;
}

export class AdminAuthRepository {
  public async findByIdentifier(identifier: string) {
    const clean = identifier.trim();
    return prisma.adminAccount.findFirst({
      where: {
        OR: [
          { username: { equals: clean, mode: 'insensitive' } },
          { email: { equals: clean, mode: 'insensitive' } },
        ],
      },
    });
  }

  public async findById(id: string) {
    return prisma.adminAccount.findUnique({
      where: { id },
    });
  }

  public async updateLastLogin(id: string) {
    return prisma.adminAccount.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  public async updateProfile(id: string, data: { fullName: string; email: string }) {
    return prisma.adminAccount.update({
      where: { id },
      data: {
        fullName: data.fullName,
        email: data.email,
      },
    });
  }

  public async updatePassword(id: string, passwordHash: string) {
    return prisma.adminAccount.update({
      where: { id },
      data: { passwordHash },
    });
  }
}

export class AdminAuthService {
  constructor(private readonly repo = new AdminAuthRepository()) {}

  /**
   * Xác thực thông tin đăng nhập Admin với cơ chế chống Brute-force
   */
  public async verifyCredentials(
    rawIdentifier: string,
    rawPassword: string,
    ipAddress = '127.0.0.1'
  ): Promise<AuthenticatedAdminDto> {
    ensureDatabaseConfigured();

    const parsed = loginSchema.parse({
      identifier: rawIdentifier,
      password: rawPassword,
    });

    const rateKey = `${ipAddress}:${parsed.identifier.toLowerCase()}`;
    enforceRateLimit(rateKey, {
      namespace: 'admin_login',
      maxRequests: 5,
      windowMs: 5 * 60 * 1000, // Tối đa 5 lần thử sai trong 5 phút
    });

    const admin = await this.repo.findByIdentifier(parsed.identifier);
    if (!admin || !admin.isActive) {
      throw new UnauthorizedError('Tên đăng nhập/Email hoặc mật khẩu không chính xác.');
    }

    const isValid = await bcrypt.compare(parsed.password, admin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Tên đăng nhập/Email hoặc mật khẩu không chính xác.');
    }

    // Reset bộ đếm brute-force sau khi đăng nhập thành công
    resetRateLimit('admin_login', rateKey);

    const updated = await this.repo.updateLastLogin(admin.id);

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      fullName: updated.fullName,
      lastLoginAt: updated.lastLoginAt,
    };
  }

  public async getAccountProfile(adminId: string) {
    ensureDatabaseConfigured();
    const admin = await this.repo.findById(adminId);
    if (!admin) {
      throw new NotFoundError('Không tìm thấy tài khoản Quản trị viên.');
    }

    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      fullName: admin.fullName,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  public async updateAccountProfile(
    adminId: string,
    input: z.infer<typeof updateAdminProfileSchema>,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = updateAdminProfileSchema.parse(input);
    const existing = await this.repo.findById(adminId);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy tài khoản Quản trị viên.');
    }

    if (validated.email.toLowerCase() !== existing.email.toLowerCase()) {
      const duplicate = await prisma.adminAccount.findFirst({
        where: {
          email: { equals: validated.email, mode: 'insensitive' },
          id: { not: adminId },
        },
      });
      if (duplicate) {
        throw new ConflictError('Địa chỉ Email này đã được sử dụng.');
      }
    }

    const updated = await this.repo.updateProfile(adminId, validated);

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      fullName: updated.fullName,
      isActive: updated.isActive,
      lastLoginAt: updated.lastLoginAt,
      updatedAt: updated.updatedAt,
    };
  }

  public async changePassword(
    adminId: string,
    input: z.infer<typeof changeAdminPasswordSchema>,
    _ipAddress?: string
  ) {
    ensureDatabaseConfigured();
    const validated = changeAdminPasswordSchema.parse(input);
    const existing = await this.repo.findById(adminId);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy tài khoản Quản trị viên.');
    }

    const matchesCurrent = await bcrypt.compare(validated.currentPassword, existing.passwordHash);
    if (!matchesCurrent) {
      throw new AppError('Mật khẩu hiện tại không chính xác.', 400, 'INVALID_CURRENT_PASSWORD');
    }

    const isSamePassword = await bcrypt.compare(validated.newPassword, existing.passwordHash);
    if (isSamePassword) {
      throw new AppError(
        'Mật khẩu mới phải khác với mật khẩu hiện tại.',
        400,
        'PASSWORD_UNCHANGED'
      );
    }

    const newHash = await bcrypt.hash(validated.newPassword, 12);
    await this.repo.updatePassword(adminId, newHash);

    return { updated: true };
  }
}

export const adminAuthRepository = new AdminAuthRepository();
export const adminAuthService = new AdminAuthService(adminAuthRepository);

