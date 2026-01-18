import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions, getAllPermissions, permissionsMeta } from "@/lib/supabase/permissions";

// GET /api/admin/roles - List roles
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

    // Get all roles
    const { data: roles, error } = await supabase
      .from("roles")
      .select("*")
      .order("is_super_admin", { ascending: false })
      .order("is_system", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch roles" },
        { status: 500 }
      );
    }

    return NextResponse.json({ roles: roles || [] });
  } catch (error) {
    console.error("List roles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/roles - Create role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, name, description, permissions } = body;

    if (!operatorId || !name || !permissions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check permission
    const hasCreatePermission = await hasPermission(
      supabase,
      operatorId,
      Permissions.ROLES_CREATE
    );
    if (!hasCreatePermission) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Check if role name exists
    const { data: existingRole } = await supabase
      .from("roles")
      .select("id")
      .eq("name", name)
      .single();

    if (existingRole) {
      return NextResponse.json(
        { error: "Role name already exists" },
        { status: 400 }
      );
    }

    // Create role
    const { data: newRole, error: createError } = await supabase
      .from("roles")
      .insert({
        name,
        description: description || null,
        permissions,
        is_system: false,
        is_super_admin: false,
        created_by: operatorId,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: "Failed to create role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      role: newRole,
    });
  } catch (error) {
    console.error("Create role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/roles - Update role
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, roleId, name, description, permissions } = body;

    if (!operatorId || !roleId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check permission
    const hasUpdatePermission = await hasPermission(
      supabase,
      operatorId,
      Permissions.ROLES_UPDATE
    );
    if (!hasUpdatePermission) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Check if role is system role
    const { data: existingRole } = await supabase
      .from("roles")
      .select("is_system")
      .eq("id", roleId)
      .single();

    if (existingRole?.is_system) {
      return NextResponse.json(
        { error: "Cannot modify system roles" },
        { status: 400 }
      );
    }

    // If changing name, check if it exists
    if (name) {
      const { data: duplicateRole } = await supabase
        .from("roles")
        .select("id")
        .eq("name", name)
        .neq("id", roleId)
        .single();

      if (duplicateRole) {
        return NextResponse.json(
          { error: "Role name already exists" },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) updateData.permissions = permissions;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update role
    const { data: updatedRole, error: updateError } = await supabase
      .from("roles")
      .update(updateData)
      .eq("id", roleId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      role: updatedRole,
    });
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/roles - Delete role
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");
    const roleId = searchParams.get("roleId");

    if (!operatorId || !roleId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check permission
    const hasDeletePermission = await hasPermission(
      supabase,
      operatorId,
      Permissions.ROLES_DELETE
    );
    if (!hasDeletePermission) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Check if role is system role
    const { data: existingRole } = await supabase
      .from("roles")
      .select("is_system")
      .eq("id", roleId)
      .single();

    if (existingRole?.is_system) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 400 }
      );
    }

    // Check if role has users
    const { count: userCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role_id", roleId);

    if (userCount && userCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete role with assigned users" },
        { status: 400 }
      );
    }

    // Delete role
    const { error: deleteError } = await supabase
      .from("roles")
      .delete()
      .eq("id", roleId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
