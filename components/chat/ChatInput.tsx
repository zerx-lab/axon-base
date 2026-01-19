"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/Button";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface ChatInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSend: () => void;
  readonly onStop?: () => void;
  readonly disabled?: boolean;
  readonly isSending?: boolean;
  readonly placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  disabled = false,
  isSending = false,
  placeholder,
}: ChatInputProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState(1);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24;
      const maxRows = 6;
      const newRows = Math.min(Math.ceil(scrollHeight / lineHeight), maxRows);
      setRows(newRows);
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isSending && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t("chat.inputPlaceholder")}
        disabled={disabled || isSending}
        rows={rows}
        className="min-h-[44px] max-h-[144px] resize-none border-border bg-card font-mono text-sm placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
      />
      {isSending && onStop ? (
        <Button
          onClick={onStop}
          variant="secondary"
          size="md"
          className="h-11 w-11 flex-shrink-0 p-0"
        >
          <StopIcon className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          size="md"
          className="h-11 w-11 flex-shrink-0 p-0"
        >
          <SendIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function SendIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function StopIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
