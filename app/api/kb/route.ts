import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeBases, users, roles } from "@/lib/db/schema";
import { eq, desc, sql, ilike, or, and } from "drizzle-orm";

async function checkPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return false;

    const [role] = await db.select().from(roles).where(eq(roles.id, user.roleId));
    if (!role) return false;

    if (role.isSuperAdmin) return true;
    return role.permissions?.includes(permission) || role.permissions?.includes("*") || false;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    if (!operatorId) {
      return NextResponse.json(
        { error: "Operator ID is required" },
        { status: 400 }
      );
    }

    const hasListPermission = await checkPermission(operatorId, "kb:list");
    if (!hasListPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const offset = (page - 1) * limit;

    const baseCondition = eq(knowledgeBases.userId, operatorId);
    const whereCondition = search
      ? and(
          baseCondition,
          or(
            ilike(knowledgeBases.name, `%${search}%`),
            ilike(knowledgeBases.description, `%${search}%`)
          )
        )
      : baseCondition;

    const [kbs, countResult] = await Promise.all([
      db
        .select()
        .from(knowledgeBases)
        .where(whereCondition)
        .orderBy(desc(knowledgeBases.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(knowledgeBases)
        .where(whereCondition),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      knowledgeBases: kbs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("List knowledge bases error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, name, description } = body;

    if (!operatorId || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const hasCreatePermission = await checkPermission(operatorId, "kb:create");
    if (!hasCreatePermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const [newKb] = await db
      .insert(knowledgeBases)
      .values({
        userId: operatorId,
        name,
        description: description || null,
      })
      .returning();

    return NextResponse.json({ success: true, knowledgeBase: newKb }, { status: 201 });
  } catch (error) {
    console.error("Create knowledge base error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, kbId, name, description } = body;

    if (!operatorId || !kbId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const hasUpdatePermission = await checkPermission(operatorId, "kb:update");
    if (!hasUpdatePermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const [existingKb] = await db
      .select()
      .from(knowledgeBases)
      .where(eq(knowledgeBases.id, kbId));

    if (!existingKb || existingKb.userId !== operatorId) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const [updatedKb] = await db
      .update(knowledgeBases)
      .set(updateData)
      .where(eq(knowledgeBases.id, kbId))
      .returning();

    return NextResponse.json({ success: true, knowledgeBase: updatedKb });
  } catch (error) {
    console.error("Update knowledge base error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");
    const kbId = searchParams.get("kbId");

    if (!operatorId || !kbId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const hasDeletePermission = await checkPermission(operatorId, "kb:delete");
    if (!hasDeletePermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const [existingKb] = await db
      .select()
      .from(knowledgeBases)
      .where(eq(knowledgeBases.id, kbId));

    if (!existingKb || existingKb.userId !== operatorId) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    await db.delete(knowledgeBases).where(eq(knowledgeBases.id, kbId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete knowledge base error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
