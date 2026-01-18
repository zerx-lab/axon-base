import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SafeUser, User, Role } from "./types";
import type { Permission } from "./permissions";

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  permission: Permission
): Promise<boolean> {
  const { data: user, error } = await supabase
    .from("users")
    .select("role_id")
    .eq("id", userId)
    .single();

  if (error || !user) return false;

  const { data: role } = await supabase
    .from("roles")
    .select("permissions, is_super_admin")
    .eq("id", user.role_id)
    .single();

  if (!role) return false;

  // Super admin has all permissions
  if (role.is_super_admin || role.permissions.includes("*")) {
    return true;
  }

  return role.permissions.includes(permission);
}

/**
 * Require a permission, throw error if not granted
 */
export async function requirePermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  permission: Permission
): Promise<void> {
  const granted = await hasPermission(supabase, userId, permission);
  if (!granted) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string[]> {
  const { data: user } = await supabase
    .from("users")
    .select("role_id")
    .eq("id", userId)
    .single();

  if (!user) return [];

  const { data: role } = await supabase
    .from("roles")
    .select("permissions, is_super_admin")
    .eq("id", user.role_id)
    .single();

  if (!role) return [];

  // Super admin has all permissions
  if (role.is_super_admin) {
    return ["*"];
  }

  return role.permissions;
}

/**
 * Check if a user is a super admin
 */
export async function isSuperAdmin(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data: user } = await supabase
    .from("users")
    .select("role_id")
    .eq("id", userId)
    .single();

  if (!user) return false;

  const { data: role } = await supabase
    .from("roles")
    .select("is_super_admin")
    .eq("id", user.role_id)
    .single();

  return role?.is_super_admin ?? false;
}

/**
 * Check if actor can manage target user
 * Rules:
 * 1. Cannot manage yourself (for certain operations)
 * 2. Only super admins can manage other super admins
 * 3. Only users with system roles can manage users with system roles
 * 4. Users can only manage other users with equal or lesser permissions
 */
export async function canManageUser(
  supabase: SupabaseClient<Database>,
  actorId: string,
  targetUserId: string
): Promise<boolean> {
  // Cannot manage yourself in certain ways
  if (actorId === targetUserId) {
    return false;
  }

  // Get actor's role info
  const { data: actorUser } = await supabase
    .from("users")
    .select("role_id")
    .eq("id", actorId)
    .single();

  if (!actorUser) return false;

  const { data: actorRole } = await supabase
    .from("roles")
    .select("is_super_admin, is_system, permissions")
    .eq("id", actorUser.role_id)
    .single();

  if (!actorRole) return false;

  // Get target's role info
  const { data: targetUser } = await supabase
    .from("users")
    .select("role_id")
    .eq("id", targetUserId)
    .single();

  if (!targetUser) return false;

  const { data: targetRole } = await supabase
    .from("roles")
    .select("is_super_admin, is_system, permissions")
    .eq("id", targetUser.role_id)
    .single();

  if (!targetRole) return false;

  // Only super admins can manage other super admins
  if (targetRole.is_super_admin && !actorRole.is_super_admin) {
    return false;
  }

  // Super admins can manage anyone
  if (actorRole.is_super_admin) {
    return true;
  }

  // Non-system role users cannot manage users with system roles
  // (e.g., custom role cannot manage Administrator)
  if (targetRole.is_system && !actorRole.is_system) {
    return false;
  }

  // For system roles, check permission count (more permissions = higher level)
  // This prevents User Manager from managing Administrator
  if (actorRole.is_system && targetRole.is_system) {
    const actorPermCount = actorRole.permissions.includes("*") ? 999 : actorRole.permissions.length;
    const targetPermCount = targetRole.permissions.includes("*") ? 999 : targetRole.permissions.length;

    // Can only manage users with fewer or equal permissions
    if (targetPermCount > actorPermCount) {
      return false;
    }
  }

  return true;
}

/**
 * Convert user to safe user (without password hash)
 */
export function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

/**
 * Get user with role information
 */
export async function getUserWithRole(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{
  user: SafeUser;
  role: Role;
  permissions: string[];
  isSuperAdmin: boolean;
} | null> {
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!user) return null;

  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("id", user.role_id)
    .single();

  if (!role) return null;

  const permissions = role.is_super_admin ? ["*"] : role.permissions;

  return {
    user: toSafeUser(user),
    role,
    permissions,
    isSuperAdmin: role.is_super_admin,
  };
}
