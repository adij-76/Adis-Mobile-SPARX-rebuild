# Hosting & laptop-free preview

Both paths below run on cloud servers, so once you've kicked them off your
laptop can be closed and the preview stays available.

**Prerequisites (one-time):**
- Node 20+ installed (`node --version`)
- A free Expo account → https://expo.dev/signup
- The code on your machine and dependencies installed:
  ```bash
  git clone https://github.com/adij-76/Adis-Mobile-SPARX-rebuild.git
  cd Adis-Mobile-SPARX-rebuild
  git checkout claude/mobile-design-app-build-lhqhpm
  npm install
  ```

---

## Option A — Web link (fastest, free, any device)

Exports the app as a website and deploys it to **EAS Hosting**. You get a
permanent URL you can open in any phone browser. It's the mobile UI in a
browser (not a true native feel), but it's instant and always on.

```bash
npx expo export --platform web          # builds the static site into ./dist
npx eas-cli@latest login                # log in to your Expo account
npx eas-cli@latest deploy --prod        # deploys ./dist, prints your URL
```

The command prints a URL like `https://igntd-mobile.expo.app`. Open it on your
phone — done. Re-run the two `expo export` + `eas deploy --prod` commands
whenever you want to publish the latest changes.

> Prefer Vercel or Netlify instead? Run `npx expo export --platform web` and
> deploy the generated `dist/` folder as a static site — both have free tiers.

---

## Option B — Real Android app (free, native)

Builds a true installable Android app in Expo's cloud. You install it from a
link and it runs natively; your laptop can be off after the build starts.

```bash
npx eas-cli@latest login
npx eas-cli@latest init                 # links this project to your Expo account
npx eas-cli@latest build -p android --profile preview
```

The build runs on Expo's servers (a few minutes; you also get an email). When
it finishes you get a **download link / QR** — open it on your Android phone,
download the `.apk`, and install it (you may need to allow "install from
unknown sources"). The `preview` profile is already configured in `eas.json`.

---

## Option C — iOS / TestFlight (most authentic; paid)

Same as Android but for iPhone, distributed through Apple's TestFlight.
Requires an **Apple Developer account** ($99/yr).

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --latest      # uploads to TestFlight
```

Follow the prompts to sign in with your Apple ID and let EAS manage signing
credentials. Once processed in App Store Connect, invite yourself as a tester
and install via the TestFlight app.

---

## Which should I use?

- **Just want to look at it from your phone, no cost, right now** → Option A.
- **Want the real native app on an Android phone, still free** → Option B.
- **Want it on your iPhone like a shipped app** → Option C (needs Apple account).
