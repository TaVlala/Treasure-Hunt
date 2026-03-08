# ARCHITECTURE.md
# Single source of truth for all technical architecture decisions.
# Every agent and developer must read this before starting work.

---

## System Overview

Three applications in one monorepo, sharing types and utilities:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │  Admin Panel +   │    │   Backend API   │
│  (React Native  │───▶│  Public Pages    │───▶│  (Express +     │
│   + Expo)       │    │  (Next.js)       │    │   PostgreSQL)   │
│   Player-facing │    │  Admin + SEO     │    │   All business  │
└─────────────────┘    └─────────────────┘    │   logic here    │
        │                      │               └─────────────────┘
        │                      │                       │
        └──────────┬───────────┘                       │
                   │                                   │
           ┌───────▼───────┐                   ┌───────▼───────┐
           │  Shared Pkg   │                   │  PostgreSQL   │
           │  Types, utils │                   │  + PostGIS    │
           │  constants    │                   └───────────────┘
           └───────────────┘
```

---

## Tech Stack (Approved Versions)

| Layer | Technology | Version |
|---|---|---|
| Mobile | React Native + Expo | SDK 52 |
| Mobile Navigation | Expo Router | v4 |
| Admin + Public | Next.js (App Router) | 15.x |
| Backend | Node.js + Express | Node 20 LTS, Express 5 |
| Language | TypeScript | 5.x (strict mode) |
| Database | PostgreSQL + PostGIS | 16.x |
| ORM | Prisma | 6.x |
| Real-time | Socket.io | 4.x |
| Maps | Mapbox GL JS + RN Mapbox | Latest |
| Auth | JWT (access + refresh) | jsonwebtoken + bcrypt |
| File Storage | Cloudflare R2 | S3-compatible |
| Payments | Stripe | Latest API |
| Push Notifications | Expo Push + FCM/APNs | Built into Expo |
| Email | Resend | Latest |
| Monorepo | Turborepo + npm workspaces | Latest |
| Hosting (API) | Railway | — |
| Hosting (Admin) | Vercel | — |
| Hosting (DB) | Railway PostgreSQL | — |

---

## Monorepo Folder Structure

```
Treasure-Hunt/
├── apps/
│   ├── mobile/                    # React Native + Expo (Player App)
│   │   ├── app/                   # Expo Router file-based screens
│   │   │   ├── (auth)/            # Login, Register, Onboarding
│   │   │   ├── (tabs)/            # Main tab navigator
│   │   │   │   ├── explore/       # Hunt discovery (map + list)
│   │   │   │   ├── hunts/         # My active/past hunts
│   │   │   │   ├── prizes/        # Prize gallery + redemption
│   │   │   │   └── profile/       # Settings, achievements
│   │   │   ├── hunt/[id]/         # Hunt detail + active game screens
│   │   │   └── _layout.tsx        # Root layout
│   │   ├── components/
│   │   │   ├── map/               # Map overlays, markers, controls
│   │   │   ├── hunt/              # Hunt cards, clue views, timers
│   │   │   ├── sponsor/           # Sponsor cards, branded content
│   │   │   ├── game/              # QR scanner, answer input, progress
│   │   │   └── ui/                # Buttons, cards, modals, typography
│   │   ├── hooks/                 # Custom hooks (useLocation, useGame, etc)
│   │   ├── services/              # API client, socket client, storage
│   │   ├── stores/                # Zustand stores (auth, game, location)
│   │   ├── utils/                 # Helpers, formatters, validators
│   │   ├── assets/                # Fonts, images, icons
│   │   ├── constants/             # Theme, config, named constants
│   │   ├── app.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── admin/                     # Next.js (Admin Panel + Public Pages)
│   │   ├── app/
│   │   │   ├── (admin)/           # Protected admin routes
│   │   │   │   ├── dashboard/     # Overview stats
│   │   │   │   ├── hunts/         # Hunt CRUD + map editor
│   │   │   │   ├── sponsors/      # Sponsor management
│   │   │   │   ├── analytics/     # Charts, reports
│   │   │   │   ├── revenue/       # Payments, invoices
│   │   │   │   ├── players/       # Player management
│   │   │   │   ├── live/          # Real-time hunt monitor
│   │   │   │   └── settings/      # White-label, general
│   │   │   ├── (public)/          # SEO-optimized public routes
│   │   │   │   ├── page.tsx       # Landing page (city hero)
│   │   │   │   ├── hunts/         # Active hunts directory
│   │   │   │   ├── hunt/[slug]/   # Hunt detail (public)
│   │   │   │   └── about/         # How it works
│   │   │   ├── (auth)/            # Admin login
│   │   │   ├── api/               # BFF routes if needed
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── admin/             # Admin-specific components
│   │   │   ├── public/            # Public page components
│   │   │   ├── maps/              # Map editor, pin placement
│   │   │   └── ui/                # Shared UI components
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── public/                # Static assets
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── server/                    # Node.js + Express (API)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.routes.ts
│       │   │   ├── hunt.routes.ts
│       │   │   ├── clue.routes.ts
│       │   │   ├── sponsor.routes.ts
│       │   │   ├── game.routes.ts
│       │   │   ├── team.routes.ts
│       │   │   ├── leaderboard.routes.ts
│       │   │   ├── prize.routes.ts
│       │   │   ├── payment.routes.ts
│       │   │   ├── analytics.routes.ts
│       │   │   ├── upload.routes.ts
│       │   │   └── public.routes.ts
│       │   ├── controllers/       # Request handling, validation
│       │   ├── services/          # Business logic layer
│       │   ├── middleware/
│       │   │   ├── auth.ts        # JWT verification + role check
│       │   │   ├── rateLimiter.ts
│       │   │   ├── errorHandler.ts
│       │   │   └── validate.ts    # Zod schema validation
│       │   ├── websocket/
│       │   │   ├── index.ts       # Socket.io setup
│       │   │   ├── leaderboard.ts
│       │   │   ├── liveTracking.ts
│       │   │   └── huntUpdates.ts
│       │   ├── utils/
│       │   │   ├── geo.ts         # PostGIS helpers, distance calc
│       │   │   ├── qrCode.ts      # QR generation + validation
│       │   │   └── tokens.ts      # JWT helpers
│       │   ├── config/
│       │   │   ├── database.ts
│       │   │   ├── stripe.ts
│       │   │   ├── r2.ts
│       │   │   ├── mapbox.ts
│       │   │   └── env.ts         # Validated env with Zod
│       │   ├── jobs/              # Background tasks (cron)
│       │   │   ├── expireHunts.ts
│       │   │   └── sponsorReports.ts
│       │   └── index.ts           # App entry point
│       ├── prisma/
│       │   ├── schema.prisma      # Full database schema
│       │   ├── seed.ts            # Demo data seeder
│       │   └── migrations/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                    # Shared across all apps
│       ├── src/
│       │   ├── types/
│       │   │   ├── user.ts
│       │   │   ├── hunt.ts
│       │   │   ├── clue.ts
│       │   │   ├── sponsor.ts
│       │   │   ├── game.ts
│       │   │   ├── payment.ts
│       │   │   └── api.ts         # API request/response types
│       │   ├── constants/
│       │   │   ├── clueTypes.ts
│       │   │   ├── huntStatus.ts
│       │   │   ├── sponsorTiers.ts
│       │   │   └── gameConfig.ts  # CLUE_PROXIMITY_METERS etc
│       │   └── utils/
│       │       ├── validation.ts  # Zod schemas (shared client+server)
│       │       └── formatting.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── ARCHITECTURE.md            # This file
│   ├── DECISIONS.md               # Decision log
│   ├── SPONSORS.md                # Sponsor system documentation
│   └── PROGRESS.md                # Feature checklist
│
├── CLAUDE.md                      # Auto-read by Claude Code
├── .gitignore
├── .env.example                   # All env vars documented
├── package.json                   # Workspace root
├── turbo.json                     # Turborepo config
└── tsconfig.base.json             # Shared TS config
```

---

## Database Schema

### Entity Relationship Overview

```
Users ──┬── GameSessions ── PlayerProgress
        │        │
        │        └── Redemptions ── SponsorPrizes
        │
        ├── Teams ── TeamMembers
        │
