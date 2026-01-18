import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";
import type { KnowledgeBaseSettings } from "@/lib/supabase/types";
import {
  generateSingleEmbedding,
  searchSimilarChunks,
  getEmbeddingSettings,
} from "@/lib/embeddings";

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { operatorId, kbId, query, limit = 5, threshold = 0.7 } = body;

    if (!operatorId || !kbId || !query) {
      return NextResponse.json(
        { error: "Missing required fields: operatorId, kbId, query" },
        { status: 400 }
      );
    }

    const canSearch = await hasPermission(supabase, operatorId, Permissions.EMBEDDING_SEARCH);
    if (!canSearch) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { data: kb, error: kbError } = await supabase
      .from("knowledge_bases")
      .select("id, settings, user_id")
      .eq("id", kbId)
      .single();

    if (kbError || !kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const settings = getEmbeddingSettings(kb.settings as KnowledgeBaseSettings | null);
    const queryEmbedding = await generateSingleEmbedding(query, settings);
    const results = await searchSimilarChunks(
      supabase,
      queryEmbedding,
      kbId,
      Math.min(limit, 20),
      Math.max(0, Math.min(threshold, 1))
    );

    const groupedByDocument: Record<string, {
      documentId: string;
      documentTitle: string;
      chunks: Array<{
        chunkId: string;
        chunkIndex: number;
        content: string;
        similarity: number;
      }>;
      maxSimilarity: number;
    }> = {};

    for (const result of results) {
      if (!groupedByDocument[result.document_id]) {
        groupedByDocument[result.document_id] = {
          documentId: result.document_id,
          documentTitle: result.document_title,
          chunks: [],
          maxSimilarity: 0,
        };
      }

      groupedByDocument[result.document_id].chunks.push({
        chunkId: result.chunk_id,
        chunkIndex: result.chunk_index,
        content: result.chunk_content,
        similarity: result.similarity,
      });

      if (result.similarity > groupedByDocument[result.document_id].maxSimilarity) {
        groupedByDocument[result.document_id].maxSimilarity = result.similarity;
      }
    }

    const documents = Object.values(groupedByDocument)
      .sort((a, b) => b.maxSimilarity - a.maxSimilarity);

    return NextResponse.json({
      success: true,
      query,
      results: documents,
      totalChunks: results.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
