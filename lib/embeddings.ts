import OpenAI from "openai";
import type { EmbeddingConfig, SimilarChunk } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "text-embedding-3-small",
  dimensions: 1536,
  batchSize: 100,
  chunkSize: 512,
  chunkOverlap: 100,
};

export async function getEmbeddingConfig(
  supabase: SupabaseClient
): Promise<EmbeddingConfig> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "embedding_config")
      .single();

    if (data?.value) {
      return { ...DEFAULT_EMBEDDING_CONFIG, ...(data.value as Partial<EmbeddingConfig>) };
    }
  } catch {
    return DEFAULT_EMBEDDING_CONFIG;
  }
  return DEFAULT_EMBEDDING_CONFIG;
}

function computeChunkHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.replace(/[\u4e00-\u9fa5]/g, "").length;
  return Math.ceil(chineseChars * 1.5 + otherChars / 4);
}

export function chunkDocument(
  content: string,
  chunkSize: number = 512,
  chunkOverlap: number = 100
): Array<{ content: string; tokenCount: number; contentHash: string }> {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const separators = ["\n\n", "\n", ". ", "。", " "];
  const chunks: Array<{ content: string; tokenCount: number; contentHash: string }> = [];
  
  let remainingText = content.trim();
  let currentChunk = "";
  let currentTokens = 0;

  while (remainingText.length > 0) {
    let splitPoint = -1;

    const targetLength = Math.min(chunkSize * 4, remainingText.length);
    const searchText = remainingText.substring(0, targetLength);

    for (const sep of separators) {
      const lastIndex = searchText.lastIndexOf(sep);
      if (lastIndex > 0 && lastIndex > splitPoint) {
        const potentialChunk = currentChunk + remainingText.substring(0, lastIndex + sep.length);
        const potentialTokens = estimateTokenCount(potentialChunk);
        
        if (potentialTokens <= chunkSize) {
          splitPoint = lastIndex + sep.length;
        } else if (splitPoint === -1 && currentChunk.length === 0) {
          splitPoint = lastIndex + sep.length;
          break;
        }
      }
    }

    if (splitPoint === -1) {
      splitPoint = Math.min(chunkSize * 4, remainingText.length);
    }

    const textToAdd = remainingText.substring(0, splitPoint);
    currentChunk += textToAdd;
    currentTokens = estimateTokenCount(currentChunk);
    remainingText = remainingText.substring(splitPoint);

    if (currentTokens >= chunkSize || remainingText.length === 0) {
      if (currentChunk.trim().length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          tokenCount: currentTokens,
          contentHash: computeChunkHash(currentChunk.trim()),
        });
      }

      if (chunkOverlap > 0 && remainingText.length > 0) {
        const overlapText = currentChunk.slice(-chunkOverlap * 4);
        currentChunk = overlapText;
        currentTokens = estimateTokenCount(currentChunk);
      } else {
        currentChunk = "";
        currentTokens = 0;
      }
    }
  }

  return chunks;
}

interface AliyunEmbeddingResponse {
  output: {
    embeddings: Array<{
      text_index: number;
      embedding: number[];
    }>;
  };
  usage: {
    total_tokens: number;
  };
  request_id: string;
}

