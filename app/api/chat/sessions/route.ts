import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";
import type { ChatSessionStatus, ChatSessionSettings, Json } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");
    const statusParam = searchParams.get("status") || "active";
    const sessionStatus: ChatSessionStatus = statusParam === "archived" ? "archived" : "active";
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const canAccess = await hasPermission(supabase, operatorId, Permissions.CHAT_ACCESS);
    if (!canAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const offset = (page - 1) * limit;

    const { data: sessions, count, error } = await supabase
      .from("chat_sessions")
      .select("*", { count: "exact" })
      .eq("user_id", operatorId)
      .eq("status", sessionStatus)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      sessions,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("List chat sessions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { operatorId, title, kbIds, settings } = body as {
      operatorId: string;
      title?: string;
      kbIds?: string[];
      settings?: ChatSessionSettings;
    };

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const canCreate = await hasPermission(supabase, operatorId, Permissions.CHAT_CREATE);
    if (!canCreate) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { data: newSession, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: operatorId,
        title: title || null,
        kb_ids: kbIds || [],
        settings: (settings || {}) as Json,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, session: newSession }, { status: 201 });
  } catch (error) {
    console.error("Create chat session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
