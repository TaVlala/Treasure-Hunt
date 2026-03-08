// Database seeder — populates demo data for local development and demos.
// Creates 1 admin, 1 player, 1 sponsor, 1 hunt with 3 clues.
// Run with: npm run prisma:seed (from apps/server/)

import 'dotenv/config';
import { PrismaClient, HuntDifficulty, HuntStatus, ClueType, SponsorTier } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Salt rounds for bcrypt password hashing
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding database...');

  // --- Admin user ---
  const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@treasurehunt.com' },
    update: {},
    create: {
      email: 'admin@treasurehunt.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      displayName: 'Hunt Admin',
    },
  });
  console.log(`  ✅ Admin: ${admin.email}`);

  // --- Demo player ---
  const playerPassword = await bcrypt.hash('player123', SALT_ROUNDS);
  const player = await prisma.user.upsert({
    where: { email: 'player@treasurehunt.com' },
    update: {},
    create: {
      email: 'player@treasurehunt.com',
      passwordHash: playerPassword,
      role: 'PLAYER',
      displayName: 'Demo Player',
    },
  });
  console.log(`  ✅ Player: ${player.email}`);

  // --- Demo sponsor ---
  const sponsor = await prisma.sponsor.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      businessName: 'Old Town Coffee',
      contactName: 'Maria Santos',
      contactEmail: 'maria@oldtowncoffee.com',
      contactPhone: '+1-555-0100',
      websiteUrl: 'https://oldtowncoffee.example.com',
      description: 'Artisan coffee roasters in the heart of the old town since 1987.',
      address: '14 Market Square, Old Town',
      latitude: 41.6938,
      longitude: 44.8015,
      tier: SponsorTier.FEATURED,
      monthlyFeeCents: 29900,
    },
  });
  console.log(`  ✅ Sponsor: ${sponsor.businessName}`);

  // --- Demo hunt ---
  const hunt = await prisma.hunt.upsert({
    where: { slug: 'old-town-explorer' },
    update: {},
    create: {
      slug: 'old-town-explorer',
      title: 'Old Town Explorer',
      description:
        'Discover the hidden gems of the old town on this self-guided adventure. ' +
        'Solve riddles, find landmarks, and earn prizes at local businesses.',
      city: 'Tbilisi',
      region: 'Kartli',
      difficulty: HuntDifficulty.EASY,
      status: HuntStatus.ACTIVE,
      centerLat: 41.6938,
      centerLng: 44.8015,
      zoomLevel: 15,
      metaTitle: 'Old Town Explorer Hunt — Tbilisi',
      metaDescription: 'A fun GPS treasure hunt through Tbilisi old town. Free to play!',
      createdBy: admin.id,
    },
  });
  console.log(`  ✅ Hunt: ${hunt.title}`);

  // --- Demo clues ---
  const clues = [
    {
      id: '00000000-0000-0000-0001-000000000001',
      orderIndex: 1,
      title: 'The Ancient Gate',
      description:
        'I stand tall and watch over the old quarter. Kings and merchants passed through me for centuries. ' +
        'Find me where the cobblestone road narrows into a single lane.',
      clueType: ClueType.GPS_PROXIMITY,
      latitude: 41.6895,
      longitude: 44.8008,
      proximityRadiusMeters: 30,
      points: 10,
      unlockMessage: 'You found the Metekhi Gate! The city has been watching over this spot for 800 years.',
    },
    {
      id: '00000000-0000-0000-0001-000000000002',
      orderIndex: 2,
      title: 'The Sulfur Bath District',
      description:
        'Tbilisi gets its name from me — "tbili" means warm. I bubble up from the earth here, ' +
        'turning domes of brick orange. What is the Georgian word for warm?',
      clueType: ClueType.TEXT_RIDDLE,
      answer: 'tbili',
      latitude: 41.6862,
      longitude: 44.8079,
      proximityRadiusMeters: 50,
      points: 15,
      hintText: 'The city name itself is the answer.',
      unlockMessage: 'Correct! These sulfur baths have been welcoming visitors since the 5th century.',
    },
    {
      id: '00000000-0000-0000-0001-000000000003',
      orderIndex: 3,
      title: 'The Coffee Reward',
      description:
        'Your final destination: a place where coffee has been served since before your grandparents were born. ' +
        'Find Old Town Coffee on Market Square and claim your prize!',
      clueType: ClueType.GPS_PROXIMITY,
      latitude: 41.6938,
      longitude: 44.8015,
      proximityRadiusMeters: 20,
      points: 20,
      unlockMessage: "You completed the hunt! Show this screen to the barista for your free coffee. You've earned it.",
    },
  ];

  for (const clue of clues) {
    await prisma.clue.upsert({
      where: { id: clue.id },
      update: {},
      create: { ...clue, huntId: hunt.id },
    });
  }
  console.log(`  ✅ Clues: ${clues.length} created`);

  // --- Link sponsor to final clue ---
  await prisma.sponsorClue.upsert({
    where: { clueId: '00000000-0000-0000-0001-000000000003' },
    update: {},
    create: {
      sponsorId: sponsor.id,
      clueId: '00000000-0000-0000-0001-000000000003',
      brandedMessage: 'Congratulations from Old Town Coffee! We have been serving Tbilisi since 1987.',
      offerText: 'Show this screen for a FREE espresso or filter coffee.',
      brandingColor: '#8B4513',
      callToAction: 'Claim Your Free Coffee',
    },
  });
  console.log(`  ✅ SponsorClue: ${sponsor.businessName} → Clue 3`);

  // --- Demo prize ---
  await prisma.sponsorPrize.upsert({
    where: { id: '00000000-0000-0000-0002-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000001',
      sponsorId: sponsor.id,
      huntId: hunt.id,
      title: 'Free Coffee at Old Town Coffee',
      description: 'One free espresso or filter coffee, redeemable at Old Town Coffee on Market Square.',
      prizeType: 'FREE_ITEM',
      valueDescription: 'Free coffee (any size)',
      redemptionLimit: 100,
      isGrandPrize: true,
      minCluesFound: 3,
    },
  });
  console.log(`  ✅ Prize: Free Coffee`);

  console.log('\n🎉 Seed complete!');
  console.log('   Admin:  admin@treasurehunt.com / admin123');
  console.log('   Player: player@treasurehunt.com / player123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
