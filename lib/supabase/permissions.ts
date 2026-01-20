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
  EMBEDDING_VIEW: "embedding:view",
  EMBEDDING_MANAGE: "embedding:manage",
  EMBEDDING_SEARCH: "embedding:search",
  CHAT_ACCESS: "chat:access",
  CHAT_CREATE: "chat:create",
  CHAT_DELETE: "chat:delete",
  CHAT_KB_PERMISSIONS_VIEW: "chat:kb_permissions:view",
  CHAT_KB_PERMISSIONS_MANAGE: "chat:kb_permissions:manage",
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
    i18nKey: "permissions.kb.list",
    category: "kb",
  },
  [Permissions.KB_CREATE]: {
    i18nKey: "permissions.kb.create",
    category: "kb",
  },
  [Permissions.KB_UPDATE]: {
    i18nKey: "permissions.kb.update",
    category: "kb",
  },
  [Permissions.KB_DELETE]: {
    i18nKey: "permissions.kb.delete",
    category: "kb",
  },
  [Permissions.DOCS_LIST]: {
    i18nKey: "permissions.docs.list",
    category: "docs",
  },
  [Permissions.DOCS_CREATE]: {
    i18nKey: "permissions.docs.create",
    category: "docs",
  },
  [Permissions.DOCS_UPDATE]: {
    i18nKey: "permissions.docs.update",
    category: "docs",
  },
  [Permissions.DOCS_DELETE]: {
    i18nKey: "permissions.docs.delete",
    category: "docs",
  },
  [Permissions.EMBEDDING_VIEW]: {
    i18nKey: "permissions.embedding.view",
    category: "embedding",
  },
  [Permissions.EMBEDDING_MANAGE]: {
    i18nKey: "permissions.embedding.manage",
    category: "embedding",
  },
  [Permissions.EMBEDDING_SEARCH]: {
    i18nKey: "permissions.embedding.search",
    category: "embedding",
  },
  [Permissions.CHAT_ACCESS]: {
    i18nKey: "permissions.chat.access",
    category: "chat",
  },
  [Permissions.CHAT_CREATE]: {
    i18nKey: "permissions.chat.create",
    category: "chat",
  },
  [Permissions.CHAT_DELETE]: {
    i18nKey: "permissions.chat.delete",
    category: "chat",
  },
  [Permissions.CHAT_KB_PERMISSIONS_VIEW]: {
    i18nKey: "permissions.chat.kbPermissionsView",
    category: "chat",
  },
  [Permissions.CHAT_KB_PERMISSIONS_MANAGE]: {
    i18nKey: "permissions.chat.kbPermissionsManage",
    category: "chat",
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
