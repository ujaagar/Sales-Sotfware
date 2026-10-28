// Loads the real migrations into an in-memory Postgres (PGlite) with small stand-ins for
// Supabase's auth and storage schemas, so triggers and RLS can be tested without Docker.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$
  select current_setting('request.jwt.claim.role', true) $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
grant all on storage.objects to authenticated;
`;

export async function freshDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = path.resolve(import.meta.dirname, "../../supabase/migrations");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(fs.readFileSync(path.join(dir, file), "utf8"));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }
  return db;
}

/** Creates an auth user + profile as the privileged setup context. */
export async function addUser(db: PGlite, role: "ceo" | "agent", name: string, active = true): Promise<string> {
  const id = crypto.randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${name.toLowerCase()}@test.pk`]);
  await db.query("insert into public.profiles (id, full_name, email, role, is_active) values ($1, $2, $3, $4, $5)", [
    id,
    name,
    `${name.toLowerCase()}@test.pk`,
    role,
    active,
  ]);
  return id;
}

/** Runs fn as a signed-in user (role authenticated, auth.uid() = userId), inside a transaction. */
export async function as<T>(db: PGlite, userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await tx.query(`select set_config('request.jwt.claim.role', 'authenticated', true)`);
    await tx.exec("set local role authenticated");
    return fn(tx);
  });
}

type Tx = Parameters<Parameters<PGlite["transaction"]>[0]>[0];
