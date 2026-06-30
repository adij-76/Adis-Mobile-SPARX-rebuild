# SPARx Mobile

A rebuild of the SPARx recovery & coaching mobile app, built from the Figma
design board on a modern React Native stack.

## Stack

- **Expo SDK 56** (React Native 0.85, React 19, React Compiler)
- **Expo Router** — file-based navigation with typed routes
- **TypeScript** (strict)
- **Lato** typeface via `@expo-google-fonts/lato`
- **expo-linear-gradient**, **@expo/vector-icons** (Ionicons), **expo-image**

Styling uses a typed design-token system (`src/constants/theme.ts`) mapped
directly from the Figma design variables — colors, the Lato type ramp,
spacing, radii and shadows.

## Getting started

```bash
npm install
npx expo start        # then press i / a, or scan the QR with Expo Go
npm run web           # run in a browser
```

## Project structure

```
src/
  app/
    _layout.tsx              # root stack + font loading + splash
    (tabs)/
      _layout.tsx            # bottom tab bar (Home · Data · Lessons · Community · Profile)
      index.tsx              # Home dashboard
      data.tsx / lessons.tsx / community.tsx / profile.tsx
    workshop/
      _layout.tsx            # workshop step stack
      intro.tsx              # step 1 — overview + hero
      video.tsx              # step 2 — lesson video
      worksheet.tsx          # step 3 — download / fill / upload
      summary.tsx            # completion screen
  components/
    ui/                      # Button, Card, ProgressBar, Stepper, Txt
    workshop-scaffold.tsx    # shared stepper + prev/next chrome
    tab-placeholder.tsx
  constants/theme.ts         # design tokens (from Figma)
  data/content.ts            # mock content for the screens
```

## Screens built in this pass

| Screen | Route | Notes |
| --- | --- | --- |
| Home dashboard | `/` | Greeting header, daily quote, checklist, programs carousel, meetings, recommended videos |
| Workshop intro | `/workshop/intro` | Stepper, hero image, rating, intro copy |
| Workshop video | `/workshop/video` | Mock player with controls |
| Workshop worksheet | `/workshop/worksheet` | 3-step download → fill → upload flow |
| Completion | `/workshop/summary` | "Well done!!" success screen |

The four secondary tabs (My Data, My Lessons, Community, Profile) ship as
on-brand placeholders, ready to be built out in the next phase.

## Design source

Figma: SPARx board, "Workshop" section. Design tokens were extracted from the
file's Figma variables and the published text styles.

## Notes

- Content in `src/data/content.ts` is mock data; wire it to the SPARx API when
  the backend is ready.
- Lato ships Regular/Bold/Black weights, so the Figma "Medium"/"SemiBold"
  steps are approximated — swap in a licensed Lato Medium/SemiBold if exact
  weights are required.
