import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/kb-permissions/[id] - 获取单个权限
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
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

    // 获取单个权限
    const { data: permission, error } = await supabase
      .from("chat_kb_permissions")
      .select("*, roles(*), knowledge_bases(*)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching permission:", error);
      return NextResponse.json({ error: "Failed to fetch permission" }, { status: 500 });
    }

    if (!permission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    return NextResponse.json({ permission });
  } catch (error) {
    console.error("Error in GET /api/admin/kb-permissions/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/kb-permissions/[id] - 更新权限
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { operatorId, can_read, can_ask } = body;

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 检查权限
    const canManage = await hasPermission(supabase, operatorId, Permissions.CHAT_KB_PERMISSIONS_MANAGE);
    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // 更新权限
    const { data: permission, error } = await supabase
      .from("chat_kb_permissions")
      .update({
        can_read: can_read ?? true,
        can_ask: can_ask ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating kb permission:", error);
      return NextResponse.json({ 
        error: "Failed to update permission",
        details: error.message 
      }, { status: 500 });
    }

    if (!permission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    return NextResponse.json({ permission });
  } catch (error) {
    console.error("Error in PUT /api/admin/kb-permissions/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/kb-permissions/[id] - 删除权限
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 检查权限
    const canManage = await hasPermission(supabase, operatorId, Permissions.CHAT_KB_PERMISSIONS_MANAGE);
    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // 删除权限
    const { error } = await supabase
      .from("chat_kb_permissions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting kb permission:", error);
      return NextResponse.json({ 
        error: "Failed to delete permission",
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/kb-permissions/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}