import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";

// GET /api/chat/accessible-kb - 获取用户有权限访问的知识库
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 检查聊天权限
    const canAccess = await hasPermission(supabase, operatorId, Permissions.CHAT_ACCESS);
    if (!canAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // 获取用户的角色ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role_id, roles!inner(is_super_admin, permissions)")
      .eq("id", operatorId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const role = user.roles as unknown as { is_super_admin: boolean; permissions: string[] };

    // 超级管理员或有通配符权限的用户可以访问所有知识库
    if (role.is_super_admin || role.permissions?.includes("*")) {
      const { data: allKbs, error: allKbError } = await supabase
        .from("knowledge_bases")
        .select("id, name, description, document_count")
        .order("name");

      if (allKbError) {
        console.error("Error fetching all knowledge bases:", allKbError);
        return NextResponse.json({ error: "Failed to fetch knowledge bases" }, { status: 500 });
      }

      return NextResponse.json({
        knowledgeBases: allKbs || [],
        accessType: "full",
      });
    }

    // 普通用户：获取通过 chat_kb_permissions 授权的知识库
    const { data: permissions, error: permError } = await supabase
      .from("chat_kb_permissions")
      .select(`
        kb_id,
        can_read,
        can_ask,
        knowledge_base:knowledge_bases(id, name, description, document_count)
      `)
      .eq("role_id", user.role_id)
      .eq("can_ask", true); // 只返回有提问权限的知识库

    if (permError) {
      console.error("Error fetching kb permissions:", permError);
      return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
    }

    // 提取知识库信息
    const knowledgeBases = permissions
      ?.filter((p) => p.knowledge_base)
      .map((p) => ({
        ...p.knowledge_base,
        can_read: p.can_read,
        can_ask: p.can_ask,
      })) || [];

    return NextResponse.json({
      knowledgeBases,
      accessType: "limited",
    });
  } catch (error) {
    console.error("Error in GET /api/chat/accessible-kb:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
