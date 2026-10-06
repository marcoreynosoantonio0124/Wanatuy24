/**
 * DUE — the DueMeet landlord mascot, drawn inline as SVG (crisp at any size,
 * instant load). A friendly, chubby building-super: emerald cap with a house
 * emblem, "DUE" on his shirt, holding his signature golden key. Static (no
 * animation) so he just stands there and greets you.
 */
export function DueMascot({ className = "h-64 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 290"
      role="img"
      aria-label="DUE the landlord mascot"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="due-skin" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ffe3c4" />
          <stop offset="1" stopColor="#eaa877" />
        </radialGradient>
        <linearGradient id="due-shirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="0.55" stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="due-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="due-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="due-pants" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#64748b" />
          <stop offset="1" stopColor="#3f4b5e" />
        </linearGradient>
      </defs>

      <ellipse cx="110" cy="278" rx="66" ry="10" fill="#000" opacity=".22" />
      <rect x="83" y="206" width="22" height="56" rx="11" fill="url(#due-pants)" />
      <rect x="115" y="206" width="22" height="56" rx="11" fill="url(#due-pants)" />
      <path d="M78 260 q16 -9 32 0 l0 6 q-16 6 -32 0 Z" fill="#1f2937" />
      <path d="M110 260 q16 -9 32 0 l0 6 q-16 6 -32 0 Z" fill="#1f2937" />

      {/* signature key */}
      <g stroke="#b4700a" strokeWidth="1.2">
        <circle cx="182" cy="150" r="17" fill="none" stroke="url(#due-gold)" strokeWidth="9" />
        <circle cx="182" cy="150" r="6" fill="#0b1220" stroke="none" />
        <rect x="177" y="164" width="10" height="66" rx="3.5" fill="url(#due-gold)" />
        <rect x="187" y="208" width="17" height="10" rx="3" fill="url(#due-gold)" />
        <rect x="187" y="223" width="12" height="10" rx="3" fill="url(#due-gold)" />
      </g>
      <line x1="178" y1="140" x2="178" y2="224" stroke="#fff8d6" strokeWidth="2" opacity=".5" />

      {/* body */}
      <path d="M56 158 q54 -30 108 0 q8 54 -5 94 q-49 16 -98 0 q-13 -40 -5 -94 Z" fill="url(#due-shirt)" />
      <path d="M110 160 q27 -14 54 -2 q7 50 -4 92 q-25 8 -50 7 Z" fill="#000" opacity=".08" />
      <path d="M56 160 q-14 6 -16 26 q12 7 24 2 Z" fill="url(#due-shirt)" />
      <path d="M164 160 q14 6 16 26 q-12 7 -24 2 Z" fill="url(#due-shirt)" />
      <path d="M88 158 q22 17 44 0 l-7 -12 q-15 9 -30 0 Z" fill="#065f46" />
      <text
        x="110"
        y="222"
        textAnchor="middle"
        fontSize="33"
        fontWeight="900"
        letterSpacing="2.5"
        fill="#ecfdf5"
        style={{ paintOrder: "stroke" }}
        stroke="#047857"
        strokeWidth="1"
      >
        DUE
      </text>

      {/* hands */}
      <circle cx="182" cy="150" r="11" fill="url(#due-skin)" />
      <circle cx="46" cy="196" r="11" fill="url(#due-skin)" />
      <rect x="40" y="168" width="16" height="34" rx="8" fill="url(#due-shirt)" />

      {/* head */}
      <circle cx="110" cy="98" r="47" fill="url(#due-skin)" />
      <ellipse cx="62" cy="100" rx="7" ry="10" fill="url(#due-skin)" />
      <ellipse cx="158" cy="100" rx="7" ry="10" fill="url(#due-skin)" />
      <ellipse cx="94" cy="78" rx="18" ry="12" fill="#fff" opacity=".15" />

      {/* cap */}
      <path d="M60 80 q50 -50 100 0 q-50 -17 -100 0 Z" fill="url(#due-cap)" />
      <path d="M57 83 q53 -56 106 0 l0 5 q-53 -20 -106 0 Z" fill="#065f46" />
      <rect x="60" y="79" width="100" height="6" rx="3" fill="#064e3b" opacity=".6" />
      <g transform="translate(100,50)">
        <rect x="0" y="8" width="18" height="12" rx="1.5" fill="#fcd34d" />
        <path d="M-3 9 L9 -1 L21 9 Z" fill="#fde68a" />
        <rect x="7" y="13" width="4" height="7" fill="#b4700a" />
      </g>

      {/* face */}
      <path d="M82 88 q10 -6 18 -1" stroke="#7c4a2d" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M118 87 q10 -5 18 1" stroke="#7c4a2d" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <ellipse cx="93" cy="101" rx="6" ry="7.4" fill="#26303f" />
      <circle cx="95.4" cy="98" r="2.1" fill="#fff" />
      <ellipse cx="127" cy="101" rx="6" ry="7.4" fill="#26303f" />
      <circle cx="129.4" cy="98" r="2.1" fill="#fff" />
      <path d="M106 107 q4 5 8 0" stroke="#d99a6c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M90 119 q20 16 40 0" stroke="#7c4a2d" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M94 122 q16 9 32 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".5" />
      <circle cx="79" cy="115" r="6" fill="#fb7185" opacity=".4" />
      <circle cx="141" cy="115" r="6" fill="#fb7185" opacity=".4" />
    </svg>
  );
}
