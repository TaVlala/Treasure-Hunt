# PROGRESS.md
# Master feature checklist — single source of truth for project status.
# Every agent must read this before starting work and update after every session.
# Format: [ ] Not started | [~] In progress | [x] Done

---

## Phase 1 — MVP (Demo to First Sponsor)

### Infrastructure
- [x] Git repo initialized with remote
- [x] .gitignore configured
- [x] Architecture documented (ARCHITECTURE.md)
- [x] Decision log started (DECISIONS.md)
- [x] Sponsor system documented (SPONSORS.md)
- [x] Monorepo setup (Turborepo + workspaces)
- [x] Shared types package
- [x] Environment config (.env.example)
- [x] Database setup (PostgreSQL + PostGIS)
- [x] Prisma schema + initial migration
- [x] Seed data (demo hunt, clues, sponsor)

### Backend API (Server)
- [x] Express server boilerplate with TypeScript
- [x] Error handling middleware (AppError class + global handler)
- [x] Request validation setup (Zod — env validation working)
- [x] Health check endpoint (GET /health)
- [x] Database connection + Prisma client
- [x] Auth: register + login + JWT + refresh tokens
- [x] Auth middleware (authenticate + requireRole)
- [x] Hunt CRUD (admin)
- [x] Clue CRUD (admin)
- [x] Sponsor CRUD (admin)
- [x] GPS proximity check endpoint
- [x] Game session: join hunt
- [x] Game session: check proximity / scan QR / submit answer
- [x] Player progress tracking
- [x] Basic leaderboard endpoint
- [x] File upload to R2
- [x] WebSocket: leaderboard updates (Socket.io, emit on clue submit)

### Admin Panel (Next.js)
- [x] Next.js project setup (Next.js 15 App Router, Tailwind v3, TypeScript strict)
- [x] Admin auth (login page + JWT cookie + clientFetch auto-refresh + serverFetch)
- [x] Dashboard (stat cards: hunts/sponsors/players + recent hunts list)
- [x] Hunt list page
- [x] Hunt creation form
- [x] Map-based clue placement (Mapbox)
- [x] Clue editor (text, GPS proximity, QR)
- [x] Sponsor list page
- [x] Sponsor creation/edit form
- [x] Link sponsor to clue

### Mobile Player App (Expo)
- [x] Expo project setup
- [x] Player auth (register + login)
- [x] Hunt discovery screen (list view)
- [x] Hunt detail page
- [x] Join hunt flow
- [x] Active hunt GPS screen (expo-location + proximity ring + clue-by-ID endpoint)
- [x] Proximity-based clue unlock (GPS + haversine, animated proximity ring)
- [x] Hint reveal (POST /hint endpoint, 5pt deduction, session restore on resume)
- [x] Session resume (detect mid-hunt session on detail screen, continue without re-joining)
- [x] Clue view (text riddle + hint text in active screen)
- [x] QR scanner (expo-camera, fullscreen modal, barcode scan submit)
- [x] Sponsor clue card (branded content — strip with name, message, offer, CTA)
- [x] Progress tracker (Clue X of Y pill + progress bar — already in active screen)
- [x] Basic leaderboard view (ranked list, current player highlighted, pull-to-refresh)
- [x] Hunt completion screen (animated score, stat grid, rank badge, leaderboard CTA)

### Design System
- [ ] Typography selection (display + body fonts)
- [ ] Color palette finalized
- [ ] Button components (pill-shaped, bold)
- [ ] Card components (hunt card, sponsor card, clue card)
- [ ] Map styling (custom Mapbox style)

---

## Phase 2 — First Live Public Hunt

### Backend
- [x] GET /api/v1/player/hunts/:huntId/prizes — returns prizes earned by player in a completed session
- [ ] Prize creation + management endpoints (admin)
- [x] Prize redemption QR generation (POST /player/prizes/:prizeId/redeem — idempotent, UUID qrCode, 90-day expiry)
- [x] Prize redemption validation endpoint (GET + POST /validate by qrCode — marks REDEEMED, rejects expired/already-redeemed)
- [ ] Team creation + joining + team sessions
- [x] Stripe: ticket purchase flow (POST /stripe/checkout/:huntId → Checkout Session URL)
- [x] Stripe: webhook handling (POST /stripe/webhook, raw body, creates GameSession + Payment atomically)
- [x] Stripe: native PaymentSheet — Apple Pay + Google Pay (@stripe/stripe-react-native 0.40, POST /stripe/payment-sheet/:huntId creates PaymentIntent, payment_intent.succeeded webhook provisions session, StripeProvider in _layout.tsx, initPaymentSheet + presentPaymentSheet in hunt detail) — requires EAS build
- [x] Push notifications (Expo Push) — device token saved on login/restore, notifications sent on clue found + hunt complete
- [x] TypeScript: 0 errors (fixed SponsorClue join table pattern in clue admin, fixed early return in player routes)
- [x] Analytics event tracking — CLUE_FOUND + HUNT_COMPLETE recorded to analytics_events table in submit handler; GET /admin/analytics (overall) + GET /admin/analytics/hunts/:huntId (per-hunt funnel)
- [x] Team creation + joining + team sessions — POST /teams, POST /teams/join, GET /teams/:teamId; session.teamId linked on create/join
- [x] Prize creation + management endpoints (admin) — full CRUD at /admin/prizes with filters + pagination
- [x] Sponsor analytics endpoints — GET /admin/analytics/sponsors/:sponsorId (clue visits, prize stats, redemption rate)
- [x] Revenue summary endpoint — GET /admin/analytics/revenue (totals, monthly breakdown, recent payments)
- [x] Hunt duplication endpoint — POST /admin/hunts/:id/duplicate clones hunt + all clues as new DRAFT
- [x] Offline data caching strategy — GET /player/hunts/:huntId/bundle endpoint; mobile huntCache.ts (AsyncStorage, 24h TTL); active screen reads from cache first