async function callAliyunEmbeddingAPI(
  apiKey: string,
  model: string,
  texts: string[]
): Promise<number[][]> {
  const response = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: {
          texts,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Aliyun API Error (${response.status}): ${errorText}`);
  }

  const data: AliyunEmbeddingResponse = await response.json();
  
  if (!data.output?.embeddings) {
    throw new Error("Invalid response from Aliyun API");
  }

  return data.output.embeddings
    .sort((a, b) => a.text_index - b.text_index)
    .map((e) => e.embedding);
}

export async function generateEmbeddings(
  texts: string[],
  config: EmbeddingConfig = DEFAULT_EMBEDDING_CONFIG
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("API key is not configured. Please set it in Settings > Embedding Model Configuration.");
  }

  const batchSize = config.batchSize || 100;
  const allEmbeddings: number[][] = [];

  const useAliyunNativeAPI = config.provider === "aliyun" && 
    !config.baseUrl.includes("compatible-mode");

  if (useAliyunNativeAPI) {
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await callAliyunEmbeddingAPI(apiKey, config.model, batch);
      allEmbeddings.push(...embeddings);
    }
  } else {
    const openai = new OpenAI({ 
      apiKey,
      baseURL: config.baseUrl,
    });

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const response = await openai.embeddings.create({
        model: config.model,
        input: batch,
        encoding_format: "float",
      });

      for (const item of response.data) {
        allEmbeddings.push(item.embedding);
      }
    }
  }

  return allEmbeddings;
}

export async function generateSingleEmbedding(
  text: string,
  settings: EmbeddingConfig = DEFAULT_EMBEDDING_CONFIG
): Promise<number[]> {
  const embeddings = await generateEmbeddings([text], settings);
  return embeddings[0];
}

export async function searchSimilarChunks(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  kbId: string,
  matchCount: number = 5,
  matchThreshold: number = 0.7
): Promise<SimilarChunk[]> {
  const { data, error } = await supabase.rpc("search_similar_chunks", {
    query_embedding: queryEmbedding,
    target_kb_id: kbId,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });

  if (error) throw error;
  return data || [];
}

export async function getEmbeddingStats(
  supabase: SupabaseClient,
  kbId: string
) {
  const { data, error } = await supabase.rpc("get_kb_embedding_stats", {
    target_kb_id: kbId,
  });

  if (error) throw error;
  return data?.[0] || {
    total_documents: 0,
    embedded_documents: 0,
    pending_documents: 0,
    failed_documents: 0,
    outdated_documents: 0,
    total_chunks: 0,
  };
}

export async function embedDocument(
  supabase: SupabaseClient,
  documentId: string,
  content: string,
  config?: EmbeddingConfig
): Promise<{ success: boolean; chunkCount: number; error?: string }> {
  try {
    const embeddingConfig = config || await getEmbeddingConfig(supabase);
    
    await supabase
      .from("documents")
      .update({ embedding_status: "processing" })
      .eq("id", documentId);

    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    const chunks = chunkDocument(content, embeddingConfig.chunkSize, embeddingConfig.chunkOverlap);
    
    if (chunks.length === 0) {
      await supabase
        .from("documents")
        .update({ embedding_status: "completed" })
        .eq("id", documentId);
      return { success: true, chunkCount: 0 };
    }

    const chunkContents = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(chunkContents, embeddingConfig);

    const chunkRecords = chunks.map((chunk, index) => ({
      document_id: documentId,
      chunk_index: index,
      content: chunk.content,
      content_hash: chunk.contentHash,
      token_count: chunk.tokenCount,
      embedding: embeddings[index],
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunkRecords);

    if (insertError) throw insertError;

    await supabase
      .from("documents")
      .update({ embedding_status: "completed" })
      .eq("id", documentId);

    return { success: true, chunkCount: chunks.length };
  } catch (error) {
    await supabase
      .from("documents")
      .update({ embedding_status: "failed" })
      .eq("id", documentId);

    return {
      success: false,
      chunkCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteDocumentEmbeddings(
  supabase: SupabaseClient,
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    await supabase
      .from("documents")
      .update({ embedding_status: "pending" })
      .eq("id", documentId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function embedKnowledgeBase(
  supabase: SupabaseClient,
  kbId: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; processed: number; failed: number; error?: string }> {
  try {
    const embeddingConfig = await getEmbeddingConfig(supabase);
    
    const { data: documents, error: fetchError } = await supabase
      .from("documents")
      .select("id, content")
      .eq("kb_id", kbId)
      .in("embedding_status", ["pending", "outdated", "failed"]);

    if (fetchError) throw fetchError;
    if (!documents || documents.length === 0) {
      return { success: true, processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const doc of documents) {
      const result = await embedDocument(supabase, doc.id, doc.content || "", embeddingConfig);
      
      if (result.success) {
        processed++;
      } else {
        failed++;
      }

      if (onProgress) {
        onProgress(processed + failed, documents.length);
      }
    }

    return { success: true, processed, failed };
  } catch (error) {
    return {
      success: false,
      processed: 0,
      failed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteKnowledgeBaseEmbeddings(
  supabase: SupabaseClient,
  kbId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: documents } = await supabase
      .from("documents")
      .select("id")
      .eq("kb_id", kbId);

    if (documents && documents.length > 0) {
      const docIds = documents.map((d) => d.id);
      
      await supabase
        .from("document_chunks")
        .delete()
        .in("document_id", docIds);

      await supabase
        .from("documents")
        .update({ embedding_status: "pending" })
        .in("id", docIds);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
