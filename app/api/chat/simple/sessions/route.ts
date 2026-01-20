import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/chat/simple/sessions - 获取用户的聊天会话列表
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createAdminClient();

    // 验证会话
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // 检查会话是否过期
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // 获取用户的聊天会话
    const { data: sessions, error } = await supabase
      .from("chat_sessions")
      .select(`
        id,
        title,
        kb_id,
        last_message_at,
        created_at,
        knowledge_bases (name)
      `)
      .eq("user_id", session.user_id)
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching chat sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    // 格式化会话数据
    const formattedSessions = sessions?.map((s: any) => ({
      id: s.id,
      title: s.title,
      kb_id: s.kb_id,
      kb_name: s.knowledge_bases?.name,
      last_message_at: s.last_message_at,
      created_at: s.created_at,
    })) || [];

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error) {
    console.error("Error in GET /api/chat/simple/sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/chat/simple/sessions - 创建新的聊天会话
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { kb_id, title } = await request.json();

    if (!kb_id) {
      return NextResponse.json(
        { error: "Knowledge base ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 验证会话
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // 验证知识库是否存在
    const { data: kb, error: kbError } = await supabase
      .from("knowledge_bases")
      .select("id, name")
      .eq("id", kb_id)
      .single();

    if (kbError || !kb) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 }
      );
    }

    // 创建新会话
    const { data: newSession, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: session.user_id,
        kb_ids: [kb_id],
        title: title || "新对话",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating chat session:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: newSession.id,
      title: newSession.title,
      kb_id: kb_id,
      kb_name: kb.name,
      last_message_at: newSession.updated_at,
      created_at: newSession.created_at,
    });
  } catch (error) {
    console.error("Error in POST /api/chat/simple/sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}