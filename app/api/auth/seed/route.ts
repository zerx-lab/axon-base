import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

const DEFAULT_USERNAME = "clown";
const DEFAULT_PASSWORD = "012359clown";

export async function POST() {
  try {
    const supabase = createAdminClient();

    // Check if super admin already exists
    const { data: existingRoles } = await supabase
      .from("roles")
      .select("id")
      .eq("is_super_admin", true);

    if (!existingRoles || existingRoles.length === 0) {
      // Seed system roles first
      await supabase.from("roles").insert([
        {
          name: "Super Administrator",
          description: "Has all permissions and cannot be modified",
          permissions: ["*"],
          is_system: true,
          is_super_admin: true,
        },
        {
          name: "Administrator",
          description: "Has all administrative permissions",
          permissions: [
            "users:list",
            "users:create",
            "users:update",
            "users:delete",
            "users:toggle_active",
            "users:reset_password",
            "roles:list",
            "roles:create",
            "roles:update",
            "roles:delete",
            "system:settings",
            "system:logs",
          ],
          is_system: true,
          is_super_admin: false,
        },
        {
          name: "User Manager",
          description: "Can manage users",
          permissions: [
            "users:list",
            "users:create",
            "users:update",
            "users:toggle_active",
            "users:reset_password",
          ],
          is_system: true,
          is_super_admin: false,
        },
        {
          name: "Viewer",
          description: "Read-only access",
          permissions: ["users:list", "roles:list"],
          is_system: true,
          is_super_admin: false,
        },
      ]);
    }

    // Get super admin role
    const { data: superAdminRole } = await supabase
      .from("roles")
      .select("id")
      .eq("is_super_admin", true)
      .single();

    if (!superAdminRole) {
      return NextResponse.json(
        { created: false, message: "Super admin role not found" },
        { status: 500 }
      );
    }

    // Check if super admin user exists
    const { data: existingUsers } = await supabase
      .from("users")
      .select("id, role_id")
      .eq("role_id", superAdminRole.id);

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({
        created: false,
        message: "Super admin user already exists",
      });
    }

    // Create super admin user
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const { error: createError } = await supabase.from("users").insert({
      username: DEFAULT_USERNAME,
      password_hash: passwordHash,
      role_id: superAdminRole.id,
      display_name: "Super Administrator",
      is_active: true,
    });

    if (createError) {
      return NextResponse.json(
        { created: false, message: `Failed to create user: ${createError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      created: true,
      message: `Super admin created with username: ${DEFAULT_USERNAME}`,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { created: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
