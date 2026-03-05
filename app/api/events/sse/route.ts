/**
 * GET /api/events/sse
 * Server-Sent Events stream for real-time updates
 * Air-gapped compliant: internal-only event streaming
 *
 * Clients connect with Accept: text/event-stream
 */
import { getDb } from '@/lib/db';

const SSE_RETRY_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 30000;

export async function GET(request: Request) {
  const accept = request.headers.get('accept') || '';
  if (!accept.includes('text/event-stream')) {
    return new Response(
      JSON.stringify({
        error: 'Use Accept: text/event-stream for SSE. Use /api/events for JSON polling.',
      }),
      { status: 406, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: object | string) => {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${payload}\n\n`)
        );
      };

      const sendHeartbeat = () => {
        sendEvent('heartbeat', { ts: new Date().toISOString() });
      };

      // Send initial connection event
      sendEvent('connected', {
        message: 'Munin SSE connected',
        retry: SSE_RETRY_MS,
        ts: new Date().toISOString(),
      });

      const interval = setInterval(async () => {
        try {
          const db = getDb();
          const notifications = db.prepare(`
            SELECT * FROM notifications
            WHERE created_at > datetime('now', '-5 minutes')
            ORDER BY created_at DESC LIMIT 10
          `).all() as any[];
          const decisions = db.prepare(`
            SELECT decision_id, status, incident_id, created_at FROM decisions
            WHERE created_at > datetime('now', '-5 minutes')
            ORDER BY created_at DESC LIMIT 10
          `).all() as any[];

          if (notifications.length > 0) {
            sendEvent('notifications', notifications);
          }
          if (decisions.length > 0) {
            sendEvent('decisions', decisions);
          }
          sendHeartbeat();
        } catch (e) {
          sendEvent('error', { message: 'Poll failed' });
        }
      }, 10000);

      const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
