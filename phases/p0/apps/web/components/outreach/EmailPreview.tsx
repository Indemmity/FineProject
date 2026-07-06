"use client";

interface EmailPreviewProps {
  subject: string;
  html: string;
  text: string;
  onApprove?: () => void;
  onEdit?: () => void;
}

export function EmailPreview({
  subject,
  html,
  text,
  onApprove,
  onEdit,
}: EmailPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Subject */}
      <div className="rounded-lg border bg-secondary/30 p-3">
        <span className="text-xs font-medium text-muted-foreground">SUBJECT</span>
        <p className="mt-1 font-medium">{subject}</p>
      </div>

      {/* Toggleable HTML/Text view */}
      <div className="rounded-lg border">
        <div className="border-b bg-secondary/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          HTML Preview
        </div>
        <div className="p-3">
          <iframe
            srcDoc={html}
            className="h-80 w-full rounded border"
            title="Email preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="border-b bg-secondary/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Plain Text
        </div>
        <pre className="p-3 text-sm whitespace-pre-wrap font-sans">
          {text}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onApprove && (
          <button
            onClick={onApprove}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Looks Good
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="rounded border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}