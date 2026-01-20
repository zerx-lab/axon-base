import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

// POST /api/test/create-test-user - 创建测试用户
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    // 获取 Viewer 角色（最低权限）
    const { data: userRole, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "Viewer")
      .single();

    if (roleError || !userRole) {
      return NextResponse.json({ error: "User role not found" }, { status: 404 });
    }

    // 创建测试用户
    const password = "test123";
    const passwordHash = await bcrypt.hash(password, 12);

    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        username: "testuser",
        password_hash: passwordHash,
        role_id: userRole.id,
        display_name: "Test User",
        is_active: true,
      })
      .select()
      .single();

    if (userError) {
      if (userError.code === "23505") {
        return NextResponse.json({ error: "User already exists" }, { status: 409 });
      }
      console.error("Error creating user:", userError);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // 获取一个示例知识库
    const { data: kb } = await supabase
      .from("knowledge_bases")
      .select("id, name")
      .limit(1)
      .single();

    // 暂时跳过权限分配，后续通过管理界面处理

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        display_name: newUser.display_name,
        password: password, // 仅用于测试
      },
      kb_permission: kb ? {
        kb_id: kb.id,
        kb_name: kb.name,
      } : null,
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}