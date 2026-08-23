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
  and file storage for later

Steps (Neon shown, Supabase is nearly identical):

1. Sign up at neon.tech with your email.
2. Create a new project. Name it `grab-gather-crm`.
3. On the project dashboard, copy the **connection string** — it looks like
   `postgresql://user:password@host/dbname?sslmode=require`. Save it somewhere
   safe; you'll paste it into Vercel in step 3.

## 2. Get a Claude API key (for voice-note parsing)

Sign up at [console.anthropic.com](https://console.anthropic.com) and create an
API key. Without this, leads can still be logged manually — only the
dictate-and-parse step needs it.

## 3. Get VAPID keys (for push notification reminders) — optional

Only needed if you want the daily "you have follow-ups due" push reminders.
Skip this and the rest of the app still works fine, just without that feature.

From this project folder, run:

```bash
npx web-push generate-vapid-keys --json
```

That prints a `publicKey` and `privateKey` — save both, you'll need them in the
next step. Also pick a `VAPID_SUBJECT`, which is just a `mailto:` address the
push services use to contact you if something's wrong (e.g.
`mailto:genesis@1to1design.co`).

Generate one more secret, this one for the scheduled reminder job itself:

```bash
openssl rand -base64 24
```

Save that as your `CRON_SECRET`.

## 4. Get a Google Maps API key (for the Ask chat's route planning) — optional

The **Ask** tab lets you chat with an assistant about your pipeline — "what
lead should I follow up on next," or "plan a route for the leads I need to
visit today." Questions and lookups work with just your Claude API key from
step 2. Route planning specifically needs one more key:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and
   create a project (or use an existing one).
2. Enable the **Directions API** for that project.
3. Under **APIs & Services → Credentials**, create an API key.
4. Enable billing on the project — Google requires a card on file for this
   API, but the free monthly credit comfortably covers a small sales team's
   usage.

Skip this and Ask still answers questions about your leads fine — it'll just
say route planning isn't set up yet if you ask it to build a route.

## 6. Push this repo to GitHub

If it isn't already, get this code into a GitHub repository (ask me to do this
part if you want — I can push directly). Vercel deploys straight from GitHub.

## 7. Deploy to Vercel

1. Sign up at [vercel.com](https://vercel.com) — "Continue with GitHub" is the
   easiest option, it links your account automatically.
2. Click **Add New → Project**, then pick this repo from the list.
3. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon/Supabase connection string from step 1 |
   | `NEXTAUTH_SECRET` | a random secret — generate one by running `openssl rand -base64 32` on your computer, or ask me to generate one |
   | `NEXTAUTH_URL` | your Vercel URL, e.g. `https://grab-gather-crm.vercel.app` (Vercel shows you this after the first deploy — you may need to add this variable and redeploy once you know the URL) |
   | `ANTHROPIC_API_KEY` | your Claude API key from step 2 |
   | `SEED_ADMIN_EMAIL` | the email for your own first login |
   | `SEED_ADMIN_NAME` | your name |
   | `SEED_ADMIN_PASSWORD` | a real password (you can change it later) |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the `publicKey` from step 3 (optional) |
   | `VAPID_PRIVATE_KEY` | the `privateKey` from step 3 (optional) |
   | `VAPID_SUBJECT` | your `mailto:` address from step 3 (optional) |
   | `CRON_SECRET` | the secret from step 3 (optional, but required for push reminders to fire) |
   | `GOOGLE_MAPS_API_KEY` | the key from step 4 (optional, only needed for route planning in Ask) |

4. Click **Deploy**.

That first deploy does more than usual: the build itself runs the database
migration and creates your login (via `SEED_ADMIN_*`) automatically — no
manual database commands needed. Every future deploy re-checks the schema the
same way, so adding fields later just works on the next push.

## 8. Set NEXTAUTH_URL and redeploy

You won't know your exact `https://....vercel.app` URL until after the first
deploy. Once you have it: **Settings → Environment Variables**, add
`NEXTAUTH_URL` with that URL, then **Deployments → (latest) → ⋯ → Redeploy**.
Login won't work correctly until this is set.

## 9. Log in and add your team

Go to your Vercel URL and log in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
you set in step 5. From **Team** in the nav, add a login for each rep — they
can then log in from their own phone's browser at the same URL.

## 10. Verify the daily reminder job (if you set up push)

Vercel reads `vercel.json` in this repo and schedules the reminder job on its
own — nothing to configure in the dashboard. It runs once a day around 7-8am
Pacific. You can confirm it's registered under your Vercel project's
**Settings → Cron Jobs**, and each rep can turn reminders on for their own
phone from **Notifications** in the nav (this has to be enabled per device).

## 11. Optional: a real domain

By default you get a `*.vercel.app` URL, which works fine and is reachable from
any phone. If you'd rather use something like `crm.grabandgather.com`, buy the
domain wherever you like and add it under the Vercel project's **Settings →
Domains** — Vercel walks you through the DNS records.

## Updating the live app later

Once this is deployed, any future changes just need `git push` to the branch
Vercel is watching — Vercel rebuilds, redeploys, and re-applies any schema
changes automatically. Nothing manual required.