Hunts ──┼── Clues ── SponsorClues
        │
Sponsors ──┬── SponsorClues
           ├── SponsorPrizes
           └── Payments

AnalyticsEvents (references all entities via nullable FKs)
```

### Full Schema

#### Users
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'player',  -- 'admin' | 'player'
  display_name    VARCHAR(100) NOT NULL,
  avatar_url      VARCHAR(500),
  home_city       VARCHAR(100),                           -- for tourist mode
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### Hunts
```sql
CREATE TABLE hunts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(200) NOT NULL,
  slug                VARCHAR(200) UNIQUE NOT NULL,        -- URL-safe: "christmas-old-town-2024"
  description         TEXT NOT NULL,
  city                VARCHAR(100) NOT NULL,
  region              VARCHAR(100),
  difficulty          VARCHAR(20) NOT NULL,                -- 'easy' | 'medium' | 'hard'
  theme               VARCHAR(50) NOT NULL DEFAULT 'general',
                      -- 'general' | 'christmas' | 'halloween' | 'summer' | 'festival' | 'custom'
  hunt_type           VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free' | 'paid'
  ticket_price_cents  INTEGER,                             -- stored as cents to avoid float issues
  currency            VARCHAR(3) DEFAULT 'USD',
  time_limit_minutes  INTEGER,                             -- NULL = no time limit
  max_players         INTEGER,                             -- NULL = unlimited
  team_mode           VARCHAR(20) NOT NULL DEFAULT 'both', -- 'solo' | 'team' | 'both'
  max_team_size       INTEGER DEFAULT 4,
  status              VARCHAR(20) NOT NULL DEFAULT 'draft',
                      -- 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  starts_at           TIMESTAMPTZ,                         -- NULL = available anytime
  ends_at             TIMESTAMPTZ,
  thumbnail_url       VARCHAR(500),
  cover_image_url     VARCHAR(500),

  -- White-label fields for tourism board branding
  whitelabel_name     VARCHAR(200),
  whitelabel_logo_url VARCHAR(500),
  whitelabel_color    VARCHAR(7),                          -- hex color

  -- Map bounds for this hunt
  center_lat          DECIMAL(10, 8) NOT NULL,
  center_lng          DECIMAL(11, 8) NOT NULL,
  zoom_level          INTEGER DEFAULT 14,

  -- SEO
  meta_title          VARCHAR(200),
  meta_description    VARCHAR(500),

  created_by          UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hunts_city ON hunts(city);
