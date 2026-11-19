# Kwik Budget

Daily-allowance budgeting app. Expo SDK 58 (Expo Router) + Supabase + RevenueCat. Every animation runs on the UI thread with Reanimated 4.

## 1. Supabase
1. Create a project at supabase.com.
2. SQL editor: paste and run `supabase/setup.sql` (all tables, security rules, merchant memory, subscriptions and AI limits). Safe to re-run after updates.
3. Authentication > Sign In / Providers: turn on **Allow anonymous sign-ins**. There is no sign-up wall: finishing onboarding creates a silent account, and people add an email later from Settings ("Back up your data"), keeping all their data.
4. Same page, Email: "Confirm email" can stay on. When it is on, backing up sends a link first, then the person sets a password.
5. Authentication > URL configuration: add `kwikbudget://` as a redirect URL (password reset and email confirmation).
6. Project URL and publishable key go in `.env.local` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`). Before launch, consider turning on CAPTCHA protection for anonymous sign-ins (Authentication > Attack Protection).

## 2. Kwik AI (chat fallback, statement import, receipt scan)
The AI runs in a Supabase Edge Function so no AI key ever ships in the app. It checks each person's plan and daily limits before calling the model.
1. Supabase > Edge Functions > Deploy a new function > Via editor. Name it `ai`, paste `supabase/functions/ai/index.ts`, Deploy.
   (Or with the CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase functions deploy ai`.)
2. Edge Functions > Secrets: add `GEMINI_API_KEY` (Google AI Studio > Get API key). Optional overrides: `AI_MODEL` (chat and receipts, default `gemini-3.5-flash-lite`) and `AI_MODEL_STATEMENT` (statements, default `gemini-3.8-flash`).
3. While testing without RevenueCat, add `ALLOW_DEMO_PRO=true` so the demo Pro unlock also lifts AI limits. Remove it for release and add `REVENUECAT_SECRET_KEY` instead, so Pro is verified on the server.
4. Limits live in two places that must match: `LIMITS` in the function and `lib/plan.ts` (what the paywall promises).

## 3. RevenueCat (subscriptions)
1. Create the app in RevenueCat, connect App Store Connect and Google Play.
2. Products: a monthly subscription and a yearly subscription with a **7-day free trial** introductory offer.
3. Entitlement id: `pro`. Offering: mark it current, with the `$rc_monthly` and `$rc_annual` packages.
4. Put the public SDK keys in `.env` as `EXPO_PUBLIC_RC_IOS_KEY` and `EXPO_PUBLIC_RC_ANDROID_KEY`.

Without keys (or inside Expo Go) the paywall runs in **demo mode**: it shows sample prices and "buying" only unlocks Pro on that device, so you can design and test the flow. A yellow line on the paywall tells you when you are in demo mode.

## 4. Run
```bash
npm install
npx expo install --fix
npx expo run:android      # or: npx expo run:ios
```
Purchases and notifications need a development build (`expo run:*` or `eas build --profile development`), not Expo Go.

## 5. Ship
```bash
npm i -g eas-cli && eas login
eas build --profile production --platform all
eas submit --platform all
```
Before submitting, host a privacy policy and terms page and update the two URLs in `app/paywall.tsx` and `app/settings.tsx` (currently `kwikbudget.app/...`). Store copy and screenshot plan: `docs/ASO.md`.

## How the app is put together
| Area | Files |
|---|---|
| Allowance engine (pure, testable) | `lib/money.ts` |
| Chat parser ("lunch 8.50 mamas", "rent paid", "got 50 tips") | `lib/parser.ts`, `lib/categories.ts` |
| Data + optimistic writes + undo | `lib/store.ts` |
| Onboarding draft (persisted until an account exists) | `lib/draft.ts`, `lib/commit.ts` |
| Subscriptions / Pro gating | `lib/purchases.ts`, `requirePro()` in `lib/afterLog.ts` |
| Ratings (asked only after a win, max every 60 days) | `lib/rating.ts`, `components/RatingSheet.tsx` |
| Reminders | `lib/notify.ts` |
| Motion building blocks | `components/Odometer.tsx` (rolling digits), `Ring.tsx` (weighted dial with knob and halo), `Jar.tsx` (sloshing liquid), `Sheet.tsx` (drag-to-dismiss), `TabBar.tsx` (sliding puck), `Burst.tsx` (physical confetti), `TxRow.tsx` (swipe to delete) |
| Illustrations (one consistent 3D style) | `components/Illustrations.tsx` |
| Icons (Lucide, one family) | `components/Icon.tsx` |

## Free vs Pro (source of truth: `lib/plan.ts`)
Free forever: daily number, jars, move money, extra income, chat logging that learns your merchants (several items, past days, splits), bills and subscriptions with yearly totals and auto-detection, weekly review, 3 Kwik AI assists a day, 1 statement import and 2 receipt scans to try.
Pro: unlimited Kwik AI (fair use), statement import, receipt scan, bill/renewal/trial reminders, price-rise alerts, category insights and payday forecast, search and CSV export, editing jar budgets mid-cycle.

## Website
The landing page, privacy policy, terms, help and account-deletion pages live in `web/` (plain static files). See `web/README.md` to fill in your legal details and deploy it to kwikbudget.app.
# KwikBudget
