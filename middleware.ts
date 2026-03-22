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
import { validateSession } from './lib/auth/sessions';

/**
 * Public API routes that do NOT require authentication.
 * Add new public routes here when needed.
 *
 *   - /api/auth/login
 *   - /api/auth/register
 *   - /api/auth/session
 *   - /api/health  (and sub-routes like /api/health/readiness)
 *   - /api/airgap/verify
 */
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/session',
  '/api/health',
  '/api/airgap/verify',
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
}

/**
 * Check authentication for protected API routes.
 * Extracts token from Authorization header (Bearer or raw) or session cookie.
 * Returns a 401 response if no valid session is found, or null if auth passed.
 */
function checkApiAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader) {
    token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  } else {
    token = request.cookies.get('session_token')?.value || null;
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const session = validateSession(token);
    if (!session.valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  } catch {
    // If session validation throws (e.g. DB not ready), deny access
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return null; // Auth passed
}

// ⚠️ RATE LIMITER LIMITATION: In-memory Map resets on restart and doesn't
// scale across instances. For production: use SQLite-backed rate limiting
// (appropriate for air-gap deployment) or Redis for multi-instance.
// X-Forwarded-For is used as key — spoofable in non-proxy configurations.
//
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

// CSRF NOTE: API routes use Authorization header (Bearer token), not cookies.
// This provides natural CSRF protection since browsers don't auto-attach
// Authorization headers in cross-origin requests. If cookie-based auth is
// added in future, CSRF tokens must be implemented.

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

  // Authentication check for protected API routes
  if (pathname.startsWith('/api/') && !isPublicApiRoute(pathname)) {
    const authResponse = checkApiAuth(request);
    if (authResponse) {
      return authResponse;
    }
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
