"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Ruler, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

interface SampleListing {
  id: string;
  image: string;
  plotNumber: string;
  location: string;
  area: string;
  price: string;
  verified: boolean;
}

const samples: SampleListing[] = [
  {
    id: "olive-grove-14",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
    plotNumber: "OLV-1402",
    location: "Toscana, Italy",
    area: "8,400 m²",
    price: "184 ETH",
    verified: true,
  },
  {
    id: "lakeside-22",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80&sat=-50",
    plotNumber: "LK-2207",
    location: "Lake Bled, Slovenia",
    area: "3,120 m²",
    price: "92 ETH",
    verified: true,
  },
  {
    id: "orchard-09",
    image:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=80",
    plotNumber: "ORC-0918",
    location: "Provence, France",
    area: "12,600 m²",
    price: "246 ETH",
    verified: true,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.2, 0, 0, 1] as const },
  },
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export function HomeMarketplace() {
  return (
    <section
      id="marketplace"
      className="border-y border-border bg-secondary/40 py-20 lg:py-28"
    >
      <div className="container">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">Marketplace preview</p>
            <h2 className="mt-3 text-3xl md:text-4xl">
              Verified land, priced honestly.
            </h2>
            <p className="mt-4 text-muted-foreground">
              A taste of what's live. Every listing carries a verification
              stamp, an owner wallet, and a clickable chain receipt.
            </p>
          </div>
          <Button asChild variant="outline" size="lg" className="self-start md:self-auto">
            <Link href={ROUTES.MARKETPLACE}>
              Browse all listings
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {samples.map((s) => (
            <motion.article
              key={s.id}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-ui hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={s.image}
                  alt={`${s.plotNumber} — ${s.location}`}
                  fill
                  sizes="(min-width: 1024px) 360px, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-page ease-out-soft group-hover:scale-105"
                />
                {s.verified && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-brand-900 shadow-sm backdrop-blur">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                    Verified
                  </span>
                )}
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 font-chain text-xs font-medium text-primary-foreground shadow-sm backdrop-blur">
                  {s.plotNumber}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg">{s.location}</h3>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{s.location.split(",")[0]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Ruler className="h-4 w-4" />
                    <span>{s.area}</span>
                  </div>
                </dl>

                <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Asking</p>
                    <p className="font-serif text-xl font-semibold text-foreground">
                      {s.price}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={ROUTES.MARKETPLACE}>
                      View
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
