import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";

// GET /api/admin/roles/[id] - Get single role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");

    if (!operatorId) {
      return NextResponse.json(
        { error: "Operator ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check permission
    const hasListPermission = await hasPermission(
      supabase,
      operatorId,
      Permissions.ROLES_LIST
    );
    if (!hasListPermission) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Get role
    const { data: role, error } = await supabase
      .from("roles")
      .select("*")
      .eq("id", roleId)
      .single();

    if (error || !role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Get role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
