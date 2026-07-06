import { PDFParse } from "pdf-parse";

console.log("pdf-parse imported successfully");

// Minimal valid PDF
const minimalPdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
);

try {
  const parser = new PDFParse({ data: new Uint8Array(minimalPdf) });
  const result = await parser.getText();
  console.log("PDF parse result:", JSON.stringify(result.text));
  await parser.destroy();
} catch (e) {
  console.error("PDF parse failed:", e instanceof Error ? e.message : e);
  console.error("Stack:", e instanceof Error ? e.stack : "");
}
