import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Uses NEXTAUTH_SECRET from env (same value as authOptions.secret).
 * Does not import auth-options here: that module pulls mssql/getPool (Node-only)
 * and must not be bundled into Edge middleware.
 */
const secret = process.env.NEXTAUTH_SECRET;
const mainDomains = [
  'localhost',
  'intertalent.intersolutions.com',
  'talenttesting.intersolutions.com',
  'ipnet10-test-f4hcabf0fybze0d3.eastus2-01.azurewebsites.net',
  'ipnet10-c7dagqhbbqgwgpez.eastus2-01.azurewebsites.net',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (!secret) {
      return NextResponse.next();
    }

    const token = await getToken({
      req: request,
      secret,
    });

    const isLoginPath =
      pathname === '/admin/login' || pathname.startsWith('/admin/login/');

    if (isLoginPath) {
      if (token) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.next();
    }

    const isUsersPath =
      pathname === '/admin/users' || pathname.startsWith('/admin/users/');

    if (isUsersPath) {
      if (!token) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
      if (token.role !== 'super_admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const hostname = request.headers.get('host') ?? '';
  const hostWithoutPort = hostname.split(':')[0];

  let slug: string | null = null;

  if (!mainDomains.includes(hostWithoutPort)) {
    if (hostWithoutPort.endsWith('.localhost')) {
      const parts = hostWithoutPort.split('.');
      if (parts.length > 1 && parts[0]) {
        slug = parts[0];
      }
    } else {
      const matchedMainDomain = mainDomains.find(
        (domain) =>
          domain !== 'localhost' && hostWithoutPort.endsWith(`.${domain}`)
      );

      if (matchedMainDomain) {
        const prefix = hostWithoutPort.slice(
          0,
          -(matchedMainDomain.length + 1)
        );
        if (prefix && prefix.split('.').filter(Boolean).length >= 1) {
          slug = prefix.split('.')[0];
        }
      }
    }
  }

  if (slug) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/client-portal/${slug}${pathname}`;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-client-portal-rewrite', '1');
    return NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|.*\\.webmanifest|.*\\.woff2?|.*\\.ttf|.*\\.eot|.*\\.webp|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.gif|.*\\.ico).*)',
  ],
};
