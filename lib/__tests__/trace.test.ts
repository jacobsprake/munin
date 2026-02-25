import { generateTraceId, getTraceIdFromHeaders, setTraceIdInHeaders, traceLogger } from '../trace';

describe('Distributed Tracing', () => {
  describe('generateTraceId', () => {
    it('produces a non-empty string', () => {
      const id = generateTraceId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('getTraceIdFromHeaders', () => {
    it('returns null when no trace header present', () => {
      const result = getTraceIdFromHeaders({});
      expect(result).toBeNull();
    });

    it('extracts trace ID from record headers', () => {
      const headers = { 'x-trace-id': 'trace_123' };
      const result = getTraceIdFromHeaders(headers);
      expect(result).toBe('trace_123');
    });
  });

  describe('setTraceIdInHeaders', () => {
    it('sets trace ID in record headers', () => {
      const headers: Record<string, string> = {};
      setTraceIdInHeaders(headers, 'trace_456');
      expect(headers['x-trace-id']).toBe('trace_456');
    });
  });

  describe('traceLogger', () => {
    it('can start a trace', () => {
      const ctx = traceLogger.startTrace('test-operation');
      expect(ctx).toBeDefined();
      expect(ctx.traceId).toBeTruthy();
      expect(ctx.operation).toBe('test-operation');
    });

    it('can end a trace', () => {
      const ctx = traceLogger.startTrace('test-op');
      const result = traceLogger.endTrace(ctx.traceId);
      expect(result).toBeDefined();
    });
  });
});
