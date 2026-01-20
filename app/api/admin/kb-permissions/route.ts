import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";

// GET /api/admin/kb-permissions - 获取知识库权限列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 检查权限
    const canView = await hasPermission(supabase, operatorId, Permissions.CHAT_KB_PERMISSIONS_VIEW);
    if (!canView) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // 获取所有角色
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name, description, is_system, is_super_admin")
      .order("name");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
    }

    // 获取所有知识库
    const { data: knowledgeBases, error: kbError } = await supabase
      .from("knowledge_bases")
      .select("id, name, description")
      .order("name");

    if (kbError) {
      console.error("Error fetching knowledge bases:", kbError);
      return NextResponse.json({ error: "Failed to fetch knowledge bases" }, { status: 500 });
    }

    // 获取所有权限（包含关联的 role 和 knowledge_base 信息）
    const { data: permissions, error: permError } = await supabase
      .from("chat_kb_permissions")
      .select(`
        *,
        role:roles(id, name, description, is_system, is_super_admin),
        knowledge_base:knowledge_bases(id, name, description)
      `);

    if (permError) {
      console.error("Error fetching permissions:", permError);
      return NextResponse.json({ 
        error: "Failed to fetch permissions",
        details: permError.message,
        code: permError.code 
      }, { status: 500 });
    }

    // 构建权限矩阵
    const permissionMatrix = roles?.map(role => ({
      role_id: role.id,
      role_name: role.name,
      role_description: role.description,
      is_system: role.is_system,
      is_super_admin: role.is_super_admin,
      permissions: knowledgeBases?.map(kb => {
        const perm = permissions?.find(p => p.role_id === role.id && p.kb_id === kb.id);
        return {
          kb_id: kb.id,
          kb_name: kb.name,
          kb_description: kb.description,
          permission_id: perm?.id || null,
          can_read: perm?.can_read || false,
          can_ask: perm?.can_ask || false,
        };
      }) || []
    })) || [];

    return NextResponse.json({ 
      roles: roles || [],
      knowledgeBases: knowledgeBases || [],
      permissions: permissions || [],
      permissionMatrix 
    });
  } catch (error) {
    console.error("Error in GET /api/admin/kb-permissions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/kb-permissions - 创建新的知识库权限
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, role_id, kb_id, can_read, can_ask } = body;

    if (!operatorId || !role_id || !kb_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 检查权限
    const canManage = await hasPermission(supabase, operatorId, Permissions.CHAT_KB_PERMISSIONS_MANAGE);
    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // 检查是否已存在相同的权限
    const { data: existing } = await supabase
      .from("chat_kb_permissions")
      .select("id")
      .eq("role_id", role_id)
      .eq("kb_id", kb_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Permission already exists" }, { status: 409 });
    }

    // 创建权限
    const { data: permission, error } = await supabase
      .from("chat_kb_permissions")
      .insert({
        role_id,
        kb_id,
        can_read: can_read ?? true,
        can_ask: can_ask ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating kb permission:", error);
      return NextResponse.json({ error: "Failed to create permission" }, { status: 500 });
    }

    return NextResponse.json({ permission }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/kb-permissions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

