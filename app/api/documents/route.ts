import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, knowledgeBases, users, roles } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

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

function computeHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function countWords(content: string): number {
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = content.replace(/[\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
  return chineseChars + englishWords;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");
    const kbId = searchParams.get("kbId");
    const docId = searchParams.get("docId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const hasListPermission = await checkPermission(operatorId, "docs:list");
    if (!hasListPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    if (docId) {
      const [doc] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, docId), eq(documents.userId, operatorId)));

      if (!doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      return NextResponse.json({ document: doc });
    }

    if (!kbId) {
      return NextResponse.json({ error: "kbId is required" }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    const [docs, countResult] = await Promise.all([
      db
        .select({
          id: documents.id,
          kbId: documents.kbId,
          title: documents.title,
          fileType: documents.fileType,
          wordCount: documents.wordCount,
          charCount: documents.charCount,
          status: documents.status,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .where(and(eq(documents.kbId, kbId), eq(documents.userId, operatorId)))
        .orderBy(desc(documents.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(and(eq(documents.kbId, kbId), eq(documents.userId, operatorId))),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      documents: docs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, kbId, title, content } = body;

    if (!operatorId || !kbId || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hasCreatePermission = await checkPermission(operatorId, "docs:create");
    if (!hasCreatePermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const [kb] = await db
      .select()
      .from(knowledgeBases)
      .where(and(eq(knowledgeBases.id, kbId), eq(knowledgeBases.userId, operatorId)));

    if (!kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const contentHash = computeHash(content);
    const wordCount = countWords(content);
    const charCount = content.length;

    const [newDoc] = await db
      .insert(documents)
      .values({
        kbId,
        userId: operatorId,
        title,
        content,
        contentHash,
        wordCount,
        charCount,
        fileType: "markdown",
      })
      .returning();

    await db
      .update(knowledgeBases)
      .set({ documentCount: sql`${knowledgeBases.documentCount} + 1`, updatedAt: new Date() })
      .where(eq(knowledgeBases.id, kbId));

    return NextResponse.json({ success: true, document: newDoc }, { status: 201 });
  } catch (error) {
    console.error("Create document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, docId, title, content, status } = body;

    if (!operatorId || !docId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hasUpdatePermission = await checkPermission(operatorId, "docs:update");
    if (!hasUpdatePermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const [existingDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, docId));

    if (!existingDoc || existingDoc.userId !== operatorId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;

    if (content !== undefined) {
      updateData.content = content;
      updateData.contentHash = computeHash(content);
      updateData.wordCount = countWords(content);
      updateData.charCount = content.length;
    }

    const [updatedDoc] = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, docId))
      .returning();

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (error) {
    console.error("Update document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");
    const docId = searchParams.get("docId");

    if (!operatorId || !docId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hasDeletePermission = await checkPermission(operatorId, "docs:delete");
    if (!hasDeletePermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const [existingDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, docId));

    if (!existingDoc || existingDoc.userId !== operatorId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await db.delete(documents).where(eq(documents.id, docId));

    await db
      .update(knowledgeBases)
      .set({ documentCount: sql`${knowledgeBases.documentCount} - 1`, updatedAt: new Date() })
      .where(eq(knowledgeBases.id, existingDoc.kbId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
