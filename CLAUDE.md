# CLAUDE.md: Ujaagar Sales (Sales Agent and Commission Portal)

## What This Project Is
An internal sales and commission portal for **Ujaagar Digital**, a digital marketing agency in Karachi, Pakistan.
Ujaagar Digital works with commission-based sales agents. Agents bring in clients for agency services (websites, Meta ads, video editing, SEO and similar). Agents record their leads and deals here, the CEO approves deals and verifies client payments, and the system calculates each agent's commission **per verified payment** using the rates locked on the deal. The CEO records commission payouts, and agents can see exactly what they earned, what was paid and what is pending.

- **Owner:** exactly one CEO account (the agency owner). There is one company, not multiple tenants.
- **Users:** the CEO and Sales Agents. No client logins. No other admin or manager roles.
- **Platform:** Web app that also works as an installable PWA on phones. No separate native app.
- **UI language:** English only, LTR.
- **Currency:** PKR only. **Timezone:** Asia/Karachi (UTC+05:00) for all dates, month boundaries and reports.

## Always Do First
- Invoke the `frontend-design` skill before writing frontend code if it is installed. If it isn't, follow the brand sheets in `brand_assets/` directly.
- Read this whole file before starting work. If a request conflicts with a rule here, ask before breaking the rule.
- Check `brand_assets/` before designing anything (see Brand and Design).

## Tech Stack (do not substitute)
- **Framework:** Next.js (App Router) with TypeScript in strict mode. In Next.js 16, middleware is called `proxy` (`src/proxy.ts`).
- **Backend:** hosted Supabase (Postgres, Auth, Storage, Row Level Security, database functions where needed). No local Docker.
- **Styling:** Tailwind CSS with design tokens defined as CSS variables. shadcn/ui components are allowed as a base but must be restyled to the brand.
- **Forms and validation:** React Hook Form + Zod. The same Zod schema validates on the client and in server actions.
- **Data fetching:** Server Components and Server Actions by default. Use client-side fetching only for interactive pieces that need it.
- **Charts:** Recharts.
- **Email notifications:** Resend (or the provider configured in env). Never hardcode keys. When the key is missing, skip email and keep in-app notifications working.
- **CAPTCHA:** Cloudflare Turnstile on the public agent application form.
- **Exports:** CSV and XLSX (SheetJS), PDF for statements.
- **PWA:** web app manifest, service worker (`public/sw.js`, registered in production only), installable on Android and iOS, app icons from brand assets. The service worker caches only `public/offline.html` and icons, never logged-in pages or data.
- **Package manager:** pnpm. Do not mix lockfiles.

## Two Separate Systems: CEO and Agent
- Roles are `ceo` and `agent` everywhere: database, code and UI. The word "admin" is not used.
- **Exactly one CEO, ever.** A unique partial index on `profiles (role) WHERE role = 'ceo'` and a trigger that blocks changing any role to `ceo` enforce this in the database. No UI or API path can create a CEO.
- **First CEO account** is created once with `pnpm seed:ceo`, which reads `CEO_EMAIL`, `CEO_NAME` and `CEO_PASSWORD` from `.env.local` and refuses to run if a CEO already exists.
- **Two login portals:** `/ceo/login` for the CEO only, `/login` for agents only. Logging in on the wrong portal signs the user out immediately with a clear message pointing to the right portal.
- **Two separate app shells:** the CEO portal lives under `/ceo` with its own layout, sidebar, dashboard and home. The agent app has its own mobile-first layout with bottom navigation.
- **Route protection in `src/proxy.ts` and in RLS:** an agent opening any `/ceo` URL is redirected to their own dashboard; the CEO opening agent routes goes to `/ceo`; logged-out users go to the matching login page. Every server page and action re-checks the role.
- **The CEO has no agent dashboard.** If the CEO makes a sale himself, he records it in **My Sales** inside the CEO portal. The CEO's own deals earn no commission and are excluded from commission liability, but count in company totals.

