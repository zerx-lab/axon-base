import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// ROLES TABLE
// ============================================
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),
    permissions: text("permissions").array().notNull().default([]),
    isSystem: boolean("is_system").notNull().default(false),
    isSuperAdmin: boolean("is_super_admin").notNull().default(false),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_roles_name").on(table.name)]
);

// ============================================
// USERS TABLE
// ============================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    displayName: varchar("display_name", { length: 255 }),
    avatar: text("avatar"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_users_username").on(table.username),
    index("idx_users_role_id").on(table.roleId),
  ]
);

// ============================================
// SESSIONS TABLE
// ============================================
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_sessions_token").on(table.token),
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ]
);

// ============================================
// KNOWLEDGE BASES TABLE
// ============================================
export const knowledgeBases = pgTable(
  "knowledge_bases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    documentCount: integer("document_count").notNull().default(0),
    settings: jsonb("settings").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_kb_user_id").on(table.userId),
    index("idx_kb_name").on(table.name),
  ]
);

// ============================================
// DOCUMENTS TABLE
// ============================================
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kbId: uuid("kb_id")
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content"),
    contentHash: varchar("content_hash", { length: 64 }),
    fileType: varchar("file_type", { length: 50 }).notNull().default("markdown"),
    wordCount: integer("word_count").notNull().default(0),
    charCount: integer("char_count").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_docs_kb_id").on(table.kbId),
    index("idx_docs_user_id").on(table.userId),
    index("idx_docs_status").on(table.status),
  ]
);

// ============================================
// RELATIONS
// ============================================
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  sessions: many(sessions),
  knowledgeBases: many(knowledgeBases),
  documents: many(documents),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const knowledgeBasesRelations = relations(knowledgeBases, ({ one, many }) => ({
  user: one(users, {
    fields: [knowledgeBases.userId],
    references: [users.id],
  }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  knowledgeBase: one(knowledgeBases, {
    fields: [documents.kbId],
    references: [knowledgeBases.id],
  }),
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type NewKnowledgeBase = typeof knowledgeBases.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
