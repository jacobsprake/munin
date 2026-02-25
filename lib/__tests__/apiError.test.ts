import { sanitizeErrorMessage, isProduction, apiErrorPayload } from '../apiError';

describe('API Error Handling', () => {
  it('sanitizes Error objects', () => {
    const msg = sanitizeErrorMessage(new Error('test error'));
    expect(msg).toBe('test error');
  });

  it('sanitizes string errors', () => {
    expect(sanitizeErrorMessage('string error')).toBe('string error');
  });

  it('sanitizes unknown error types', () => {
    const msg = sanitizeErrorMessage(42);
    expect(typeof msg).toBe('string');
  });

  it('sanitizes null/undefined', () => {
    expect(typeof sanitizeErrorMessage(null)).toBe('string');
    expect(typeof sanitizeErrorMessage(undefined)).toBe('string');
  });

  it('isProduction returns boolean', () => {
    expect(typeof isProduction()).toBe('boolean');
  });

  it('apiErrorPayload returns error field', () => {
    const payload = apiErrorPayload(new Error('test'));
    expect(payload).toHaveProperty('error');
    expect(typeof payload.error).toBe('string');
  });
});
