/**
 * Friendly flat-cartoon illustrations for the role-picker cards — the same two
 * characters as the dashboard mascots: DUE (lessor, with a house key) and MEET
 * (renter, with luggage), each with their name on their shirt.
 * Pure SVG (no image assets), so they stay crisp and load instantly.
 */

/** DUE — the lessor, holding a rental agreement and a house key, house behind. */
export function LessorScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} role="img" aria-label="Landlord holding a rental agreement">
      {/* soft ground */}
      <ellipse cx="100" cy="150" rx="78" ry="8" fill="#000" opacity="0.12" />

      {/* house behind */}
      <g opacity="0.95">
        <rect x="26" y="70" width="66" height="58" rx="4" fill="#10b981" />
        <rect x="26" y="70" width="66" height="58" rx="4" fill="#065f46" opacity="0.15" />
        <path d="M20 74 L59 44 L98 74 Z" fill="#f59e0b" />
        <rect x="44" y="92" width="18" height="36" rx="2" fill="#ecfdf5" />
        <rect x="70" y="88" width="14" height="14" rx="2" fill="#a7f3d0" />
      </g>

      {/* person */}
      <g>
        {/* legs */}
        <rect x="112" y="118" width="12" height="26" rx="5" fill="#1e293b" />
        <rect x="132" y="118" width="12" height="26" rx="5" fill="#1e293b" />
        {/* body + name on the shirt */}
        <rect x="104" y="80" width="48" height="46" rx="16" fill="#0f766e" />
        <text x="128" y="108" textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="0.5" fill="#ecfdf5" style={{ fontFamily: "inherit" }}>DUE</text>
        {/* arm holding paper */}
        <rect x="96" y="92" width="22" height="11" rx="5" fill="#0f766e" />
        {/* head */}
        <circle cx="128" cy="64" r="16" fill="#fcd9b6" />
        <path d="M112 60 a16 16 0 0 1 32 0 q-16 -10 -32 0Z" fill="#3f2d1d" />
        <circle cx="122" cy="64" r="1.8" fill="#1e293b" />
        <circle cx="134" cy="64" r="1.8" fill="#1e293b" />
        <path d="M123 71 q5 4 10 0" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* the paper / contract */}
        <g transform="rotate(-8 88 96)">
          <rect x="70" y="80" width="34" height="42" rx="3" fill="#ffffff" stroke="#cbd5e1" />
          <line x1="76" y1="90" x2="98" y2="90" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="76" y1="98" x2="98" y2="98" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="76" y1="106" x2="92" y2="106" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M84 113 l4 4 l8 -9" stroke="#059669" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* a big friendly house key — the lessor's accessory */}
      <g>
        <circle cx="172" cy="82" r="9" fill="none" stroke="#fbbf24" strokeWidth="4" />
        <circle cx="172" cy="82" r="2.5" fill="#fef3c7" />
        <rect x="170" y="89" width="4" height="28" rx="1" fill="#fbbf24" />
        <rect x="174" y="104" width="9" height="4" rx="1" fill="#fbbf24" />
        <rect x="174" y="112" width="6" height="4" rx="1" fill="#fbbf24" />
      </g>
    </svg>
  );
}

/** A tenant / renter arriving with luggage and a moving box — ready to move in. */
export function TenantScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} role="img" aria-label="Tenant arriving with luggage">
      <ellipse cx="100" cy="150" rx="78" ry="8" fill="#000" opacity="0.12" />

      {/* person */}
      <g>
        {/* legs */}
        <rect x="66" y="116" width="12" height="28" rx="5" fill="#1e293b" />
        <rect x="86" y="116" width="12" height="28" rx="5" fill="#1e293b" />
        {/* body + name on the shirt */}
        <rect x="58" y="76" width="48" height="46" rx="16" fill="#b45309" />
        <text x="82" y="104" textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="0.3" fill="#fff7ed" style={{ fontFamily: "inherit" }}>MEET</text>
        {/* arm reaching to luggage handle */}
        <rect x="98" y="86" width="26" height="11" rx="5" fill="#b45309" />
        {/* head */}
        <circle cx="82" cy="60" r="16" fill="#fcd9b6" />
        <path d="M66 58 a16 16 0 0 1 32 -2 q-16 -8 -32 2Z" fill="#1f2937" />
        <circle cx="76" cy="60" r="1.8" fill="#1e293b" />
        <circle cx="88" cy="60" r="1.8" fill="#1e293b" />
        <path d="M77 67 q5 4 10 0" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* rolling luggage */}
      <g>
        <rect x="120" y="72" width="34" height="54" rx="7" fill="#0f766e" />
        <rect x="120" y="72" width="34" height="54" rx="7" fill="#ffffff" opacity="0.08" />
        <line x1="128" y1="84" x2="146" y2="84" stroke="#a7f3d0" strokeWidth="3" strokeLinecap="round" />
        <line x1="128" y1="94" x2="146" y2="94" stroke="#a7f3d0" strokeWidth="3" strokeLinecap="round" />
        {/* handle */}
        <path d="M124 72 V60 h26 V72" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
        {/* wheels */}
        <circle cx="127" cy="130" r="4" fill="#1e293b" />
        <circle cx="147" cy="130" r="4" fill="#1e293b" />
      </g>

      {/* moving box */}
      <g>
        <rect x="150" y="104" width="30" height="24" rx="2" fill="#f59e0b" />
        <path d="M150 104 h30 v6 h-30Z" fill="#d97706" />
        <line x1="165" y1="104" x2="165" y2="128" stroke="#b45309" strokeWidth="2" />
      </g>
    </svg>
  );
}
