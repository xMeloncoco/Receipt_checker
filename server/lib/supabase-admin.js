import { createClient } from '@supabase/supabase-js';

// Lazy — client is created on first use, not at module load.
// This prevents a startup crash when env vars aren't set yet.
let _client = null;

function getClient() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check your .env file'
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Proxy so callers can still write `supabase.from(...)` and `supabase.storage`
const supabaseAdmin = new Proxy(
  {},
  {
    get(_, prop) {
      const client = getClient();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

export default supabaseAdmin;
