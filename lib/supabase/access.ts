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

  const actorIsSuperAdmin = await isSuperAdmin(supabase, actorId);
  const targetIsSuperAdmin = await isSuperAdmin(supabase, targetUserId);

  // Only super admins can manage other super admins
  if (targetIsSuperAdmin && !actorIsSuperAdmin) {
    return false;
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
