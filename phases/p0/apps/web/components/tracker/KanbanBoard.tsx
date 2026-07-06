"use client";

import { useState } from "react";
import { StatusBadge } from "./StatusBadge";

interface KanbanItem {
  id: string;
  title: string;
  company: string;
  status: string;
}

interface KanbanBoardProps {
  items: KanbanItem[];
  columns: { key: string; label: string }[];
  onStatusChange?: (id: string, newStatus: string) => void;
}

export function KanbanBoard({ items, columns, onStatusChange }: KanbanBoardProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const getColumnItems = (colKey: string) =>
    items.filter((item) => item.status === colKey);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-max pb-4">
        {columns.map((col) => {
          const colItems = getColumnItems(col.key);
          return (
            <div
              key={col.key}
              className="w-64 shrink-0 rounded-lg border bg-secondary/20 p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedItem && onStatusChange) {
                  onStatusChange(draggedItem, col.key);
                  setDraggedItem(null);
                }
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium capitalize">
                  {col.label}
                </h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                  {colItems.length}
                </span>
              </div>

              <div className="space-y-2 min-h-[100px]">
                {colItems.length === 0 && (
                  <div className="rounded border-2 border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Drop here
                  </div>
                )}
                {colItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedItem(item.id)}
                    className="cursor-grab rounded border bg-white p-3 shadow-sm active:cursor-grabbing"
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.company}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}