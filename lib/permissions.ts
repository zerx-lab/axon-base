/**
 * Frontend permission constants
 * Must be kept in sync with convex/lib/permissions.ts
 */

// All available permissions in the system
export const PERMISSIONS = {
  // User management permissions
  USERS_LIST: "users:list",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_TOGGLE_ACTIVE: "users:toggle_active",
  USERS_RESET_PASSWORD: "users:reset_password",

  // Role management permissions
  ROLES_LIST: "roles:list",
  ROLES_CREATE: "roles:create",
  ROLES_UPDATE: "roles:update",
  ROLES_DELETE: "roles:delete",

  // System permissions
  SYSTEM_SETTINGS: "system:settings",
  SYSTEM_LOGS: "system:logs",

  // Knowledge base permissions
  KB_LIST: "kb:list",
  KB_CREATE: "kb:create",
  KB_UPDATE: "kb:update",
  KB_DELETE: "kb:delete",

  // Document permissions
  DOCS_LIST: "docs:list",
  DOCS_CREATE: "docs:create",
  DOCS_UPDATE: "docs:update",
  DOCS_DELETE: "docs:delete",

  // Embedding permissions
  EMBEDDING_VIEW: "embedding:view",
  EMBEDDING_MANAGE: "embedding:manage",
  EMBEDDING_SEARCH: "embedding:search",

  // Chat permissions
  CHAT_ACCESS: "chat:access",
  CHAT_CREATE: "chat:create",
  CHAT_DELETE: "chat:delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
