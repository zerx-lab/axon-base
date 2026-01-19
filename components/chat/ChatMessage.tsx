"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useI18n } from "@/lib/i18n";

interface Reference {
  documentId: string;
  documentTitle: string;
  sourceUrl: string | null;
  content: string;
}

interface ChatMessageProps {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly isStreaming?: boolean;
  readonly references?: Reference[];
}

export function ChatMessage({ role, content, isStreaming = false, references }: ChatMessageProps) {
  const { t } = useI18n();
  const [showReferences, setShowReferences] = useState(false);

  if (role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-foreground px-4 py-3 text-background">
          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    );
  }

  const hasReferences = references && references.length > 0;

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <Avatar className="mt-1 h-8 w-8 flex-shrink-0 border border-border/50">
        <AvatarFallback className="bg-background font-mono text-xs">
          <BotIcon className="h-4 w-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 max-w-[80%] space-y-2">
        <div className="rounded-2xl rounded-tl-md border border-border/30 bg-background px-4 py-3">
          <MarkdownRenderer content={content} />
          {isStreaming && (
            <span className="inline-block ml-1 h-4 w-1.5 animate-pulse bg-foreground rounded-sm" />
          )}
        </div>
        
        {hasReferences && (
          <div className="pl-1">
            <button
              onClick={() => setShowReferences(!showReferences)}
              className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ReferenceIcon className="h-3.5 w-3.5" />
              <span>{t("chat.references")} ({references.length})</span>
              <ChevronIcon className={`h-3 w-3 transition-transform ${showReferences ? "rotate-180" : ""}`} />
            </button>
            
            {showReferences && (
              <div className="mt-2 space-y-2">
                {references.map((ref, index) => (
                  <div
                    key={`${ref.documentId}-${index}`}
                    className="rounded-lg border border-border/50 bg-card/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-medium text-foreground/80 line-clamp-1">
                        {ref.documentTitle}
                      </span>
                      {ref.sourceUrl && (
                        <a
                          href={ref.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          title={ref.sourceUrl}
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
                      {ref.content}
                    </p>
                    {ref.sourceUrl && (
                      <a
                        href={ref.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-block font-mono text-[10px] text-muted-foreground/70 hover:text-foreground/70 truncate max-w-full transition-colors"
                      >
                        {ref.sourceUrl}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BotIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="8" cy="16" r="1" fill="currentColor" />
      <circle cx="16" cy="16" r="1" fill="currentColor" />
      <path d="M9 7V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

function ReferenceIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 12h6M9 16h6M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
    </svg>
  );
}

function ChevronIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function LinkIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
