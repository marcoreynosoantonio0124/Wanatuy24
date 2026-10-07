import Image from "next/image";

/**
 * Full-bleed fixed photo wallpaper behind a whole dashboard page, with a dark
 * readability overlay. Matches the lessor dashboard's background treatment.
 */
export function PageWallpaper({ src = "/lessor-hero.jpg" }: { src?: string }) {
  return (
    <div className="fixed inset-0 -z-10">
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-950/85" />
    </div>
  );
}
