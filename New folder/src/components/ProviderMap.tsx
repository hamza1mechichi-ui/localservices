"use client";

import dynamic from "next/dynamic";

const LocationMap = dynamic(() => import("@/components/LocationMap").then((m) => ({ default: m.LocationMap })), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
      <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  ),
});

export default function ProviderMap({ lat, lng }: { lat: number; lng: number }) {
  return <LocationMap lat={lat} lng={lng} zoom={13} className="h-64 rounded-lg" />;
}
