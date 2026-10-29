import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project-id.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your_supabase_anon_public_key";

/**
 * Supabase Client สำหรับฝั่ง Browser (Client Component)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

