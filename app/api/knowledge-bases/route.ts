import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";

// GET /api/knowledge-bases - 获取知识库列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 检查权限 - 可以查看知识库权限的用户应该能获取知识库列表
    const canView = await hasPermission(supabase, operatorId, Permissions.CHAT_KB_PERMISSIONS_VIEW);
    
    if (!canView) {
      // 如果没有权限查看知识库权限，可能还是超级管理员
      const { data: user } = await supabase
        .from("users")
        .select("roles!inner(is_super_admin)")
        .eq("id", operatorId)
        .single();
      
      const isSuperAdmin = user?.roles?.is_super_admin || false;
      if (!isSuperAdmin) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }
    }

    // 获取所有知识库
    const { data: knowledgeBases, error } = await supabase
      .from("knowledge_bases")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching knowledge bases:", error);
      return NextResponse.json({ error: "Failed to fetch knowledge bases" }, { status: 500 });
    }

    return NextResponse.json({ knowledgeBases: knowledgeBases || [] });
  } catch (error) {
    console.error("Error in GET /api/knowledge-bases:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}