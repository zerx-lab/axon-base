import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { toSafeUser, hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";

// GET /api/admin/users/[id] - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
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
      Permissions.USERS_LIST
    );
    if (!hasListPermission) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Get user with role
    const { data: user, error } = await supabase
      .from("users")
      .select("*, roles!inner(id, name, is_super_admin, permissions)")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { roles, ...userData } = user;

    return NextResponse.json({
      user: {
        ...toSafeUser(userData),
        role: roles,
        permissions: roles.is_super_admin ? ["*"] : roles.permissions,
        isSuperAdmin: roles.is_super_admin,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
