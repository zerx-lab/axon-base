import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import {
  Permissions,
  getAllPermissions,
  permissionsMeta,
  getPermissionsByCategory,
} from "@/lib/supabase/permissions";

// GET /api/admin/roles/permissions - Get all available permissions
export async function GET(request: NextRequest) {
  try {
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

    const allPermissions = getAllPermissions();
    const byCategory = getPermissionsByCategory();

    return NextResponse.json({
      permissions: allPermissions,
      meta: permissionsMeta,
      byCategory,
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
