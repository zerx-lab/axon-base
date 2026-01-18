import { db, roles, users } from "./index";
import { eq } from "drizzle-orm";

const SYSTEM_ROLES = [
  {
    name: "Super Administrator",
    description: "Has all permissions and cannot be modified",
    permissions: ["*"],
    isSystem: true,
    isSuperAdmin: true,
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
      "kb:list",
      "kb:create",
      "kb:update",
      "kb:delete",
      "docs:list",
      "docs:create",
      "docs:update",
      "docs:delete",
    ],
    isSystem: true,
    isSuperAdmin: false,
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
    isSystem: true,
    isSuperAdmin: false,
  },
  {
    name: "Viewer",
    description: "Read-only access",
    permissions: ["users:list", "roles:list", "kb:list", "docs:list"],
    isSystem: true,
    isSuperAdmin: false,
  },
];

async function seed() {
  console.log("Seeding database...");

  for (const role of SYSTEM_ROLES) {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.name, role.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(roles).values(role);
      console.log(`Created role: ${role.name}`);
    } else {
      console.log(`Role already exists: ${role.name}`);
    }
  }

  const superAdminRole = await db
    .select()
    .from(roles)
    .where(eq(roles.isSuperAdmin, true))
    .limit(1);

  if (superAdminRole.length > 0) {
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.roleId, superAdminRole[0].id))
      .limit(1);

    if (existingAdmin.length === 0) {
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash("012359clown", 12);

      await db.insert(users).values({
        username: "clown",
        passwordHash,
        roleId: superAdminRole[0].id,
        displayName: "Super Administrator",
        isActive: true,
      });
      console.log("Created admin user: clown");
    } else {
      console.log("Admin user already exists");
    }
  }

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
