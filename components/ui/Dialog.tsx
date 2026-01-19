"use client";

import { useEffect, useRef, type ReactNode } from "react";

type DialogSize = "sm" | "md" | "lg" | "xl" | "full";

interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: DialogSize;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
  full: "max-w-[90vw] h-[90vh]",
};

export function Dialog({ open, onClose, title, children, footer, size = "md" }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const isFullSize = size === "full";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        className={`relative z-10 w-full border border-border bg-background shadow-lg animate-fade-in flex flex-col ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="font-mono text-sm font-medium uppercase tracking-wider">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`px-6 py-4 ${isFullSize ? "flex-1 overflow-hidden" : ""}`}>
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
