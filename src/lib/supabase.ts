import { createClient } from "@supabase/supabase-js";

// Used for frontend or normal authenticated requests
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "http://mock-url.com",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "mock-anon-key"
);
