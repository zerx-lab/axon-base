import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/access";
import { Permissions } from "@/lib/supabase/permissions";
import type { ChatSessionStatus, Json } from "@/lib/supabase/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createAdminClient();
    const { id: sessionId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");
    const includeMessages = searchParams.get("includeMessages") === "true";

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const canAccess = await hasPermission(supabase, operatorId, Permissions.CHAT_ACCESS);
    if (!canAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { data: session, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", operatorId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let messages = null;
    if (includeMessages) {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      messages = msgs;
    }

    return NextResponse.json({
      session,
      messages,
    });
  } catch (error) {
    console.error("Get chat session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createAdminClient();
    const { id: sessionId } = await params;
    const body = await request.json();
    const { operatorId, title, kbIds, settings, status } = body as {
      operatorId: string;
      title?: string;
      kbIds?: string[];
      settings?: Record<string, unknown>;
      status?: ChatSessionStatus;
    };

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const canAccess = await hasPermission(supabase, operatorId, Permissions.CHAT_ACCESS);
    if (!canAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { data: existingSession } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", operatorId)
      .single();

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (kbIds !== undefined) updateData.kb_ids = kbIds;
    if (settings !== undefined) updateData.settings = settings as Json;
    if (status !== undefined) updateData.status = status;

    const { data: updatedSession, error } = await supabase
      .from("chat_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error("Update chat session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createAdminClient();
    const { id: sessionId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const operatorId = searchParams.get("operatorId");

    if (!operatorId) {
      return NextResponse.json({ error: "Operator ID is required" }, { status: 400 });
    }

    const canDelete = await hasPermission(supabase, operatorId, Permissions.CHAT_DELETE);
    if (!canDelete) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { data: existingSession } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", operatorId)
      .single();

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete chat session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
