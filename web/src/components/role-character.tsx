/**
 * Friendly role mascots drawn inline as SVG (crisp at any size, instant load):
 * a waving landlord with keys for the lessor, a traveler with luggage for the
 * renter. They float, wave, and sparkle via the .char-* classes in globals.css
 * (which respect prefers-reduced-motion).
 */
export function RoleCharacter({
  role,
  className = "h-24 w-auto",
}: {
  role: "lessor" | "renter";
  className?: string;
}) {
  if (role === "lessor") {
    return (
      <svg
        className={`char-float ${className}`}
        viewBox="0 0 150 168"
        role="img"
        aria-label="Landlord mascot"
      >
        <g opacity="0.95">
          <rect x="96" y="60" width="44" height="40" rx="4" fill="#0f3b2e" stroke="#34d399" strokeWidth="2" />
          <path d="M92 62 L118 42 L144 62 Z" fill="#34d399" />
          <rect x="110" y="78" width="14" height="22" rx="2" fill="#34d399" />
          <circle cx="121" cy="90" r="1.6" fill="#0b1220" />
        </g>
        <g className="char-bob">
          <rect x="58" y="126" width="12" height="30" rx="6" fill="#1e293b" />
          <rect x="76" y="126" width="12" height="30" rx="6" fill="#1e293b" />
          <path d="M50 94 q23 -13 46 0 l-5 42 q-18 7 -36 0 Z" fill="#10b981" />
          <rect x="86" y="96" width="11" height="28" rx="5.5" fill="#10b981" />
          <circle cx="98" cy="122" r="6" fill="#f3c9a3" />
          <g>
            <circle cx="110" cy="118" r="6" fill="none" stroke="#fbbf24" strokeWidth="3" />
            <rect x="112" y="121" width="3.5" height="14" fill="#fbbf24" />
            <rect x="114" y="130" width="6" height="3" fill="#fbbf24" />
          </g>
          <g className="char-wave" style={{ transformOrigin: "50% 100%" }}>
            <rect x="44" y="72" width="11" height="30" rx="5.5" fill="#10b981" />
            <circle cx="49" cy="70" r="6.5" fill="#f3c9a3" />
          </g>
          <circle cx="73" cy="72" r="19" fill="#f3c9a3" />
          <path d="M54 70 q0 -22 19 -22 q19 0 19 22 q-8 -9 -19 -9 q-11 0 -19 9 Z" fill="#2a2636" />
          <circle cx="67" cy="72" r="2" fill="#1f2937" />
          <circle cx="79" cy="72" r="2" fill="#1f2937" />
          <path d="M68 80 q5 4 10 0" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="63" cy="78" r="2.5" fill="#fb7185" opacity="0.5" />
          <circle cx="83" cy="78" r="2.5" fill="#fb7185" opacity="0.5" />
        </g>
        <path
          className="char-twinkle"
          style={{ transformOrigin: "50% 50%" }}
          d="M126 50 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"
          fill="#fde68a"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`char-float ${className}`}
      viewBox="0 0 150 168"
      role="img"
      aria-label="Renter mascot"
    >
      <g className="char-bob">
        <rect x="46" y="126" width="12" height="30" rx="6" fill="#1e293b" />
        <rect x="64" y="126" width="12" height="30" rx="6" fill="#1e293b" />
        <path d="M38 94 q23 -13 46 0 l-5 42 q-18 7 -36 0 Z" fill="#0ea5e9" />
        <rect x="74" y="96" width="11" height="26" rx="5.5" fill="#0ea5e9" />
        <circle cx="85" cy="120" r="6" fill="#f3c9a3" />
        <g className="char-wave" style={{ transformOrigin: "50% 100%" }}>
          <rect x="32" y="72" width="11" height="30" rx="5.5" fill="#0ea5e9" />
          <circle cx="37" cy="70" r="6.5" fill="#f3c9a3" />
        </g>
        <circle cx="61" cy="72" r="19" fill="#f3c9a3" />
        <path d="M42 72 q0 -22 19 -22 q19 0 19 22 q-8 -9 -19 -9 q-11 0 -19 9 Z" fill="#3a2b22" />
        <circle cx="61" cy="46" r="6" fill="#3a2b22" />
        <circle cx="55" cy="72" r="2" fill="#1f2937" />
        <circle cx="67" cy="72" r="2" fill="#1f2937" />
        <path d="M56 80 q5 4 10 0" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="51" cy="78" r="2.5" fill="#fb7185" opacity="0.5" />
        <circle cx="71" cy="78" r="2.5" fill="#fb7185" opacity="0.5" />
      </g>
      <g className="char-bob" style={{ animationDelay: "0.2s" }}>
        <rect x="96" y="92" width="34" height="50" rx="7" fill="#f59e0b" />
        <rect x="112" y="92" width="4" height="50" fill="#d97706" opacity="0.7" />
        <rect x="101" y="99" width="24" height="10" rx="3" fill="#fcd34d" opacity="0.65" />
        <rect x="104" y="74" width="4" height="20" rx="2" fill="#94a3b8" />
        <rect x="118" y="74" width="4" height="20" rx="2" fill="#94a3b8" />
        <rect x="102" y="72" width="22" height="5" rx="2.5" fill="#94a3b8" />
        <circle cx="103" cy="146" r="4" fill="#1e293b" />
        <circle cx="123" cy="146" r="4" fill="#1e293b" />
      </g>
      <path
        className="char-twinkle"
        style={{ transformOrigin: "50% 50%" }}
        d="M128 58 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"
        fill="#bae6fd"
      />
    </svg>
  );
}
