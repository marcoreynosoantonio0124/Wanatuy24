import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

type Hit = { lat: string; lon: string; display_name: string };

/**
 * Server-side address search proxy. OpenStreetMap/Nominatim rejects requests
 * without an identifying User-Agent — which browsers can't set — so the client
 * calls us and we add it here. Free, no API key. PH-filtered.
 */
export async function GET(request: NextRequest) {
  await requireUser();

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ results: [] });

  const nominatim = await fromNominatim(q);
  if (nominatim.length > 0) return NextResponse.json({ results: nominatim });
  // Fallback: Photon (Komoot) — another free OSM geocoder, autocomplete-friendly.
  const photon = await fromPhoton(q);
  return NextResponse.json({ results: photon });
}

async function fromNominatim(q: string): Promise<Hit[]> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1" +
    `&limit=6&countrycodes=ph&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim's usage policy requires a descriptive User-Agent.
        "User-Agent": "DueMeet/1.0 (https://duemeet12.vercel.app)",
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Hit[];
    return (Array.isArray(data) ? data : []).map((d) => ({
      lat: d.lat,
      lon: d.lon,
      display_name: d.display_name,
    }));
  } catch {
    return [];
  }
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | undefined>;
};

async function fromPhoton(q: string): Promise<Hit[]> {
  // Bias toward the Philippines (centre), then keep only PH results.
  const url =
    "https://photon.komoot.io/api/?lang=en&limit=6&lat=12.8797&lon=121.774" +
    `&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: PhotonFeature[] };
    return (data.features ?? [])
      .filter((f) => (f.properties?.countrycode ?? "").toUpperCase() === "PH")
      .map((f) => {
        const [lon, lat] = f.geometry?.coordinates ?? [0, 0];
        const p = f.properties ?? {};
        const display_name = [p.name, p.street, p.district, p.city, p.state, p.country]
          .filter(Boolean)
          .join(", ");
        return { lat: String(lat), lon: String(lon), display_name };
      })
      .filter((h) => h.display_name);
  } catch {
    return [];
  }
}
