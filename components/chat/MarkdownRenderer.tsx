"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { useState } from "react";
import type { Components } from "react-markdown";
import { useI18n } from "@/lib/i18n";
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  readonly content: string;
  readonly className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const { t } = useI18n();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const components: Partial<Components> = {
    code(props) {
      const { inline, className, children, ...rest } = props as {
        inline?: boolean;
        className?: string;
        children?: React.ReactNode;
      };
      const match = /language-(\w+)/.exec(className || "");
      const code = String(children).replace(/\n$/, "");
      const codeId = Math.random().toString(36).substring(7);

      if (!inline && match) {
        return (
          <div className="group relative my-4">
            <div className="flex items-center justify-between rounded-t-sm border border-border bg-muted/30 px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {match[1]}
              </span>
              <button
                onClick={() => copyToClipboard(code, codeId)}
                className="flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-wider opacity-0 transition-opacity hover:bg-muted/50 group-hover:opacity-100"
                title={t("chat.copyCode")}
              >
                {copiedCode === codeId ? (
                  <>
                    <CheckIcon className="h-3 w-3" />
                    {t("chat.codeCopied")}
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-3 w-3" />
                    {t("chat.copyCode")}
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-b-sm border border-t-0 border-border bg-[#0d1117] p-4">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          </div>
        );
      }

      return (
        <code
          className="rounded border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[13px]"
          {...rest}
        >
          {children}
        </code>
      );
    },

    // Headings
    h1: ({ children }) => (
      <h1 className="mb-4 mt-6 font-mono text-2xl font-bold">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 mt-5 font-mono text-xl font-bold">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-4 font-mono text-lg font-semibold">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-2 mt-3 font-mono text-base font-semibold">{children}</h4>
    ),

    // Paragraphs
    p: ({ children }) => (
      <p className="mb-4 leading-relaxed">{children}</p>
    ),

    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground underline decoration-muted underline-offset-2 hover:decoration-foreground"
      >
        {children}
      </a>
    ),

    // Lists
    ul: ({ children }) => (
      <ul className="mb-4 ml-6 list-disc space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),

    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),

    // Tables
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse font-mono text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b-2 border-border bg-muted/20">{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="border-b border-border">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2">{children}</td>
    ),

    // Horizontal rule
    hr: () => <hr className="my-6 border-border" />,

    // Strong/Bold
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),

    // Emphasis/Italic
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
  };

  return (
    <div className={`prose prose-sm max-w-none font-mono text-sm ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CopyIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
