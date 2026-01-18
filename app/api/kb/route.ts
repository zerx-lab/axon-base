import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const canList = await hasPermission(supabase, operatorId, Permissions.KB_LIST);
    if (!canList) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from("knowledge_bases")
      .select("*", { count: "exact" })
      .eq("user_id", operatorId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: kbs, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      knowledgeBases: kbs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("List knowledge bases error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { operatorId, name, description } = body;

    if (!operatorId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const canCreate = await hasPermission(supabase, operatorId, Permissions.KB_CREATE);
    if (!canCreate) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { data: newKb, error } = await supabase
      .from("knowledge_bases")
      .insert({
        user_id: operatorId,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, knowledgeBase: newKb }, { status: 201 });
  } catch (error) {
    console.error("Create knowledge base error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { operatorId, kbId, name, description } = body;

    if (!operatorId || !kbId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const canUpdate = await hasPermission(supabase, operatorId, Permissions.KB_UPDATE);
    if (!canUpdate) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { data: existingKb } = await supabase
      .from("knowledge_bases")
      .select("*")
      .eq("id", kbId)
      .single();

    if (!existingKb || existingKb.user_id !== operatorId) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const { data: updatedKb, error } = await supabase
      .from("knowledge_bases")
      .update(updateData)
      .eq("id", kbId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, knowledgeBase: updatedKb });
  } catch (error) {
    console.error("Update knowledge base error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");
    const kbId = searchParams.get("kbId");

    if (!operatorId || !kbId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const canDelete = await hasPermission(supabase, operatorId, Permissions.KB_DELETE);
    if (!canDelete) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { data: existingKb } = await supabase
      .from("knowledge_bases")
      .select("*")
      .eq("id", kbId)
      .single();

    if (!existingKb || existingKb.user_id !== operatorId) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const { error } = await supabase.from("knowledge_bases").delete().eq("id", kbId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete knowledge base error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