CREATE INDEX idx_hunts_status ON hunts(status);
CREATE INDEX idx_hunts_slug ON hunts(slug);
```

#### Clues
```sql
CREATE TABLE clues (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id                 UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  order_index             INTEGER NOT NULL,                -- display/unlock order
  title                   VARCHAR(200) NOT NULL,
  description             TEXT NOT NULL,                   -- the riddle or clue text
  hint_text               TEXT,                            -- optional hint (costs points?)
  clue_type               VARCHAR(30) NOT NULL,
                          -- 'text_riddle' | 'image' | 'gps_proximity' | 'qr_code' | 'photo_challenge'
  answer                  VARCHAR(500),                    -- correct answer for riddle type
  image_url               VARCHAR(500),                    -- clue image or photo
  latitude                DECIMAL(10, 8) NOT NULL,
  longitude               DECIMAL(11, 8) NOT NULL,
  location                GEOGRAPHY(POINT, 4326),          -- PostGIS geospatial column
  proximity_radius_meters INTEGER NOT NULL DEFAULT 50,     -- radius to trigger clue unlock
  is_bonus                BOOLEAN DEFAULT false,           -- bonus clue, not required
  points                  INTEGER NOT NULL DEFAULT 10,
  unlock_message          TEXT,                            -- shown when clue is found
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(hunt_id, order_index)
);
CREATE INDEX idx_clues_hunt ON clues(hunt_id);
CREATE INDEX idx_clues_location ON clues USING GIST(location);
```

#### Sponsors
```sql
CREATE TABLE sponsors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name   VARCHAR(200) NOT NULL,
  contact_name    VARCHAR(100),
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(50),
  website_url     VARCHAR(500),
  logo_url        VARCHAR(500),
  description     TEXT,
  address         TEXT NOT NULL,
  latitude        DECIMAL(10, 8) NOT NULL,
  longitude       DECIMAL(11, 8) NOT NULL,
  location        GEOGRAPHY(POINT, 4326),

  tier            VARCHAR(20) NOT NULL DEFAULT 'basic',
                  -- 'basic' | 'featured' | 'prize'
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
                  -- 'active' | 'paused' | 'expired'
  contract_start  DATE,
  contract_end    DATE,
  monthly_fee_cents INTEGER,
  notes           TEXT,                                    -- admin-only notes

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### Sponsor Clues (linking sponsors to specific clues with branding)
```sql
CREATE TABLE sponsor_clues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id      UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  clue_id         UUID NOT NULL REFERENCES clues(id) ON DELETE CASCADE,
  branded_message TEXT,                                    -- message shown to player
  offer_text      VARCHAR(500),                            -- "Show this for 10% off!"
  branding_color  VARCHAR(7),                              -- hex accent color
  call_to_action  VARCHAR(200),                            -- CTA button text
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(clue_id)  -- one sponsor per clue
);
```

