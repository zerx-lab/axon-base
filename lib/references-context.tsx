"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ChatMessageMetadata } from "@/lib/supabase/types";

export type MessageReference = NonNullable<ChatMessageMetadata["references"]>[number];

interface ReferencesContextValue {
  /** Map of message ID to references array */
  getReferences: (messageId: string) => MessageReference[] | undefined;
}

const ReferencesContext = createContext<ReferencesContextValue | null>(null);

interface ReferencesProviderProps {
  readonly children: ReactNode;
  /** Map of message ID to references */
  readonly referencesMap: Map<string, MessageReference[]>;
}

export function ReferencesProvider({ children, referencesMap }: ReferencesProviderProps) {
  const value = useMemo<ReferencesContextValue>(
    () => ({
      getReferences: (messageId: string) => referencesMap.get(messageId),
    }),
    [referencesMap]
  );

  return (
    <ReferencesContext.Provider value={value}>
      {children}
    </ReferencesContext.Provider>
  );
}

export function useReferences(messageId: string): MessageReference[] | undefined {
  const context = useContext(ReferencesContext);
  if (!context) {
    return undefined;
  }
  return context.getReferences(messageId);
}
