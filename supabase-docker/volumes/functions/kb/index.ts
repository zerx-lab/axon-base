import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const kbId = pathParts[1]

    switch (req.method) {
      case 'GET':
        return kbId ? await getKnowledgeBase(supabaseClient, kbId) : await listKnowledgeBases(supabaseClient)
      case 'POST':
        return await createKnowledgeBase(supabaseClient, user.id, await req.json())
      case 'PUT':
        if (!kbId) return errorResponse('Knowledge base ID required', 400)
        return await updateKnowledgeBase(supabaseClient, kbId, await req.json())
      case 'DELETE':
        if (!kbId) return errorResponse('Knowledge base ID required', 400)
        return await deleteKnowledgeBase(supabaseClient, kbId)
      default:
        return errorResponse('Method not allowed', 405)
    }
  } catch (error) {
    return errorResponse(error.message, 500)
  }
})

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function successResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function listKnowledgeBases(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return errorResponse(error.message, 400)
  return successResponse(data)
}

async function getKnowledgeBase(supabase: ReturnType<typeof createClient>, id: string) {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*, documents(id, title, file_type, word_count, status, created_at)')
    .eq('id', id)
    .single()

  if (error) return errorResponse(error.message, 404)
  return successResponse(data)
}

async function createKnowledgeBase(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: { name: string; description?: string }
) {
  if (!body.name) return errorResponse('Name is required', 400)

  const { data, error } = await supabase
    .from('knowledge_bases')
    .insert({
      user_id: userId,
      name: body.name,
      description: body.description || null,
    })
    .select()
    .single()

  if (error) return errorResponse(error.message, 400)
  return successResponse(data, 201)
}

async function updateKnowledgeBase(
  supabase: ReturnType<typeof createClient>,
  id: string,
  body: { name?: string; description?: string }
) {
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description

  if (Object.keys(updates).length === 0) {
    return errorResponse('No fields to update', 400)
  }

  const { data, error } = await supabase
    .from('knowledge_bases')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return errorResponse(error.message, 400)
  return successResponse(data)
}

async function deleteKnowledgeBase(supabase: ReturnType<typeof createClient>, id: string) {
  const { error } = await supabase
    .from('knowledge_bases')
    .delete()
    .eq('id', id)

  if (error) return errorResponse(error.message, 400)
  return successResponse({ success: true })
}
