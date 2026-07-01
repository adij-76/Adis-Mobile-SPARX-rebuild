# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Deployment model — the live app builds from `main`

`.github/workflows/deploy-web.yml` deploys to GitHub Pages **only on push to
`main`**. Feature branches are NOT deployed. So while you develop on a branch,
the live app (adij-76.github.io) keeps running whatever is on `main`. Two rules
follow from this:

1. **App code on a branch is not live until merged to `main`.** Don't assume the
   deployed site reflects your latest commits — it reflects `main`. Merge to
   deploy; verify on the live site only after the merge builds.

2. **The Supabase `mobile_*` views are a shared contract with the *deployed* app,
   not your branch.** You run view SQL by hand in Supabase, so a view change goes
   live immediately — against whatever app build is currently on `main`. That
   means:
   - **Evolve views additively.** Never rename or drop a column the live app
     reads. Add the new column and KEEP the old one as an alias until the app
     build that uses the new name has shipped to `main`. Only then drop the alias.
   - A view column rename that isn't matched by a deployed app build **breaks the
     live app** (empty results / missing fields). This already happened once
     (portion_id→module_id, avatar→avatar_url). See `db/field-dictionary.md` and
     the compat aliases in `db/views.sql`.

Rule of thumb: **DB views can only change in lock-step with `main`.** If a view
change requires a matching app change, merge the app change to `main` first (or
together), and keep back-compat aliases across the transition.
