"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

/**
 * A free map location picker (OpenStreetMap via Leaflet — no API key, no
 * billing). Search an address, or drag/tap to drop the pin; it fills the
 * hidden latitude/longitude inputs and the address field so the lessor can
 * see exactly where their property is.
 */
export function LocationPicker({
  defaultLat = null,
  defaultLng = null,
  defaultAddress = "",
}: {
  defaultLat?: number | null;
  defaultLng?: number | null;
  defaultAddress?: string | null;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const [lat, setLat] = useState<number | "">(defaultLat ?? "");
  const [lng, setLng] = useState<number | "">(defaultLng ?? "");
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;

      const startLat = typeof defaultLat === "number" ? defaultLat : 14.5995;
      const startLng = typeof defaultLng === "number" ? defaultLng : 120.9842;
      const startZoom = typeof defaultLat === "number" ? 16 : 11;

      map = L.map(mapEl.current).setView([startLat, startLng], startZoom);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: '<div style="font-size:30px;line-height:1;transform:translate(-50%,-92%)">📍</div>',
        className: "",
        iconSize: [0, 0],
      });
      const marker = L.marker([startLat, startLng], {
        draggable: true,
        icon,
      }).addTo(map);
      markerRef.current = marker;

      const set = (la: number, lo: number) => {
        setLat(Number(la.toFixed(6)));
        setLng(Number(lo.toFixed(6)));
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        set(p.lat, p.lng);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        set(e.latlng.lat, e.latlng.lng);
      });

      setTimeout(() => map.invalidateSize(), 250);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setNote("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(
          q,
        )}`,
        { headers: { Accept: "application/json" } },
      );
      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      if (data && data[0]) {
        const la = Number(data[0].lat);
        const lo = Number(data[0].lon);
        setLat(Number(la.toFixed(6)));
        setLng(Number(lo.toFixed(6)));
        if (!address) setAddress(data[0].display_name ?? "");
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([la, lo], 16);
          markerRef.current.setLatLng([la, lo]);
        }
      } else {
        setNote("No match — drag the pin to set the spot instead.");
      }
    } catch {
      setNote("Couldn't search right now — drag the pin to set the spot.");
    }
    setSearching(false);
  }

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900";

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-700">
        Where is the property?
      </span>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="Search address or place…"
          className={input}
        />
        <button
          type="button"
          onClick={search}
          disabled={searching}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
        >
          {searching ? "…" : "Find"}
        </button>
      </div>

      <div
        ref={mapEl}
        className="h-64 w-full overflow-hidden rounded-lg border border-slate-300"
        style={{ background: "#e8eef3" }}
      />
      <p className="text-xs text-slate-500">
        Drag the 📍 pin or tap the map to set the exact spot.
        {lat !== "" && lng !== "" ? ` · Pinned at ${lat}, ${lng}` : ""}
      </p>
      {note && <p className="text-xs text-amber-600">{note}</p>}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Address</span>
        <input
          name="address_text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, Barangay, City, Province"
          className={input}
        />
      </label>

      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lng} />
    </div>
  );
}
