// Permission constants
export const Permissions = {
  USERS_LIST: "users:list",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_TOGGLE_ACTIVE: "users:toggle_active",
  USERS_RESET_PASSWORD: "users:reset_password",
  ROLES_LIST: "roles:list",
  ROLES_CREATE: "roles:create",
  ROLES_UPDATE: "roles:update",
  ROLES_DELETE: "roles:delete",
  SYSTEM_SETTINGS: "system:settings",
  SYSTEM_LOGS: "system:logs",
  KB_LIST: "kb:list",
  KB_CREATE: "kb:create",
  KB_UPDATE: "kb:update",
  KB_DELETE: "kb:delete",
  DOCS_LIST: "docs:list",
  DOCS_CREATE: "docs:create",
  DOCS_UPDATE: "docs:update",
  DOCS_DELETE: "docs:delete",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// Permission metadata for UI display
export const permissionsMeta: Record<
  Permission,
  { i18nKey: string; category: string }
> = {
  [Permissions.USERS_LIST]: {
    i18nKey: "permissions.users.list",
    category: "users",
  },
  [Permissions.USERS_CREATE]: {
    i18nKey: "permissions.users.create",
    category: "users",
  },
  [Permissions.USERS_UPDATE]: {
    i18nKey: "permissions.users.update",
    category: "users",
  },
  [Permissions.USERS_DELETE]: {
    i18nKey: "permissions.users.delete",
    category: "users",
  },
  [Permissions.USERS_TOGGLE_ACTIVE]: {
    i18nKey: "permissions.users.toggleActive",
    category: "users",
  },
  [Permissions.USERS_RESET_PASSWORD]: {
    i18nKey: "permissions.users.resetPassword",
    category: "users",
  },
  [Permissions.ROLES_LIST]: {
    i18nKey: "permissions.roles.list",
    category: "roles",
  },
  [Permissions.ROLES_CREATE]: {
    i18nKey: "permissions.roles.create",
    category: "roles",
  },
  [Permissions.ROLES_UPDATE]: {
    i18nKey: "permissions.roles.update",
    category: "roles",
  },
  [Permissions.ROLES_DELETE]: {
    i18nKey: "permissions.roles.delete",
    category: "roles",
  },
  [Permissions.SYSTEM_SETTINGS]: {
    i18nKey: "permissions.system.settings",
    category: "system",
  },
  [Permissions.SYSTEM_LOGS]: {
    i18nKey: "permissions.system.logs",
    category: "system",
  },
  [Permissions.KB_LIST]: {
    i18nKey: "permission.kb.list",
    category: "kb",
  },
  [Permissions.KB_CREATE]: {
    i18nKey: "permission.kb.create",
    category: "kb",
  },
  [Permissions.KB_UPDATE]: {
    i18nKey: "permission.kb.update",
    category: "kb",
  },
  [Permissions.KB_DELETE]: {
    i18nKey: "permission.kb.delete",
    category: "kb",
  },
  [Permissions.DOCS_LIST]: {
    i18nKey: "permission.docs.list",
    category: "docs",
  },
  [Permissions.DOCS_CREATE]: {
    i18nKey: "permission.docs.create",
    category: "docs",
  },
  [Permissions.DOCS_UPDATE]: {
    i18nKey: "permission.docs.update",
    category: "docs",
  },
  [Permissions.DOCS_DELETE]: {
    i18nKey: "permission.docs.delete",
    category: "docs",
  },
};

// Get all available permissions
export function getAllPermissions(): Permission[] {
  return Object.values(Permissions);
}

// Group permissions by category
export function getPermissionsByCategory(): Record<string, Permission[]> {
  const grouped: Record<string, Permission[]> = {};

  for (const [permission, meta] of Object.entries(permissionsMeta)) {
    if (!grouped[meta.category]) {
      grouped[meta.category] = [];
    }
    grouped[meta.category].push(permission as Permission);
  }

  return grouped;
}
