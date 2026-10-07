import Image from "next/image";
import { DueMascot } from "@/components/due-mascot";

/**
 * Full-bleed immersive hero for the lessor dashboard: a real property photo
 * backdrop with DUE and the greeting on top, fading into the dark dashboard.
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
      <Image
        src="/lessor-hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.45) 52%, rgba(2,6,23,0.15) 100%), linear-gradient(180deg, rgba(2,6,23,0) 48%, rgba(2,6,23,0.55) 84%, #020617 100%)",
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

      <DueMascot className="pointer-events-none absolute bottom-0 right-1 h-[220px] w-auto drop-shadow-2xl sm:right-6 sm:h-[300px]" />
    </section>
  );
}
