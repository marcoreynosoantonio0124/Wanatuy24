import Image from "next/image";

/**
 * Full-bleed immersive hero for the lessor dashboard: a generated emerald-dusk
 * neighborhood scene (glowing horizon, lit windows, floating keys & sparkles)
 * that the greeting and DUE sit on top of, fading into the dark dashboard below.
 * Breaks out of the page's padded column with the negative margins.
 *
 * `flushTop` pulls the hero up to the very top of the content area (for the
 * real dashboard). It's turned off on the admin preview pages, where a banner
 * sits above the hero — otherwise the hero would overlap that banner.
 */
export function LessorHero({
  greetingName,
  flushTop = true,
}: {
  greetingName: string;
  flushTop?: boolean;
}) {
  return (
    <section
      className={`relative -mx-4 overflow-hidden sm:rounded-b-3xl ${flushTop ? "-mt-8" : ""}`}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 460"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lh-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#05362a" />
            <stop offset="0.45" stopColor="#0e6b57" />
            <stop offset="0.72" stopColor="#1f8a6f" />
            <stop offset="1" stopColor="#083b2e" />
          </linearGradient>
          <radialGradient id="lh-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff7e0" />
            <stop offset="0.35" stopColor="#ffd98a" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <g id="lh-key">
            <circle cx="0" cy="0" r="7" fill="none" stroke="currentColor" strokeWidth="3.2" />
            <rect x="-1.6" y="6" width="3.2" height="18" rx="1.4" fill="currentColor" />
            <rect x="1.6" y="15" width="6" height="3" fill="currentColor" />
            <rect x="1.6" y="20" width="4" height="3" fill="currentColor" />
          </g>
          <g id="lh-star">
            <path d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" fill="currentColor" />
          </g>
        </defs>

        <rect width="1200" height="460" fill="url(#lh-sky)" />
        <circle cx="760" cy="300" r="300" fill="url(#lh-sun)" />
        <circle cx="760" cy="300" r="60" fill="#fff2cf" opacity="0.85" />
        <g fill="#083529" opacity="0.9">
          <rect x="60" y="250" width="70" height="120" />
          <rect x="140" y="215" width="54" height="155" />
          <rect x="980" y="235" width="60" height="135" />
          <rect x="1050" y="205" width="66" height="165" />
          <rect x="1128" y="255" width="60" height="115" />
        </g>
        <g fill="#04231b">
          <rect x="120" y="300" width="180" height="160" />
          <path d="M110 302 L210 250 L310 302 Z" />
          <rect x="840" y="312" width="150" height="148" />
          <path d="M828 314 L915 262 L1002 314 Z" />
          <rect x="470" y="330" width="150" height="130" />
          <path d="M460 332 L545 288 L630 332 Z" />
        </g>
        <g fill="#ffcf6b" opacity="0.92">
          <rect x="150" y="330" width="20" height="26" rx="2" />
          <rect x="190" y="330" width="20" height="26" rx="2" />
          <rect x="150" y="372" width="20" height="26" rx="2" />
          <rect x="880" y="340" width="18" height="24" rx="2" />
          <rect x="915" y="340" width="18" height="24" rx="2" />
          <rect x="505" y="356" width="18" height="24" rx="2" />
          <rect x="545" y="356" width="18" height="24" rx="2" />
        </g>
        <g color="#ecfdf5" opacity="0.16">
          <use href="#lh-key" transform="translate(300,110) rotate(20) scale(1.6)" />
          <use href="#lh-key" transform="translate(900,120) rotate(-16) scale(1.3)" />
          <use href="#lh-key" transform="translate(560,90) rotate(34) scale(1.1)" />
        </g>
        <g color="#fde68a" opacity="0.6">
          <use href="#lh-star" transform="translate(430,120) scale(1.1)" />
          <use href="#lh-star" transform="translate(680,150) scale(0.8)" />
          <use href="#lh-star" transform="translate(240,180) scale(0.7)" />
          <use href="#lh-star" transform="translate(1000,90) scale(0.9)" />
        </g>
        <g opacity="0.05" fill="#fff">
          <polygon points="0,460 360,0 460,0 100,460" />
          <polygon points="520,460 760,0 820,0 580,460" />
        </g>
      </svg>

      {/* readability + bottom fade into the dashboard */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(2,10,8,0.78) 0%, rgba(2,10,8,0.4) 55%, rgba(2,10,8,0.15) 100%), linear-gradient(180deg, rgba(2,6,23,0) 55%, rgba(2,6,23,0.6) 85%, #020617 100%)",
        }}
      />

      <div className="relative flex min-h-[300px] flex-col justify-center px-4 pb-16 pt-10 sm:min-h-[320px] sm:px-8">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200">
          👋 Welcome back
        </span>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
          Kumusta, <span className="text-emerald-300">{greetingName}!</span>
        </h1>
        <p className="mt-2 max-w-[58%] text-sm text-white/85 sm:text-base">
          Ito ang iyong mga paupahan — managed beautifully in one place.
        </p>
      </div>

      <Image
        src="/due-mascot.png"
        alt="DUE — your DueMeet rent buddy"
        width={330}
        height={560}
        priority
        className="pointer-events-none absolute bottom-0 right-1 h-[230px] w-auto drop-shadow-2xl sm:right-6 sm:h-[310px]"
      />
    </section>
  );
}
