import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission, canManageUser } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";

// POST /api/admin/users/toggle-active - Toggle user active status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, userId, isActive } = body;

    if (!operatorId || !userId || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check permission
    const hasTogglePermission = await hasPermission(
      supabase,
      operatorId,
      Permissions.USERS_TOGGLE_ACTIVE
    );
    if (!hasTogglePermission) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Cannot toggle self
    if (operatorId === userId) {
      return NextResponse.json(
        { error: "Cannot change your own status" },
        { status: 400 }
      );
    }

    // Check if can manage user
    const canManage = await canManageUser(supabase, operatorId, userId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Cannot manage this user" },
        { status: 403 }
      );
    }

    // Update user
    const { error: updateError } = await supabase
      .from("users")
      .update({ is_active: isActive })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    // If disabling, delete user's sessions
    if (!isActive) {
      await supabase.from("sessions").delete().eq("user_id", userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Toggle active error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
