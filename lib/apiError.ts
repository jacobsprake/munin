/**
 * API error handling (roadmap item 55)
 * Sanitize error responses: no stack traces in production, consistent message shape.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || 'An error occurred';
  }
  if (typeof error === 'string') return error;
  return 'An error occurred';
}

/**
 * Use in API route catch blocks:
 * return NextResponse.json(
 *   { error: sanitizeErrorMessage(error) },
 *   { status: 500 }
 * );
 * In production, never include error.stack in the response.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function apiErrorPayload(error: unknown): { error: string; details?: string } {
  const message = sanitizeErrorMessage(error);
  const payload: { error: string; details?: string } = { error: message };
  if (!isProduction() && error instanceof Error && error.stack) {
    payload.details = error.stack;
  }
  return payload;
}
