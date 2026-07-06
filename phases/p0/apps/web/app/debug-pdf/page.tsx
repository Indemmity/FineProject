"use client";

import { useState } from "react";

export default function DebugPDFPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const text = await res.text();
      setResult(`Status: ${res.status}\n\n${text}`);
    } catch (err) {
      setResult(`Network error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">PDF Debug</h1>
      <input type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} disabled={loading} />
      {loading && <p>Loading...</p>}
      <pre className="bg-black text-green-400 p-4 rounded whitespace-pre-wrap max-w-4xl overflow-auto">{result}</pre>
    </div>
  );
}
