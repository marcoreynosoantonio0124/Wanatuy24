/** Decorative on-brand illustration: a little row of homes with a sun.
 *  Pure SVG — crisp at any size, no external image, themes with the brand. */
export function HouseScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 260"
      role="img"
      aria-label="Illustration of houses"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* soft ground */}
      <path
        d="M0 214 C 120 198, 360 198, 480 214 L480 260 L0 260 Z"
        fill="#d1fae5"
      />
      <path
        d="M0 214 C 120 198, 360 198, 480 214"
        stroke="#6ee7b7"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* sun */}
      <circle cx="410" cy="60" r="26" fill="#fbbf24" />
      <circle cx="410" cy="60" r="34" stroke="#fcd34d" strokeWidth="3" opacity="0.6" />

      {/* tree */}
      <rect x="44" y="176" width="10" height="38" rx="4" fill="#b45309" />
      <circle cx="49" cy="160" r="24" fill="#34d399" />
      <circle cx="34" cy="172" r="16" fill="#10b981" />
      <circle cx="64" cy="172" r="16" fill="#10b981" />

      {/* house 1 — medium, left */}
      <g stroke="#1e293b" strokeWidth="3" strokeLinejoin="round">
        <rect x="92" y="128" width="96" height="86" rx="6" fill="#ffffff" />
        <path d="M82 130 L140 84 L198 130 Z" fill="#059669" />
        <rect x="106" y="170" width="26" height="44" rx="3" fill="#047857" />
        <rect x="150" y="146" width="28" height="28" rx="3" fill="#fcd34d" />
        <path d="M164 146 V174 M150 160 H178" strokeWidth="2" />
      </g>

      {/* house 2 — tall apartment, middle */}
      <g stroke="#1e293b" strokeWidth="3" strokeLinejoin="round">
        <rect x="206" y="96" width="92" height="118" rx="6" fill="#ffffff" />
        <rect x="200" y="86" width="104" height="14" rx="4" fill="#0f766e" />
        <rect x="222" y="116" width="22" height="22" rx="2" fill="#fcd34d" />
        <rect x="260" y="116" width="22" height="22" rx="2" fill="#fcd34d" />
        <rect x="222" y="150" width="22" height="22" rx="2" fill="#a7f3d0" />
        <rect x="260" y="150" width="22" height="22" rx="2" fill="#fcd34d" />
        <rect x="240" y="184" width="26" height="30" rx="2" fill="#047857" />
      </g>

      {/* house 3 — small, right */}
      <g stroke="#1e293b" strokeWidth="3" strokeLinejoin="round">
        <rect x="316" y="150" width="82" height="64" rx="6" fill="#ffffff" />
        <path d="M308 152 L357 116 L406 152 Z" fill="#0d9488" />
        <rect x="330" y="176" width="22" height="38" rx="3" fill="#047857" />
        <rect x="366" y="168" width="22" height="22" rx="3" fill="#fcd34d" />
      </g>

      {/* little bushes */}
      <circle cx="298" cy="206" r="12" fill="#34d399" />
      <circle cx="76" cy="208" r="10" fill="#34d399" />
    </svg>
  );
}
