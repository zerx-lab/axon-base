import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";
import bcrypt from "bcryptjs";

// POST /api/admin/config/import - 导入系统配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, config, options = {} } = body;

    if (!operatorId || !config) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 检查是否是超级管理员
    const { data: user } = await supabase
      .from("users")
      .select("*, roles(*)")
      .eq("id", operatorId)
      .single();

    if (!user?.roles?.is_super_admin) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // 验证配置格式
    if (!config.version || !config.exportDate) {
      return NextResponse.json({ error: "Invalid configuration format" }, { status: 400 });
    }

    const importResults: {
      success: boolean;
      imported: {
        roles: number;
        users: number;
        knowledgeBases: number;
        kbPermissions: number;
        systemSettings: number;
      };
      errors: string[];
      warnings: string[];
    } = {
      success: true,
      imported: {
        roles: 0,
        users: 0,
        knowledgeBases: 0,
        kbPermissions: 0,
        systemSettings: 0,
      },
      errors: [],
      warnings: [],
    };

    // 1. 导入角色（如果选择）
    if (options.importRoles && config.roles) {
      for (const role of config.roles) {
        try {
          // 检查角色是否已存在
          const { data: existing } = await supabase
            .from("roles")
            .select("id")
            .eq("name", role.name)
            .single();

          if (!existing) {
            const { error } = await supabase
              .from("roles")
              .insert({
                name: role.name,
                description: role.description,
                permissions: role.permissions,
                is_system: false,
                is_super_admin: false,
                created_by: operatorId,
              });

            if (error) throw error;
            importResults.imported.roles++;
          } else {
            importResults.warnings.push(`角色 "${role.name}" 已存在，跳过`);
          }
        } catch (error: any) {
          importResults.errors.push(`导入角色 "${role.name}" 失败: ${error.message}`);
        }
      }
    }

    // 2. 导入用户（如果选择）
    if (options.importUsers && config.users) {
      for (const userData of config.users) {
        try {
          // 检查用户是否已存在
          const { data: existing } = await supabase
            .from("users")
            .select("id")
            .eq("username", userData.username)
            .single();

          if (!existing) {
            // 为新用户生成默认密码
            const defaultPassword = `${userData.username}123`;
            const passwordHash = await bcrypt.hash(defaultPassword, 10);

            const { error } = await supabase
              .from("users")
              .insert({
                username: userData.username,
                display_name: userData.display_name,
                password_hash: passwordHash,
                role_id: userData.role_id,
                is_active: userData.is_active ?? true,
                created_by: operatorId,
              });

            if (error) throw error;
            importResults.imported.users++;
            importResults.warnings.push(`用户 "${userData.username}" 已创建，默认密码: ${defaultPassword}`);
          } else {
            importResults.warnings.push(`用户 "${userData.username}" 已存在，跳过`);
          }
        } catch (error: any) {
          importResults.errors.push(`导入用户 "${userData.username}" 失败: ${error.message}`);
        }
      }
    }

    // 3. 导入知识库（如果选择）
    if (options.importKnowledgeBases && config.knowledgeBases) {
      for (const kb of config.knowledgeBases) {
        try {
          // 检查知识库是否已存在
          const { data: existing } = await supabase
            .from("knowledge_bases")
            .select("id")
            .eq("name", kb.name)
            .single();

          if (!existing) {
            const { error } = await supabase
              .from("knowledge_bases")
              .insert({
                name: kb.name,
                description: kb.description,
                user_id: operatorId,
                document_count: 0,
                settings: kb.settings || {},
              });

            if (error) throw error;
            importResults.imported.knowledgeBases++;
          } else {
            importResults.warnings.push(`知识库 "${kb.name}" 已存在，跳过`);
          }
        } catch (error: any) {
          importResults.errors.push(`导入知识库 "${kb.name}" 失败: ${error.message}`);
        }
      }
    }

    // 4. 导入知识库权限（如果选择）
    if (options.importKbPermissions && config.kbPermissions) {
      for (const perm of config.kbPermissions) {
        try {
          // 检查权限是否已存在
          const { data: existing } = await supabase
            .from("chat_kb_permissions")
            .select("id")
            .eq("role_id", perm.role_id)
            .eq("kb_id", perm.kb_id)
            .single();

          if (!existing) {
            const { error } = await supabase
              .from("chat_kb_permissions")
              .insert({
                role_id: perm.role_id,
                kb_id: perm.kb_id,
                can_read: perm.can_read,
                can_ask: perm.can_ask,
              });

            if (error) throw error;
            importResults.imported.kbPermissions++;
          } else {
            importResults.warnings.push(`权限配置已存在，跳过`);
          }
        } catch (error: any) {
          importResults.errors.push(`导入权限失败: ${error.message}`);
        }
      }
    }

    // 5. 导入系统设置（如果选择）
    if (options.importSystemSettings && config.systemSettings) {
      for (const setting of config.systemSettings) {
        try {
          const { error } = await supabase
            .from("system_settings")
            .upsert({
              key: setting.key,
              value: setting.value,
              description: setting.description,
              updated_by: operatorId,
              updated_at: new Date().toISOString(),
            });

          if (error) throw error;
          importResults.imported.systemSettings++;
        } catch (error: any) {
          importResults.errors.push(`导入设置 "${setting.key}" 失败: ${error.message}`);
        }
      }
    }

    // 判断是否有错误
    if (importResults.errors.length > 0) {
      importResults.success = false;
    }

    return NextResponse.json(importResults);

  } catch (error) {
    console.error("Error importing config:", error);
    return NextResponse.json({ error: "Failed to import configuration" }, { status: 500 });
  }
}