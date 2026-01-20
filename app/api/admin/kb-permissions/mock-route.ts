// 临时模拟 API，等类型生成后替换
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/kb-permissions - 获取知识库权限列表（模拟）
export async function GET(request: NextRequest) {
  // 返回模拟数据
  return NextResponse.json({
    permissions: [
      {
        id: "1",
        user_id: "bf1a15dd-9a88-4157-902c-e74e97bda9b1",
        kb_id: "kb-1",
        can_read: true,
        can_ask: true,
        user: {
          id: "bf1a15dd-9a88-4157-902c-e74e97bda9b1",
          username: "testuser",
          display_name: "Test User",
          role: { id: "role-1", name: "Viewer" }
        },
        knowledge_base: {
          id: "kb-1",
          name: "Sample Knowledge Base",
          description: "A test knowledge base"
        }
      }
    ]
  });
}

// POST - 创建权限（模拟）
export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({
    permission: {
      id: Date.now().toString(),
      ...body
    }
  }, { status: 201 });
}

// PUT - 更新权限（模拟）
export async function PUT(request: NextRequest) {
  return NextResponse.json({ success: true });
}

// DELETE - 删除权限（模拟）
export async function DELETE(request: NextRequest) {
  return NextResponse.json({ success: true });
}