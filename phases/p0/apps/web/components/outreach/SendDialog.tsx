"use client";

import { useMemo, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  onConfirm: (data: { toEmail: string; toName: string; subject: string }) => Promise<void>;
}

export function SendDialog({
  open,
  onOpenChange,
  recipientEmail: initialEmail,
  recipientName: initialName,
  subject: initialSubject,
  bodyHtml,
  bodyText,
  onConfirm,
}: SendDialogProps) {
  const [toEmail, setToEmail] = useState(initialEmail);
  const [toName, setToName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewHtml = useMemo(() => bodyHtml.replace(/<img[^>]*track-open[^>]*\/?>/gi, ""), [bodyHtml]);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      await onConfirm({ toEmail, toName, subject });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review & Send Email</DialogTitle>
          <DialogDescription>
            Review the email details below and edit if needed before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">To (Email)</label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="recipient@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Recipient Name</label>
            <input
              type="text"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Hiring Manager"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Body</label>
            <div className="rounded-lg border">
              <div className="border-b bg-secondary/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                HTML Preview
              </div>
              <iframe
                srcDoc={previewHtml}
                className="h-64 w-full rounded-b"
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Plain text version</summary>
              <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded border bg-secondary/20 p-2 text-xs">
                {bodyText}
              </pre>
            </details>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !toEmail.trim()}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
