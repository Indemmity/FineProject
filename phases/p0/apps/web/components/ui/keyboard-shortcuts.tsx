"use client";

import { useEffect, useState, useCallback } from "react";

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  description: string;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
        if (e.key === s.key && ctrlMatch) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [shortcuts]);
}

export function ShortcutsHelp({ shortcuts }: { shortcuts: Shortcut[] }) {
  const [visible, setVisible] = useState(false);

  const toggle = useCallback(() => setVisible((v) => !v), []);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [toggle]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => setVisible(false)}
    >
      <div
        className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
        <div className="mt-4 space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{s.description}</span>
              <kbd className="rounded border bg-secondary px-2 py-0.5 font-mono text-xs">
                {s.ctrl ? "Ctrl+" : ""}{s.key === " " ? "Space" : s.key}
              </kbd>
            </div>
          ))}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Show/hide shortcuts</span>
            <kbd className="rounded border bg-secondary px-2 py-0.5 font-mono text-xs">?</kbd>
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="mt-4 w-full rounded bg-primary py-2 text-sm font-medium text-primary-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
}