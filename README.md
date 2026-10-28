# [Uniliga MultiGG](https://a1exhorst.github.io/UniligaMultiGG/)

**One match link. Both teams on OP.GG.**

A single-purpose tool for League of Legends Uniliga matches on [OPL](https://www.opleague.pro/). Paste a match URL and generate EUW OP.GG multi-search links for both registered rosters. Click a team's crest to open its multi-search.

**This project is 100% vibecoded.** The implementation, styling, and documentation were generated with AI. Use it, inspect it, improve it. No automated tests are included.

## Run locally

Install [Bun](https://bun.sh/) (the project and CI use **1.3.9**), then:

```sh
bun install
bun run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`).

```sh
bun run build      # TypeScript check + production build into dist/
bun run preview    # Serve that production build locally
bun run typecheck  # TypeScript check only
```

Built with **React, TypeScript, Vite, and Bun**. Bun is used as the package manager and runtime for Vite. Commit `bun.lock` for reproducible installs.


### Bun cache on Windows

The included `bunfig.toml` uses a project-local `.bun-cache/` for dependency downloads. This avoids an incomplete package in Bun's shared user cache causing errors such as `Cannot find package 'fdir'` even after copying the project without `node_modules`.

When copying or committing the project, include `bunfig.toml`, `package.json`, and `bun.lock`. Omit `node_modules/`, `dist/`, and `.bun-cache/`; `bun install` recreates what it needs.

If an earlier install left incomplete packages, reinstall once from the project directory:

```sh
bun install --frozen-lockfile --force
bun run dev
```
## Use it

1. Copy the URL of your OPL League of Legends match page.
2. Paste it into the search field and choose **Find teams** (or press Enter).
3. Click either crest to open that team's EUW OP.GG multi-search in a new tab.

The **RIOT ID (LEAGUE OF LEGENDS)** column is the only source of player names. OPL account usernames are never substituted for Riot IDs. All listed registrations with a complete `GameName#Tagline` are included, including substitutes and players OPL marks ineligible. Duplicate Riot IDs are removed, and registrations without a complete ID are counted as omitted. Expand the Riot ID count to inspect exactly which IDs were included. An empty roster has no OP.GG link. No arbitrary five-player limit is applied; OP.GG controls how many results its service displays.

Captain links come from the roster's explicit Captain position and take priority. If no captain is listed, the site fetches that team's OPL profile and displays its **Contact** field. Contact names link to an OPL user profile when the field supplies one; otherwise they appear as plain text. If neither is provided, the site displays **No contact person provided**. A failed team-page lookup displays **Contact details unavailable** while keeping the OP.GG links usable. A missing team logo falls back to the team's initials. A missing scheduled time is shown as unscheduled.

## Deploy on GitHub Pages

1. Create a GitHub repository and push these files to its `main` or `master` branch. Include the `.github` directory and `bun.lock`.
2. In the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. The included **Deploy to GitHub Pages** workflow runs on pushes to `main` or `master`. If the first run happened before Pages was enabled, open **Actions → Deploy to GitHub Pages → Run workflow**.
4. When the workflow finishes, open the URL shown by the `github-pages` deployment, usually `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

Vite uses a relative asset base, so both repository project sites and `USERNAME.github.io` repositories work without editing the config. If your default branch has another name, update the branch list in `.github/workflows/deploy.yml`. No GitHub token, OPL token, Riot API key, or backend deployment is required for the default setup.

## How live loading works

GitHub Pages serves static files. OPL does not send the CORS headers needed to fetch its pages directly from another website, and its API requires a bearer token. This app therefore requests the **public match page through [Jina Reader](https://github.com/jina-ai/reader)**, requesting HTML with `X-Respond-With: html` and a fresh fetch with `X-No-Cache: true`. It reads the JSON already embedded in that page, without executing OPL's scripts. One page contains both rosters, logos, captain roles, event name, and the scheduled start timestamp. An additional team-page request is made only for each team without a captain, to read its Contact field.

Only canonical public match and team URLs (`https://www.opleague.pro/match/ID` and `https://www.opleague.pro/team/ID`) are sent to the fetch service. If Jina is unavailable, the app retries through [AllOrigins](https://allorigins.win/). Queries and fragments from pasted links are discarded, and OPL credentials/cookies are never sent. Results are not stored locally. Opening OP.GG sends the selected roster's Riot IDs to OP.GG.

**The default setup depends on OPL and public fetch services.** Service outages, anonymous rate limits, blocking, or OPL markup changes can prevent a lookup. Jina is asked to bypass its cache; the AllOrigins fallback may return a cached page (its current public cache header allows five minutes, potentially longer during upstream errors). After both services fail, the UI shows a retryable error. This is live page fetching, not an included static example or hardcoded roster.

### Optional custom relay

For more control, point the app at a CORS-enabled relay you operate. Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_OPL_PROXY_URL=https://your-relay.example/?url=
```

The app appends the URL-encoded canonical OPL match or team URL. The relay must return the original page HTML and allow browser access from your site's origin. Restrict your relay to `https://www.opleague.pro/match/ID` and `https://www.opleague.pro/team/ID` URLs with numeric IDs. Do not expose an unrestricted fetch proxy.

For GitHub Pages, create **Settings → Secrets and variables → Actions → Variables → New repository variable** named `VITE_OPL_PROXY_URL`, then rerun the deployment. Leave it unset to use Jina Reader with the AllOrigins fallback. All `VITE_` variables are public build-time configuration; do not put API keys or secrets in them.

## Project layout

- `bunfig.toml` - project-local Bun dependency cache configuration.
- `src/App.tsx` — search, loading/error states, team crests, captain links, and schedule.
- `src/opl.ts` — strict match URL validation, safe JSON extraction, and OP.GG link generation.
- `src/wallpapers.ts` — official wallpaper pool and attribution source.
- `src/styles.css` — responsive layout, typography, and wallpaper overlays.
- `.github/workflows/deploy.yml` — Bun build and GitHub Pages deployment.

## License and attribution

The source code is [MIT licensed](LICENSE). Riot artwork, team logos, names, and other third-party content remain the property of their respective owners and are **not** covered by the MIT license. This is an unofficial fan project, not endorsed by or affiliated with Riot Games, Uniliga, OPL, or OP.GG. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.
