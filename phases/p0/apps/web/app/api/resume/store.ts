/**
 * Resume storage — saves parsed resume data and manages the resumes table.
 *
 * Tries the database first (via Drizzle ORM), falls back to in-memory Map.
 */

import { randomUUID } from "node:crypto";
import { getDb, resumes } from "@jobplatform/shared/db";
import { eq } from "drizzle-orm";

export interface StoredResume {
  id: string;
  userId: string;
  filename: string;
  format: string;
  text: string;
  wordCount: number;
  originalFileContent?: string; // base64 encoded
  createdAt: Date;
}

// Use globalThis to persist in-memory store across hot reloads in dev mode
const globalForStore = globalThis as unknown as {
  resumeMemStore: Map<string, StoredResume>;
};

const memStore = globalForStore.resumeMemStore ?? new Map<string, StoredResume>();

if (process.env.NODE_ENV !== "production") {
  globalForStore.resumeMemStore = memStore;
}

/** Converts a DB row to StoredResume shape. */
function rowToResume(row: typeof resumes.$inferSelect): StoredResume {
  return {
    id: row.id,
    userId: row.userId,
    filename: row.originalFilePath,
    format: row.originalFilePath.endsWith(".pdf")
      ? "pdf"
      : row.originalFilePath.endsWith(".docx")
        ? "docx"
        : "txt",
    text: row.parsedText,
    wordCount: row.parsedText.split(/\s+/).filter(Boolean).length,
    createdAt: row.createdAt,
  };
}

export function saveResume(
  userId: string,
  filename: string,
  format: string,
  text: string,
  wordCount: number,
  originalFileContent?: string,
): StoredResume {
  const resume: StoredResume = {
    id: randomUUID(),
    userId,
    filename,
    format,
    text,
    wordCount,
    originalFileContent,
    createdAt: new Date(),
  };
  memStore.set(resume.id, resume);
  return resume;
}

export async function getResume(id: string): Promise<StoredResume | undefined> {
  // Try database first
  const db = getDb();
  if (db) {
    try {
      const rows = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
      if (rows.length > 0) {
        return rowToResume(rows[0]!);
      }
    } catch {
      // DB failed — fall through to in-memory
    }
  }
  // Fall back to in-memory store
  return memStore.get(id);
}

export function deleteResume(id: string): boolean {
  const db = getDb();
  if (db) {
    try {
      db.delete(resumes).where(eq(resumes.id, id)).then().catch(() => {});
    } catch {
      // ignore
    }
  }
  return memStore.delete(id);
}

export function listResumes(userId: string): StoredResume[] {
  return Array.from(memStore.values()).filter((r) => r.userId === userId);
}

export function countResumes(): number {
  return memStore.size;
}