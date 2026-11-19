# Kwik Budget website

Plain static site, no build step. Every page works from any static host.

| URL | File | Used by |
|---|---|---|
| `/` | `index.html` | Store listings "Marketing URL", share link in the app |
| `/privacy/` | `privacy/index.html` | App Store Connect + Play Console privacy policy URL, paywall, Settings |
| `/terms/` | `terms/index.html` | Paywall (Apple requires a Terms/EULA link for subscriptions), Settings |
| `/support/` | `support/index.html` | App Store "Support URL", Settings → Help and FAQ |
| `/delete-account/` | `delete-account/index.html` | Play Console → Data safety → "Delete account URL" |
| `/404.html` | `404.html` | Shown by the host for missing pages |

## Before you publish
1. Search for `class="fill"` (highlighted in yellow on the page) and fill in: legal name of the developer or company, postal address, and the country whose law governs the terms. Then remove nothing else.
2. When the listings are live, paste the store links into `STORE` at the top of `main.js`. Until then the buttons scroll to the download section.
3. If the domain is not `kwikbudget.app`, replace it in the `SITE` line of every page's `<head>` (canonical/og tags), `sitemap.xml`, `robots.txt`, and in the app (`app/paywall.tsx`, `app/settings.tsx`).
4. Make sure `support@kwikbudget.app` receives mail.
5. Ask a lawyer to read the privacy policy and terms. They are written to match how the app works today (Supabase, Gemini, RevenueCat, no ads or analytics), but they are not legal advice.

## Deploy (pick one, all free)
- **Cloudflare Pages:** dash → Workers & Pages → Create → Pages → upload the `web` folder (or connect the repo with build output `web`). `_headers` is picked up automatically.
- **Netlify:** drag the `web` folder onto app.netlify.com/drop. `_headers` and `404.html` work as is.
- **Vercel:** `npx vercel web --prod`. `vercel.json` turns on clean URLs.
- **GitHub Pages:** push the contents of `web` to a `gh-pages` branch (add an empty `.nojekyll` file so `.well-known` is served).

Then point the domain's DNS at the host and turn on HTTPS.

## Preview locally
```bash
npx serve web
```

## Notes
- Fonts (Plus Jakarta Sans, same as the app) are self-hosted in `assets/fonts`, so the site makes no third-party requests.
- `assets/og.png` is the 1200×630 link preview image. Screenshots in `assets/` come from the UI mockups; swap in real device screenshots before launch if you like.
- `.well-known/apple-app-site-association` is a placeholder for universal links later.
