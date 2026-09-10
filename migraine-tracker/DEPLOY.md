# Putting this app on a web address

Written for someone who doesn't use a terminal. About 5 minutes.

The migraine tracker has no database, no API keys and no settings to configure
— it's just a set of files a web browser reads. That makes it about as simple
as hosting gets.

You'll end up with a real `https://` link that works on any phone or computer,
and that can be added to a phone's home screen so it opens like a normal app.

## Why not just run it on your computer?

You can, but it's the harder path and it gives you less. Two things only work
on a real `https://` address:

- **"Use my current location."** Browsers refuse to share location with a page
  that isn't on a secure address, so on a laptop you'd have to type your city
  in by hand every time.
- **Adding it to a phone's home screen.** This is the whole point of the app —
  a big icon your wife taps, that opens full-screen with no browser bar.

So the hosted version is both easier to set up and closer to the real thing.

## Deploy it with Vercel

Vercel hosts this kind of site free, and this repository is already connected
to it.

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New…** → **Project**.
3. Find **Grab_and_gather_CRM** in the list and click **Import**.
4. **This is the one setting that matters.** Find **Root Directory**, click
   **Edit**, and choose the `migraine-tracker` folder. Without this, Vercel
   tries to build the CRM instead, which needs a database and will fail.
5. Leave everything else alone. Click **Deploy**.
6. Wait about a minute. You'll get a link like
   `https://migraine-tracker-xxxx.vercel.app`.

That link is the app. Open it anywhere.

### If the branch matters

If the deploy fails saying it can't find the `migraine-tracker` folder, the
app is on a branch Vercel isn't looking at. In the Vercel project: **Settings**
→ **Git** → **Production Branch** → set it to the branch holding this app →
then **Deployments** → **Redeploy**.

## Put it on a phone

**iPhone:** open the link in Safari (it must be Safari), tap the share button,
then **Add to Home Screen**.

**Android:** open the link in Chrome, tap the three-dot menu, then
**Add to Home screen** or **Install app**.

It now opens full-screen with its own icon, and works without a connection
apart from fetching new weather.

## First things to do in the app

1. **Settings → Use my current location.** The panel at the top of the Today
   screen stays a grey prompt until it knows where you are. Once set, it fills
   with pressure, temperature, humidity and air quality within a second or two.
2. **Settings → What to track.** Turn off anything she doesn't get, turn on
   anything she does. Fewer switches on means faster logging during an attack.
3. **Medications.** Add each prescription with its dose and daily limit.
4. **Today.** Rate a few things and hit save.

The **Patterns** screen stays empty until there are about two weeks of entries,
and the **doctor report** is thin until there's a month or two. That's expected
— it's a diary, and diaries need time before they say anything.

## Updating it later

Every time the code changes, Vercel rebuilds and the link updates by itself.
Nothing to do.

## One thing to know about the data

Everything typed into the app is stored **on the device it was typed on**. It
is not on a server, and it is not in an account. That's deliberate — health
data stays private — but it has one consequence worth understanding:

**If she clears her browser data or loses the phone, the diary is gone.**

So once there's real history in it, use **Settings → Download full backup**
now and then and keep the file somewhere safe. That same file restores
everything onto a new phone.
