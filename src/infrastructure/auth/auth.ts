import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { adminAuthService } from '@/modules/auth/auth.service';
import { authConfig } from './auth.config';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      fullName: string;
    } & DefaultSession['user'];
  }

  interface User {
    username?: string;
    fullName?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'AdminCredentials',
      credentials: {
        identifier: { label: 'Username hoặc Email', type: 'text' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const forwardedFor = request?.headers?.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

        try {
          const admin = await adminAuthService.verifyCredentials(
            String(credentials.identifier),
            String(credentials.password),
            ip
          );

          return {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            name: admin.fullName,
            fullName: admin.fullName,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
});
