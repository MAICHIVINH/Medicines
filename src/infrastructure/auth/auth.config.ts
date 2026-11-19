import type { NextAuthConfig } from 'next-auth';
import { getEnv } from '@/config/env';

/**
 * Cấu hình Auth.js tương thích Edge Runtime (dùng cho Middleware)
 * Không import Prisma hay bcryptjs tại đây để tránh cảnh báo Edge Runtime.
 */
export const authConfig = {
  secret: getEnv().AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 giờ
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; username?: string; email?: string | null; fullName?: string };
        token.id = u.id;
        token.username = u.username;
        token.email = u.email;
        token.fullName = u.fullName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = String(token.id);
        session.user.username = String(token.username);
        session.user.email = String(token.email);
        session.user.fullName = String(token.fullName);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
