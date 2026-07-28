"use client";

import * as React from "react";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className = "", children, maxHeight, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`overflow-auto ${maxHeight ? `max-h-[${maxHeight}]` : "max-h-[500px]"} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
