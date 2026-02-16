/**
 * Distributed Tracing System
 * 
 * Provides trace IDs for end-to-end request tracking across frontend and backend.
 * Enables following packets, incidents, and audits through the entire system.
 */

let traceIdCounter = 0;

export function generateTraceId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const counter = (traceIdCounter++).toString(36);
  return `trace_${timestamp}_${random}_${counter}`;
}

export function getTraceIdFromHeaders(headers: Headers | Record<string, string>): string | null {
  if (headers instanceof Headers) {
    return headers.get('x-trace-id') || headers.get('trace-id') || null;
  }
  return headers['x-trace-id'] || headers['trace-id'] || null;
}

export function setTraceIdInHeaders(headers: Headers | Record<string, string>, traceId: string): void {
  if (headers instanceof Headers) {
    headers.set('x-trace-id', traceId);
  } else {
    headers['x-trace-id'] = traceId;
  }
}

export interface TraceContext {
  traceId: string;
  spanId?: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  metadata?: Record<string, any>;
}

class TraceLogger {
  private traces: Map<string, TraceContext> = new Map();

  startTrace(operation: string, metadata?: Record<string, any>): TraceContext {
    const traceId = generateTraceId();
    const context: TraceContext = {
      traceId,
      operation,
      startTime: Date.now(),
      metadata,
    };
    this.traces.set(traceId, context);
    return context;
  }

  endTrace(traceId: string, metadata?: Record<string, any>): TraceContext | null {
    const context = this.traces.get(traceId);
    if (!context) return null;

    const duration = Date.now() - context.startTime;
    const finalContext = {
      ...context,
      duration,
      endTime: Date.now(),
      metadata: { ...context.metadata, ...metadata },
    };

    // Log trace
    console.log(`[TRACE] ${context.operation} (${traceId}): ${duration}ms`, finalContext.metadata);

    // In production, would write to trace log file or send to tracing system
    // await writeTraceLog(finalContext);

    this.traces.delete(traceId);
    return finalContext;
  }

  getTrace(traceId: string): TraceContext | null {
    return this.traces.get(traceId) || null;
  }
}

export const traceLogger = new TraceLogger();

/**
 * Middleware helper for Next.js API routes
 */
export function withTraceId<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  operationName: string
): T {
  return (async (...args: any[]) => {
    const request = args[0] as Request;
    let traceId = getTraceIdFromHeaders(request.headers);

    if (!traceId) {
      traceId = generateTraceId();
    }

    const context = traceLogger.startTrace(operationName, {
      method: request.method,
      url: request.url,
    });

    try {
      const response = await handler(...args);
      
      // Add trace ID to response headers
      if (response instanceof Response) {
        response.headers.set('x-trace-id', traceId);
      }

      traceLogger.endTrace(traceId, { status: response.status || 200 });
      return response;
    } catch (error) {
      traceLogger.endTrace(traceId, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }) as T;
}
