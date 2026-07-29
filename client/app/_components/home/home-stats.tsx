"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Activity, Landmark, Timer, Users } from "lucide-react";

const stats = [
  { label: "Verified parcels", value: 12482, suffix: "+", icon: Landmark },
  { label: "On-chain transfers", value: 3961, suffix: "", icon: Activity },
  { label: "Avg. settlement", value: 87, suffix: "s", icon: Timer },
  { label: "Active users", value: 5430, suffix: "+", icon: Users },
] as const;

function useCountUp(target: number, run: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, durationMs]);
  return value;
}

function StatTile({
  label,
  value,
  suffix,
  icon: Icon,
  run,
  index,
}: {
  label: string;
  value: number;
  suffix: string;
  icon: (typeof stats)[number]["icon"];
  run: boolean;
  index: number;
}) {
  const animated = useCountUp(value, run);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={run ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.2, 0, 0, 1] }}
      className="group rounded-xl border border-border bg-card p-5 transition-shadow duration-ui hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-transform duration-hover group-hover:-rotate-3">
          <Icon className="h-4 w-4" />
        </span>
        <p className="eyebrow">{label}</p>
      </div>
      <p className="mt-3 font-serif text-3xl font-semibold text-foreground">
        {animated.toLocaleString()}
        <span className="text-accent">{suffix}</span>
      </p>
    </motion.div>
  );
}

export function HomeStats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section className="border-y border-border bg-background py-14 lg:py-16">
      <div ref={ref} className="container">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <StatTile
              key={s.label}
              label={s.label}
              value={s.value}
              suffix={s.suffix}
              icon={s.icon}
              run={inView}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
