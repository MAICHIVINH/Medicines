import { auth } from './auth';
import { UnauthorizedError } from '@/lib/errors';

export interface AdminSessionContext {
  adminId: string;
  username: string;
  email: string;
  fullName: string;
}

/**
 * Bắt buộc kiểm tra phiên đăng nhập Admin ở phía Server trước mọi thao tác quản trị.
 */
export async function requireAdminSession(): Promise<AdminSessionContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError(
      'Yêu cầu xác thực Quản trị viên. Vui lòng đăng nhập để thực hiện thao tác này.'
    );
  }

  return {
    adminId: session.user.id,
    username: session.user.username,
    email: session.user.email,
    fullName: session.user.fullName,
  };
}

/**
 * Kiểm tra xem request hiện tại có phải từ Admin đã đăng nhập hay không (dùng cho GET API)
 */
export async function getOptionalAdminSession(): Promise<AdminSessionContext | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    return {
      adminId: session.user.id,
      username: session.user.username,
      email: session.user.email,
      fullName: session.user.fullName,
    };
  } catch {
    return null;
  }
}

