import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatConfig } from "@/lib/supabase/types";
import { extractDetailedError } from "@/lib/error-extractor";

interface TestChatRequest {
  operatorId: string;
  message: string;
  config: ChatConfig;
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
    const body: TestChatRequest = await request.json();
    const { operatorId, message, config } = body;

    if (!operatorId || !message || !config) {
      return NextResponse.json(
        { error: "Missing required fields: operatorId, message, and config are required" },
        { status: 400 }
      );
    }

    const canManage = await hasPermission(supabase, operatorId, Permissions.SYSTEM_SETTINGS);
    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    let apiKey = config.apiKey;
    if (!apiKey || apiKey === "********") {
      const { data: savedConfig } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "chat_config")
        .single();

      if (savedConfig?.value && typeof savedConfig.value === "object") {
        const savedValue = savedConfig.value as { apiKey?: string };
        if (savedValue.apiKey) {
          apiKey = savedValue.apiKey;
        }
      }
    }

    if (!apiKey || apiKey === "********") {
      return NextResponse.json(
        { error: "API Key is required. Please configure it in the settings." },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const configWithKey = { ...config, apiKey };
    const model = createProvider(configWithKey);
    
    const result = await generateText({
      model,
      prompt: message,
      maxOutputTokens: config.maxTokens || 256,
      temperature: config.temperature ?? 0.7,
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      result: {
        text: result.text,
        responseTime,
        model: config.model,
        usage: {
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          totalTokens: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
        },
        finishReason: result.finishReason,
      },
    });
   } catch (error) {
     const errorDetails = extractDetailedError(error);
     console.error("Test chat error:", {
       message: errorDetails.message,
       code: errorDetails.code,
       statusCode: errorDetails.statusCode,
       details: errorDetails.details,
     });

     return NextResponse.json(
       {
         error: errorDetails.message,
         code: errorDetails.code,
         statusCode: errorDetails.statusCode,
         details: errorDetails.details,
       },
       { status: errorDetails.statusCode || 500 }
     );
   }
}
