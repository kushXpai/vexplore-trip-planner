// api/delete-user.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Basic UUID v4 format check
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // Verify the requesting user is authenticated and is superadmin
    const supabaseClient = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: userData, error: roleError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData) {
      return res.status(403).json({ error: 'Unable to verify user role' });
    }

    if (userData.role !== 'superadmin') {
      return res.status(403).json({ error: 'Insufficient permissions. Super Admin access required.' });
    }

    // ── Validate userId ───────────────────────────────────────────────────────
    const { userId } = req.body;

    console.log('[delete-user] received userId:', userId, '| type:', typeof userId);

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in request body' });
    }

    if (typeof userId !== 'string') {
      return res.status(400).json({ error: `userId must be a string, got: ${typeof userId}` });
    }

    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: `userId is not a valid UUID: "${userId}"` });
    }

    // Prevent deleting yourself
    if (userId === user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // ── Admin client (service role) ───────────────────────────────────────────
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Delete from public.users first (removes FK dependency)
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) {
      console.error('[delete-user] DB delete error:', dbError);
      throw new Error(`Failed to delete user from database: ${dbError.message}`);
    }

    console.log('[delete-user] DB row deleted, now deleting from auth...');

    // 2. Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('[delete-user] Auth delete error:', authError);
      throw new Error(`User removed from database but auth deletion failed: ${authError.message}`);
    }

    console.log('[delete-user] Successfully deleted userId:', userId);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (error: any) {
    console.error('[delete-user] Unhandled error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to delete user',
    });
  }
}