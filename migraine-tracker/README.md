# Migraine Tracker

A migraine diary that records how you feel **next to what the air was doing at
that exact hour** — temperature, barometric pressure, humidity, and air quality
— so that after a few months you can show a doctor your own patterns instead of
a guess.

It is a phone-first web app. Big targets, a dark low-glare theme by default, and
a comfort mode that dims the whole screen, because light sensitivity is a
migraine symptom and a bright white screen mid-attack is its own problem.

## What it does

**Top of the screen — conditions now.** Barometric pressure with its 24-hour
change and a trend line, temperature, humidity, US AQI, plus wind gusts, UV,
cloud cover, PM2.5 and pollen where it is published. Unusual readings get called
out as facts ("Pressure down 0.18 inHg in 24 hours"), never as predictions.

**Scroll down — rate what you feel.** 0–10 for overall migraine, head pain,
dizziness, vertigo, nausea and light sensitivity out of the box; sound
sensitivity, aura, neck tension, brain fog and fatigue are one switch away, and
you can add your own. Every scale can be set by dragging a large slider or
tapping a number. Optional context — sleep, stress, water, skipped meals, cycle
day — is collapsed so it never slows down logging during an attack.

**Medications.** Each prescription carries its dose, form, schedule, daily and
weekly ceilings, prescriber, and instructions. The card resolves to one plain
sentence — "Due now — 8:00 AM dose not yet given", "Too soon — next dose after
3:40 PM" — so somebody helping can act without interpreting anything. Doses are
recorded with one tap.

It also counts the days each acute medication was used in the last 30 and warns
as that approaches the level at which the medication can start causing headaches
of its own. Those thresholds come from [ICHD-3 section 8.2, medication-overuse
headache](https://ichd-3.org/8-headache-attributed-to-a-substance-or-its-withdrawal/8-2-medication-overuse-headache-moh/):
10 days a month for triptans, ergotamines, opioids and combination analgesics,
15 days a month for simple analgesics and NSAIDs. It is a count to bring to a
prescriber, not a diagnosis.

**Patterns.** Once there are about two weeks of entries, the app correlates every
environmental variable — including rates of change, which is where the
barometric pressure research points — against every symptom, at 0, 6, 12 and 24
hour lags. Results are Spearman rank correlations with Holm-Bonferroni
adjustment, because testing dozens of variables at once will otherwise throw up
false positives by chance alone. Each finding shows its sample size and a plain
contrast ("around 8.3 out of 10 when pressure had fallen, 0.4 when it had
risen").

The app deliberately assumes nothing about direction. Weather sensitivity varies
person to person, so it measures the individual rather than applying a rule.

**Doctor report.** One printable page: symptom days per month, per-symptom
averages and worst scores, medication use with overuse thresholds, and the
associations that survived statistical adjustment. Prints black-on-white
regardless of the app's dark theme. CSV export for entries and doses too.

## Privacy

There is no account, no server, and no database. Everything is stored in the
browser's IndexedDB on the device it was entered on. Symptom and medication data
never leaves that device.

The only outbound request is to [Open-Meteo](https://open-meteo.com) for weather
and air quality, which receives coordinates and nothing else. Open-Meteo is free
for non-commercial use and needs no API key or account.

Because nothing is on a server, **a backup is the only way to move devices or
recover from cleared browser data**. Settings → Download full backup.

## Hourly data without a server

Open-Meteo serves up to 92 days of *past* hourly data from the same endpoint as
the forecast. Opening the app backfills every hour missed while it was closed,
so an unbroken hourly record needs no cron job, no background worker, and no
hosting bill. Closing the app for a month loses nothing.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in ./out
npm run lint
```

`npm run build` produces a fully static site in `out/`. Drop that directory on
Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any web server — there is
nothing to configure and no runtime.

On a phone, open the deployed URL and use "Add to Home Screen". It installs as a
standalone app and works offline apart from the weather pull.

Icons are generated, not checked in by hand:

```bash
node scripts/generate-icons.mjs
```

## Layout

```
src/lib/
  types.ts       Every stored shape
  db.ts          IndexedDB wrapper, backup/restore/wipe
  weather.ts     Open-Meteo client (weather, air quality, geocoding)
  analysis.ts    Env features, lags, correlations, daily summaries
  stats.ts       Spearman, Holm adjustment, t-distribution p-values
  medication.ts  Dose state, limits, ICHD-3 overuse counting
  store.tsx      One provider holding all state, synced to IndexedDB
src/app/         Today, /meds, /history, /insights, /report, /settings
```

There are no runtime dependencies beyond Next.js and React. The charts, the
statistics, the IndexedDB layer and the icon generator are all hand-written, so
the app opens fast on an old phone and has nothing to keep up to date.

## Splitting this into its own repository

The whole app is self-contained in this directory, so it lifts out cleanly with
its history intact:

```bash
git subtree split --prefix=migraine-tracker -b migraine-tracker-only
cd .. && git clone <this-repo> migraine-tracker && cd migraine-tracker
git checkout migraine-tracker-only
git remote set-url origin <new-repo-url>
git push -u origin migraine-tracker-only:main
```

Nothing outside this directory is referenced.

## Not a medical device

This app records and summarises what you type into it. It does not diagnose
anything, it does not decide doses, and an association it finds is not evidence
of cause. It is built to make a conversation with a doctor better informed, not
to replace one.