#### Sponsor Prizes
```sql
CREATE TABLE sponsor_prizes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id        UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  hunt_id           UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  prize_type        VARCHAR(30) NOT NULL,
                    -- 'discount' | 'free_item' | 'experience' | 'gift_card' | 'merch'
  value_description VARCHAR(200),                          -- "20% off any coffee" or "$25 value"
  redemption_limit  INTEGER,                               -- NULL = unlimited
  redemptions_used  INTEGER NOT NULL DEFAULT 0,
  expiry_date       DATE,
  terms_conditions  TEXT,
  image_url         VARCHAR(500),
  is_grand_prize    BOOLEAN DEFAULT false,                 -- awarded to hunt winner
  min_clues_found   INTEGER DEFAULT 0,                     -- minimum clues to earn this prize

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

#### Game Sessions
```sql
CREATE TABLE game_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id         UUID NOT NULL REFERENCES hunts(id),
  player_id       UUID NOT NULL REFERENCES users(id),
  team_id         UUID REFERENCES teams(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
                  -- 'active' | 'completed' | 'abandoned' | 'timed_out'
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  score           INTEGER NOT NULL DEFAULT 0,
  clues_found     INTEGER NOT NULL DEFAULT 0,
  total_clues     INTEGER NOT NULL,                        -- snapshot at start time
  time_taken_secs INTEGER,                                 -- NULL until completed

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(hunt_id, player_id)  -- one session per player per hunt
);
CREATE INDEX idx_sessions_hunt ON game_sessions(hunt_id);
CREATE INDEX idx_sessions_player ON game_sessions(player_id);
```

#### Player Progress
```sql
CREATE TABLE player_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  clue_id         UUID NOT NULL REFERENCES clues(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'locked',
                  -- 'locked' | 'unlocked' | 'found' | 'skipped'
  found_at        TIMESTAMPTZ,
  method          VARCHAR(20),                             -- 'gps' | 'qr_code' | 'answer'
  points_earned   INTEGER NOT NULL DEFAULT 0,
  hint_used       BOOLEAN DEFAULT false,

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, clue_id)
);
```

#### Teams
```sql
CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  hunt_id       UUID NOT NULL REFERENCES hunts(id),
  invite_code   VARCHAR(8) UNIQUE NOT NULL,                -- 8-char alphanumeric
  max_members   INTEGER NOT NULL DEFAULT 4,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, user_id)
);
```

#### Redemptions
```sql
CREATE TABLE redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_id        UUID NOT NULL REFERENCES sponsor_prizes(id),
  player_id       UUID NOT NULL REFERENCES users(id),
  session_id      UUID NOT NULL REFERENCES game_sessions(id),
  qr_code         VARCHAR(100) UNIQUE NOT NULL,            -- unique redemption code
  status          VARCHAR(20) NOT NULL DEFAULT 'generated',
                  -- 'generated' | 'redeemed' | 'expired'
  redeemed_at     TIMESTAMPTZ,
  redeemed_by     VARCHAR(100),                            -- staff name who processed it
  expires_at      TIMESTAMPTZ NOT NULL,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_redemptions_qr ON redemptions(qr_code);
```

#### Payments
```sql
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type      VARCHAR(30) NOT NULL,                  -- 'sponsor_fee' | 'ticket_purchase'
  payer_type        VARCHAR(20) NOT NULL,                  -- 'sponsor' | 'player'
  payer_id          UUID NOT NULL,                         -- FK to sponsors or users
  amount_cents      INTEGER NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
  stripe_payment_id VARCHAR(200),
  stripe_invoice_id VARCHAR(200),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
                    -- 'pending' | 'completed' | 'failed' | 'refunded'
  description       VARCHAR(500),
  metadata          JSONB,                                 -- flexible extra data

  -- For ticket purchases
  hunt_id           UUID REFERENCES hunts(id),
  session_id        UUID REFERENCES game_sessions(id),

  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payments_payer ON payments(payer_type, payer_id);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_id);
