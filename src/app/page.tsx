import { PropertySearch } from "@/components/PropertySearch";
import { getServerConfig } from "@/lib/config";
import { getAppStatus } from "@/lib/properties";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const status = getAppStatus();
  const { mapbox } = getServerConfig();
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  return (
    <PropertySearch
      status={status}
      mapboxToken={mapboxToken.includes("replace_me") ? "" : mapboxToken}
      geocodeCountry={mapbox.geocodeCountry}
    />
  );
}
