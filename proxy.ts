import { NextResponse } from 'next/server';
import { auth } from '@/auth';

const AUTH_PAGES = ['/login', '/signup'];

// Fast redirect for signed-out visitors. Every page and action still checks the session itself.
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const onAuthPage = AUTH_PAGES.includes(pathname);

  if (!req.auth && !onAuthPage) {
    const url = new URL('/login', req.nextUrl);
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  if (req.auth && onAuthPage) {
    return NextResponse.redirect(new URL('/sets', req.nextUrl));
  }
});

export const config = {
  matcher: ['/((?!api/auth|api/mobile|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
