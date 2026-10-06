/**
 * Time-of-day theming for the ambient backdrop.
 *
 * The backdrop shifts its sky, its sun/moon, and how many stars show based on
 * the hour — morning feels like morning, night feels like night. The server
 * renders a Manila-time default (most DueMeet users are in the Philippines) so
 * there's no flash, then the browser corrects it to the viewer's real local
 * time once the page loads.
 */

export type Phase = "dawn" | "day" | "dusk" | "night";

export function phaseForHour(hour: number): Phase {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

/** Current hour in Manila (UTC+8) — the server-side default. */
export function manilaHour(): number {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCHours();
}

export function currentPhaseManila(): Phase {
  return phaseForHour(manilaHour());
}
