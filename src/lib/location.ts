export async function getCleanLocationName(latitude: number, longitude: number): Promise<string | null> {
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
  } catch (_err) {
    // Reverse geocode timeout or network error — fallback label is applied below
  }

  return null;
}
