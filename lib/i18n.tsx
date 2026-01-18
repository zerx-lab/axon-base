"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Locale = "zh" | "en";

interface Translations {
  [key: string]: {
    zh: string;
    en: string;
  };
}

// All translations
const translations: Translations = {
  // Navigation
  "nav.overview": { zh: "概览", en: "Overview" },
  "nav.users": { zh: "用户", en: "Users" },
  "nav.roles": { zh: "角色", en: "Roles" },
  "nav.knowledgeBases": { zh: "知识库", en: "Knowledge Bases" },
  "nav.settings": { zh: "设置", en: "Settings" },

  // Auth
  "auth.signOut": { zh: "退出登录", en: "Sign Out" },
  "auth.signIn": { zh: "登录", en: "Sign In" },
  "auth.username": { zh: "用户名", en: "Username" },
  "auth.password": { zh: "密码", en: "Password" },
  "auth.loading": { zh: "加载中", en: "Loading" },
  "auth.signingIn": { zh: "登录中...", en: "Signing in..." },
  "auth.invalidCredentials": { zh: "用户名或密码错误", en: "Invalid credentials" },
  "auth.enterUsername": { zh: "请输入用户名", en: "Enter username" },
  "auth.enterPassword": { zh: "请输入密码", en: "Enter password" },
  "auth.securePortal": { zh: "安全访问入口", en: "Secure Access Portal" },
  "auth.connectionFailed": { zh: "连接失败，请重试", en: "Connection failed. Please try again." },

  // Roles
  "role.super_admin": { zh: "超级管理员", en: "Super Admin" },
  "role.admin": { zh: "管理员", en: "Admin" },
  "role.user": { zh: "用户", en: "User" },

  // Dashboard
  "dashboard.title": { zh: "仪表盘", en: "Dashboard" },
  "dashboard.welcome": { zh: "欢迎回来", en: "Welcome back" },
  "dashboard.overview": { zh: "概览", en: "Overview" },
  "dashboard.quickActions": { zh: "快捷操作", en: "Quick Actions" },
  "dashboard.recentActivity": { zh: "最近活动", en: "Recent Activity" },
  "dashboard.sessionStarted": { zh: "会话已开始", en: "Session started" },
  "dashboard.systemInitialized": { zh: "系统已初始化", en: "System initialized" },
  "dashboard.welcomeToAxonBase": { zh: "欢迎使用 AxonBase", en: "Welcome to AxonBase" },
  "dashboard.justNow": { zh: "刚刚", en: "Just now" },

  // Greetings
  "greeting.morning": { zh: "早上好", en: "Good morning" },
  "greeting.afternoon": { zh: "下午好", en: "Good afternoon" },
  "greeting.evening": { zh: "晚上好", en: "Good evening" },

  // Stats
  "stats.totalUsers": { zh: "用户总数", en: "Total Users" },
  "stats.activeSessions": { zh: "活跃会话", en: "Active Sessions" },
  "stats.systemStatus": { zh: "系统状态", en: "System Status" },
  "stats.uptime": { zh: "运行时间", en: "Uptime" },
  "stats.online": { zh: "在线", en: "Online" },

  // Actions
  "action.manageUsers": { zh: "管理用户", en: "Manage Users" },
  "action.manageUsersDesc": { zh: "添加、编辑或删除用户账户", en: "Add, edit, or remove user accounts" },
  "action.systemSettings": { zh: "系统设置", en: "System Settings" },
  "action.systemSettingsDesc": { zh: "配置应用程序偏好设置", en: "Configure application preferences" },
  "action.viewLogs": { zh: "查看日志", en: "View Logs" },
  "action.viewLogsDesc": { zh: "监控系统活动", en: "Monitor system activity" },

  // Settings
  "settings.title": { zh: "设置", en: "Settings" },
  "settings.language": { zh: "语言", en: "Language" },
  "settings.theme": { zh: "主题", en: "Theme" },
  "settings.themeLight": { zh: "亮色", en: "Light" },
  "settings.themeDark": { zh: "暗色", en: "Dark" },

  // Common
  "common.loading": { zh: "加载中", en: "Loading" },
  "common.redirecting": { zh: "跳转中", en: "Redirecting" },
  "common.error": { zh: "错误", en: "Error" },
  "common.save": { zh: "保存", en: "Save" },
  "common.cancel": { zh: "取消", en: "Cancel" },
  "common.confirm": { zh: "确认", en: "Confirm" },
  "common.delete": { zh: "删除", en: "Delete" },
  "common.edit": { zh: "编辑", en: "Edit" },
  "common.create": { zh: "创建", en: "Create" },
  "common.search": { zh: "搜索", en: "Search" },
  "common.user": { zh: "用户", en: "User" },
  "common.actions": { zh: "操作", en: "Actions" },
  "common.status": { zh: "状态", en: "Status" },
  "common.active": { zh: "已启用", en: "Active" },
  "common.inactive": { zh: "已禁用", en: "Inactive" },
  "common.noData": { zh: "暂无数据", en: "No data" },
  "common.loadMore": { zh: "加载更多", en: "Load more" },
  "common.close": { zh: "关闭", en: "Close" },

  // User Management
  "users.title": { zh: "用户管理", en: "User Management" },
  "users.createUser": { zh: "创建用户", en: "Create User" },
  "users.editUser": { zh: "编辑用户", en: "Edit User" },
  "users.deleteUser": { zh: "删除用户", en: "Delete User" },
  "users.resetPassword": { zh: "重置密码", en: "Reset Password" },
  "users.toggleActive": { zh: "切换状态", en: "Toggle Status" },
  "users.username": { zh: "用户名", en: "Username" },
  "users.displayName": { zh: "显示名称", en: "Display Name" },
  "users.level": { zh: "用户级别", en: "User Level" },
  "users.role": { zh: "角色", en: "Role" },
  "users.lastLogin": { zh: "最后登录", en: "Last Login" },
  "users.createdAt": { zh: "创建时间", en: "Created At" },
  "users.confirmDelete": { zh: "确定要删除此用户吗？此操作无法撤销。", en: "Are you sure you want to delete this user? This action cannot be undone." },
  "users.confirmDisable": { zh: "确定要禁用此用户吗？", en: "Are you sure you want to disable this user?" },
  "users.confirmEnable": { zh: "确定要启用此用户吗？", en: "Are you sure you want to enable this user?" },
  "users.newPassword": { zh: "新密码", en: "New Password" },
  "users.noRole": { zh: "无角色", en: "No Role" },
  "users.noRoleOptional": { zh: "无需角色", en: "No role needed" },
  "users.roleRequired": { zh: "请选择角色", en: "Please select a role" },
  "users.searchPlaceholder": { zh: "搜索用户名或显示名称...", en: "Search username or display name..." },

  // Role Management
  "roles.title": { zh: "角色管理", en: "Role Management" },
  "roles.createRole": { zh: "创建角色", en: "Create Role" },
  "roles.editRole": { zh: "编辑角色", en: "Edit Role" },
  "roles.deleteRole": { zh: "删除角色", en: "Delete Role" },
  "roles.name": { zh: "角色名称", en: "Role Name" },
  "roles.description": { zh: "角色描述", en: "Description" },
  "roles.permissions": { zh: "权限", en: "Permissions" },
  "roles.systemRole": { zh: "系统角色", en: "System Role" },
  "roles.customRole": { zh: "自定义角色", en: "Custom Role" },
  "roles.confirmDelete": { zh: "确定要删除此角色吗？此操作无法撤销。", en: "Are you sure you want to delete this role? This action cannot be undone." },
  "roles.cannotDeleteSystem": { zh: "系统角色无法删除", en: "System roles cannot be deleted" },
  "roles.cannotDeleteInUse": { zh: "该角色正在被使用，无法删除", en: "This role is in use and cannot be deleted" },

  // Permission categories
  "permission.category.users": { zh: "用户管理", en: "User Management" },
  "permission.category.roles": { zh: "角色管理", en: "Role Management" },
  "permission.category.system": { zh: "系统设置", en: "System Settings" },

  // Permission names
  "permission.users.list": { zh: "查看用户列表", en: "View User List" },
  "permission.users.list.desc": { zh: "允许查看所有用户", en: "Allow viewing all users" },
  "permission.users.create": { zh: "创建用户", en: "Create User" },
  "permission.users.create.desc": { zh: "允许创建新用户", en: "Allow creating new users" },
  "permission.users.update": { zh: "编辑用户", en: "Edit User" },
  "permission.users.update.desc": { zh: "允许编辑用户信息", en: "Allow editing user information" },
  "permission.users.delete": { zh: "删除用户", en: "Delete User" },
  "permission.users.delete.desc": { zh: "允许删除用户", en: "Allow deleting users" },
  "permission.users.toggleActive": { zh: "禁用/启用用户", en: "Toggle User Status" },
  "permission.users.toggleActive.desc": { zh: "允许启用或禁用用户账户", en: "Allow enabling or disabling user accounts" },
  "permission.users.resetPassword": { zh: "重置密码", en: "Reset Password" },
  "permission.users.resetPassword.desc": { zh: "允许重置用户密码", en: "Allow resetting user passwords" },
  "permission.roles.list": { zh: "查看角色列表", en: "View Role List" },
  "permission.roles.list.desc": { zh: "允许查看所有角色", en: "Allow viewing all roles" },
  "permission.roles.create": { zh: "创建角色", en: "Create Role" },
  "permission.roles.create.desc": { zh: "允许创建新角色", en: "Allow creating new roles" },
  "permission.roles.update": { zh: "编辑角色", en: "Edit Role" },
  "permission.roles.update.desc": { zh: "允许编辑角色权限", en: "Allow editing role permissions" },
  "permission.roles.delete": { zh: "删除角色", en: "Delete Role" },
  "permission.roles.delete.desc": { zh: "允许删除自定义角色", en: "Allow deleting custom roles" },
  "permission.system.settings": { zh: "系统设置", en: "System Settings" },
  "permission.system.settings.desc": { zh: "允许访问系统设置", en: "Allow access to system settings" },
  "permission.system.logs": { zh: "查看日志", en: "View Logs" },
  "permission.system.logs.desc": { zh: "允许查看系统日志", en: "Allow viewing system logs" },

  // Error messages
  "error.accessDenied": { zh: "访问被拒绝", en: "Access Denied" },
  "error.noPermission": { zh: "您没有权限访问此页面", en: "You don't have permission to access this page" },
  "error.permissionDenied": { zh: "权限不足", en: "Permission denied" },
  "error.userNotFound": { zh: "用户不存在", en: "User not found" },
  "error.roleNotFound": { zh: "角色不存在", en: "Role not found" },
  "error.usernameExists": { zh: "用户名已存在", en: "Username already exists" },
  "error.roleNameExists": { zh: "角色名称已存在", en: "Role name already exists" },
  "error.cannotDeleteSelf": { zh: "无法删除自己的账户", en: "Cannot delete your own account" },
  "error.cannotDisableSelf": { zh: "无法禁用自己的账户", en: "Cannot disable your own account" },
  "error.createUserFailed": { zh: "创建用户失败", en: "Failed to create user" },
  "error.updateUserFailed": { zh: "更新用户失败", en: "Failed to update user" },
  "error.resetPasswordFailed": { zh: "重置密码失败", en: "Failed to reset password" },
  "error.deleteUserFailed": { zh: "删除用户失败", en: "Failed to delete user" },
  "error.createRoleFailed": { zh: "创建角色失败", en: "Failed to create role" },
  "error.updateRoleFailed": { zh: "更新角色失败", en: "Failed to update role" },
  "error.deleteRoleFailed": { zh: "删除角色失败", en: "Failed to delete role" },

  // Validation messages
  "validation.roleNameRequired": { zh: "角色名称不能为空", en: "Role name is required" },

  // Common (additional)
  "common.role": { zh: "角色", en: "Role" },
  "common.optional": { zh: "可选", en: "optional" },
  "common.import": { zh: "导入", en: "Import" },
  "common.export": { zh: "导出", en: "Export" },
  "common.preview": { zh: "预览", en: "Preview" },
  "common.download": { zh: "下载", en: "Download" },
  "common.upload": { zh: "上传", en: "Upload" },
  "common.content": { zh: "内容", en: "Content" },
  "common.title": { zh: "标题", en: "Title" },
  "common.description": { zh: "描述", en: "Description" },
  "common.name": { zh: "名称", en: "Name" },
  "common.type": { zh: "类型", en: "Type" },
  "common.size": { zh: "大小", en: "Size" },
  "common.words": { zh: "字数", en: "Words" },
  "common.chars": { zh: "字符", en: "Characters" },
  "common.back": { zh: "返回", en: "Back" },
  "common.view": { zh: "查看", en: "View" },
  "common.add": { zh: "添加", en: "Add" },
  "common.createdAt": { zh: "创建时间", en: "Created At" },

  // Knowledge Base Management
  "kb.title": { zh: "知识库管理", en: "Knowledge Base Management" },
  "kb.create": { zh: "创建知识库", en: "Create Knowledge Base" },
  "kb.edit": { zh: "编辑知识库", en: "Edit Knowledge Base" },
  "kb.delete": { zh: "删除知识库", en: "Delete Knowledge Base" },
  "kb.name": { zh: "知识库名称", en: "Knowledge Base Name" },
  "kb.description": { zh: "知识库描述", en: "Description" },
  "kb.documentCount": { zh: "文档数量", en: "Document Count" },
  "kb.createdAt": { zh: "创建时间", en: "Created At" },
  "kb.updatedAt": { zh: "更新时间", en: "Updated At" },
  "kb.confirmDelete": { zh: "确定要删除此知识库吗？所有关联文档将被一并删除，此操作无法撤销。", en: "Are you sure you want to delete this knowledge base? All associated documents will be deleted. This action cannot be undone." },
  "kb.noData": { zh: "暂无知识库，点击上方按钮创建", en: "No knowledge bases yet. Click the button above to create one." },
  "kb.namePlaceholder": { zh: "请输入知识库名称", en: "Enter knowledge base name" },
  "kb.descriptionPlaceholder": { zh: "请输入知识库描述（可选）", en: "Enter description (optional)" },
  "kb.viewDocuments": { zh: "查看文档", en: "View Documents" },

  // Document Management
  "docs.title": { zh: "文档管理", en: "Document Management" },
  "docs.create": { zh: "添加文档", en: "Add Document" },
  "docs.import": { zh: "导入 Markdown", en: "Import Markdown" },
  "docs.edit": { zh: "编辑文档", en: "Edit Document" },
  "docs.delete": { zh: "删除文档", en: "Delete Document" },
  "docs.preview": { zh: "预览文档", en: "Preview Document" },
  "docs.docTitle": { zh: "文档标题", en: "Document Title" },
  "docs.content": { zh: "文档内容", en: "Document Content" },
  "docs.wordCount": { zh: "字数统计", en: "Word Count" },
  "docs.charCount": { zh: "字符统计", en: "Character Count" },
  "docs.fileType": { zh: "文件类型", en: "File Type" },
  "docs.status": { zh: "状态", en: "Status" },
  "docs.statusActive": { zh: "正常", en: "Active" },
  "docs.statusArchived": { zh: "已归档", en: "Archived" },
  "docs.confirmDelete": { zh: "确定要删除此文档吗？此操作无法撤销。", en: "Are you sure you want to delete this document? This action cannot be undone." },
  "docs.noData": { zh: "暂无文档，点击上方按钮添加", en: "No documents yet. Click the button above to add one." },
  "docs.titlePlaceholder": { zh: "请输入文档标题", en: "Enter document title" },
  "docs.contentPlaceholder": { zh: "请输入 Markdown 内容...", en: "Enter Markdown content..." },
  "docs.backToKb": { zh: "返回知识库", en: "Back to Knowledge Bases" },
  "docs.importSuccess": { zh: "文档导入成功", en: "Document imported successfully" },
  "docs.importError": { zh: "文档导入失败", en: "Failed to import document" },
  "docs.searchPlaceholder": { zh: "搜索文档...", en: "Search documents..." },
  "docs.document": { zh: "文档", en: "Document" },

  // Permission categories (Knowledge Base)
  "permission.category.kb": { zh: "知识库管理", en: "Knowledge Base Management" },
  "permission.category.docs": { zh: "文档管理", en: "Document Management" },

  // Permission names (Knowledge Base)
  "permission.kb.list": { zh: "查看知识库列表", en: "View Knowledge Base List" },
  "permission.kb.list.desc": { zh: "允许查看所有知识库", en: "Allow viewing all knowledge bases" },
  "permission.kb.create": { zh: "创建知识库", en: "Create Knowledge Base" },
  "permission.kb.create.desc": { zh: "允许创建新知识库", en: "Allow creating new knowledge bases" },
  "permission.kb.update": { zh: "编辑知识库", en: "Edit Knowledge Base" },
  "permission.kb.update.desc": { zh: "允许编辑知识库信息", en: "Allow editing knowledge base information" },
  "permission.kb.delete": { zh: "删除知识库", en: "Delete Knowledge Base" },
  "permission.kb.delete.desc": { zh: "允许删除知识库", en: "Allow deleting knowledge bases" },

  // Permission names (Documents)
  "permission.docs.list": { zh: "查看文档列表", en: "View Document List" },
  "permission.docs.list.desc": { zh: "允许查看所有文档", en: "Allow viewing all documents" },
  "permission.docs.create": { zh: "创建文档", en: "Create Document" },
  "permission.docs.create.desc": { zh: "允许创建新文档", en: "Allow creating new documents" },
  "permission.docs.update": { zh: "编辑文档", en: "Edit Document" },
  "permission.docs.update.desc": { zh: "允许编辑文档内容", en: "Allow editing document content" },
  "permission.docs.delete": { zh: "删除文档", en: "Delete Document" },
  "permission.docs.delete.desc": { zh: "允许删除文档", en: "Allow deleting documents" },

  // Error messages (Knowledge Base)
  "error.kbNotFound": { zh: "知识库不存在", en: "Knowledge base not found" },
  "error.docNotFound": { zh: "文档不存在", en: "Document not found" },
  "error.kbNameExists": { zh: "知识库名称已存在", en: "Knowledge base name already exists" },
  "error.createKbFailed": { zh: "创建知识库失败", en: "Failed to create knowledge base" },
  "error.updateKbFailed": { zh: "更新知识库失败", en: "Failed to update knowledge base" },
  "error.deleteKbFailed": { zh: "删除知识库失败", en: "Failed to delete knowledge base" },
  "error.createDocFailed": { zh: "创建文档失败", en: "Failed to create document" },
  "error.updateDocFailed": { zh: "更新文档失败", en: "Failed to update document" },
  "error.deleteDocFailed": { zh: "删除文档失败", en: "Failed to delete document" },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const LOCALE_STORAGE_KEY = "axon_locale";

// Store for locale state
let localeListeners: Array<() => void> = [];
let currentLocale: Locale = "zh";

function getLocaleSnapshot(): Locale {
  return currentLocale;
}

function getLocaleServerSnapshot(): Locale {
  return "zh";
}

function subscribeLocale(callback: () => void): () => void {
  localeListeners.push(callback);
  return () => {
    localeListeners = localeListeners.filter((l) => l !== callback);
  };
}

function setLocaleValue(newLocale: Locale) {
  currentLocale = newLocale;
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }
  localeListeners.forEach((l) => l());
}

// Initialize from localStorage on client
if (typeof window !== "undefined") {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
  if (stored && (stored === "zh" || stored === "en")) {
    currentLocale = stored;
  }
}

interface I18nProviderProps {
  readonly children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getLocaleServerSnapshot
  );

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleValue(newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const translation = translations[key];
      if (!translation) {
        console.warn(`Missing translation: ${key}`);
        return key;
      }
      return translation[locale];
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export function useTranslation() {
  const { t } = useI18n();
  return t;
}
