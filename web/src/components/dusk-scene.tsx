/** Moody golden-hour neighborhood, silhouette style — built for a full-bleed
 *  hero behind a dark overlay. Pure SVG (no image asset), crisp at any size.
 *  Swap this for a real <img> hero photo later without touching the layout. */
export function DuskScene({
  className,
  preserveAspectRatio = "xMidYMid slice",
}: {
  className?: string;
  preserveAspectRatio?: string;
}) {
  // A few lit windows, generated so they look scattered but stable.
  const windows = [
    [120, 470], [150, 470], [120, 500], [180, 500],
    [980, 452], [1010, 452], [1010, 482], [1040, 482],
    [612, 556], [648, 556], [684, 556],
    [860, 548], [896, 548],
  ];
  return (
    <svg
      viewBox="0 0 1200 760"
      role="img"
      aria-label="Neighborhood at golden hour"
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="dk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1026" />
          <stop offset="0.34" stopColor="#2a2154" />
          <stop offset="0.56" stopColor="#7a3b6e" />
          <stop offset="0.72" stopColor="#d1673f" />
          <stop offset="0.85" stopColor="#f2a24a" />
          <stop offset="0.95" stopColor="#f8cf82" />
        </linearGradient>
        <radialGradient id="dk-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff7e6" />
          <stop offset="0.3" stopColor="#ffd88a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd88a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dk-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1020" />
          <stop offset="1" stopColor="#05070f" />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect width="1200" height="760" fill="url(#dk-sky)" />

      {/* sun + glow, low center-right */}
      <circle cx="820" cy="470" r="420" fill="url(#dk-sun)" />
      <circle cx="820" cy="452" r="72" fill="#fff2d6" />

      {/* soft horizon haze */}
      <g fill="#ffe8bf" opacity="0.16">
        <rect x="0" y="436" width="1200" height="8" />
        <rect x="0" y="452" width="1200" height="4" />
      </g>

      {/* distant skyline silhouettes */}
      <g fill="#1a2140">
        <rect x="60" y="392" width="46" height="88" />
        <rect x="118" y="360" width="34" height="120" />
        <rect x="160" y="410" width="40" height="70" />
        <rect x="940" y="378" width="40" height="102" />
        <rect x="988" y="404" width="34" height="76" />
        <rect x="1030" y="360" width="42" height="120" />
        <rect x="1084" y="400" width="40" height="80" />
      </g>

      {/* ground */}
      <rect y="470" width="1200" height="290" fill="url(#dk-ground)" />

      {/* foreground buildings / houses — dark silhouettes */}
      <g fill="#090d1a">
        {/* left apartment block */}
        <rect x="96" y="430" width="150" height="120" />
        <rect x="90" y="420" width="162" height="14" />
        {/* palm, left */}
        <path d="M300 552 C 296 508 296 472 300 440" stroke="#090d1a" strokeWidth="12" fill="none" strokeLinecap="round" />
        {/* center bungalow */}
        <rect x="588" y="500" width="132" height="56" />
        <path d="M576 502 L654 456 L732 502 Z" />
        {/* right house */}
        <rect x="840" y="492" width="120" height="60" />
        <path d="M828 494 L900 452 L972 494 Z" />
        {/* right palm */}
        <path d="M1000 556 C 1006 512 1006 476 1002 444" stroke="#090d1a" strokeWidth="12" fill="none" strokeLinecap="round" />
      </g>
      {/* palm fronds */}
      <g fill="#090d1a">
        <path d="M300 440 C 264 428 244 436 232 452 C 262 444 282 444 300 456 Z" />
        <path d="M300 440 C 336 428 356 436 368 452 C 338 444 318 444 300 456 Z" />
        <path d="M300 436 C 282 408 286 388 296 374 C 292 400 296 418 304 448 Z" />
        <path d="M1002 444 C 966 432 946 440 934 456 C 964 448 984 448 1002 460 Z" />
        <path d="M1002 444 C 1038 432 1058 440 1070 456 C 1040 448 1020 448 1002 460 Z" />
      </g>

      {/* lit windows glow */}
      <g>
        {windows.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="16" height="20" rx="2" fill="#ffcf6b" opacity="0.95" />
        ))}
      </g>

      {/* lamp posts with warm halo */}
      <g>
        <circle cx="430" cy="470" r="26" fill="#ffd98a" opacity="0.25" />
        <circle cx="430" cy="470" r="6" fill="#ffe6a8" />
        <rect x="428" y="470" width="4" height="86" fill="#0a0f1e" />
        <circle cx="1150" cy="486" r="24" fill="#ffd98a" opacity="0.22" />
        <circle cx="1150" cy="486" r="6" fill="#ffe6a8" />
        <rect x="1148" y="486" width="4" height="80" fill="#0a0f1e" />
      </g>

      {/* light reflections on ground */}
      <g fill="#ffcf6b" opacity="0.12">
        <rect x="626" y="556" width="6" height="120" />
        <rect x="872" y="556" width="6" height="110" />
        <rect x="428" y="556" width="4" height="120" />
      </g>
    </svg>
  );
}
