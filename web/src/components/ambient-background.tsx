/**
 * Ambient "screensaver" backdrop for the signed-in app and the renter portal.
 * A calm, living night sky — slow-drifting aurora glows, a field of twinkling
 * stars, and a few sparkles floating up. Purely decorative: it sits behind all
 * content (pointer-events: none) so it never gets in the way of navigation, and
 * it holds completely still for anyone who prefers reduced motion.
 *
 * Positions are generated from a fixed seed so the server and browser render
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
  top: rand() * 94,
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

export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <span className="ambient-blob ambient-blob-a" />
      <span className="ambient-blob ambient-blob-b" />
      <span className="ambient-blob ambient-blob-c" />

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
