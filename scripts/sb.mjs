// Runs the Supabase CLI with settings from .env.local (so secrets never go on the command line).
// Usage: node scripts/sb.mjs link | push | types | query "<sql>"
import { spawnSync } from "node:child_process";
import fs from "node:fs";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.error("Missing .env.local. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

const ref = process.env.SUPABASE_PROJECT_REF;
for (const k of ["SUPABASE_PROJECT_REF", "SUPABASE_DB_PASSWORD", "SUPABASE_ACCESS_TOKEN"]) {
  if (!process.env[k]) {
    console.error(`${k} is empty in .env.local.`);
    process.exit(1);
  }
}

const run = (args, opts = {}) =>
  spawnSync("pnpm", ["exec", "supabase", ...args], { stdio: opts.capture ? ["inherit", "pipe", "inherit"] : "inherit", shell: true, env: process.env, encoding: "utf8" });

const cmd = process.argv[2];
let res;
if (cmd === "link") {
  res = run(["link", "--project-ref", ref]);
} else if (cmd === "push") {
  res = run(["db", "push", "--linked", "--include-all"]);
} else if (cmd === "types") {
  res = run(["gen", "types", "typescript", "--project-id", ref, "--schema", "public"], { capture: true });
  if (res.status === 0) {
    fs.writeFileSync("src/lib/supabase/database.types.ts", res.stdout);
    console.log("Wrote src/lib/supabase/database.types.ts");
  }
} else {
  console.error("Usage: node scripts/sb.mjs link | push | types");
  process.exit(1);
}
process.exit(res.status ?? 1);
