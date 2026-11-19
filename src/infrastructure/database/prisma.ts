import { PrismaClient } from '@prisma/client';
import { isDatabaseConfigured } from '@/config/env';
import { ServiceUnavailableError } from '@/lib/errors';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Kiểm tra trạng thái cấu hình và kết nối thực tế tới Neon PostgreSQL.
 * Không giả vờ kết nối thành công nếu thiếu DATABASE_URL hoặc thông tin chưa hợp lệ.
 */
export function ensureDatabaseConfigured(): void {
  if (!isDatabaseConfigured()) {
    throw new ServiceUnavailableError(
      'Cơ sở dữ liệu Neon PostgreSQL chưa được cấu hình. Vui lòng thiết lập biến môi trường DATABASE_URL và DIRECT_URL trong file .env theo hướng dẫn.',
      {
        missingVariables: ['DATABASE_URL', 'DIRECT_URL'],
        guide: 'Xem phần Cấu hình Neon PostgreSQL trong README.md hoặc .env.example',
      }
    );
  }
}

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  configured: boolean;
  message: string;
}> {
  if (!isDatabaseConfigured()) {
    return {
      connected: false,
      configured: false,
      message: 'Chưa cấu hình DATABASE_URL hợp lệ trong môi trường.',
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      connected: true,
      configured: true,
      message: 'Kết nối Neon PostgreSQL hoạt động ổn định.',
    };
  } catch (error) {
    return {
      connected: false,
      configured: true,
      message:
        error instanceof Error
          ? `Không thể kết nối Neon PostgreSQL: ${error.message}`
          : 'Lỗi kết nối Neon PostgreSQL không xác định.',
    };
  }
}