### Admin Panel
- [x] Hunt creation wizard (multi-step) — 5-step wizard: Basics → Settings → Schedule+Map → Images → SEO+Whitelabel
- [x] Prize manager — create/edit/delete SponsorPrize records; pages at /hunts/:id/prizes, /prizes/new, /prizes/:prizeId
- [x] Analytics dashboard — /analytics page with event summary cards + recent events table
- [x] Sponsor analytics view — /sponsors/:id/analytics page (4 stat cards + clue funnel with visual bars)
- [x] Revenue dashboard — /revenue page (total/ticket/sponsor revenue, monthly breakdown table, recent payments)
- [x] Live hunt monitor — /live page with 10s polling, player cards, GPS, progress bars
- [x] Player management page — /players with search, status toggle, session count
- [x] White-label settings per hunt — /hunts/:id/whitelabel page (brand name, logo, color picker); wizard step 5 included; mobile active screen applies whitelabelColor dynamically
- [x] Sponsor report PDF export — GET /admin/analytics/sponsors/:id/report.pdf streams pdfkit PDF; ExportPdfButton on sponsor analytics page
- [ ] Seasonal hunt templates

### Mobile Player App
- [x] Map view for hunt discovery — Mapbox map with difficulty-coloured pins, bottom callout card, "View Hunt" CTA; list/map toggle pill in discover screen
- [x] Paid ticket purchase (Stripe Checkout — "Buy Ticket" → browser → poll for session → navigate)
- [x] Team creation + join flow — /team/create and /team/join screens; team options shown after joining a TEAM/BOTH mode hunt
- [x] All clue types — IMAGE renders imageUrl, TEXT_RIDDLE shows answer input, PHOTO_CHALLENGE uses expo-image-picker + GPS gate; photo method added to submit schema + FoundMethod enum
- [ ] Hint system (costs points)
- [x] Prize gallery (prize cards on completion screen, grand prize highlight, "Claim Prize" CTA)
- [x] Prize detail screen (sponsor info, how-to-redeem, QR placeholder)
- [x] Prize redemption QR screen (tap-to-generate QR, white QR card, redeemed/expired status badges)
- [x] Push notification handling (expo-notifications registered on login/restore, foreground handler configured)
- [x] Offline mode (cached clue content) — bundle fetched on hunt start, clues served from AsyncStorage cache
- [x] Hunt history — /history tab shows completed sessions with scores and dates
- [ ] Tourist mode ("I'm visiting [city]")
- [x] Social sharing — Share Result button on completion screen via Share.share() (score, time, clues, deep link)

### Public Pages
- [x] Landing page (city hero, bold design) — /  with nav, hero, features strip, CTA footer
- [x] Active hunts directory — /discover with city/title text filter, hunt cards grid, empty state
- [x] Hunt detail (public, SEO) — /discover/:slug with generateMetadata, full public detail page
- [x] Embeddable hotel widget — /embed/hunts iframe page (dark, city-filterable, noindex); /embed-code snippet generator in dashboard; wildcard CORS on /api/v1/public/*
- [x] About / How it works page — /about with player steps, sponsor section, FAQ

---

## Phase 3 — Scale & Revenue

### Backend
- [ ] Stripe Billing for recurring sponsor fees
- [ ] Automated invoice generation
- [ ] Multi-city tenant support
- [ ] Advanced analytics (cohorts, retention)
- [x] Rate limiting and abuse protection — helmet security headers, express-rate-limit (auth 10/15min, game 60/min, general 200/min), XSS sanitisation middleware
- [ ] API versioning
- [x] Background job queue (BullMQ) — analyticsQueue + emailQueue + cleanupQueue; analytics.worker (off request thread), email.worker (Resend, retry x3), cleanup.worker (nightly 02:00 UTC purge); Bull Board at /bull-board
- [x] Observability — pino structured logging (JSON prod / pretty dev), request ID middleware (X-Request-Id), @sentry/node v10 (gated on SENTRY_DSN), extended /health (DB ping, Redis ping, uptime, memory RSS)

### Admin Panel
- [ ] Multi-city management
- [x] Sponsor self-serve portal — SPONSOR role + User→Sponsor link, register/login endpoints, GET /sponsor/me+clues+analytics, /sponsor/login+register+dashboard pages
- [ ] Advanced analytics dashboards
- [ ] A/B test hunt variations
- [ ] Bulk hunt management

### Mobile App
- [x] App Store submission prep — eas.json (dev/preview/production profiles), app.json (full metadata + permissions + runtimeVersion), STORE_LISTING.md (ready-to-paste copy + submission checklist)
- [x] Achievements + badges system — 8 achievements, evaluateAchievements() in submit handler, GET /profile + /achievements endpoints, Profile tab with badge grid, animated toast in active screen
- [x] Social features — tappable leaderboard profiles (public stats + rival badge + top achievements modal), achievement push notifications
- [ ] AR clue mode (camera-based clues)
- [ ] Accessibility improvements
- [ ] Performance optimization at scale

### Business
- [ ] Hotel partnership integration
- [ ] Event/festival partnership workflow
- [ ] Franchise/license model documentation
