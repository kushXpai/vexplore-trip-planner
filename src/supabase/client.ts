// src/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url: RequestInfo | URL, options?: RequestInit) => {
      const proxied = url.toString().replace(
        'https://mozlgewmosobrxjveqqj.supabase.co',
        window.location.origin + '/supabase'
      );
      return fetch(proxied, options);
    }
  }
});