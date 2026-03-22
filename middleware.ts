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

// Simple in-memory rate limiter (no external dependencies)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = process.env.NODE_ENV === 'development' ? 300 : 60;   // Higher in dev for rapid testing
const AUTH_RATE_LIMIT_MAX = 5;        // 5 auth attempts per minute per IP

function getRateLimitKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || request.ip || 'unknown';
}

function isRateLimited(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > maxRequests;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production' && process.env.ENFORCE_HTTPS === 'true') {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto === 'http') {
      const httpsUrl = request.nextUrl.clone();
      httpsUrl.protocol = 'https';
      return NextResponse.redirect(httpsUrl, 301);
    }
  }

  // Rate limiting
  const clientKey = getRateLimitKey(request);
  const isAuthRoute = pathname.startsWith('/api/auth/');
  const maxReqs = isAuthRoute ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX_REQUESTS;

  if (isRateLimited(clientKey, maxReqs)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const response = NextResponse.next();

  // Air-gap Content Security Policy — Palantir-grade: zero external resources
  const csp = [
    "default-src 'self'",
    // NOTE: 'unsafe-inline' is required by Next.js styled-jsx and inline styles.
    // This is a known limitation — nonce-based CSP requires custom Next.js server
    // configuration. 'unsafe-eval' has been removed as it is not required.
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  // X-XSS-Protection intentionally omitted: deprecated header that can introduce
  // vulnerabilities in older browsers. Modern CSP provides superior protection.
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  // HSTS: enforce HTTPS for 1 year in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

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
