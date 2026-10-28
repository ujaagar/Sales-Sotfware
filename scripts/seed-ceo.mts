// Creates the one and only CEO account. Run once: pnpm seed:ceo
// Reads CEO_NAME, CEO_EMAIL, CEO_PASSWORD from .env.local. Refuses if a CEO already exists.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const name = process.env.CEO_NAME?.trim();
const email = process.env.CEO_EMAIL?.trim().toLowerCase();
const password = process.env.CEO_PASSWORD ?? "";

function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (!url || !serviceKey) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
if (!name || name.length < 2) fail("CEO_NAME is empty in .env.local.");
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("CEO_EMAIL is missing or not a valid email.");
if (password.length < 10) fail("CEO_PASSWORD must be at least 10 characters.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const existing = await admin.from("profiles").select("id, email").eq("role", "ceo").maybeSingle();
if (existing.error) fail(`Could not read profiles: ${existing.error.message}. Did you run pnpm db:push?`);
if (existing.data) fail(`A CEO account already exists (${existing.data.email}). There can only be one.`);

const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: "ceo" },
  user_metadata: { full_name: name },
});
if (created.error || !created.data.user) fail(`Could not create the login: ${created.error?.message}`);

const profile = await admin.from("profiles").insert({ id: created.data.user.id, full_name: name, email, role: "ceo" });
if (profile.error) {
  await admin.auth.admin.deleteUser(created.data.user.id);
  fail(`Could not create the CEO profile: ${profile.error.message}`);
}

console.log(`✔ CEO account created for ${email}. Log in at /ceo/login.`);
