# CLAUDE.md
# Auto-read by Claude Code at the start of every session.
# This is the single source of truth for project context.

---

## Project Overview

**Treasure Hunt** is a Location-Based Tourism Scavenger Hunt Platform — a marketing
channel for local businesses disguised as a fun GPS-based game for tourists and locals.
Sponsors pay to place branded clues at their locations. Players explore the city, find
clues, and redeem prizes at sponsor businesses. Revenue comes from sponsor fees, paid
hunt tickets, and tourism board contracts.

## Current Phase: Phase 1 MVP — Mobile Player App (Expo)

**Status:** Backend API complete. Admin panel Phase 1 fully complete. Mobile app: auth + discovery + hunt detail + active hunt GPS screen + hint reveal + session resume + QR scanner complete.

**Last completed chunk:** Hint reveal + session resume + QR scanner — added `POST /api/v1/game/sessions/:sessionId/hint` (5pt atomic deduction via `$transaction`); added `GET /api/v1/player/hunts/:huntId/my-session`; installed `expo-camera`; rewrote `active.tsx` with hint reveal, QR fullscreen modal (`CameraView`), hint state restore on resume, QR scan debouncing; updated `index.tsx` with parallel session fetch + Resume/Join conditional footer.
**Next chunk:** Sponsor clue card + progress tracker — show branded sponsor content on active clue card (logo, name, CTA), add clue progress indicator ("Clue 2 of 5") to active screen, and basic leaderboard view screen.

**Known fix:** Express 5 `ParamsDictionary` types named params as `string | string[]` — always extract with `req.params['key'] as string` in route handlers.

**Tailwind on Windows (non-CWD launch):** `postcss.config.js` must pass `config: path.join(__dirname, 'tailwind.config.js')` explicitly. `tailwind.config.js` must convert `__dirname` with `path.sep` split to avoid Windows backslashes in fast-glob patterns.

## Key Architectural Decisions

- **Monorepo** (Turborepo + npm workspaces) with 3 apps + 1 shared package
- **Mobile:** React Native + Expo SDK 52 (player app, cross-platform)
- **Admin + Public:** Next.js 15 App Router (admin panel + SEO pages)
- **Backend:** Node.js + Express 5 + TypeScript (single API server)
- **Database:** PostgreSQL 16 + PostGIS (geospatial queries for proximity)
- **ORM:** Prisma (type-safe, shared types across apps)
- **Maps:** Mapbox (customizable styling for premium design direction)
- **Auth:** JWT access + refresh tokens, two roles: admin and player
- **Storage:** Cloudflare R2 (zero egress fees)
- **Payments:** Stripe (tickets + future sponsor billing)
- **Real-time:** Socket.io (leaderboards + live tracking)
- **Design:** Bold, editorial, premium tourism aesthetic (not generic SaaS)

See `docs/ARCHITECTURE.md` for full technical details.
See `docs/DECISIONS.md` for reasoning behind each decision.

## Known Issues / Technical Debt

None yet — project has not started development.

## Commands to Run Locally

```bash
# Install all dependencies (from root)
npm install

# Start backend API server
npm run dev --workspace=apps/server        # http://localhost:3001

# Start admin panel
npm run dev --workspace=apps/admin         # http://localhost:3000

# Start mobile app (Expo)
npm run dev --workspace=apps/mobile        # Expo Go on device

# Run all apps in parallel
npm run dev                                # via Turborepo

# Database
npx prisma migrate dev --schema=apps/server/prisma/schema.prisma
npx prisma db seed --schema=apps/server/prisma/schema.prisma
npx prisma studio --schema=apps/server/prisma/schema.prisma
```

## Project Files to Read First

1. `CLAUDE.md` — this file (project context)
2. `docs/PROGRESS.md` — what's done, what's next
3. `docs/ARCHITECTURE.md` — full technical architecture
4. `docs/DECISIONS.md` — why decisions were made
5. `docs/SPONSORS.md` — sponsor system documentation

## Git Workflow

- **Never commit to main** — always use feature branches
- Branch naming: `feature/`, `fix/`, `refactor/`
- Descriptive commit messages (what + why)
- Remote: https://github.com/TaVlala/Treasure-Hunt.git

## Work Chunk Rules (MANDATORY)

Every task must follow these rules — no exceptions.

### Before Starting Each Chunk:
1. Tell the user what you are about to build
2. Roughly how long it will take
3. What the codebase will look like when done
4. **Wait for "go"** — do NOT start until approved

### During Each Chunk:
- Work in self-contained chunks with clear start and end
- Never stop mid-feature leaving broken code
- The codebase must be in a WORKING state when the chunk ends

### After Finishing Each Chunk:
1. Commit all changes to a feature branch and push to remote
2. Update PROGRESS.md — mark completed items
3. Update CLAUDE.md — summarize current state
4. Tell the user: what was completed, files changed, what comes next
5. **Wait for "continue"** — do NOT start next chunk until approved

### If Approaching Context Limit:
1. Stop at the nearest clean breakpoint
2. Do NOT start a new feature you cannot finish
3. Commit what is done
4. Update PROGRESS.md and CLAUDE.md with exact state
5. Write TODO comment in any unfinished file
6. Tell the user exactly where you stopped and how to continue

### Chunk Size Guide:
- Small: one file, one function, one endpoint
- Medium: one complete feature (e.g. player auth)
- Large: one full phase (only if clearly scoped)
- When in doubt — do LESS and commit MORE often

## Code Quality Rules

- TypeScript strict mode — no `any`
- Every file starts with 2-3 line comment explaining purpose
- Every function gets a one-line comment
- Named constants, no magic numbers
- Short functions, one responsibility each
- Zod for all validation (shared schemas between client + server)
- `.env.example` with every variable documented

## Multi-Agent Workflow

Multiple agents (Claude Code, Gemini Flash, etc.) work on this project.
- **Starting a session:** Pull latest → read CLAUDE.md → read PROGRESS.md
- **Ending a session:** Update PROGRESS.md → update CLAUDE.md → commit → push
- See full workflow in the original project specification.
