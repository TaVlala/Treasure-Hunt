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
- [ ] Prize redemption validation endpoint (sponsor scans QR → marks REDEEMED)
- [ ] Team creation + joining + team sessions
- [ ] Stripe: ticket purchase flow
- [ ] Stripe: webhook handling
- [ ] Push notifications (Expo Push)
- [ ] Analytics event tracking
- [ ] Sponsor analytics endpoints
- [ ] Revenue summary endpoint
- [ ] Hunt duplication endpoint
- [ ] Offline data caching strategy

### Admin Panel
- [ ] Hunt creation wizard (multi-step)
- [ ] Prize manager
- [ ] Sponsor analytics view (charts)
- [ ] Revenue dashboard
- [ ] Live hunt monitor (player map)
- [ ] Player management page
- [ ] White-label settings per hunt
- [ ] Sponsor report PDF export
- [ ] Seasonal hunt templates

### Mobile Player App
- [ ] Map view for hunt discovery
- [ ] Paid ticket purchase (Stripe Checkout)
- [ ] Team creation + join flow
- [ ] All clue types (image, photo challenge)
- [ ] Hint system (costs points)
- [x] Prize gallery (prize cards on completion screen, grand prize highlight, "Claim Prize" CTA)
- [x] Prize detail screen (sponsor info, how-to-redeem, QR placeholder)
- [x] Prize redemption QR screen (tap-to-generate QR, white QR card, redeemed/expired status badges)
- [ ] Push notification handling
- [ ] Offline mode (cached clue content)
- [ ] Hunt history + achievements
- [ ] Tourist mode ("I'm visiting [city]")
- [ ] Social sharing

### Public Pages
- [ ] Landing page (city hero, bold design)
- [ ] Active hunts directory
- [ ] Hunt detail (public, SEO)
- [ ] Embeddable widget for hotels
- [ ] About / How it works page

---

## Phase 3 — Scale & Revenue

### Backend
- [ ] Stripe Billing for recurring sponsor fees
- [ ] Automated invoice generation
- [ ] Multi-city tenant support
- [ ] Advanced analytics (cohorts, retention)
- [ ] Rate limiting and abuse protection
- [ ] API versioning
- [ ] Background job queue (bull/bullmq)

### Admin Panel
- [ ] Multi-city management
- [ ] Sponsor self-serve portal (separate auth)
- [ ] Advanced analytics dashboards
- [ ] A/B test hunt variations
- [ ] Bulk hunt management

### Mobile App
- [ ] App Store submission (iOS + Android)
- [ ] Achievements + badges system
- [ ] Social features (follow players, share results)
- [ ] AR clue mode (camera-based clues)
- [ ] Accessibility improvements
- [ ] Performance optimization at scale

### Business
- [ ] Hotel partnership integration
- [ ] Event/festival partnership workflow
- [ ] Franchise/license model documentation