## Agent Registration (apply, CEO approves, agent sets own password)
- Public **Apply as Sales Agent** page at `/apply`, linked from `/login`. Fields: full name, email, phone, WhatsApp, city, CNIC (optional, format `12345-1234567-1`), short note. No password field.
- Protected by Cloudflare Turnstile (verified on the server) and a rate limit by hashed IP. Duplicate email or phone (against pending or approved applications and existing profiles) is rejected with a clear message.
- Submissions go to `agent_applications` with status `pending` | `approved` | `rejected`. No auth user is created at this stage, so a pending or rejected applicant cannot log in.
- The CEO portal has an **Agent Applications** screen with a sidebar badge count, and the CEO is notified of each new application. The CEO approves or rejects (rejection reason optional).
- **On approve:** create the auth user (email confirmed, no password) and the `profiles` row (role `agent`, active), then issue an invite. Invites use our own `agent_invites` table (hashed token, `expires_at` 7 days, `used_at`) because Supabase links expire within 24 hours. The link `/set-password?token=…` lets the agent choose their own password; then they log in at `/login` with their email. The CEO never sees or sets agent passwords.
- The CEO screen has **Copy invite link** (to send on WhatsApp) and **Resend invite** (issues a new token and invalidates older ones). The invite is also emailed when Resend is configured.
- **On reject:** the applicant gets an email if Resend is configured. No account exists, so no login.
- The CEO can also **add an agent directly** from the Agents screen. This creates an already-approved application and runs the same approve flow.

