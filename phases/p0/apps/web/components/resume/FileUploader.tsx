"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UploadResult {
  filename: string;
  format: string;
  wordCount: number;
  text: string;
  error?: string;
}

interface FileUploaderProps {
  onUploadComplete: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export interface FileUploaderHandle {
  openFilePicker: () => void;
  clearSelection: () => void;
}

export const FileUploader = forwardRef<FileUploaderHandle, FileUploaderProps>(
  function FileUploader({ onUploadComplete, onError }, ref) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const openFilePicker = useCallback(() => {
      inputRef.current?.click();
    }, []);

    const clearSelection = useCallback(() => {
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        openFilePicker,
        clearSelection,
      }),
      [clearSelection, openFilePicker],
    );

    const handleDrag = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(e.type === "dragenter" || e.type === "dragover");
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) setFile(dropped);
    }, []);

    const handleUpload = useCallback(async () => {
      if (!file) return;

      setIsUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        const result = await new Promise<UploadResult>((resolve, reject) => {
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(data);
              } else {
                reject(new Error(data.error ?? "Upload failed"));
              }
            } catch {
              reject(new Error("Upload failed: server returned an invalid response"));
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.open("POST", "/api/resume/upload");
          xhr.send(formData);
        });

        onUploadComplete(result);
      } catch (err) {
        const msg = (err as Error).message;
        onError?.(msg);
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    }, [file, onUploadComplete, onError]);

    return (
      <Card
        className={`relative border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {!file && !isUploading && (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Drop your resume here</p>
              <p className="text-sm text-muted-foreground">
                or{" "}
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="text-primary underline"
                >
                  browse files
                </button>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports PDF, DOCX, TXT (max 10 MB)
            </p>
          </div>
        )}

        {file && !isUploading && (
          <div className="space-y-4">
            <FileText className="mx-auto h-12 w-12 text-primary" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button type="button" onClick={handleUpload}>
                <Upload className="mr-2 h-4 w-4" /> Upload
              </Button>
              <Button type="button" variant="outline" onClick={clearSelection}>
                <X className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="font-medium">Uploading...</p>
            <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </Card>
    );
  },
);

FileUploader.displayName = "FileUploader";
