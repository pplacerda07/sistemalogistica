// Supabase Edge Function: create-user
// Deploy: supabase functions deploy create-user
//
// Body: { email: string, senha: string, nome: string, role: 'admin' | 'vendedor' }
// Requer header Authorization: Bearer <JWT do admin>

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Verify caller is an admin
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user: caller }, error: callerError } =
    await callerClient.auth.getUser()

  if (callerError || !caller) {
    return new Response(
      JSON.stringify({ error: 'Invalid token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Only admins can create users' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Parse and validate body
  let body: { email?: string; senha?: string; nome?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { email, senha, nome, role } = body
  if (!email || !senha || !nome || !role) {
    return new Response(
      JSON.stringify({ error: 'Missing fields: email, senha, nome, role' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (role !== 'admin' && role !== 'vendedor') {
    return new Response(
      JSON.stringify({ error: 'role must be admin or vendedor' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Create the user via admin API
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, role },
    })

  if (createError || !created.user) {
    return new Response(
      JSON.stringify({ error: createError?.message ?? 'Failed to create user' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // The handle_new_user trigger should have inserted the profile already,
  // but we ensure the role/nome match the requested values (trigger reads from user_metadata).
  await adminClient
    .from('profiles')
    .update({ nome, role })
    .eq('id', created.user.id)

  return new Response(
    JSON.stringify({ user: { id: created.user.id, email: created.user.email, nome, role } }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
