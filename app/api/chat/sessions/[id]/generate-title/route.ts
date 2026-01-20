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

interface RouteParams {
  params: Promise<{ id: string }>;
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

const TITLE_GENERATION_PROMPT = `Based on the user's first message in a conversation, generate a concise and descriptive title for this chat session.

Rules:
1. The title should be 2-6 words, maximum 50 characters
2. Capture the main topic or intent of the conversation
3. Use the same language as the user's message
4. Do NOT use quotes around the title
5. Do NOT include prefixes like "Title:" or "Chat:"
6. Return ONLY the title, nothing else

User's message: {{message}}`;

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = createAdminClient();

  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { operatorId, userMessage } = body as {
      operatorId: string;
      userMessage: string;
    };

    if (!operatorId || !userMessage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const canAccess = await hasPermission(supabase, operatorId, Permissions.CHAT_ACCESS);
    if (!canAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { data: session } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", operatorId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get chat config
    const { data: chatConfigData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "chat_config")
      .single();

    if (!chatConfigData?.value) {
      return NextResponse.json({ error: "Chat not configured" }, { status: 400 });
    }

    const chatConfig = chatConfigData.value as unknown as ChatConfig;
    if (!chatConfig.apiKey) {
      return NextResponse.json({ error: "Chat API key not configured" }, { status: 400 });
    }

    const model = createProvider(chatConfig);

    const prompt = TITLE_GENERATION_PROMPT.replace("{{message}}", userMessage);

    const result = await generateText({
      model,
      messages: [{ role: "user", content: prompt }],
      maxOutputTokens: 100,
      temperature: 0.7,
    });

    const generatedTitle = result.text.trim().slice(0, 100);

    if (generatedTitle) {
      const { error: updateError } = await supabase
        .from("chat_sessions")
        .update({ title: generatedTitle })
        .eq("id", sessionId);

      if (updateError) {
        console.error("Failed to update session title:", updateError);
        return NextResponse.json({ error: "Failed to update title" }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      title: generatedTitle,
    });
  } catch (error) {
    const extracted = extractDetailedError(error);
    console.error("Generate title error:", {
      message: extracted.message,
      code: extracted.code,
      statusCode: extracted.statusCode,
    });
    return NextResponse.json(
      { error: extracted.message, code: extracted.code },
      { status: extracted.statusCode || 500 }
    );
  }
}
