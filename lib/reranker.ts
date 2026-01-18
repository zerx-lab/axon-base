import type { HybridSearchChunk } from "@/lib/supabase/types";

export type RerankerProvider = "cohere" | "jina" | "voyage" | "local-bge";

export interface RerankerConfig {
  provider: RerankerProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface RerankResult {
  chunk: HybridSearchChunk;
  relevanceScore: number;
  originalRank: number;
  newRank: number;
}

export interface RerankOptions {
  topK?: number;
  returnOriginalOrder?: boolean;
}

interface CohereRerankResponse {
  results: Array<{
    index: number;
    relevance_score: number;
  }>;
}

interface JinaRerankResponse {
  results: Array<{
    index: number;
    relevance_score: number;
    document: { text: string };
  }>;
}

interface VoyageRerankResponse {
  data: Array<{
    index: number;
    relevance_score: number;
  }>;
}

async function rerankWithCohere(
  query: string,
  chunks: HybridSearchChunk[],
  config: RerankerConfig,
  topK: number
): Promise<RerankResult[]> {
  const response = await fetch("https://api.cohere.ai/v1/rerank", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model || "rerank-english-v3.0",
      query,
      documents: chunks.map(c => c.chunk_content),
      top_n: topK,
      return_documents: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cohere rerank failed: ${error}`);
  }

  const data: CohereRerankResponse = await response.json();
  
  return data.results.map((r, newRank) => ({
    chunk: chunks[r.index],
    relevanceScore: r.relevance_score,
    originalRank: r.index,
    newRank,
  }));
}

async function rerankWithJina(
  query: string,
  chunks: HybridSearchChunk[],
  config: RerankerConfig,
  topK: number
): Promise<RerankResult[]> {
  const response = await fetch(config.baseUrl || "https://api.jina.ai/v1/rerank", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model || "jina-reranker-v2-base-multilingual",
      query,
      documents: chunks.map(c => c.chunk_content),
      top_n: topK,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jina rerank failed: ${error}`);
  }

  const data: JinaRerankResponse = await response.json();
  
  return data.results.map((r, newRank) => ({
    chunk: chunks[r.index],
    relevanceScore: r.relevance_score,
    originalRank: r.index,
    newRank,
  }));
}

async function rerankWithVoyage(
  query: string,
  chunks: HybridSearchChunk[],
  config: RerankerConfig,
  topK: number
): Promise<RerankResult[]> {
  const response = await fetch(config.baseUrl || "https://api.voyageai.com/v1/rerank", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model || "rerank-2",
      query,
      documents: chunks.map(c => c.chunk_content),
      top_k: topK,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage rerank failed: ${error}`);
  }

  const data: VoyageRerankResponse = await response.json();
  
  return data.data.map((r, newRank) => ({
    chunk: chunks[r.index],
    relevanceScore: r.relevance_score,
    originalRank: r.index,
    newRank,
  }));
}

function rerankWithLocalBGE(
  _query: string,
  chunks: HybridSearchChunk[],
  _config: RerankerConfig,
  topK: number
): RerankResult[] {
  return chunks.slice(0, topK).map((chunk, index) => ({
    chunk,
    relevanceScore: chunk.combined_score,
    originalRank: index,
    newRank: index,
  }));
}

export async function rerankChunks(
  query: string,
  chunks: HybridSearchChunk[],
  config: RerankerConfig,
  options: RerankOptions = {}
): Promise<RerankResult[]> {
  const { topK = 20, returnOriginalOrder = false } = options;
  
  if (chunks.length === 0) return [];
  if (chunks.length <= topK && !config.apiKey) {
    return chunks.map((chunk, index) => ({
      chunk,
      relevanceScore: chunk.combined_score,
      originalRank: index,
      newRank: index,
    }));
  }

  let results: RerankResult[];

  switch (config.provider) {
    case "cohere":
      results = await rerankWithCohere(query, chunks, config, topK);
      break;
    case "jina":
      results = await rerankWithJina(query, chunks, config, topK);
      break;
    case "voyage":
      results = await rerankWithVoyage(query, chunks, config, topK);
      break;
    case "local-bge":
    default:
      results = rerankWithLocalBGE(query, chunks, config, topK);
      break;
  }

  if (returnOriginalOrder) {
    results.sort((a, b) => a.originalRank - b.originalRank);
  }

  return results;
}

export async function hybridSearchWithReranking(
  searchResults: HybridSearchChunk[],
  query: string,
  rerankerConfig: RerankerConfig | null,
  topK: number = 20
): Promise<HybridSearchChunk[]> {
  if (!rerankerConfig || !rerankerConfig.apiKey) {
    return searchResults.slice(0, topK);
  }

  const reranked = await rerankChunks(query, searchResults, rerankerConfig, { topK });
  
  return reranked.map(r => ({
    ...r.chunk,
    combined_score: r.relevanceScore,
  }));
}