```

#### Analytics Events
```sql
CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  VARCHAR(50) NOT NULL,
              -- 'hunt_view' | 'hunt_start' | 'hunt_complete' | 'clue_found' |
              -- 'sponsor_view' | 'sponsor_click' | 'prize_earned' | 'prize_redeemed' |
              -- 'ticket_purchased' | 'team_created' | 'qr_scanned'
  hunt_id     UUID REFERENCES hunts(id),
  clue_id     UUID REFERENCES clues(id),
  sponsor_id  UUID REFERENCES sponsors(id),
  player_id   UUID REFERENCES users(id),
  session_id  UUID REFERENCES game_sessions(id),
  metadata    JSONB,                                       -- flexible event-specific data
  latitude    DECIMAL(10, 8),
  longitude   DECIMAL(11, 8),

  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_hunt ON analytics_events(hunt_id);
CREATE INDEX idx_analytics_sponsor ON analytics_events(sponsor_id);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);
```

---

## API Architecture

### Base URL: `/api/v1`

### Authentication
- All routes except public and auth routes require a valid JWT
- Admin routes additionally require `role === 'admin'`
- Tokens: access token (15min) + refresh token (7 days, stored in httpOnly cookie)

### Auth Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Register new player account | None |
| POST | `/auth/login` | Login (returns tokens) | None |
| POST | `/auth/refresh` | Refresh access token | Refresh cookie |
| POST | `/auth/logout` | Invalidate refresh token | Player/Admin |
| GET | `/auth/me` | Get current user profile | Player/Admin |
| PUT | `/auth/me` | Update profile | Player/Admin |
| POST | `/auth/forgot-password` | Send reset email | None |
| POST | `/auth/reset-password` | Reset with token | None |

### Admin — Hunts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/hunts` | List all hunts (filterable) |
| POST | `/admin/hunts` | Create new hunt |
| GET | `/admin/hunts/:id` | Get hunt with all clues |
| PUT | `/admin/hunts/:id` | Update hunt |
| DELETE | `/admin/hunts/:id` | Delete hunt (soft) |
| POST | `/admin/hunts/:id/publish` | Set status to active |
| POST | `/admin/hunts/:id/pause` | Pause active hunt |
| POST | `/admin/hunts/:id/archive` | Archive completed hunt |
| POST | `/admin/hunts/:id/duplicate` | Clone hunt as draft |

### Admin — Clues
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/hunts/:huntId/clues` | List clues for hunt |
| POST | `/admin/hunts/:huntId/clues` | Add clue to hunt |
| PUT | `/admin/clues/:id` | Update clue |
| DELETE | `/admin/clues/:id` | Remove clue |
| PUT | `/admin/hunts/:huntId/clues/reorder` | Reorder clues |

### Admin — Sponsors
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/sponsors` | List all sponsors |
| POST | `/admin/sponsors` | Create sponsor profile |
| GET | `/admin/sponsors/:id` | Sponsor detail + stats |
| PUT | `/admin/sponsors/:id` | Update sponsor |
| DELETE | `/admin/sponsors/:id` | Deactivate sponsor |
| GET | `/admin/sponsors/:id/report` | Foot traffic report |
| POST | `/admin/sponsors/:id/clues` | Assign sponsor to clue |

### Admin — Prizes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/prizes` | List all prizes |
| POST | `/admin/sponsors/:sponsorId/prizes` | Create prize |
| PUT | `/admin/prizes/:id` | Update prize |
| DELETE | `/admin/prizes/:id` | Remove prize |
| GET | `/admin/prizes/:id/redemptions` | View redemption history |

### Admin — Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/analytics/dashboard` | Overview metrics |
| GET | `/admin/analytics/hunts/:id` | Per-hunt analytics |
| GET | `/admin/analytics/sponsors/:id` | Per-sponsor analytics |
| GET | `/admin/analytics/revenue` | Revenue summary |
| GET | `/admin/analytics/players/live` | Live player positions |

### Admin — Payments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/payments` | List all payments |
| POST | `/admin/payments/invoice` | Create Stripe invoice for sponsor |
| GET | `/admin/payments/summary` | Revenue totals by period |

