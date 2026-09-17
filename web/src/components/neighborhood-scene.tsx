/** A richer, golden-hour Filipino neighborhood scene — layered depth, terracotta
 *  roofs, palm trees and a hazy skyline. Pure SVG (no image asset), so it's crisp
 *  at any size and loads instantly. Designed to work as a full-bleed banner
 *  (pass preserveAspectRatio="xMidYMid slice") or a contained illustration. */
export function NeighborhoodScene({
  className,
  preserveAspectRatio = "xMidYMid meet",
}: {
  className?: string;
  preserveAspectRatio?: string;
}) {
  return (
    <svg
      viewBox="0 0 800 420"
      role="img"
      aria-label="Illustration of a neighborhood at golden hour"
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ns-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.45" stopColor="#bae6fd" />
          <stop offset="0.78" stopColor="#fef3c7" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="ns-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ade80" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
        <radialGradient id="ns-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.35" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ns-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#fde9c8" />
        </linearGradient>
        <linearGradient id="ns-apt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eff6ff" />
          <stop offset="1" stopColor="#dbeafe" />
        </linearGradient>
      </defs>

      {/* sky + sun */}
      <rect width="800" height="420" fill="url(#ns-sky)" />
      <circle cx="640" cy="120" r="150" fill="url(#ns-sun)" />
      <circle cx="640" cy="120" r="46" fill="#fffbeb" />

      {/* clouds */}
      <g fill="#ffffff" opacity="0.75">
        <ellipse cx="180" cy="90" rx="60" ry="20" />
        <ellipse cx="230" cy="80" rx="42" ry="18" />
        <ellipse cx="470" cy="60" rx="50" ry="16" />
      </g>

      {/* distant hills */}
      <path d="M0 300 Q 200 250 420 288 T 800 280 L800 320 L0 320 Z" fill="#86efac" opacity="0.7" />

      {/* hazy skyline */}
      <g fill="#94a3b8" opacity="0.5">
        <rect x="60" y="250" width="34" height="60" rx="2" />
        <rect x="110" y="234" width="26" height="76" rx="2" />
        <rect x="150" y="258" width="30" height="52" />
        <rect x="520" y="244" width="30" height="66" rx="2" />
        <rect x="560" y="262" width="26" height="48" />
        <rect x="596" y="230" width="30" height="80" rx="2" />
        <rect x="700" y="252" width="34" height="58" rx="2" />
      </g>

      {/* ground */}
      <path d="M0 306 Q 400 288 800 302 L800 420 L0 420 Z" fill="url(#ns-ground)" />
      {/* path */}
      <path d="M360 420 Q 400 350 430 306 L470 306 Q 450 360 460 420 Z" fill="#eaddc7" opacity="0.85" />

      {/* left palm tree */}
      <g>
        <path d="M96 320 C 92 288 90 262 92 236" stroke="#a16207" strokeWidth="9" fill="none" strokeLinecap="round" />
        <g fill="#15803d">
          <path d="M92 236 C 60 224 40 232 30 246 C 56 240 76 240 92 250 Z" />
          <path d="M92 236 C 124 224 146 232 156 246 C 128 240 108 240 92 250 Z" />
          <path d="M92 232 C 74 206 58 196 40 196 C 66 206 80 220 92 244 Z" />
          <path d="M92 232 C 110 206 126 196 144 196 C 118 206 104 220 92 244 Z" />
          <path d="M92 230 C 88 202 92 184 100 172 C 96 196 98 214 96 240 Z" />
        </g>
      </g>

      {/* house 1 — bungalow, left */}
      <g>
        <ellipse cx="196" cy="312" rx="86" ry="10" fill="#14532d" opacity="0.25" />
        <rect x="140" y="238" width="120" height="74" fill="url(#ns-wall)" />
        <rect x="238" y="238" width="22" height="74" fill="#e8c9a0" />
        <path d="M126 240 L200 194 L274 240 Z" fill="#c2410c" />
        <path d="M200 194 L274 240 L262 240 L200 202 Z" fill="#9a3412" />
        <rect x="158" y="264" width="28" height="26" rx="2" fill="#fde68a" stroke="#9a3412" strokeWidth="2" />
        <path d="M172 264 V290 M158 277 H186" stroke="#9a3412" strokeWidth="1.5" />
        <rect x="206" y="270" width="26" height="42" rx="2" fill="#7c2d12" />
        <circle cx="227" cy="292" r="1.8" fill="#fde68a" />
      </g>

      {/* house 2 — apartment, middle */}
      <g>
        <ellipse cx="352" cy="312" rx="72" ry="9" fill="#14532d" opacity="0.25" />
        <rect x="300" y="188" width="104" height="124" fill="url(#ns-apt)" />
        <rect x="386" y="188" width="18" height="124" fill="#c7d7ef" />
        <rect x="294" y="178" width="116" height="14" rx="3" fill="#0f766e" />
        <g fill="#fde68a" stroke="#1e3a8a" strokeWidth="1.5" opacity="0.95">
          <rect x="316" y="206" width="20" height="22" rx="2" />
          <rect x="350" y="206" width="20" height="22" rx="2" />
          <rect x="316" y="240" width="20" height="22" rx="2" />
          <rect x="350" y="240" width="20" height="22" rx="2" fill="#bfdbfe" />
          <rect x="316" y="274" width="20" height="22" rx="2" fill="#bfdbfe" />
          <rect x="350" y="274" width="20" height="22" rx="2" />
        </g>
      </g>

      {/* house 3 — right */}
      <g>
        <ellipse cx="540" cy="312" rx="82" ry="10" fill="#14532d" opacity="0.25" />
        <rect x="486" y="244" width="112" height="68" fill="url(#ns-wall)" />
        <rect x="578" y="244" width="20" height="68" fill="#e8c9a0" />
        <path d="M474 246 L542 206 L610 246 Z" fill="#b91c1c" />
        <path d="M542 206 L610 246 L598 246 L542 214 Z" fill="#991b1b" />
        <rect x="502" y="266" width="26" height="24" rx="2" fill="#fde68a" stroke="#7f1d1d" strokeWidth="2" />
        <rect x="548" y="270" width="26" height="42" rx="2" fill="#7c2d12" />
      </g>

      {/* right palm tree */}
      <g>
        <path d="M706 322 C 712 292 714 266 710 240" stroke="#a16207" strokeWidth="9" fill="none" strokeLinecap="round" />
        <g fill="#166534">
          <path d="M710 240 C 742 228 762 236 772 250 C 746 244 726 244 710 254 Z" />
          <path d="M710 240 C 678 228 656 236 646 250 C 674 244 694 244 710 254 Z" />
          <path d="M710 236 C 728 210 744 200 762 200 C 736 210 722 224 710 248 Z" />
          <path d="M710 236 C 692 210 676 200 658 200 C 684 210 698 224 710 248 Z" />
        </g>
      </g>

      {/* foreground shrubs */}
      <g fill="#22c55e">
        <ellipse cx="120" cy="330" rx="26" ry="16" />
        <ellipse cx="640" cy="332" rx="30" ry="18" />
        <ellipse cx="430" cy="336" rx="22" ry="13" fill="#16a34a" />
      </g>
    </svg>
  );
}
