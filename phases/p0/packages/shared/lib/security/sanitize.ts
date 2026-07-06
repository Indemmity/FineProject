/**
 * Input sanitization — strips dangerous content from user inputs.
 */

const HTML_TAG_RE = /<[^>]*>/g;

export function sanitizeText(input: string): string {
  return input
    .replace(HTML_TAG_RE, "")        // strip HTML tags
    .replace(/[<>]/g, "")            // remove angle brackets
    .replace(/javascript:/gi, "")    // strip JS protocol
    .replace(/on\w+=/gi, "")         // strip event handlers
    .trim();
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.\./g, "")
    .trim();
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAGIC_BYTES: Record<string, Uint8Array> = {
  pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),       // %PDF
  docx: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),       // PK\x03\x04 (ZIP)
};

export function validateFileUpload(
  filename: string,
  mimeType: string,
  buffer: Uint8Array,
  maxSize: number,
): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `Unsupported file type: ${mimeType}`;
  }

  if (buffer.length > maxSize) {
    return `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)} MB`;
  }

  // Check magic bytes
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && MAGIC_BYTES[ext]) {
    const expected = MAGIC_BYTES[ext];
    for (let i = 0; i < expected.length; i++) {
      if (buffer[i] !== expected[i]) {
        return `File extension does not match content (expected .${ext})`;
      }
    }
  }

  return null;
}