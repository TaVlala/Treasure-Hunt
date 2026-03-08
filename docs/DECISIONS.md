# DECISIONS.md
# Running log of every major technical and architectural decision.
# Every agent and developer must log decisions here as they are made.
# Format: Date | Decision | Why | Alternatives Considered

---

## Decision Log

### 2026-03-08 | React Native + Expo for mobile app
**Decision:** Use React Native with Expo SDK 52 for the player mobile app.
**Why:** Cross-platform (iOS, Android, Web) from a single TypeScript codebase. Expo simplifies
builds, push notifications, OTA updates, and camera/location access. Largest hiring pool
for React developers. Expo Router provides file-based routing similar to Next.js.
**Alternatives:** Flutter (Dart is a second language, weaker Mapbox integration), Ionic
(performance concerns for GPS-heavy map app, feels like a web wrapper).

---

### 2026-03-08 | Next.js 15 for admin panel and public pages
**Decision:** Use Next.js with App Router for the admin panel and SEO-optimized public pages.
**Why:** Admin panel needs fast client-side interactions. Public discovery pages ("things to do
in [city]") need SSR/SSG for SEO — Next.js excels at both. Same TypeScript ecosystem as
mobile and server. Deploys to Vercel with zero config.
**Alternatives:** Separate admin SPA + static site (unnecessary complexity), Remix (smaller
ecosystem, less deployment flexibility).

---

### 2026-03-08 | Node.js + Express for backend API
**Decision:** Use Node.js with Express 5 and TypeScript for the backend.
**Why:** Same language (TypeScript) across the entire stack — shared types, shared validation
schemas, shared constants. Express has the largest middleware ecosystem. Socket.io integrates
natively. Easy to hire for.
**Alternatives:** Django (Python adds a second language), Fastify (smaller ecosystem,
fewer tutorials), NestJS (too much boilerplate for early stage).

---

### 2026-03-08 | PostgreSQL + PostGIS for database
**Decision:** Use PostgreSQL 16 with PostGIS extension for all data storage.
**Why:** The data model is deeply relational (hunts → clues → sponsors → prizes → sessions).
PostGIS provides native geospatial queries — proximity checks become a single SQL query
instead of application-level math. Battle-tested at massive scale. Free and open source.
**Alternatives:** MongoDB (relational data is a poor fit, no native geo joins), Firebase
Firestore (vendor lock-in, complex queries are expensive and limited), Supabase PostgreSQL
(good option but we want more control over the server layer).

---

### 2026-03-08 | Prisma for ORM
**Decision:** Use Prisma as the database ORM.
**Why:** Generates TypeScript types from schema — shared across all apps. Clean migration
system. Excellent developer experience with autocomplete. Works with PostGIS via extensions.
**Alternatives:** Drizzle (newer, less mature), TypeORM (more boilerplate), raw SQL
(maintainability concerns at scale).

---

### 2026-03-08 | Mapbox for maps and location display
**Decision:** Use Mapbox GL JS (web) and React Native Mapbox (mobile) for all map rendering.
**Why:** Far more customizable than Google Maps — critical for the premium design direction.
Custom map styles allow bold, branded map aesthetics instead of default Google Maps chrome.
50K free map loads/month covers early stage. 3D terrain and custom markers.
**Alternatives:** Google Maps (more expensive, harder to customize styling to match design
direction), OpenStreetMap/Leaflet (requires more work for premium styling, no native mobile SDK).

---

### 2026-03-08 | Cloudflare R2 for file storage
**Decision:** Use Cloudflare R2 for sponsor logos, clue images, and hunt thumbnails.
**Why:** S3-compatible API (familiar tooling), zero egress fees (images served to players
don't cost extra), 10GB free storage, automatic CDN via Cloudflare.
**Alternatives:** AWS S3 (egress fees add up with many players loading images), Firebase
Storage (vendor lock-in), Supabase Storage (tied to Supabase ecosystem).

---

### 2026-03-08 | Monorepo with Turborepo
**Decision:** Use a Turborepo monorepo with npm workspaces.
**Why:** All three apps (mobile, admin, server) share TypeScript types, constants, and
validation schemas. Turborepo caches builds and runs tasks in parallel. Simpler than
maintaining three separate repos with versioned shared packages.
**Alternatives:** Nx (more complex setup), separate repos (type sharing becomes painful),
Lerna (effectively deprecated).

---

### 2026-03-08 | JWT with refresh token rotation for auth
**Decision:** Use JWT access tokens (15min) with httpOnly cookie refresh tokens (7 days)
and refresh token rotation.
**Why:** Stateless auth works well with the API-first architecture. Short-lived access tokens
limit damage if compromised. Refresh token rotation detects token theft. Role claim in JWT
enables middleware-based route protection.
**Alternatives:** Session-based auth (requires server state, harder to scale), Auth0/Clerk
(adds cost and vendor dependency for a simple two-role system), Passport.js sessions
(same session concerns).

---

### 2026-03-08 | Store prices in cents (integer)
**Decision:** All monetary values stored as integers representing cents.
**Why:** Floating point arithmetic causes rounding errors with money. Storing as cents
(e.g., $29.99 = 2999) eliminates this. Industry standard practice (Stripe does this too).
**Alternatives:** DECIMAL type (acceptable but cents is more explicit and simpler in code).

---

### 2026-03-08 | Bold premium design direction inspired by bornandbredbrand.com
**Decision:** Follow a bold, confident, editorial design aesthetic — not a typical SaaS look.
**Why:** This is a tourism product. It must feel like a premium city experience, not a
software tool. Large typography, cinematic imagery, minimal color palette, bold CTAs.
Sponsor content must feel integrated and premium, never like ads.
**Alternatives:** Material Design (too generic), typical SaaS (wrong audience), gamified
bright UI (too childish for tourism market).

---

### 2026-03-08 | No separate sponsor portal (Phase 1-2)
**Decision:** All sponsor management is handled by the admin. No self-serve sponsor login.
**Why:** Early stage — the admin (platform owner) is the single point of contact for sponsors.
Building a sponsor portal before product-market fit is premature. Admin creates sponsor
profiles, manages clue placement, generates reports to share manually.
**Alternatives:** Build sponsor portal now (over-engineering, no sponsors yet to use it).
Planned for Phase 3+ once sponsor volume justifies the investment.

---

### 2026-03-08 | Multi-tenancy designed in from day one
**Decision:** Data model and architecture support multi-city/multi-tenant from the start.
**Why:** The business goal is to eventually license the platform to other cities. Hunts are
scoped to cities. Sponsors are location-bound. White-label settings are per-hunt. This
avoids a painful refactor later.
**Alternatives:** Single-tenant and refactor later (technical debt, data migration risk).
