# SPONSORS.md
# Complete documentation of the sponsor system — the core revenue engine.
# Every agent must read this before touching sponsor-related code.

---

## Business Model Summary

This platform is a **marketing channel for local businesses** disguised as a game.
Sponsors pay to place branded content at their physical locations within scavenger hunts.
Players walk to these locations, interact with the brand, and redeem prizes in person.

**Revenue streams (in order of priority):**
1. Sponsor clue placement fees (recurring monthly)
2. Sponsor prize sponsorships (per-hunt or per-season)
3. Tourism board contracts (white-label branded hunts)
4. Pay-to-play premium hunt tickets (player pays, sponsors fund prizes)
5. Hotel partnership referral commissions (future)

---

## Sponsor Tiers

### Basic — Clue Placement
**What the sponsor gets:**
- One clue placed at or near their business location
- Business name and logo displayed when player finds the clue
- Custom branded message shown to player (e.g., "Welcome to Mario's Cafe!")
- A simple offer/CTA (e.g., "Show this screen for a free cookie")
- Monthly foot traffic report (how many players visited)

**What the admin does:**
- Creates the sponsor profile with business details
- Places a clue at/near the sponsor's location during hunt creation
- Links the sponsor to that clue via the admin panel
- Sets the branded message and offer text

**Pricing model:** Monthly flat fee (admin sets per-sponsor)

---

### Featured — Enhanced Visibility
**Everything in Basic, plus:**
- Sponsor logo appears on the hunt detail page (before player starts)
- Business highlighted on the hunt map with a branded marker
- Sponsor name appears on the public landing page for the hunt
- Priority placement in clue order (early clues get more visits)
- Enhanced analytics: time spent at location, offer redemption rate

**What the admin does additionally:**
- Marks the sponsor as "featured" tier
- Uploads sponsor logo and sets branding color
- Places sponsor's clue earlier in the hunt sequence
- Includes sponsor in hunt marketing materials

**Pricing model:** Higher monthly fee (2-3x basic)

---

### Prize Sponsor — Maximum Engagement
**Everything in Featured, plus:**
- Sponsor provides physical prizes redeemed at their location
- Prize appears in the hunt's prize list (motivates players to participate)
- Grand prize option: awarded to the hunt winner or top finishers
- Player must visit sponsor location to redeem (guaranteed foot traffic)
- Full redemption tracking with QR verification
- Detailed analytics: redemption rate, conversion to purchase

**What the admin does additionally:**
- Creates prize entries linked to the sponsor
- Sets redemption limits, expiry dates, terms
- Manages the QR redemption flow
- Provides sponsor with redemption reports

**Pricing model:** Monthly fee + per-prize sponsorship fee

---

## Sponsor Lifecycle (Admin-Managed)

```
1. ONBOARD
   Admin meets local business → agrees on tier and pricing
   Admin creates sponsor profile in admin panel
   Admin enters business details, logo, location, tier, contract dates

2. INTEGRATE INTO HUNT
   Admin creates or edits a hunt
   Admin places a clue at/near sponsor location on the map
   Admin links sponsor to clue → sets branded message, offer, branding
   If prize sponsor: admin creates prizes with redemption details

3. GO LIVE
   Admin publishes the hunt
   Players discover and play the hunt
   When player reaches sponsor clue → they see branded content
   If prize earned → player gets QR code to show at sponsor location

4. REPORT
   Admin generates sponsor analytics report
   Shows: player visits, offer views, prize redemptions, time at location
   Admin shares report with sponsor (email/PDF)

5. RENEW OR ROTATE
   Admin reviews sponsor contract dates
   Renews, adjusts tier, or rotates sponsor for next season
   Seasonal hunts get new sponsor rotations
```

---

## Prize Redemption Flow

### Player Earns Prize
```
Player completes hunt (or meets min clue threshold)
     ↓
Server checks which prizes the player qualifies for
     ↓
Server creates Redemption record with unique QR code
     ↓
Prize appears in player's "My Prizes" screen
     ↓
Player taps prize → sees redemption QR code + sponsor details
```

