import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatConfig, SearchType } from "@/lib/supabase/types";
import {
  generateSingleEmbedding,
  getEmbeddingConfig,
  hybridSearchDocumentChunks,
} from "@/lib/embeddings";
import {
  t,
  parseLocale,
  buildDocQASystemPrompt,
  formatChunkContext,
  type Locale,
} from "@/lib/i18n-server";

interface TestDocumentRequest {
  operatorId: string;
  docId: string;
  query: string;
  limit?: number;
  threshold?: number;
  locale?: string;
}

interface ChunkResult {
  chunkId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  searchType?: SearchType;
  combinedScore?: number;
}

function createChatProvider(config: ChatConfig) {
  const { provider, baseUrl, apiKey, model } = config;

  switch (provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey,
        baseURL: baseUrl || undefined,
      });
      return openai(model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey,
        baseURL: baseUrl || undefined,
      });
      return anthropic(model);
    }
    case "openai-compatible": {
      const compatible = createOpenAICompatible({
        name: "openai-compatible",
        apiKey,
        baseURL: baseUrl,
      });
      return compatible(model);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function POST(request: NextRequest) {
  let locale: Locale = "zh";
  
  try {
    const supabase = createAdminClient();
    const body: TestDocumentRequest = await request.json();
    const { operatorId, docId, query, limit = 5, threshold = 0.5, locale: localeParam } = body;
    locale = parseLocale(localeParam);

    if (!operatorId || !docId || !query) {
      return new Response(
        JSON.stringify({ error: t("api.docTest.missingFields", locale) }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const canSearch = await hasPermission(supabase, operatorId, Permissions.EMBEDDING_SEARCH);
    if (!canSearch) {
      return new Response(
        JSON.stringify({ error: t("api.docTest.permissionDenied", locale) }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, title, kb_id, embedding_status")
      .eq("id", docId)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: t("api.docTest.documentNotFound", locale) }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (doc.embedding_status !== "completed") {
      return new Response(
        JSON.stringify({ error: t("api.docTest.embeddingNotCompleted", locale) }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const embeddingConfig = await getEmbeddingConfig(supabase);
    const queryEmbedding = await generateSingleEmbedding(query, embeddingConfig);

    const hybridResults = await hybridSearchDocumentChunks(
      supabase,
      query,
      queryEmbedding,
      docId,
      {
        matchCount: limit,
        matchThreshold: threshold,
        vectorWeight: 0.5,
      }
    );

    if (hybridResults.length === 0) {
      return new Response(
        JSON.stringify({
          type: "complete",
          success: true,
          query,
          chunks: [],
          answer: t("api.docTest.noContentFound", locale),
          documentTitle: doc.title,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const chunksWithSimilarity: ChunkResult[] = hybridResults.map((result) => ({
      chunkId: result.chunk_id,
      chunkIndex: result.chunk_index,
      content: result.chunk_content,
      similarity: result.similarity,
      searchType: result.search_type,
      combinedScore: result.combined_score,
    }));

    return streamAnswer(supabase, query, chunksWithSimilarity, doc.title, locale);
  } catch (error) {
    console.error("Document test stream error:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === "object" && error !== null
        ? JSON.stringify(error)
        : t("api.docTest.testFailed", locale);
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function streamAnswer(
  supabase: ReturnType<typeof createAdminClient>,
  query: string,
  chunks: ChunkResult[],
  documentTitle: string,
  locale: Locale
): Promise<Response> {
  const encoder = new TextEncoder();
  const startTime = Date.now();

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: string, data: unknown) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  (async () => {
    try {
      await sendEvent("metadata", {
        query,
        documentTitle,
        chunks,
        startTime,
      });

      if (chunks.length === 0) {
        await sendEvent("text", { content: t("api.docTest.noRelevantContent", locale) });
        await sendEvent("done", { 
          responseTime: Date.now() - startTime,
          usage: null,
        });
        await writer.close();
        return;
      }

      const { data: chatConfigData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "chat_config")
        .single();

      if (!chatConfigData?.value) {
        await sendEvent("text", { content: t("api.docTest.chatNotConfigured", locale) });
        await sendEvent("done", { responseTime: Date.now() - startTime, usage: null });
        await writer.close();
        return;
      }

      const chatConfig = chatConfigData.value as unknown as ChatConfig;

      if (!chatConfig.apiKey || chatConfig.apiKey === "********") {
        await sendEvent("text", { content: t("api.docTest.apiKeyNotConfigured", locale) });
        await sendEvent("done", { responseTime: Date.now() - startTime, usage: null });
        await writer.close();
        return;
      }

      const context = formatChunkContext(chunks, locale);
      const systemPrompt = buildDocQASystemPrompt(documentTitle, context, locale);

      try {
        const model = createChatProvider(chatConfig);

        const result = streamText({
          model,
          system: systemPrompt,
          prompt: query,
          maxOutputTokens: chatConfig.maxTokens || 1024,
          temperature: chatConfig.temperature ?? 0.3,
        });

        for await (const textPart of result.textStream) {
          await sendEvent("text", { content: textPart });
        }

        const usage = await result.usage;
        const responseTime = Date.now() - startTime;

        await sendEvent("done", {
          responseTime,
          usage: {
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
          },
        });
      } catch (error) {
        console.error("Stream generation error:", error);
        await sendEvent("error", {
          message: `${t("api.docTest.generateFailed", locale)}: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    } catch (error) {
      console.error("Stream processing error:", error);
      await sendEvent("error", {
        message: error instanceof Error ? error.message : t("api.docTest.streamFailed", locale),
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