### Player — Hunt Discovery
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/hunts` | Browse active hunts | Player |
| GET | `/hunts/:slug` | Hunt detail page | Player |
| GET | `/hunts/nearby` | Hunts near GPS coords (`?lat=&lng=&radius=`) | Player |
| GET | `/hunts/city/:citySlug` | Hunts in a specific city | Player |

### Player — Game
| Method | Path | Description |
|--------|------|-------------|
| POST | `/game/join/:huntId` | Start a new game session |
| GET | `/game/session/:sessionId` | Get session state + progress |
| POST | `/game/session/:sessionId/check-proximity` | Check if near a clue (sends lat/lng) |
| POST | `/game/session/:sessionId/scan-qr` | Submit QR code scan |
| POST | `/game/session/:sessionId/submit-answer` | Submit riddle answer |
| POST | `/game/session/:sessionId/use-hint` | Use hint for current clue |
| POST | `/game/session/:sessionId/abandon` | Abandon hunt |
| GET | `/game/session/:sessionId/progress` | Full progress with clue statuses |

### Player — Teams
| Method | Path | Description |
|--------|------|-------------|
| POST | `/teams` | Create team |
| POST | `/teams/join/:inviteCode` | Join team |
| GET | `/teams/:id` | Team info + members |
| DELETE | `/teams/:id/leave` | Leave team |

### Player — Leaderboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/leaderboards/:huntId` | Solo leaderboard |
| GET | `/leaderboards/:huntId/teams` | Team leaderboard |

### Player — Prizes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/prizes/mine` | My earned prizes |
| GET | `/prizes/:id` | Prize detail |
| GET | `/prizes/:redemptionId/qr` | Generate redemption QR |

### Player — Payments
| Method | Path | Description |
|--------|------|-------------|
| POST | `/payments/purchase-ticket/:huntId` | Buy hunt ticket (Stripe Checkout) |
| GET | `/payments/my-purchases` | Purchase history |

### Public (No Auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/public/hunts/:citySlug` | Active hunts for city (SEO) |
| GET | `/public/hunt/:slug` | Hunt detail for embedding |
| GET | `/public/cities` | List of available cities |

### File Uploads
| Method | Path | Description |
|--------|------|-------------|
| POST | `/uploads/image` | Upload image to R2 (returns URL) |
| DELETE | `/uploads/:key` | Delete uploaded image |

### WebSocket Events (Socket.io)

**Client → Server:**
- `player:location-update` — player sends GPS coords during active hunt
- `player:join-hunt` — player enters hunt room for leaderboard
- `player:leave-hunt` — player exits hunt room

**Server → Client:**
- `leaderboard:update` — updated scores for hunt
- `hunt:status-change` — hunt published/paused/ended
- `clue:unlocked` — new clue available
- `prize:earned` — player earned a prize
- `hunt:player-count` — updated active player count

**Admin-only (Server → Client):**
- `admin:player-positions` — live GPS of all active players
- `admin:hunt-stats` — real-time hunt metrics

---

## Auth & Roles

### Two roles: `admin` and `player`

**Registration:**
- Players register via mobile app (email + password)
- Admin accounts created manually (seeded or via protected endpoint)
- No self-service admin registration

**Token Flow:**
1. Login → server returns `{ accessToken, user }` + sets `refreshToken` httpOnly cookie
2. Client stores accessToken in memory (not localStorage for security)
3. All API calls include `Authorization: Bearer <accessToken>`
4. When accessToken expires, client calls `/auth/refresh` to get new one
5. Refresh token rotation: each refresh issues new refresh token, invalidates old

**Middleware Stack:**
```
authenticate → checks JWT, attaches user to request
requireRole('admin') → checks user.role === 'admin'
```

---

## Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/treasure_hunt?schema=public

# JWT
JWT_ACCESS_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<random-64-char>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Mapbox
MAPBOX_ACCESS_TOKEN=pk.xxx
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx    # public token for client-side maps
EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxx    # public token for mobile maps

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=treasure-hunt
R2_PUBLIC_URL=https://cdn.yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx

# Resend (email)
RESEND_API_KEY=re_xxx

# Expo Push
EXPO_ACCESS_TOKEN=xxx

# Admin Panel
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Mobile App
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## How the Apps Relate

1. **Mobile app** (Expo) calls the **server API** for all data and game logic
2. **Admin panel** (Next.js) calls the same **server API** with admin-role JWT
3. **Public pages** (Next.js SSR) call **server API** at build/request time for SEO content
4. **Server** is the single source of truth — all business logic lives here
5. **Shared package** provides TypeScript types and constants to all three apps
6. **Socket.io** connects mobile app and admin panel to server for real-time features
7. **Mapbox** renders maps in both mobile (RN Mapbox) and web (Mapbox GL JS)
8. **Stripe** webhooks hit the server for payment confirmation
9. **R2** serves static files (images, logos) via CDN URL to all clients
