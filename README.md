# Grab & Gather CRM

Lead-tracking CRM for Grab & Gather. Log a lead right after a meeting by dictating
a voice note, let it parse into structured fields, review, save. Shared pipeline
across every rep's login.

## Stack

- **Next.js** (App Router, TypeScript) — frontend + backend in one app
- **Postgres** via **Prisma** — the data store
- **NextAuth (Credentials)** — email/password login per rep, no third-party account needed
- **Claude Haiku** (Anthropic API) — parses freeform dictated text into structured lead fields
- **Web Push** — optional daily reminder notifications for follow-ups due
- **Tailwind CSS** — styling
- Installable as a PWA (add to home screen on iOS/Android)

## Local development

Requires Node 20+ and a Postgres database.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY
npx prisma migrate dev
npx prisma db seed     # creates one login (see prisma/seed.ts for defaults)
npm run dev
```

Open http://localhost:3000, log in with the seeded account, and add more reps from
**Team** in the nav once you're signed in.

## How it's organized

- `src/app/page.tsx` — the pipeline: list of all leads, filterable by status/vertical/search,
  sortable by follow-up date or last contacted, with an overdue/due-today banner for your
  own leads. Leads marked Lost are hidden unless you filter for them specifically.
- `src/app/leads/new` — new lead form: voice-note capture + parse flow, live duplicate-name
  warning as you type the organization name, Save and Exit / Save and Add New
- `src/app/leads/[id]` — lead detail / edit, with a Meeting Notes history at the bottom
  (collapsible, newest first) and a Documents section (financial model / placement
  agreement links)
- `src/app/leads/import` — CSV import with column mapping, flags rows that look similar
  to existing leads after import
- `src/app/print` — branded, filter-aware PDF/print export of the pipeline
- `src/app/settings/team` — add rep logins
- `src/app/settings/notifications` — per-device push notification opt-in
- `src/app/api/parse-lead` — calls Claude to extract structured fields (including a
  summary) from a raw voice-note transcript. The raw text is always preserved verbatim
  as a quoted block in the lead's first note, regardless of what gets parsed out of it.
- `src/app/api/cron/follow-up-reminders` — daily digest push notification job (see
  `vercel.json` for the schedule), auth-gated by `CRON_SECRET`
- `src/lib/similarity.ts` — the fuzzy name-matching behind duplicate detection
- `prisma/schema.prisma` — the data model (`User`, `Lead`, `LeadNote`, `PushSubscription`)

## Voice note capture

The voice note field is a plain textarea. On phones, tap it and use the OS keyboard's
own dictation (the mic key on iOS or Android) — more reliable across devices than
in-browser speech recognition, especially on iPhone. On desktop there's also a
"Dictate" button that uses the browser's Web Speech API directly (Chrome/Edge/Safari;
unsupported in Firefox).

## Deployment

Live — see [DEPLOYMENT.md](./DEPLOYMENT.md) for the full setup (hosted Postgres,
Vercel, environment variables, and the optional push-notification setup). Any
future `git push` to the deployed branch redeploys automatically, including
re-applying database migrations.
