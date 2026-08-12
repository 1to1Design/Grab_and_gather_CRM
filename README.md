# Grab & Gather CRM

Lead-tracking CRM for Grab & Gather. Log a lead right after a meeting by dictating
a voice note, let it parse into structured fields, review, save. Shared pipeline
across every rep's login.

## Stack

- **Next.js** (App Router, TypeScript) — frontend + backend in one app
- **Postgres** via **Prisma** — the data store
- **NextAuth (Credentials)** — email/password login per rep, no third-party account needed
- **Claude Haiku** (Anthropic API) — parses freeform dictated text into structured lead fields
- **Tailwind CSS** — styling

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

- `src/app/page.tsx` — the pipeline (list of all leads, filterable by status/vertical)
- `src/app/leads/new` — new lead form, includes the voice-note capture + parse flow
- `src/app/leads/[id]` — lead detail / edit
- `src/app/leads/import` — CSV import with column mapping, for bringing in existing lead lists
- `src/app/settings/team` — add rep logins
- `src/app/api/parse-lead` — server route that calls Claude to extract structured fields
  from a raw voice-note transcript. The raw text is always saved verbatim to the lead's
  notes field regardless of what gets parsed out of it.
- `prisma/schema.prisma` — the data model (`User`, `Lead`)

## Voice note capture

There's no custom audio recording in the MVP. The voice note field is a plain
textarea — tap it, use your phone's own keyboard dictation (the mic key on iOS or
Android), and it works like any other text input. This is more reliable across
phones than in-browser speech recognition, especially on iPhone.

## Deployment

Not deployed yet by design — see [DEPLOYMENT.md](./DEPLOYMENT.md) for the steps to
put this on a real URL reps can hit from their phones, whenever you're ready to
bring reps on.
