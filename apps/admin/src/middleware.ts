// Next.js Edge middleware — protects dashboard routes and redirects stale sessions.
// Runs before every matching request; reads admin_token cookie for auth state.

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  const { pathname } = request.nextUrl;

  // Authenticated user hitting /login → already logged in, send to dashboard
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Unauthenticated user hitting any dashboard route → send to login
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Match dashboard sub-routes (protect) and login (redirect if already authed)
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
