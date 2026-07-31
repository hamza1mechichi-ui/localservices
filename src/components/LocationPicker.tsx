"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Crosshair } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

interface LocationResult {
  lat: number;
  lng: number;
  displayName: string;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// Déduplique les résultats Nominatim trop proches (arrondi ~1km, évite les doublons de variantes FR/AR)
function dedupeByProximity(results: LocationResult[]): LocationResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.lat.toFixed(2)},${r.lng.toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function LocationPicker({
  value,
  onChange,
  onCoordinates,
  placeholder,
  name,
}: {
  value: string;
  onChange: (val: string) => void;
  onCoordinates?: (lat: number, lng: number) => void;
  placeholder?: string;
  name?: string;
}) {
  const { lang } = useLang();
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debouncedValue = useDebouncedValue(value, 500);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    // Intentional: this effect synchronizes suggestions with the debounced search
    // value against the Nominatim API (an external system), including clearing
    // suggestions when the query becomes too short.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (debouncedValue.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);

    (async () => {
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", debouncedValue);
        url.searchParams.set("format", "json");
        url.searchParams.set("countrycodes", "tn"); // Tunisie uniquement
        url.searchParams.set("accept-language", "fr,ar");
        url.searchParams.set("limit", "6");

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "LocalServices/1.0" },
        });
        const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
        const results = dedupeByProximity(
          data.map((d) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), displayName: d.display_name }))
        );
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        if (abortRef.current === controller) setSearching(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedValue]);

  function handleInput(val: string) {
    onChange(val);
    if (val.trim().length < 3) setOpen(false);
  }

  function select(loc: LocationResult) {
    onChange(loc.displayName.split(",")[0]);
    onCoordinates?.(loc.lat, loc.lng);
    setOpen(false);
  }

  function getCurrentPosition() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        onCoordinates?.(latitude, longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=fr,ar`,
            { headers: { "User-Agent": "LocalServices/1.0" } }
          );
          const data = await res.json();
          onChange(data.display_name?.split(",")[0] || t("comp.currentPosition", lang));
        } catch {}
      },
      () => {}
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            name={name}
            value={value}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={placeholder ?? t("comp.searchLocationPlaceholder", lang)}
            className="w-full ps-10 pe-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-start focus:ring-2 focus:ring-blue-500"
          />
          {searching && <Loader2 size={16} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 animate-spin" />}
        </div>
        <button type="button" onClick={getCurrentPosition}
          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          title={t("comp.useMyLocation", lang)}>
          <Crosshair size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => select(s)}
              className="w-full text-start px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-500/10 border-b border-gray-50 dark:border-gray-700 last:border-0">
              <p className="font-medium">{s.displayName.split(",")[0]}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{s.displayName}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
