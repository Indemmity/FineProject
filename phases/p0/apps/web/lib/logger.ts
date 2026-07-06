/**
 * Structured logging — outputs JSON logs with consistent fields.
 *
 * Usage:
 *   import { log } from "@/lib/logger";
 *   log.info("User signed in", { userId: "abc", duration: 120 });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  requestId?: string;
  userId?: string;
  duration?: number;
  [key: string]: unknown;
}

function createEntry(
  level: LogLevel,
  message: string,
  extra?: Record<string, unknown>,
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME ?? "web",
    requestId: extra?.requestId as string | undefined,
    userId: extra?.userId as string | undefined,
    duration: extra?.duration as number | undefined,
    ...extra,
  };
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug: (message: string, extra?: Record<string, unknown>) =>
    emit(createEntry("debug", message, extra)),
  info: (message: string, extra?: Record<string, unknown>) =>
    emit(createEntry("info", message, extra)),
  warn: (message: string, extra?: Record<string, unknown>) =>
    emit(createEntry("warn", message, extra)),
  error: (message: string, extra?: Record<string, unknown>) =>
    emit(createEntry("error", message, extra)),
};