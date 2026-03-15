// Static "How It Works" page — server component.
// Explains the Treasure Hunt platform for players and business sponsors.

import Link from 'next/link';

// Individual numbered step for the player journey
function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
        <span className="text-amber-400 font-bold text-sm">{number}</span>
      </div>
      <div className="pt-1.5">
        <h3 className="text-white font-semibold text-base mb-1">{title}</h3>
        <p className="text-white/40 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Single FAQ item
function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-white/[0.06] py-6">
      <h4 className="text-white font-semibold text-base mb-2">{question}</h4>
      <p className="text-white/40 text-sm leading-relaxed">{answer}</p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-14">

      {/* Header */}
      <div className="mb-16 text-center">
        <p className="text-xs uppercase tracking-widest text-amber-400/60 mb-4 font-medium">
          About
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
          How Treasure Hunt Works
        </h1>
        <p className="text-white/40 text-base leading-relaxed max-w-md mx-auto">
          For players who want to explore and win. For businesses who want customers through the door.
        </p>
      </div>

      {/* Player steps */}
      <section className="mb-16">
        <p className="text-xs uppercase tracking-widest text-white/25 font-medium mb-8">
          For Players
        </p>
        <div className="flex flex-col gap-8">
          <Step
            number={1}
            title="Download the App"
            description="Search 'Treasure Hunt' on the App Store or Google Play. Create a free account in seconds."
          />
          <Step
            number={2}
            title="Join a Hunt"
            description="Browse active hunts in your city. Free hunts are open to everyone — paid hunts unlock premium prizes."
          />
          <Step
            number={3}
            title="Follow GPS Clues"
            description="Each clue leads you to a real location. Solve riddles, take photos, and navigate the city on foot."
          />
          <Step
            number={4}
            title="Claim Prizes at Sponsor Locations"
            description="Complete the hunt and redeem your QR code at the sponsor's location for real-world prizes — discounts, free items, and more."
          />
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-white/[0.06] mb-16" />

      {/* Business / Sponsor section */}
      <section className="mb-16">
        <p className="text-xs uppercase tracking-widest text-white/25 font-medium mb-6">
          For Businesses
        </p>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8">
          <div className="text-3xl mb-4">🏪</div>
          <h2 className="text-white font-bold text-2xl mb-3">Partner with us</h2>
          <p className="text-white/50 text-base leading-relaxed mb-6">
            Place a branded clue at your location. Tourists visit. You gain customers. Sponsors receive
            dedicated foot traffic, brand visibility, and measurable engagement — all tracked in real time.
          </p>
          <ul className="space-y-2 mb-8 text-white/40 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">✓</span>
              Branded clue at your venue drives guaranteed foot traffic
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">✓</span>
              Prize redemptions bring customers to your counter
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">✓</span>
              Analytics dashboard shows visits, completions, and redemptions
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">✓</span>
              Tourism-board partnerships available for city-wide hunts
            </li>
          </ul>
          <Link
            href="mailto:hello@treasurehunt.app"
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold px-6 py-3 rounded-full transition-colors text-sm"
          >
            Contact us to become a sponsor →
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-white/[0.06] mb-4" />

      {/* FAQ */}
      <section>
        <p className="text-xs uppercase tracking-widest text-white/25 font-medium mb-2">
          FAQ
        </p>
        <FAQ
          question="Is the app free to download?"
          answer="Yes, the app is free. Individual hunts may be free or paid — check each hunt's listing for pricing details."
        />
        <FAQ
          question="Do I need GPS or internet?"
          answer="Yes, an active internet connection and location services are required to play. The app uses your GPS position to verify clue proximity."
        />
        <FAQ
          question="Can I play with friends?"
          answer="Absolutely. Team-mode hunts let you create or join a team using an invite code. Solo hunts are for individual play only."
        />
        <FAQ
          question="How do I redeem a prize?"
          answer="After completing a hunt, you'll receive a QR code in the app. Show it to the staff at the sponsor's location to claim your prize."
        />
      </section>

      {/* CTA to discover */}
      <div className="mt-16 text-center">
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold px-8 py-3.5 rounded-full transition-colors text-sm"
        >
          Browse Active Hunts →
        </Link>
      </div>

    </div>
  );
}
