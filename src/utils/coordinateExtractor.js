import exifr from "exifr";

/**
 * Extract GPS coordinates from an uploaded image file using EXIF metadata.
 * @param {File|Blob} file 
 * @returns {Promise<{latitude: number, longitude: number, source: string}|null>}
 */
export async function extractGPSFromImage(file) {
  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
      return {
        latitude: parseFloat(gps.latitude.toFixed(6)),
        longitude: parseFloat(gps.longitude.toFixed(6)),
        source: "Image EXIF (Drone/Camera GPS)"
      };
    }
  } catch (err) {
    console.warn("Could not read EXIF GPS metadata:", err);
  }
  return null;
}

/**
 * Format decimal coordinates into Degree Minute Second (DMS) string
 */
export function formatDMS(deg, isLat) {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  const direction = isLat ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim (free, open source)
 */
export async function reverseGeocodeOSM(lat, lng) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const nominatimBase = import.meta.env?.VITE_OSM_NOMINATIM_URL || "https://nominatim.openstreetmap.org/reverse";
    const url = `${nominatimBase}?format=jsonv2&lat=${lat}&lon=${lng}`;
    
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "AEROSAR-SearchAndRescue/1.0"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        // Return a clean concise location name
        const address = data.address || {};
        const parts = [
          address.suburb || address.neighbourhood || address.village || address.town || address.city,
          address.state_district || address.state,
          address.country
        ].filter(Boolean);
        return {
          fullName: data.display_name,
          shortName: parts.length > 0 ? parts.join(", ") : data.display_name.split(",").slice(0, 2).join(",")
        };
      }
    }
  } catch (e) {
    console.warn("Nominatim reverse geocode error:", e);
  }
  return {
    fullName: `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`,
    shortName: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`
  };
}
