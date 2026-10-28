import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Opening a notification marks it read, then goes to where it points.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("link").eq("id", id).maybeSingle();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  const link = data?.link && data.link.startsWith("/") ? data.link : "/";
  return NextResponse.redirect(new URL(link, req.url));
}
