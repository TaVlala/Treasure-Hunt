// Next.js Edge middleware — protects dashboard routes and redirects stale sessions.
// Admin login is now at /admin/login (not /login).

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  const { pathname } = request.nextUrl;

  // Redirect old /login path to /admin/login for bookmarked links
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Authenticated admin hitting /admin/login → already logged in, go to dashboard
  if (pathname === '/admin/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Unauthenticated user hitting any dashboard route → send to admin login
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/admin/login'],
};
