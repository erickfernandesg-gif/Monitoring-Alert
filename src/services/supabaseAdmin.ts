import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// Used for backend operations (e.g. Cron Job) to bypass RLS
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || "http://mock-url.com",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "mock-service-key"
);
