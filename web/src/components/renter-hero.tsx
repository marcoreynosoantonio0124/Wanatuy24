import Image from "next/image";
import { DuskScene } from "@/components/dusk-scene";

/**
 * The renter's warm welcome hero: the emerald-dusk scene with MEET standing
 * on it and a handwritten greeting. Mirrors the lessor hero (full-bleed).
 *
 * `flushTop` pulls the hero up to the very top of the content area (real
 * dashboard); it's off on the admin preview, where a banner sits above it.
 */
export function RenterHero({
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
      <DuskScene
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-slate-950/25" />

      <div className="relative flex min-h-[300px] flex-col justify-center px-4 pb-16 pt-10 sm:min-h-[320px] sm:px-8">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200">
          👋 Welcome back
        </span>
        <h1
          className="mt-3 text-4xl font-bold leading-none text-white sm:text-5xl [text-shadow:0_3px_10px_rgba(0,0,0,0.9)]"
          style={{
            fontFamily: "'Caveat', ui-rounded, cursive",
            WebkitTextStroke: "1.1px rgba(2,6,23,0.7)",
            paintOrder: "stroke",
          }}
        >
          Hi, {greetingName}!
        </h1>
        <p className="mt-2 max-w-[58%] text-sm text-white/85 sm:text-base">
          Ito ang lahat ng iyong inuupahan — nasa isang lugar ang records mo.
        </p>
      </div>

      <Image
        src="/meet-mascot.png"
        alt="MEET — your DueMeet rent buddy"
        width={300}
        height={520}
        priority
        className="pointer-events-none absolute bottom-0 right-1 h-[230px] w-auto drop-shadow-2xl sm:right-6 sm:h-[310px]"
      />
    </section>
  );
}
