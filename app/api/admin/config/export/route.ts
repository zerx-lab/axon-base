import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";

// GET /api/admin/config/export - 导出系统配置
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 检查是否是超级管理员
    const { data: user } = await supabase
      .from("users")
      .select("*, roles(*)")
      .eq("id", operatorId)
      .single();

    if (!user?.roles?.is_super_admin) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // 导出配置数据
    const exportData: any = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      exportedBy: user.username,
    };

    // 1. 导出角色（排除系统角色）
    const { data: roles } = await supabase
      .from("roles")
      .select("*")
      .eq("is_system", false)
      .order("name");
    
    exportData.roles = roles || [];

    // 2. 导出用户（排除超级管理员）
    const { data: users } = await supabase
      .from("users")
      .select("id, username, display_name, role_id, is_active, created_at")
      .order("username");
    
    // 过滤掉密码和敏感信息
    exportData.users = users?.filter(u => u.id !== operatorId) || [];

    // 3. 导出知识库
    const { data: knowledgeBases } = await supabase
      .from("knowledge_bases")
      .select("*")
      .order("name");
    
    exportData.knowledgeBases = knowledgeBases || [];

    // 4. 导出知识库权限
    const { data: kbPermissions } = await supabase
      .from("chat_kb_permissions")
      .select("*")
      .order("role_id");
    
    exportData.kbPermissions = kbPermissions || [];

    // 5. 导出系统设置
    const { data: systemSettings } = await supabase
      .from("system_settings")
      .select("*");
    
    exportData.systemSettings = systemSettings || [];

    // 生成配置文件
    const configString = JSON.stringify(exportData, null, 2);
    const fileName = `axondoc_config_${new Date().getTime()}.json`;

    return new NextResponse(configString, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error("Error exporting config:", error);
    return NextResponse.json({ error: "Failed to export configuration" }, { status: 500 });
  }
}