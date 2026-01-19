"use client";

import { useCallback, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useTheme } from "@/lib/theme";

interface MarkdownEditorProps {
  readonly value: string;
  readonly onChange?: (value: string) => void;
  readonly readOnly?: boolean;
  readonly height?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  height = "100%",
}: MarkdownEditorProps) {
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  const handleEditorMount: OnMount = useCallback((editor) => {
    setIsReady(true);
    editor.focus();
  }, []);

  const handleChange = useCallback(
    (newValue: string | undefined) => {
      if (onChange && newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  return (
    <div className="h-full w-full overflow-hidden border border-border">
      {!isReady && (
        <div className="flex h-full items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground">Loading editor...</span>
        </div>
      )}
      <Editor
        height={height}
        defaultLanguage="markdown"
        value={value}
        onChange={handleChange}
        theme={theme === "dark" ? "vs-dark" : "light"}
        onMount={handleEditorMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "var(--font-geist-mono), monospace",
          lineNumbers: "on",
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          padding: { top: 16, bottom: 16 },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
        loading={null}
      />
    </div>
  );
}
