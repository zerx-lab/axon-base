/**
 * Server-side i18n utilities for API Routes
 * This module provides translation functions that can be used in Next.js API Routes
 */

export type Locale = "zh" | "en";

interface Translations {
  [key: string]: {
    zh: string;
    en: string;
  };
}

// Server-side translations (subset needed for API responses)
const serverTranslations: Translations = {
  // Document Test API responses
  "api.docTest.noContentFound": {
    zh: "文档中未找到相关内容来回答您的问题。",
    en: "No content found in the document to answer your question.",
  },
  "api.docTest.noRelevantContent": {
    zh: "文档中未找到相关内容来回答您的问题。",
    en: "No relevant content found in the document to answer your question.",
  },
  "api.docTest.chatNotConfigured": {
    zh: "聊天模型未配置，请在设置中配置。",
    en: "Chat model not configured. Please configure it in Settings.",
  },
  "api.docTest.apiKeyNotConfigured": {
    zh: "聊天 API 密钥未配置，请在设置中配置。",
    en: "Chat API key not configured. Please configure it in Settings.",
  },
  "api.docTest.cannotFindRelevantInfo": {
    zh: "根据提供的文档内容，我无法找到相关信息来回答这个问题。",
    en: "Based on the provided document content, I cannot find relevant information to answer this question.",
  },
  "api.docTest.embeddingNotCompleted": {
    zh: "文档向量化未完成，请先完成文档向量化。",
    en: "Document embedding not completed. Please embed the document first.",
  },
  "api.docTest.documentNotFound": {
    zh: "文档不存在",
    en: "Document not found",
  },
  "api.docTest.permissionDenied": {
    zh: "权限不足",
    en: "Permission denied",
  },
  "api.docTest.missingFields": {
    zh: "缺少必填字段：operatorId, docId, query",
    en: "Missing required fields: operatorId, docId, query",
  },
  "api.docTest.testFailed": {
    zh: "测试失败",
    en: "Test failed",
  },
  "api.docTest.generateFailed": {
    zh: "生成回答失败",
    en: "Failed to generate answer",
  },
  "api.docTest.streamFailed": {
    zh: "流处理失败",
    en: "Stream processing failed",
  },

  // System prompt translations
  "api.docTest.systemPrompt.role": {
    zh: "你是一个文档问答助手。你必须仅根据下方提供的文档片段来回答用户的问题。",
    en: "You are a document Q&A assistant. You MUST answer the user's question based ONLY on the provided document fragments below.",
  },
  "api.docTest.systemPrompt.rules": {
    zh: `严格规则：
1. 你只能使用提供的片段中的信息来回答
2. 如果片段中没有足够的信息来回答问题，请说"根据提供的文档内容，我无法找到相关信息来回答这个问题。"
3. 不要编造或推断片段中未明确说明的信息
4. 尽可能引用你的回答基于哪个片段
5. 保持回答简洁准确`,
    en: `STRICT RULES:
1. You can ONLY use information from the provided fragments to answer
2. If the fragments don't contain enough information to answer the question, say "Based on the provided document content, I cannot find relevant information to answer this question."
3. Do NOT make up or infer information that is not explicitly stated in the fragments
4. Always cite which fragment(s) your answer is based on when possible
5. Keep your answer concise and accurate`,
  },
  "api.docTest.systemPrompt.document": {
    zh: "文档",
    en: "Document",
  },
  "api.docTest.systemPrompt.fragments": {
    zh: "文档片段",
    en: "DOCUMENT FRAGMENTS",
  },
  "api.docTest.fragment": {
    zh: "片段",
    en: "Fragment",
  },
  "api.docTest.similarity": {
    zh: "相似度",
    en: "Similarity",
  },
};

/**
 * Get translation for a key in the specified locale
 * @param key - Translation key
 * @param locale - Target locale (defaults to "zh")
 * @returns Translated string or the key if not found
 */
export function t(key: string, locale: Locale = "zh"): string {
  const translation = serverTranslations[key];
  if (!translation) {
    console.warn(`[i18n-server] Missing translation: ${key}`);
    return key;
  }
  return translation[locale];
}

/**
 * Create a translator function bound to a specific locale
 * @param locale - Target locale
 * @returns Translator function
 */
export function createTranslator(locale: Locale = "zh") {
  return (key: string): string => t(key, locale);
}

/**
 * Build localized system prompt for document Q&A
 * @param documentTitle - Title of the document
 * @param context - Formatted context string with document fragments
 * @param locale - Target locale
 * @returns Localized system prompt
 */
export function buildDocQASystemPrompt(
  documentTitle: string,
  context: string,
  locale: Locale = "zh"
): string {
  const role = t("api.docTest.systemPrompt.role", locale);
  const rules = t("api.docTest.systemPrompt.rules", locale);
  const docLabel = t("api.docTest.systemPrompt.document", locale);
  const fragmentsLabel = t("api.docTest.systemPrompt.fragments", locale);

  return `${role}

${rules}

${docLabel}: "${documentTitle}"

---
${fragmentsLabel}:
${context}
---`;
}

/**
 * Format chunk context with localized labels
 * @param chunks - Array of chunks with content and similarity
 * @param locale - Target locale
 * @returns Formatted context string
 */
export function formatChunkContext(
  chunks: Array<{ content: string; similarity: number }>,
  locale: Locale = "zh"
): string {
  const fragmentLabel = t("api.docTest.fragment", locale);
  const similarityLabel = t("api.docTest.similarity", locale);

  return chunks
    .map(
      (chunk, index) =>
        `[${fragmentLabel} ${index + 1}] (${similarityLabel}: ${(chunk.similarity * 100).toFixed(1)}%)\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}

/**
 * Parse locale from request, with fallback to default
 * @param locale - Locale string from request
 * @returns Valid Locale type
 */
export function parseLocale(locale?: string | null): Locale {
  if (locale === "en" || locale === "zh") {
    return locale;
  }
  return "zh"; // Default to Chinese
}
