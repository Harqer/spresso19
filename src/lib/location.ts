export async function getCleanLocationName(latitude: number, longitude: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
      {
        headers: { "Accept-Language": "en" },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || addr.county;
      const state = addr.state || addr.country;

      if (city && state) {
        return `${city}, ${state}`;
      } else if (city) {
        return city;
      } else if (data.display_name) {
        const parts = data.display_name.split(",").map((s: string) => s.trim());
        if (parts.length >= 2) {
          return `${parts[0]}, ${parts[1]}`;
        }
        return parts[0];
      }
    }
  } catch (err) {
    console.warn("Reverse geocode lookup exception/timeout:", err);
  }

  // Fallback clean city naming logic without ever showing raw coordinates
  if (latitude >= 37.0 && latitude <= 38.2 && longitude >= -123.2 && longitude <= -121.8) {
    return "San Francisco, CA";
  } else if (latitude >= 40.4 && latitude <= 41.1 && longitude >= -74.3 && longitude <= -73.6) {
    return "New York, NY";
  } else if (latitude >= 33.7 && latitude <= 34.4 && longitude >= -118.7 && longitude <= -117.9) {
    return "Los Angeles, CA";
  }

  return "Current Location";
}
