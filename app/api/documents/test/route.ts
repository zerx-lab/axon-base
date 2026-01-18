import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";
import { generateText } from "ai";
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

function createProvider(config: ChatConfig) {
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
  try {
    const supabase = createAdminClient();
    const body: TestDocumentRequest = await request.json();
    const { operatorId, docId, query, limit = 5, threshold = 0.5, locale: localeParam } = body;
    const locale = parseLocale(localeParam);

    if (!operatorId || !docId || !query) {
      return NextResponse.json(
        { error: t("api.docTest.missingFields", locale) },
        { status: 400 }
      );
    }

    const canSearch = await hasPermission(supabase, operatorId, Permissions.EMBEDDING_SEARCH);
    if (!canSearch) {
      return NextResponse.json(
        { error: t("api.docTest.permissionDenied", locale) },
        { status: 403 }
      );
    }

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, title, kb_id, embedding_status")
      .eq("id", docId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: t("api.docTest.documentNotFound", locale) },
        { status: 404 }
      );
    }

    if (doc.embedding_status !== "completed") {
      return NextResponse.json(
        { error: t("api.docTest.embeddingNotCompleted", locale) },
        { status: 400 }
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
      return NextResponse.json({
        success: true,
        query,
        chunks: [],
        answer: t("api.docTest.noContentFound", locale),
        documentTitle: doc.title,
        debug: { totalChunks: 0, searchType: "hybrid" },
      });
    }

    const chunksWithSimilarity: ChunkResult[] = hybridResults.map((result) => ({
      chunkId: result.chunk_id,
      chunkIndex: result.chunk_index,
      content: result.chunk_content,
      similarity: result.similarity,
      searchType: result.search_type,
      combinedScore: result.combined_score,
    }));

    const debug = {
      totalChunks: hybridResults.length,
      searchType: "hybrid",
      queryEmbeddingLength: queryEmbedding.length,
      threshold,
      resultTypes: hybridResults.reduce((acc, r) => {
        acc[r.search_type] = (acc[r.search_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return await generateAnswer(supabase, query, chunksWithSimilarity, doc.title, locale, debug);
  } catch (error) {
    console.error("Document test error:", error);
    const locale = parseLocale(undefined);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : t("api.docTest.testFailed", locale) },
      { status: 500 }
    );
  }
}

async function generateAnswer(
  supabase: ReturnType<typeof createAdminClient>,
  query: string,
  chunks: ChunkResult[],
  documentTitle: string,
  locale: Locale,
  debug?: unknown
) {
  if (chunks.length === 0) {
    return NextResponse.json({
      success: true,
      query,
      chunks: [],
      answer: t("api.docTest.noRelevantContent", locale),
      documentTitle,
      debug,
    });
  }

  const { data: chatConfigData } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "chat_config")
    .single();

  if (!chatConfigData?.value) {
    return NextResponse.json({
      success: true,
      query,
      chunks,
      answer: t("api.docTest.chatNotConfigured", locale),
      documentTitle,
    });
  }

  const chatConfig = chatConfigData.value as unknown as ChatConfig;

  if (!chatConfig.apiKey || chatConfig.apiKey === "********") {
    return NextResponse.json({
      success: true,
      query,
      chunks,
      answer: t("api.docTest.apiKeyNotConfigured", locale),
      documentTitle,
    });
  }

  const context = formatChunkContext(chunks, locale);
  const systemPrompt = buildDocQASystemPrompt(documentTitle, context, locale);

  try {
    const model = createProvider(chatConfig);
    const startTime = Date.now();

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: query,
      maxOutputTokens: chatConfig.maxTokens || 1024,
      temperature: chatConfig.temperature ?? 0.3,
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      chunks,
      answer: result.text,
      documentTitle,
      responseTime,
      usage: {
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      },
      debug,
    });
  } catch (error) {
    console.error("Chat generation error:", error);
    return NextResponse.json({
      success: true,
      query,
      chunks,
      answer: `${t("api.docTest.generateFailed", locale)}: ${error instanceof Error ? error.message : "Unknown error"}`,
      documentTitle,
    });
  }
}
