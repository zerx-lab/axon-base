import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { toSafeUser, getUserPermissions } from "@/lib/supabase/access";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get session by token
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ valid: false });
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Delete expired session (log error but don't fail validation)
      const { error: deleteError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", session.id);

      if (deleteError) {
        console.warn("Failed to delete expired session:", deleteError);
      }
      return NextResponse.json({ valid: false });
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ valid: false });
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json({ valid: false });
    }

    // Get role
    const { data: role } = await supabase
      .from("roles")
      .select("*")
      .eq("id", user.role_id)
      .single();

    if (!role) {
      return NextResponse.json({ valid: false });
    }

    // Get permissions
    const permissions = await getUserPermissions(supabase, user.id);

    return NextResponse.json({
      valid: true,
      user: toSafeUser(user),
      role,
      permissions,
      isSuperAdmin: role.is_super_admin,
    });
  } catch (error) {
    console.error("Validate session error:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
