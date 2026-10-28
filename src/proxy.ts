import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before every page: refreshes the login session and sends people to the right portal.
// Pages and the database (RLS) check permissions again; this is the first gate only.

const PUBLIC = ["/", "/login", "/ceo/login", "/apply", "/set-password", "/forgot-password", "/reset-password", "/sales-agent-policy", "/auth/callback"];

export async function proxy(request: NextRequest) {
  const preview =
    process.env.APP_PREVIEW === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (preview) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const role = (claims?.app_metadata as { role?: string } | undefined)?.role;
  const path = request.nextUrl.pathname;
  const isCeoArea = path === "/ceo" || path.startsWith("/ceo/");
  const isPublic = PUBLIC.includes(path);

  const redirect = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  // API routes check login and role themselves and answer 401/403; never bounce them to a page.
  if (path.startsWith("/api/")) return response;

  if (!claims) {
    if (isPublic) return response;
    return redirect(isCeoArea ? "/ceo/login" : "/login");
  }

  // Signed in: keep each role in its own portal.
  // One browser holds one login. If the other portal's page is opened, explain that instead of
  // silently switching dashboards (e.g. CEO and agent logged in from two tabs of the same browser).
  if (role === "agent" && isCeoArea && path !== "/ceo/login") return redirect("/ceo/login?as=agent");
  if (role === "ceo" && !isCeoArea && !isPublic) return redirect("/login?as=ceo");
  if (path === "/login" && role === "agent") return redirect("/dashboard");
  if (path === "/ceo/login" && role === "ceo") return redirect("/ceo");
  if (path === "/" && role) return redirect(role === "ceo" ? "/ceo" : "/dashboard");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|brand/|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
