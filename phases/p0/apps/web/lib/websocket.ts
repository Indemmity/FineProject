/**
 * WebSocket adapter — subscribes to events relevant to the current user
 * and pushes real-time updates to the UI.
 */

// In production this would use the `ws` library or a WebSocket server.

type WSHandler = (data: unknown) => void;

const subscriptions = new Map<string, Set<WSHandler>>();

/**
 * Subscribe to a specific event type for real-time UI updates.
 * Returns an unsubscribe function.
 */
export function subscribe(
  eventType: string,
  handler: WSHandler,
): () => void {
  if (!subscriptions.has(eventType)) {
    subscriptions.set(eventType, new Set());
  }
  subscriptions.get(eventType)!.add(handler);
  return () => subscriptions.get(eventType)?.delete(handler);
}

/**
 * Emit an event locally (simulates server push).
 * In production this would receive events from the WebSocket connection.
 */
export function emit(eventType: string, data: unknown): void {
  const handlers = subscriptions.get(eventType);
  if (handlers) {
    for (const handler of handlers) {
      try {
        handler(data);
      } catch {
        // swallow per-handler errors
      }
    }
  }
}

/**
 * Connect to the server WebSocket.
 * Returns a promise that resolves when connected.
 */
export async function connectWebSocket(url: string): Promise<void> {
  // P4: const ws = new WebSocket(url);
  // ws.onmessage = (event) => {
  //   const { type, data } = JSON.parse(event.data);
  //   emit(type, data);
  // };
  console.log(`[websocket] Connection to ${url} (stub)`);
}

/**
 * Disconnect the WebSocket.
 */
export function disconnectWebSocket(): void {
  subscriptions.clear();
}