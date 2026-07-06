/**
 * Event bus — typed publish/subscribe for cross-service communication.
 *
 * In production this wraps Redis Pub/Sub. For development it uses an
 * in-memory implementation with the same interface.
 */

import type { PlatformEvent, EventHandler } from "./schemas";

type BusListener = (channel: string, message: string) => void;

interface BusBackend {
  publish(channel: string, message: string): void | Promise<void>;
  subscribe(channel: string, listener: BusListener): void;
  unsubscribe(channel: string, listener: BusListener): void;
  disconnect(): void | Promise<void>;
}

// ─── In-memory backend (dev default) ─────────────────────────────────────────

class InMemoryBus implements BusBackend {
  private listeners = new Map<string, Set<BusListener>>();

  publish(channel: string, message: string): void {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      for (const listener of channelListeners) {
        try {
          listener(channel, message);
        } catch {
          // swallow per-listener errors
        }
      }
    }
  }

  subscribe(channel: string, listener: BusListener): void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);
  }

  unsubscribe(channel: string, listener: BusListener): void {
    this.listeners.get(channel)?.delete(listener);
  }

  disconnect(): void {
    this.listeners.clear();
  }
}

// ─── Event Bus ───────────────────────────────────────────────────────────────

class EventBus {
  private backend: BusBackend;
  private handlers = new Map<string, Set<EventHandler>>();

  constructor(backend?: BusBackend) {
    this.backend = backend ?? new InMemoryBus();
  }

  /** Publish an event to all subscribers on the event's channel. */
  async publish(event: PlatformEvent): Promise<void> {
    const channel = `event:${event.eventType}`;
    const message = JSON.stringify(event);
    await this.backend.publish(channel, message);

    // Also trigger local handlers
    const localHandlers = this.handlers.get(event.eventType);
    if (localHandlers) {
      for (const handler of localHandlers) {
        try {
          await handler(event);
        } catch {
          // swallow per-handler errors
        }
      }
    }
  }

  /** Subscribe to a specific event type. */
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Also subscribe at the backend level if using Redis
    const channel = `event:${eventType}`;
    this.backend.subscribe(channel, (_channel, message) => {
      try {
        const event = JSON.parse(message) as PlatformEvent;
        handler(event);
      } catch {
        // ignore parse errors
      }
    });
  }

  /** Remove a handler from an event type. */
  off(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  /** Disconnect the bus backend. */
  async disconnect(): Promise<void> {
    await this.backend.disconnect();
  }
}

/** Global event bus instance */
export const eventBus = new EventBus();

/** Connect to Redis backend (call once at service startup). */
export async function connectRedis(url: string): Promise<void> {
  // P4: import { createClient } from "redis";
  // const client = createClient({ url });
  // await client.connect();
  // const redisBackend = new RedisBus(client);
  // replace eventBus backend
  console.log(`[event-bus] Redis connection to ${url} (stub — in-memory active)`);
}