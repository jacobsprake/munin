// Jest setup file
// Add any global test setup here

// Polyfill TextEncoder/TextDecoder for undici (Node < 18 or Jest env may not have them)
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Polyfill ReadableStream for undici (must be set before requiring undici)
if (typeof globalThis.ReadableStream === 'undefined') {
  try {
    const { ReadableStream } = require('stream/web');
    globalThis.ReadableStream = ReadableStream;
  } catch (_) {
    // Node < 18
  }
}

// Polyfill Web Crypto API (jsdom lacks crypto.subtle)
const { webcrypto } = require('crypto');
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});

// Polyfill btoa/atob for PQC tests
if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
  globalThis.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
}

// Polyfill Web API Request/Response for Next.js API route tests (Jest runs in Node)
if (typeof globalThis.Request === 'undefined') {
  const { Request, Response, Headers } = require('undici');
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.Headers = Headers;
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Suppress console errors in tests (optional)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };
