import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { toSafeUser, getUserPermissions } from "@/lib/supabase/access";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_DURATION_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get user by username
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: "Account is disabled" },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Get user role
    const { data: role } = await supabase
      .from("roles")
      .select("*")
      .eq("id", user.role_id)
      .single();

    if (!role) {
      return NextResponse.json(
        { success: false, error: "User role not found" },
        { status: 500 }
      );
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
    );

    // Get user agent and IP
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined;

    // Create session
    const { error: sessionError } = await supabase.from("sessions").insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    if (sessionError) {
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Update last login time
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);

    // Get permissions
    const permissions = await getUserPermissions(supabase, user.id);

    return NextResponse.json({
      success: true,
      user: toSafeUser(user),
      role,
      permissions,
      isSuperAdmin: role.is_super_admin,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
