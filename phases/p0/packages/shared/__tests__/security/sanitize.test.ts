import { describe, it, expect } from "vitest";
import { maskPII, restorePII } from "../../lib/security/pii";
import { sanitizeText, sanitizeFilename, validateFileUpload } from "../../lib/security/sanitize";

describe("PII Masking", () => {
  it("masks phone numbers", () => {
    const result = maskPII("Call me at 555-123-4567");
    expect(result).toContain("[REDACTED-PHONE]");
    expect(result).not.toContain("555-123-4567");
  });

  it("masks email addresses", () => {
    const result = maskPII("Email me at john@example.com");
    expect(result).toContain("[REDACTED-EMAIL]");
  });

  it("masks SSN-like patterns", () => {
    const result = maskPII("SSN: 123-45-6789");
    expect(result).toContain("[REDACTED-SSN]");
  });

  it("restores original PII after masking", () => {
    const original = "Contact: john@example.com or 555-123-4567";
    const masked = maskPII(original);
    const restored = restorePII(original, masked);
    expect(restored).toBe(original);
  });

  it("returns original text when no PII present", () => {
    const text = "Just some standard text without PII.";
    expect(maskPII(text)).toBe(text);
  });
});

describe("Input Sanitization", () => {
  it("strips HTML tags", () => {
    const result = sanitizeText("<script>alert('xss')</script>Hello");
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("</script>");
    expect(result).toContain("Hello");
  });

  it("sanitizes filenames", () => {
    expect(sanitizeFilename("../../../etc/passwd.pdf")).toBe("___etc_passwd.pdf");
    expect(sanitizeFilename("resume-2024.pdf")).toBe("resume-2024.pdf");
  });

  it("validates file upload MIME type", () => {
    const result = validateFileUpload(
      "virus.exe",
      "application/x-msdownload",
      new Uint8Array(100),
      1024 * 1024,
    );
    expect(result).toContain("Unsupported file type");
  });

  it("detects mismatched magic bytes", () => {
    const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    const result = validateFileUpload(
      "resume.pdf",
      "application/pdf",
      buffer,
      1024 * 1024,
    );
    expect(result).toContain("File extension does not match content");
  });
});