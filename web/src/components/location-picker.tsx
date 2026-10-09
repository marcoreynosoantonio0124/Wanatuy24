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

  type Suggestion = { lat: string; lon: string; display_name: string };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNext = useRef(false); // don't re-search right after picking a suggestion

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

  function pinTo(la: number, lo: number, zoom = 16) {
    setLat(Number(la.toFixed(6)));
    setLng(Number(lo.toFixed(6)));
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([la, lo], zoom);
      markerRef.current.setLatLng([la, lo]);
    }
  }

  /** Debounced type-ahead suggestions (free, OpenStreetMap/Nominatim). */
  function onQueryChange(v: string) {
    setQuery(v);
    setNote("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (v.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&countrycodes=ph&q=${encodeURIComponent(
            v.trim(),
          )}`,
          { headers: { Accept: "application/json" } },
        );
        const data = (await res.json()) as Suggestion[];
        setSuggestions(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 450);
  }

  function choose(s: Suggestion) {
    const la = Number(s.lat);
    const lo = Number(s.lon);
    pinTo(la, lo);
    setAddress(s.display_name ?? "");
    skipNext.current = true;
    setQuery(s.display_name ?? "");
    setSuggestions([]);
    setOpen(false);
  }

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setNote("");
    setOpen(false);
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
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setOpen(false);
                search();
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Start typing an address or place…"
            autoComplete="off"
            className={input}
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute z-[1000] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-300 bg-white py-1 shadow-xl">
              {suggestions.map((s, i) => (
                <li key={`${s.lat}-${s.lon}-${i}`}>
                  <button
                    type="button"
                    // onMouseDown fires before the input's onBlur, so the pick registers.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(s);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50"
                  >
                    📍 {s.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
        Pick a suggestion as you type, then drag the 📍 pin (or tap the map) to
        the exact spot.
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
