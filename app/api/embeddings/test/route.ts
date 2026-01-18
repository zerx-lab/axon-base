import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";
import OpenAI from "openai";

interface TestEmbeddingRequest {
  operatorId: string;
  text: string;
  config: {
    provider: "openai" | "azure" | "local" | "aliyun";
    baseUrl: string;
    apiKey: string;
    model: string;
    dimensions: number;
  };
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

async function callAliyunNativeAPI(
  apiKey: string,
  model: string,
  text: string
): Promise<{ embedding: number[]; usage: { total_tokens: number } }> {
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
          texts: [text],
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Aliyun API Error (${response.status}): ${errorText}`);
  }

  const data: AliyunEmbeddingResponse = await response.json();
  
  if (!data.output?.embeddings?.[0]?.embedding) {
    throw new Error("Invalid response from Aliyun API");
  }

  return {
    embedding: data.output.embeddings[0].embedding,
    usage: data.usage,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body: TestEmbeddingRequest = await request.json();
    const { operatorId, text, config } = body;

    if (!operatorId || !text || !config) {
      return NextResponse.json(
        { error: "Missing required fields: operatorId, text, and config are required" },
        { status: 400 }
      );
    }

    const canManage = await hasPermission(supabase, operatorId, Permissions.SYSTEM_SETTINGS);
    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    if (!config.apiKey || config.apiKey === "********") {
      const { data: savedConfig } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "embedding_config")
        .single();

      if (savedConfig?.value && typeof savedConfig.value === "object") {
        const savedValue = savedConfig.value as { apiKey?: string };
        if (savedValue.apiKey) {
          config.apiKey = savedValue.apiKey;
        }
      }
    }

    if (!config.apiKey || config.apiKey === "********") {
      return NextResponse.json(
        { error: "API Key is required. Please configure it in the settings." },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    let embedding: number[];
    let usage: { total_tokens?: number; prompt_tokens?: number } = {};
    let modelName = config.model;

    const useAliyunNativeAPI = config.provider === "aliyun" && 
      !config.baseUrl.includes("compatible-mode");

    if (useAliyunNativeAPI) {
      const result = await callAliyunNativeAPI(config.apiKey, config.model, text);
      embedding = result.embedding;
      usage = result.usage;
    } else {
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });

      const response = await openai.embeddings.create({
        model: config.model,
        input: text,
        encoding_format: "float",
      });

      embedding = response.data[0].embedding;
      usage = response.usage;
      modelName = response.model;
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      result: {
        dimensions: embedding.length,
        responseTime,
        vectorPreview: embedding.slice(0, 10),
        model: modelName,
        usage,
      },
    });
  } catch (error) {
    console.error("Test embedding error:", error);
    
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { 
          error: `API Error: ${error.message}`,
          details: {
            status: error.status,
            code: error.code,
          }
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 500 }
    );
  }
}
