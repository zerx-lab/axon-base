import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/chat/knowledge-bases - 获取用户可访问的知识库列表
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

    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*, role:roles(*)")
      .eq("id", session.user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 如果是超级管理员，返回所有知识库
    if (user.role?.is_super_admin) {
      const { data: knowledgeBases, error } = await supabase
        .from("knowledge_bases")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching knowledge bases:", error);
        return NextResponse.json(
          { error: "Failed to fetch knowledge bases" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        knowledgeBases: knowledgeBases.map((kb) => ({
          ...kb,
          can_access: true,
        })),
      });
    }

    // 普通用户：基于角色获取有权限访问的知识库
    // 先获取用户角色的权限
    const { data: rolePermissions, error: permError } = await supabase
      .from("chat_kb_permissions")
      .select("*, knowledge_bases(*)")
      .eq("role_id", user.role?.id)
      .or("can_read.eq.true,can_ask.eq.true");

    if (permError) {
      console.error("Error fetching permissions:", permError);
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 }
      );
    }

    // 提取有权限的知识库
    const knowledgeBases = rolePermissions?.map((perm) => ({
      ...perm.knowledge_bases,
      can_read: perm.can_read,
      can_ask: perm.can_ask,
      can_access: true,
    })) || [];

    return NextResponse.json({ knowledgeBases });
  } catch (error) {
    console.error("Error in GET /api/chat/knowledge-bases:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}