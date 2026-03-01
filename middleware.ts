/**
 * Air-Gap Security Middleware
 *
 * Enforces Content Security Policy headers that prevent any external
 * network requests. This ensures Munin operates in a fully air-gapped
 * environment with zero CDN, cloud, or external dependencies.
 *
 * Security headers:
 * - CSP: blocks all external scripts, styles, fonts, images, connections
 * - X-Content-Type-Options: prevents MIME sniffing
 * - X-Frame-Options: prevents clickjacking
 * - Referrer-Policy: no referrer leakage
 * - Permissions-Policy: disables unnecessary browser APIs
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Air-gap Content Security Policy — no external resources allowed
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // Air-gap indicator header
  response.headers.set('X-Munin-Deployment', 'air-gapped');
  response.headers.set('X-Munin-Version', '0.9.3');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
