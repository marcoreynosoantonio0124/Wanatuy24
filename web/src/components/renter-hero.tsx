import Image from "next/image";
import { DuskScene } from "@/components/dusk-scene";

/**
 * The renter's warm welcome hero: the emerald-dusk scene with MEET standing
 * on it and a handwritten greeting. Mirrors the lessor hero.
 */
export function RenterHero({ greetingName }: { greetingName: string }) {
  return (
    <section className="relative min-h-[210px] overflow-hidden rounded-b-2xl sm:rounded-2xl">
      <DuskScene
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-slate-950/25" />
      <div className="relative px-5 py-7 pr-32">
        <p className="text-sm font-medium text-emerald-300">Welcome back 👋</p>
        <h1
          className="text-4xl font-bold leading-none text-white sm:text-5xl [text-shadow:0_3px_10px_rgba(0,0,0,0.9)]"
          style={{
            fontFamily: "'Caveat', ui-rounded, cursive",
            WebkitTextStroke: "1.1px rgba(2,6,23,0.7)",
            paintOrder: "stroke",
          }}
        >
          Hi, {greetingName}!
        </h1>
        <p className="mt-2 max-w-[62%] text-sm text-white/85">
          Ito ang lahat ng iyong inuupahan — nasa isang lugar ang records mo.
        </p>
      </div>
      <Image
        src="/meet-mascot.png"
        alt="MEET — your DueMeet rent buddy"
        width={300}
        height={520}
        priority
        className="pointer-events-none absolute bottom-0 right-1 h-44 w-auto drop-shadow-xl sm:right-3 sm:h-52"
      />
    </section>
  );
}
