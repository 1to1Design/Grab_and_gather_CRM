# Deploying Grab & Gather CRM

This app isn't deployed yet on purpose — it runs fully locally today (see
README.md). When you're ready to put it on a real URL your reps can reach from
their phones, here's the path. Budget about 30 minutes the first time. All of
this is free at the volume you'd run with one to a few reps.

You'll end up with three things: a hosted Postgres database, the app running on
Vercel, and a real web address.

## 1. Create a hosted Postgres database

Pick one — either works fine with this app, no code changes needed either way:

- **[Neon](https://neon.tech)** — simplest, generous free tier, good default choice
- **[Supabase](https://supabase.com)** — also gives you a GUI to browse the data
  and file storage for later (useful once you attach placement agreements to won
  leads)

Steps (Neon shown, Supabase is nearly identical):

1. Sign up at neon.tech with your email.
2. Create a new project. Name it `grab-gather-crm`.
3. On the project dashboard, copy the **connection string** — it looks like
   `postgresql://user:password@host/dbname?sslmode=require`. Save it somewhere
   safe; you'll paste it into Vercel in step 3.

## 2. Push this repo to GitHub

If it isn't already, get this code into a GitHub repository (ask me to do this
part if you want — I can push directly). Vercel deploys straight from GitHub.

## 3. Deploy to Vercel

1. Sign up at [vercel.com](https://vercel.com) — "Continue with GitHub" is the
   easiest option, it links your account automatically.
2. Click **Add New → Project**, then pick this repo from the list.
3. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon/Supabase connection string from step 1 |
   | `NEXTAUTH_SECRET` | a random secret — generate one by running `openssl rand -base64 32` on your computer, or ask me to generate one |
   | `NEXTAUTH_URL` | your Vercel URL, e.g. `https://grab-gather-crm.vercel.app` (Vercel shows you this after the first deploy — you may need to add this variable and redeploy once you know the URL) |
   | `ANTHROPIC_API_KEY` | your Claude API key from [console.anthropic.com](https://console.anthropic.com) |

4. Click **Deploy**. First deploy takes 1-2 minutes.

## 4. Set up the database schema on the live database

The database starts empty — it needs the same tables your local one has. From
your computer, in this project folder:

```bash
DATABASE_URL="<paste the Neon/Supabase connection string>" npx prisma migrate deploy
```

This applies the schema to the live database without touching your local one
(your local `.env` file is untouched — you're overriding `DATABASE_URL` just for
this one command).

## 5. Create your first login on the live app

Same idea — run the seed script against the live database instead of local:

```bash
DATABASE_URL="<paste the connection string>" \
SEED_ADMIN_EMAIL="genesis@1to1design.co" \
SEED_ADMIN_NAME="Genesis" \
SEED_ADMIN_PASSWORD="<pick a real password>" \
npx prisma db seed
```

Now go to your Vercel URL, log in with that email/password, and you're in. From
**Team** in the nav, add a login for each rep — they can then log in from their
own phone's browser at the same URL.

## 6. Optional: a real domain

By default you get a `*.vercel.app` URL, which works fine and is reachable from
any phone. If you'd rather use something like `crm.grabandgather.com`, buy the
domain wherever you like and add it under the Vercel project's **Settings →
Domains** — Vercel walks you through the DNS records.

## Updating the live app later

Once this is deployed, any future changes just need `git push` to the branch
Vercel is watching (usually `main`) — Vercel rebuilds and redeploys
automatically. If a change adds new fields to the data model, run
`DATABASE_URL="<live url>" npx prisma migrate deploy` once after that push to
bring the live database's schema up to date.
