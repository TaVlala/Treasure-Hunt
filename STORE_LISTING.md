# Treasure Hunt — App Store & Play Store Listing

> Copy-paste ready. Replace placeholder values (marked `[PLACEHOLDER]`) before submission.

---

## App Store (iOS) — App Information

### App Name (30 chars max)
```
Treasure Hunt
```

### Subtitle (30 chars max)
```
Explore Cities. Find Clues. Win.
```

### Category
- Primary: **Travel**
- Secondary: **Games → Adventure**

### Age Rating
**4+** — No objectionable content

### Privacy Policy URL
```
https://treasurehunt.app/privacy
```

### Support URL
```
https://treasurehunt.app/support
```

### Marketing URL
```
https://treasurehunt.app
```

---

## App Description

### Short Description (170 chars — used in search results on some stores)
```
Turn your city into a game. Follow GPS clues, discover local businesses, and win real prizes in this location-based scavenger hunt.
```

### Full Description (4000 chars max — App Store)

```
Treasure Hunt turns your city into an adventure.

Follow a trail of location-based clues through real neighbourhoods, discover hidden gems, and earn prizes sponsored by local businesses — all without a tour guide or a boring itinerary.

HOW IT WORKS

1. Pick a hunt in your city (or wherever you're visiting)
2. Follow GPS clues to real locations — restaurants, shops, landmarks, hidden courtyards
3. Solve riddles, scan QR codes, and snap photo challenges to progress
4. Collect points, climb the leaderboard, and redeem prizes at sponsor businesses

WHAT MAKES IT DIFFERENT

Real Locations — every clue brings you to an actual place worth visiting. No virtual waypoints, no sitting on your couch.

Sponsored Prizes — local businesses fund the hunts and offer real rewards: free drinks, discounts, exclusive experiences. You win; they get a visit.

Solo or Team Play — compete on your own or form a team and split the glory (and the arguments about which alley to duck down).

All Clue Types — GPS proximity unlocks, QR codes, text riddles, and photo challenges mean every hunt feels fresh.

Achievements & Leaderboards — rack up badges, maintain your streak, and see where you rank against every other explorer in the city.

Offline Ready — downloaded clue content means you can keep going even when the signal drops underground or in a narrow lane.

GREAT FOR

- Tourists who want to see a city beyond the top-10 lists
- Locals looking for a new way to explore their own backyard
- Groups, couples, families, and corporate team outings
- Anyone who thinks walking tours could use a plot twist

Hunt organizers and sponsors: visit treasurehunt.app to learn how to create a hunt or get your business featured.

```

---

## Play Store (Android) — Store Listing

### App Name (50 chars max)
```
Treasure Hunt: City Scavenger Hunt
```

### Short Description (80 chars)
```
GPS clue trails through real cities. Find locations. Win prizes.
```

### Full Description (4000 chars — same as App Store version above; repeat here)

*(Use the same full description as above)*

### Category
**Travel & Local**

### Tags (Play Store)
```
scavenger hunt, treasure hunt, GPS game, city exploration, travel game, location game, outdoor adventure, sightseeing
```

---

## Keywords (App Store Search Ads — 100 chars, comma-separated)

```
scavenger hunt,treasure hunt,city game,gps adventure,travel game,explore city,outdoor game,clue hunt
```

---

## Screenshots — Required Sizes

### iPhone (6.7" — iPhone 15 Pro Max)
Minimum 3 screenshots, recommended 6–10.

| # | Screen | Caption suggestion |
|---|--------|--------------------|
| 1 | Hunt discovery list | "Hunts in your city — pick one and go" |
| 2 | Active GPS map / proximity ring | "Follow the signal to the next clue" |
| 3 | Clue reveal (QR + riddle) | "Solve it. Scan it. Move on." |
| 4 | Photo challenge submission | "Photo challenges at real locations" |
| 5 | Leaderboard | "Compete with every explorer in the city" |
| 6 | Achievement badge unlock | "Earn badges for every milestone" |
| 7 | Prize redemption QR | "Real prizes from local businesses" |
| 8 | Hunt completion screen | "Finish strong. Claim your reward." |

### iPad (12.9" — if tablet support enabled)
*(Currently disabled — supportsTablet: false)*

### Android (Phone — Pixel 8 Pro or similar)
Same screens as iPhone. Export at 1080 × 1920 px minimum.

---

## App Preview Video (App Store — optional but recommended)

**Duration:** 15–30 seconds
**Script outline:**
1. 0–3s: City aerial / street scene → app icon appears
2. 3–8s: Discovery screen, tap a hunt
3. 8–15s: GPS proximity ring closing in, clue unlocks
4. 15–22s: QR scan → clue solved, points awarded
5. 22–28s: Leaderboard → achievement toast → prize QR
6. 28–30s: Logo + "Download Free"

---

## What's New (Version 1.0.0)

```
First public release of Treasure Hunt.

• GPS-based clue trails through real city locations
• Solo and team play modes
• QR codes, riddles, and photo challenges
• Real prizes sponsored by local businesses
• Achievements, streaks, and leaderboards
• Offline clue caching for spotty signal areas
```

---

## Checklist Before Submission

### Both Stores
- [ ] Icon exported: 1024 × 1024 px PNG, no alpha, no rounded corners (stores apply their own mask)
- [ ] All screenshot sizes exported and uploaded
- [ ] Privacy policy live at treasurehunt.app/privacy
- [ ] Support URL live at treasurehunt.app/support
- [ ] All `REPLACE_WITH_*` placeholders in `eas.json` and `app.json` filled in

### App Store (iOS) only
- [ ] Apple Developer account active ($99/yr)
- [ ] App record created in App Store Connect
- [ ] `ascAppId` set in `eas.json` → `submit.production.ios`
- [ ] `appleTeamId` set in `eas.json`
- [ ] `extra.eas.projectId` in `app.json` set to the EAS project ID (`eas init` output)
- [ ] `updates.url` in `app.json` updated with the same EAS project ID
- [ ] TestFlight build tested on physical device
- [ ] Age rating questionnaire completed in App Store Connect
- [ ] Encryption compliance: `usesNonExemptEncryption: false` (already set — standard HTTPS only)

### Play Store (Android) only
- [ ] Google Play Developer account active ($25 one-time)
- [ ] `google-services.json` placed in `apps/mobile/` (from Firebase console)
- [ ] `google-service-account.json` placed in `apps/mobile/` for automated submission
- [ ] Internal test track tested on physical device
- [ ] Content rating questionnaire completed in Play Console
- [ ] Data safety form completed (location, camera collected; no data sold)

### EAS Build Commands
```bash
# Confirm EAS CLI installed
npm install -g eas-cli

# Log in
eas login

# Link project (generates projectId — update app.json afterward)
cd apps/mobile && eas init

# Build for iOS (production)
eas build --platform ios --profile production

# Build for Android (production)
eas build --platform android --profile production

# Submit to App Store
eas submit --platform ios --profile production

# Submit to Play Store
eas submit --platform android --profile production
```