### Player Redeems Prize at Sponsor Location
```
Player visits sponsor location
     ↓
Player shows QR code on phone screen
     ↓
Sponsor staff scans QR (or enters code manually)
     ↓
System validates: not expired, not already redeemed, within limit
     ↓
If valid → marks as redeemed, records timestamp and staff name
     ↓
If invalid → shows error (expired / already used / limit reached)
```

### QR Code Design
- Format: `TH-{prizeId_short}-{random_8_chars}`
- Example: `TH-CAFC-X7K9M2PQ`
- Encoded as QR code for scanning
- Also displayable as text for manual entry
- Each QR is single-use (one redemption per code)

### Redemption Validation Endpoint
```
POST /api/v1/prizes/:redemptionId/redeem
Body: { staffName?: string }
Auth: Player JWT (player shows their phone, QR triggers this)

Alternative for staff:
POST /api/v1/prizes/verify/:qrCode
Auth: None (public endpoint, QR code is the auth)
Returns: { valid: boolean, prizeName, playerName, error? }
```

### Expiry Rules
- Default: prize expires 72 hours after earning
- Configurable per prize by admin
- Expired redemptions cannot be reactivated
- Admin can see expired vs redeemed vs unused in analytics

---

## Data Tracked Per Sponsor

### Real-time Metrics
- Players currently near sponsor location (within proximity radius)
- Active hunt sessions that include this sponsor's clue

### Per-Hunt Metrics
- Total players who found the sponsor's clue
- Average time spent at sponsor location (time between arrival and departure)
- Offer view count (how many saw the branded message)
- CTA click count (if offer has a link)

### Prize Metrics (Prize Sponsors Only)
- Prizes generated (earned by players)
- Prizes redeemed (actually visited and claimed)
- Redemption rate (redeemed / generated)
- Prizes expired (never claimed)
- Redemptions by day/time (when do players visit?)

### Aggregate Metrics
- Total unique players sent to sponsor location (across all hunts)
- Month-over-month foot traffic trend
- Comparison to other sponsors in same hunt
- Player demographics (home city, if available)

### Report Format
Admin generates and exports reports as:
- Dashboard view in admin panel (charts + numbers)
- PDF export for sharing with sponsor via email
- CSV export for sponsors who want raw data

---

## Sponsor Content Rules

### What the player sees at a sponsor clue:
```
┌─────────────────────────────────────┐
│                                     │
│         [SPONSOR LOGO]              │
│                                     │
│    🎉 Clue Found!                  │
│                                     │
│    "Welcome to Mario's Cafe!        │
│     You've discovered a hidden      │
│     gem of the city."               │
│                                     │
│    ─────────────────────────        │
│                                     │
│    🎁 Special Offer                 │
│    "Show this screen for a          │
│     free espresso with any          │
│     pastry purchase!"               │
│                                     │
│    [ Redeem Prize ]    [+10 pts]    │
│                                     │
│    Powered by [Hunt Name]           │
│                                     │
└─────────────────────────────────────┘
```

### Design Rules (matches premium design direction):
- Sponsor card uses clean white background
- Sponsor's brand color as accent (border, button)
- Sponsor logo displayed prominently but not overwhelming
- Offer text is clear and actionable
- Must NEVER look like a typical advertisement
- Must feel like a natural part of the game experience
- Bold typography for the sponsor name
- Pill-shaped CTA button with sponsor accent color

---

## Revenue Tracking

### Admin tracks all revenue manually initially:
- Sponsor fees: admin records payment when received
- Ticket sales: tracked automatically via Stripe
- Tourism board contracts: admin records as manual payment

### Payment Records:
```
payments table tracks:
- payment_type: 'sponsor_fee' | 'ticket_purchase'
- payer_type: 'sponsor' | 'player'
- amount + currency
- stripe reference (for ticket sales)
- status tracking
```

### Revenue Dashboard Shows:
- Total revenue by period (week/month/quarter)
- Revenue by type (sponsor fees vs ticket sales)
- Revenue by hunt
- Revenue per sponsor
- Outstanding invoices
- MRR (monthly recurring revenue) from sponsors

### Future: Automated Stripe Billing
- Phase 3 feature: Stripe Billing for recurring sponsor fees
- Auto-generate monthly invoices
- Payment reminders
- Revenue recognition reports
