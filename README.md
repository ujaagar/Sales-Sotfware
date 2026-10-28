# Ujaagar Sales

Sales and commission portal for Ujaagar Digital: agents record leads, deals and client payments; the CEO approves deals, verifies payments, locks months and pays commission. Works on phones as an installable app.

The rules for this project are in [CLAUDE.md](CLAUDE.md).

## First-time setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free plan is fine). Use it for development first; make a separate project before going live.
2. **Fill in `.env.local`.** Every value has a comment in [.env.example](.env.example) saying where to find it. Never paste these anywhere else.
3. **Install and set up the database:**

   ```bash
   pnpm install
   pnpm db:link        # connects this folder to your Supabase project
   pnpm db:push        # creates tables, security rules and default rates
   pnpm db:types       # generates TypeScript types from the database
   pnpm seed:ceo       # creates the one CEO account from CEO_NAME / CEO_EMAIL / CEO_PASSWORD
   pnpm seed:demo      # optional, development only: 3 demo agents with sample data
   ```

4. **Run it:** `pnpm dev`, then open http://localhost:3000.
   - CEO login: http://localhost:3000/ceo/login
   - Agent login: http://localhost:3000/login
   - Agent application form: http://localhost:3000/apply

## The CEO account

There is exactly one CEO account. It is created only by `pnpm seed:ceo`, and the database refuses a second one. If you lose the CEO password, reset it from the Supabase dashboard (Authentication → Users).

## How agents join

Agents apply at `/apply`. The CEO approves them under **Agent Applications**, then sends them the "set your password" link (emailed automatically if Resend is set up, or copied and sent on WhatsApp). Links expire after 7 days and can be resent. The CEO never sees agent passwords.

## Commission rules (short version)

- Commission is earned on each **verified client payment**.
- The rate is chosen by the deal's size and **locked when the CEO approves the deal**.
- New sale: up to Rs 50,000 → 10% · up to Rs 100,000 → 12% · up to Rs 200,000 → 13.5% · up to Rs 300,000 → 15% · above → 18%.
- Monthly packages: first month at the new-sale rate, every later month 1.5% (fee up to Rs 150,000) or 2% (above).
- Full details: [CLAUDE.md](CLAUDE.md#commission-calculation-per-payment-model-rates-locked-on-the-deal).

## Tests

```bash
pnpm test:unit   # commission calculation
pnpm test:db     # database rules and security (runs the real migrations in an in-memory Postgres)
pnpm test:e2e    # browser tests against the running app
```

## Brand assets

The approved artwork is in `brand_assets/`. `pnpm brand:assets` regenerates the transparent logos (`public/brand/`) and app icons (`public/icons/`) from it.
