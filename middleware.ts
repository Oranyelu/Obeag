import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (token) {
      const isApproved = token.status === 'APPROVED';
      const isAdmin = token.role === 'ADMIN';

      // Redirect unapproved non-admin users to pending page
      if (!isApproved && !isAdmin && path !== '/pending-approval') {
        return NextResponse.redirect(new URL('/pending-approval', req.url));
      }

      // Redirect approved users away from pending page
      if ((isApproved || isAdmin) && path === '/pending-approval') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Protect Admin paths
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/', '/admin/:path*', '/history', '/notifications', '/pending-approval'],
};