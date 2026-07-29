import dynamic from "next/dynamic";
import { HomeHero } from "./_components/home/home-hero";
import { HomeNav } from "./_components/home/home-nav";

/**
 * Above-the-fold chrome (nav + hero) is imported statically so it's in the
 * first chunk and paints immediately. Everything below the fold is
 * code-split via `next/dynamic` — each section (all framer-motion-heavy)
 * ships as its own lazily-loaded chunk instead of bloating the initial
 * landing-page bundle. `ssr` stays on (default) so the server-rendered HTML
 * and SEO content are unchanged; only the client JS is deferred.
 */
const HomeStats = dynamic(() =>
  import("./_components/home/home-stats").then((m) => m.HomeStats),
);
const HomeFeatures = dynamic(() =>
  import("./_components/home/home-features").then((m) => m.HomeFeatures),
);
const HomeHowItWorks = dynamic(() =>
  import("./_components/home/home-how-it-works").then((m) => m.HomeHowItWorks),
);
const HomeRoles = dynamic(() =>
  import("./_components/home/home-roles").then((m) => m.HomeRoles),
);
const HomeMarketplace = dynamic(() =>
  import("./_components/home/home-marketplace").then((m) => m.HomeMarketplace),
);
const HomeCta = dynamic(() =>
  import("./_components/home/home-cta").then((m) => m.HomeCta),
);
const HomeFooter = dynamic(() =>
  import("./_components/home/home-footer").then((m) => m.HomeFooter),
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <HomeNav />
      <main>
        <HomeHero />
        <HomeStats />
        <HomeFeatures />
        <HomeHowItWorks />
        <HomeRoles />
        <HomeMarketplace />
        <HomeCta />
      </main>
      <HomeFooter />
    </div>
  );
}
