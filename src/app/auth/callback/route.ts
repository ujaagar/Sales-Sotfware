import { NextResponse } from "next/server";
import { safePath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

// Supabase email links (password reset) land here with ?code=…; we swap it for a session.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const safeNext = safePath(url.searchParams.get("next"), "/reset-password");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/forgot-password?link=expired", url.origin));
}
