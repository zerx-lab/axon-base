import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";
import type { Json } from "@/lib/supabase/types";

type JsonObject = { [key: string]: Json | undefined };

interface ExportedConfig {
  version: string;
  exportedAt: string;
  includesApiKeys: boolean;
  embedding?: JsonObject;
  chat?: JsonObject;
  reranker?: JsonObject;
  quality?: JsonObject;
  prompts?: JsonObject;
}

// POST to export configuration with real API keys
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { operatorId, includeApiKeys } = body;

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    // Check permission
    const canExport = await hasPermission(supabase, operatorId, Permissions.SYSTEM_SETTINGS);
    if (!canExport) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Fetch all settings from database
    const { data: settings, error } = await supabase
      .from("system_settings")
      .select("*")
      .in("key", ["embedding_config", "chat_config", "reranker_config", "reranker_quality_config", "prompt_config"]);

    if (error) throw error;

    // Build export data
    const exportData: ExportedConfig = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      includesApiKeys: !!includeApiKeys,
    };

    const maskApiKey = (key: string | undefined): string => {
      if (!key) return "";
      if (key.length <= 8) return "***";
      return key.slice(0, 4) + "..." + key.slice(-4);
    };

    for (const setting of settings || []) {
      const value = setting.value as JsonObject;
      
      switch (setting.key) {
        case "embedding_config":
          exportData.embedding = {
            ...value,
            apiKey: includeApiKeys ? value.apiKey : maskApiKey(value.apiKey as string | undefined),
          };
          break;
        case "chat_config":
          exportData.chat = {
            ...value,
            apiKey: includeApiKeys ? value.apiKey : maskApiKey(value.apiKey as string | undefined),
          };
          break;
        case "reranker_config":
          exportData.reranker = {
            ...value,
            apiKey: includeApiKeys ? value.apiKey : maskApiKey(value.apiKey as string | undefined),
          };
          break;
        case "reranker_quality_config":
          exportData.quality = value;
          break;
        case "prompt_config":
          exportData.prompts = value;
          break;
      }
    }

    return NextResponse.json({ success: true, config: exportData });
  } catch (error) {
    console.error("Export settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
