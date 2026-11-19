import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/infrastructure/auth/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user?.id);

  // Cho phép truy cập trang đăng nhập Admin
  if (pathname === '/admin/login') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/admin', req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // Bảo vệ toàn bộ các trang /admin/*
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/admin/login', req.nextUrl.origin);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Bảo vệ các endpoint /api/v1/admin/*
  if (pathname.startsWith('/api/v1/admin')) {
    if (!isLoggedIn) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Yêu cầu xác thực Quản trị viên.',
          },
        },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/api/v1/admin/:path*'],
};
