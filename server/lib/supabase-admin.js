import { createClient } from '@supabase/supabase-js';

// Uses the service_role key — bypasses RLS for trusted server-side operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabaseAdmin;
