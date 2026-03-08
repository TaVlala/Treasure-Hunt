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
- [ ] Auth: register + login + JWT + refresh tokens
- [ ] Auth middleware (authenticate + requireRole)
- [ ] Hunt CRUD (admin)
- [ ] Clue CRUD (admin)
- [ ] Sponsor CRUD (admin)
- [ ] GPS proximity check endpoint
- [ ] Game session: join hunt
- [ ] Game session: check proximity / scan QR / submit answer
- [ ] Player progress tracking
- [ ] Basic leaderboard endpoint
- [ ] File upload to R2
- [ ] WebSocket: leaderboard updates

### Admin Panel (Next.js)
- [ ] Next.js project setup
- [ ] Admin auth (login page + JWT handling)
- [ ] Dashboard (placeholder stats)
- [ ] Hunt list page
- [ ] Hunt creation form
- [ ] Map-based clue placement (Mapbox)
- [ ] Clue editor (text, GPS proximity, QR)
- [ ] Sponsor list page
- [ ] Sponsor creation/edit form
- [ ] Link sponsor to clue

### Mobile Player App (Expo)
- [ ] Expo project setup
- [ ] Player auth (register + login)
- [ ] Hunt discovery screen (list view)
- [ ] Hunt detail page
- [ ] Join hunt flow
- [ ] Active hunt GPS map (Mapbox)
- [ ] Proximity-based clue unlock
- [ ] Clue view (text riddle)
- [ ] QR scanner
- [ ] Sponsor clue card (branded content)
- [ ] Progress tracker
- [ ] Basic leaderboard view
- [ ] Hunt completion screen

### Design System
- [ ] Typography selection (display + body fonts)
- [ ] Color palette finalized
- [ ] Button components (pill-shaped, bold)
- [ ] Card components (hunt card, sponsor card, clue card)
- [ ] Map styling (custom Mapbox style)

---

## Phase 2 — First Live Public Hunt

### Backend
- [ ] Prize creation + management endpoints
- [ ] Prize redemption QR generation
- [ ] Prize redemption validation endpoint
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
- [ ] Prize gallery
- [ ] Prize redemption QR screen
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