## Sales Agent Policy (must be accepted before the portal opens)
- The policy text lives in `content/policy/<version>.en.md` and `<version>.ur.md` (the owner's documents, shown as written). `CURRENT_POLICY_VERSION` in `src/lib/policy.ts` names the version in force.
- On first login (and after every new version) an agent sees only `/welcome/policy`: the full policy in English or Urdu (RTL, Noto Sans Arabic). The accept form unlocks after scrolling to the end; the agent types their full name (must match the account) and CNIC, ticks the agreement and accepts. "I do not accept" signs them out.
- `requireAgent()` blocks every agent page and action until the current version is accepted.
- Each acceptance is stored in `policy_acceptances` (version, language, typed name, CNIC, IP, user agent, time). Rows can't be edited or deleted.
- The policy is also a page inside the agent portal (`/policy`) and public at `/sales-agent-policy` (linked from home and /apply). The CEO's Agents screen shows who has accepted.
- To publish a new version: add the two new files, bump `CURRENT_POLICY_VERSION`, and give agents 7 days' notice (policy Section 9).

## Roles and Permissions
Permissions must be enforced in the database with Supabase **Row Level Security**, not only in the UI. Hiding a button is not security.

### CEO
- Full access to everything.
- Approve or reject agent applications; add agents directly; resend invites; deactivate and edit agents.
- Approve or reject deals (with a reason on reject). Cancel monthly deals or set their end month.
- Verify or reject client payments that agents record.
- Configure commission rates and monthly targets.
- Lock commission months. Record commission payouts to agents.
- View all reports, export data, see the full activity log.
- Reassign a client or lead from one agent to another (logged).
- Record his own sales in My Sales.

### Sales Agent
- Sees **only their own** leads, clients, deals, payments and commissions. Never another agent's records, names of their clients or amounts.
- Can add and edit their own leads.
- Can convert a lead into a deal (deal starts as `pending_approval`).
- Can record client payments with proof (receipt image or screenshot). Payments start as `pending_verification`.
- Can add notes and follow-up dates on their own leads and deals.
- Can view their own commission summary, statements and payout history.
- Can view the leaderboard (see Leaderboard rules for what it shows).
- Cannot edit a deal after approval, cannot change amounts on a verified payment, cannot see or edit commission settings.

## Core Domain and Data Model
Use snake_case table and column names. Every table has `id uuid`, `created_at`, `updated_at`. Money is stored as **integer PKR (bigint)**, never floats. Display with thousands separators, for example `Rs 125,000`.

- **profiles**: id (auth user), full_name, phone, whatsapp, city, role (`ceo` | `agent`), is_active, avatar_url.
- **agent_applications**: full_name, email, phone, whatsapp, city, cnic, note, status (`pending` | `approved` | `rejected`), rejection_reason, reviewed_by, reviewed_at, profile_id (after approval), source (`form` | `ceo`).
- **agent_invites**: profile_id, token_hash, expires_at, used_at, revoked_at, created_by.
- **application_attempts**: ip_hash, created_at (rate limiting).
- **services**: name (Website, Meta Ads, Video Editing, SEO, Social Media Management, etc.), is_active. The CEO manages this list. Agents pick from it.
- **leads**: owner_agent_id, client_name, business_name, phone, whatsapp, city, source, interested_services, status (`new` | `contacted` | `interested` | `not_interested` | `converted` | `lost`), next_follow_up_at, notes.
- **clients**: owner_agent_id, name, business_name, phone, whatsapp, email (optional), city. Created when a lead converts or directly by an agent.
- **client_owner_history**: client_id, agent_id, from_date, to_date. Written whenever ownership changes.
- **deals**: client_id, agent_id, service_id, description, deal_type (`one_time` | `monthly`), total_amount_pkr (one-time), monthly_fee_pkr (monthly), start_month, end_month (optional), status (`pending_approval` | `approved` | `rejected` | `completed` | `cancelled`), rejection_reason, approved_by, approved_at, cancelled_at, next_follow_up_at, and the **rate snapshot** set at approval: new_sale_rate_percent, recurring_rate_percent, new_sale_tier_id, recurring_tier_id.
- **deal_notes**: deal_id or lead_id, author_id, body, created_at. Notes are append-only.
- **client_payments**: deal_id, amount_pkr, paid_on (date), method (`cash` | `bank_transfer` | `jazzcash` | `easypaisa` | `other`), proof_file_path, status (`pending_verification` | `verified` | `rejected`), verified_by, verified_at, rejection_reason, refund_of (for negative refund rows).
- **commission_tiers**: kind (`new_sale` | `recurring`), min_amount_pkr, max_amount_pkr (nullable for top tier), rate_percent, effective_from. The CEO edits these. Old tiers are kept, never overwritten.
- **commission_entries**: payment_id, agent_id, month, kind (`new_sale` | `recurring` | `adjustment`), base_amount_pkr, rate_percent, amount_pkr.
- **agent_targets** (optional per agent override): agent_id, month, target_amount_pkr.
- **commission_periods**: agent_id, month (first day of month), collected_amount_pkr, commission_amount_pkr, status (`open` | `locked`), locked_at.
- **commission_payouts**: agent_id, amount_pkr, paid_on, method, reference, note, recorded_by.
- **monthly_due_alerts**: deal_id, month (prevents duplicate missed-payment alerts).
- **notifications**: user_id, type, title, body, link, read_at.
- **activity_log**: actor_id, action, entity_type, entity_id, before (jsonb), after (jsonb), created_at. Append-only.

## Business Rules (the most important part, follow exactly)

### Deal lifecycle
1. Agent creates a deal for a client: `pending_approval`. A deal is either **one-time** (fixed total) or **monthly** (monthly fee, start month, optional end month).
2. The CEO approves (`approved`) or rejects with a reason (`rejected`). Rejected deals can be edited and resubmitted by the agent. **On approval the commission rates are locked onto the deal** (rate snapshot).
3. Once all payments are received and work is delivered, the CEO marks a one-time deal `completed`.
4. The CEO can `cancel` a deal, or set a monthly deal's end month. No payments are accepted after the end month or after cancellation. Cancelling does not delete verified payments; handle refunds as described below.

### Payments
- Payments can only be recorded on **approved**, non-cancelled deals, and for monthly deals only within start month to end month.
- For one-time deals, the total of verified payments can never exceed `total_amount_pkr`. Validate in both the form and the database. Monthly deals have no total cap.
- A payment counts toward commission **only after the CEO verifies it**. The commission month is the month of `paid_on` (Asia/Karachi), not the verification date.
- Proof upload is required (image or PDF, max 5 MB) and stored in a **private** Supabase Storage bucket. Access via signed URLs only.
- **Monthly due check:** if an active monthly deal has no payment recorded for the current month by the **10th**, the daily job notifies the agent and the CEO (once per deal per month), and the CEO dashboard shows it as missed.

### Commission calculation (per-payment model, rates locked on the deal)
- Commission is earned on each **verified client payment**, not on deal value.
- The slab is chosen from the **deal's size**: one-time deal → `total_amount_pkr`; monthly deal → `monthly_fee_pkr`. The whole payment gets that slab's rate (not marginal). Boundaries are inclusive.
- **New sale rates** (default): up to Rs 50,000 → 10% · up to Rs 100,000 → 12% · up to Rs 200,000 → 13.5% · up to Rs 300,000 → 15% · above Rs 300,000 → 18%. They apply to every payment of a one-time deal and to a monthly deal's first month (`start_month`).
- **Recurring rates** (default): monthly deal, every month after `start_month`, based on that deal's own monthly fee: up to Rs 150,000 → 1.5% · above → 2%.
- **Rates come from the deal's rate snapshot**, taken when the CEO approved the deal. Changing rates later affects only deals approved after the change.
- Recurring commission stops when the agent is deactivated (CEO setting, on by default).
- **Reassignment:** recurring entries go to the agent who owned the client on the payment's `paid_on` date (from `client_owner_history`). The new agent earns recurring commission from the reassignment date; earlier entries stay with the old agent. New-sale entries stay with the deal's original agent.
- The CEO's own deals (My Sales) produce no commission entries.
- Results are stored per payment in `commission_entries`. Until the month is locked, the commission is shown as **"Estimated"** and updates as payments are verified.
- The CEO locks a month (`locked`) after reviewing. Locked months are immutable. If a correction is needed afterwards (for example a refund), create an adjustment entry in the next open month, never edit a locked month.
- **Agent balance:** always show three numbers: Earned, Paid, Pending. Earned = locked months + estimated open months (shown separately); Pending = Earned − Paid.
- All calculation logic lives in one place (`src/lib/commission/`) and must have unit tests covering: every slab boundary (exact min and max), rate snapshot unaffected by later rate changes, recurring threshold per deal fee, first vs later month of a monthly deal, end month and cancel, reassignment date split, empty month, month crossing at midnight Karachi time, rejected payment, refund adjustment into a locked month, deactivated agent.
- The CEO's deal approval screen shows, next to the amount: deal type, slab range (for example "Rs 100,001 – 200,000"), rate, and the expected commission (per payment for one-time; first month and later months for monthly).

### Refunds
- If a client is refunded, the CEO records a negative adjustment linked to the original payment. If that month is locked, the negative commission adjustment goes into the current open month for that agent.

### Leads and ownership
- Duplicate check: when an agent adds a lead or client, warn if the same phone number already exists. If it belongs to another agent, do not reveal who; tell the agent "This contact is already registered. Contact the CEO." and notify the CEO.
- The agent who owns the client gets commission on that client's deals unless the CEO reassigns ownership (see Reassignment).

## Leaderboard
- Visible to all agents and the CEO.
- Ranks agents by verified collected amount for the selected month (current month by default).
- Agents see: rank, agent name, and their own exact numbers. For other agents show rank and name, and the amount only as a progress bar, not the exact rupee figure. The CEO sees all exact figures.
- Never show other agents' client names on the leaderboard.

## Notifications
Deliver both in-app (bell icon with unread count) and by email. Events:
- CEO: new agent application, new deal submitted, new payment awaiting verification, duplicate contact attempt, monthly payment missed by the 10th.
- Agent: deal approved or rejected (with reason), payment verified or rejected, payout recorded, month locked with final commission, follow-up date reached for their lead or deal, monthly payment missed by the 10th.
- Applicant: invite link on approval, rejection notice.
- The daily job runs at 9:00 AM Asia/Karachi (Vercel cron `/api/cron/daily`, protected by `CRON_SECRET`): follow-up reminders and monthly-due checks.
- Hosting: Vercel project `sales-sotfware` (GitHub `ujaagar/Sales-Sotfware`, branch `main` auto-deploys), live at https://sales.ujaagardigital.com (CNAME in Cloudflare, DNS only). Functions run in `sin1` (Singapore) because the Supabase database is in AWS ap-southeast-1; keep them in the same region.

## Reports and Exports (CEO)
- CEO dashboard: total collected this month, commission liability (estimated + locked − paid), pending deal approvals, pending payment verifications, agent performance, sales by service, monthly deals due/missed this month.
- Filters on every report: date range, agent, service, deal status.
- Export any table view to CSV and XLSX.
- Per-agent monthly commission statement as PDF (agent can download their own).

## Screens (minimum set)
**Public:** Home (`/`), Agent login (`/login`), CEO login (`/ceo/login`), Apply as Sales Agent (`/apply`), Sales Agent Policy (`/sales-agent-policy`), Set password (`/set-password`), Forgot / reset password.
**Agent onboarding:** Accept the Sales Agent Policy (`/welcome/policy`).
**Agent:** Dashboard (earned / paid / pending, today's follow-ups, their leads and deals, recent payments), Leads (list + kanban by status), Clients, Deals, Record Payment, Commissions and Statements, Payouts history, Leaderboard, Sales Agent Policy, Notifications, Profile.
**CEO:** Dashboard, Agent Applications, Approvals queue (deals), Payment verification queue (with proof preview), Agents, Services, Commission Rates and Targets, Month Locking, Payouts, Reports, Activity Log, Settings, My Sales.

Do not add screens or features beyond this list unless asked.

## Brand and Design
- Always check `brand_assets/` first and use the real Ujaagar Digital logo artwork (never retype the lettering).
- **Palette:** Midnight `#0E1C33` (headings, primary buttons, dark surfaces), Ujaagar Blue `#4169FF` (accents and highlights, use sparingly), Canvas `#F5F7FB` (page backgrounds), White `#FFFFFF` (cards), Slate `#475569` (supporting text). Balance roughly 60% light, 30% navy, 10% blue.
- **Typography:** Poppins (600/700) for headings, Inter (400/500) for body and UI. Tabular numbers for all amounts.
- **Layout:** spacing 8 / 16 / 24 / 32 / 48 px, cards 16 px radius, buttons 12 px radius, content width up to 1200 px, single column on mobile. Icons on a 24 px grid, 2 px stroke, rounded caps.
- **Dark and light mode both required**, with a toggle and system-preference default. Define every color as a CSS variable token for both themes. Check contrast in both modes.
- This is a working tool, not a marketing site: prioritise clarity, fast data entry and readable tables over decoration. Keep visual flair subtle.
- **Mobile-first.** Agents will mostly use phones in the field. Recording a lead or a payment must be easy with one hand: large tap targets (min 44px), sticky primary action button, phone camera upload for receipts.
- Tables become card lists on small screens.
- Never use default Tailwind blue or indigo as the primary color.
- Never use `transition-all`. Animate only `transform` and `opacity`, keep animations short.
- Every clickable element needs hover, focus-visible and active states.
- Every list must have proper empty, loading (skeleton) and error states.
- Status colors must be consistent everywhere: pending = amber, approved/verified = green, rejected = red, completed = neutral/brand, cancelled = gray. Never rely on color alone; always show the label too.
- Amounts always as `Rs 125,000` (international thousands grouping). Dates as `26 Oct 2026`.

## Security Rules
- RLS enabled on **every** table, with policies written and tested for both roles. Add a test that an agent cannot read another agent's rows.
- Never expose the Supabase service role key to the client. Use it only in server code.
- **Secrets:** the owner puts all keys and passwords into `.env.local` himself. Never ask for secrets to be pasted into chat; point to `.env.example` instead.
- All money changes, approvals, verifications, tier changes, month locks, reassignments, application decisions and payouts are written to `activity_log`.
- Nothing financial is hard-deleted. Use status changes or soft delete.
- Validate every input on the server, even if the client already validated it.
- `src/proxy.ts` never redirects `/api/*`; every API route checks login and role itself (401/403), and `/api/cron/*` checks `CRON_SECRET`.
- One browser holds one login. If a page of the other portal is opened, the proxy sends it to that portal's login with `?as=agent` / `?as=ceo`, and the login page explains (use an incognito window for both at once).
- Mobile layouts: page grids use `grid-cols-1` before their `sm:`/`md:`/`lg:` columns, so long text can never widen the page.
- Secrets live in `.env.local` (never committed). Keep `.env.example` updated with every variable name.

## Code Conventions
- Folder structure: `src/app/(auth)`, `src/app/(agent)`, `src/app/(ceo)/ceo`, `src/components/`, `src/lib/` (supabase clients, commission logic, formatting), `supabase/migrations/`, `tests/`.
- Database changes only through SQL migration files in `supabase/migrations/`, applied with the Supabase CLI. Never change the schema by hand in the dashboard.
- Generate TypeScript types from the Supabase schema after every migration.
- Keep components small. No business logic in UI components; put it in `lib/` or server actions.
- One formatting helper for money and one for dates; use them everywhere.
- Write tests (Vitest) for commission logic, RLS and accounts. Use Playwright for the main flows: apply → CEO approves → set password → login; agent adds lead, converts to deal, CEO approves, agent records payment, CEO verifies, commission updates.

## Local Development and Visual Checks
- Run the app with `pnpm dev` on `http://localhost:3000`. If it is already running, do not start a second instance.
- Use the hosted Supabase project from `.env.local`, with seed data: the CEO (`pnpm seed:ceo`) plus `pnpm seed:demo` (3 agents, sample services, rates, leads, deals and payments across at least two months).
- After building or changing a screen, screenshot it at mobile (390px) and desktop (1440px) widths in **both** light and dark mode, view the screenshots, and fix layout issues before saying it is done.
- Never screenshot a `file:///` URL; always use localhost.

## Hard Rules
- Do not use floats for money.
- Do not calculate commission anywhere except the single commission module.
- Do not edit locked commission months.
- Do not show one agent's data to another agent.
- Do not create a second CEO, and do not create agent accounts without CEO approval.
- Do not let the CEO see or set agent passwords.
- Do not add features, screens or integrations not listed here without asking.
- Do not commit secrets or ask for them in chat.
- Do not use `transition-all` or default Tailwind blue/indigo as primary.
- Do not mark a task done without running the tests and checking the screens.

## Next.js 16 notes
@AGENTS.md
