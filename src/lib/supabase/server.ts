import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Supabase client acting as the signed-in user (RLS applies). Use in Server Components and Actions. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are refreshed by the proxy instead.
        }
      },
    },
  });
}

/**
 * Service-role client that bypasses RLS. Server only, and only for things the user's own
 * session can't do: creating auth accounts, invites, the public application form, cron jobs.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in .env.local.");
  return createSupabaseClient<Database>(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
