"use client";

import { useEffect, useState } from "react";
import { phaseForHour, type Phase } from "@/lib/time-theme";

/**
 * Ambient "screensaver" backdrop for the whole app, the renter portal, and the
 * welcome screen. A calm, living sky that changes with the time of day:
 *   dawn  → warm sunrise glow, a few faint stars
 *   day   → bright blue sky, a high sun, no stars
 *   dusk  → golden-hour pinks and oranges, stars coming out
 *   night → deep navy, a pale moon, a full field of stars
 * On top of the sky: slow-drifting colour glows, twinkling stars, and sparkles
 * floating up. Purely decorative (pointer-events: none, sits behind content)
 * and completely still for anyone who prefers reduced motion.
 *
 * The server passes `initialPhase` from Manila time so the first paint matches;
 * the browser then switches to the viewer's own local time.
 *
 * Star/sparkle positions come from a fixed seed so the server and browser draw
 * the exact same sky (no hydration mismatch).
 */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(20260214);

const STARS = Array.from({ length: 46 }, () => ({
  left: rand() * 100,
  top: rand() * 92,
  size: 1 + rand() * 2.2,
  delay: rand() * 6,
  dur: 2.6 + rand() * 3.8,
}));

const SPARKLES = Array.from({ length: 7 }, () => ({
  left: 5 + rand() * 90,
  size: 11 + rand() * 11,
  delay: rand() * 14,
  dur: 15 + rand() * 11,
}));

export function AmbientBackground({
  initialPhase = "night",
}: {
  initialPhase?: Phase;
}) {
  const [phase, setPhase] = useState<Phase>(initialPhase);

  useEffect(() => {
    const update = () => setPhase(phaseForHour(new Date().getHours()));
    update();
    const id = setInterval(update, 10 * 60 * 1000); // re-check every 10 min
    return () => clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden
      data-phase={phase}
      className="ambient pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="ambient-sky" />
      <div className="ambient-orb" />

      <span className="ambient-blob ambient-blob-a" />
      <span className="ambient-blob ambient-blob-b" />
      <span className="ambient-blob ambient-blob-c" />

      <div className="ambient-stars">
        {STARS.map((s, i) => (
          <span
            key={`st${i}`}
            className="ambient-star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
            }}
          />
        ))}
      </div>

      {SPARKLES.map((s, i) => (
        <span
          key={`sp${i}`}
          className="ambient-sparkle"
          style={{
            left: `${s.left}%`,
            fontSize: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
