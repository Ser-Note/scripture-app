const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Access-Control-Allow-Credentials': 'true',
};

function withCors(response: Response, extraHeaders: Record<string, string> | null = null) {
  const headers = new Headers(response.headers);
  const base = extraHeaders ? { ...corsHeaders, ...extraHeaders } : corsHeaders;
  Object.entries(base).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL env var');
}
if (!SERVICE_ROLE) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
}

import { createClient } from 'npm:@supabase/supabase-js@2.29.0';

Deno.serve(async (req: Request) => {
  // Build per-request CORS headers (echo Origin when present)
  const origin = req.headers.get('origin') || '*';
  const requestCors = { ...corsHeaders, 'Access-Control-Allow-Origin': origin };

  // CORS preflight
  if (req.method === 'OPTIONS') {
    // Return 204 No Content with CORS headers for preflight
    return withCors(new Response(null, { status: 204 }), requestCors);
  }

  if (req.method !== 'POST') {
    return withCors(new Response(JSON.stringify({ error: 'Only POST allowed' }), { status: 405 }), requestCors);
  }

  // Ensure service key present
  if (!SERVICE_ROLE || !SUPABASE_URL) {
    return withCors(new Response(
      JSON.stringify({ error: 'Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL' }),
      { status: 500 }
    ), requestCors);
  }

  // parse body safely
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return withCors(new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 }), requestCors);
  }

  const userId = body?.userId ?? body?.user_id ?? body?.id;
  if (!userId) {
    return withCors(new Response(JSON.stringify({ error: 'userId is required in request body' }), { status: 400 }), requestCors);
  }

    // create admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // SECURITY: require caller to send their access token and verify they're an admin
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
      return withCors(new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 }), requestCors);
    }

    // Verify token and fetch user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    const authUser = authData?.user ?? authData?.user ?? null;
    if (authErr || !authUser) {
      console.error('Token verification failed', authErr);
      return withCors(new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401 }), requestCors);
    }

    // Check that the caller is an admin in the profiles table
    try {
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileErr) {
        console.error('Error fetching profile for auth user', profileErr);
        return withCors(new Response(JSON.stringify({ error: 'Failed to verify caller role' }), { status: 500 }), requestCors);
      }

      if (!profile || profile.role !== 'admin') {
        return withCors(new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), { status: 403 }), requestCors);
      }
    } catch (err) {
      console.error('Unexpected error verifying admin role', err);
      return withCors(new Response(JSON.stringify({ error: 'Failed to verify permissions' }), { status: 500 }));
    }

    try {
      // Attempt to clean up related rows in known tables to avoid FK/constraint failures.
      // This helps if auth.deleteUser fails due to dependent rows in the DB.
      const cleanupTables = async () => {
        try {
          // Delete likes, bookmarks, notifications
          await supabaseAdmin.from('likes').delete().eq('user_id', userId);
          await supabaseAdmin.from('bookmarks').delete().eq('user_id', userId);
          await supabaseAdmin.from('notifications').delete().eq('user_id', userId);

          // Delete comments and community posts
          await supabaseAdmin.from('comments').delete().eq('user_id', userId);
          await supabaseAdmin.from('community').delete().eq('user_id', userId);

          // Delete follows where user is follower or followed
          await supabaseAdmin.from('follows').delete().eq('follower_id', userId);
          await supabaseAdmin.from('follows').delete().eq('followed_id', userId);

          // Delete profile row (if present)
          await supabaseAdmin.from('profiles').delete().eq('id', userId);
        } catch (cleanupErr) {
          console.warn('Cleanup step encountered an error', cleanupErr);
          // continue; we'll still try admin.deleteUser
        }
      };

      await cleanupTables();

      // Use admin API to delete user
      const res = await supabaseAdmin.auth.admin.deleteUser(userId);

      // Log full result for debugging (without exposing service key)
      console.info('deleteUser result', JSON.stringify({ status: res?.error ? 'error' : 'ok', error: res?.error ?? null }));

      if (res?.error) {
        // Include error message but avoid leaking sensitive data
        return withCors(new Response(JSON.stringify({ error: res.error.message ?? 'Database error deleting user' }), { status: 400 }));
      }

      return withCors(new Response(JSON.stringify({ success: true }), { status: 200 }));
    } catch (err) {
      console.error('Unexpected error deleting user', err);
      return withCors(new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }));
    }
});
