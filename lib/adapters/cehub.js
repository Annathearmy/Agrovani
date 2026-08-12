// Syngenta CE Hub API adapter + geocoding.

const CEHUB_BASE = 'https://services.cehub.syngenta-ais.com';
const CEHUB_APIKEY = process.env.CEHUB_APIKEY || 'b5428df1-abb7-4f52-8a13-ddaed67dcb98';

function headers() {
  return { ApiKey: CEHUB_APIKEY, Accept: 'application/json' };
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

// Optimal spray window for biostimulant foliar application.
export async function fetchSprayWindow(latitude, longitude, sprayingType = 'Foliar') {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 5);
  const url = `${CEHUB_BASE}/api/AgronomicsDecisionRecommendation/SprayWindowRecommendation?latitude=${latitude}&longitude=${longitude}&sprayingType=${encodeURIComponent(
    sprayingType
  )}&startDate=${ymd(start)}&endDate=${ymd(end)}`;
  try {
    const res = await fetch(url, { headers: headers(), cache: 'no-store' });
    if (!res.ok) return { ok: false, windows: [] };
    const data = await res.json();
    return { ok: true, windows: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { ok: false, windows: [], error: String(e) };
  }
}

export async function fetchHydricStress(latitude, longitude, crop = 'Rice') {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);
  const url = `${CEHUB_BASE}/api/AgronomicsDecisionRecommendation/HydricStressRecommendation?latitude=${latitude}&longitude=${longitude}&crop=${encodeURIComponent(
    crop
  )}&startDate=${ymd(start)}&endDate=${ymd(end)}&waterAvailabilty=Medium`;
  try {
    const res = await fetch(url, { headers: headers(), cache: 'no-store' });
    if (!res.ok) return { ok: false, data: null };
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, data: null, error: String(e) };
  }
}

// Geocode via OpenStreetMap Nominatim (free, no key) as CE Hub LocationSearch
// path is not publicly resolvable. Restricted to India.
export async function geocodeLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=5&q=${encodeURIComponent(
    query
  )}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FarmVista-Annam/1.0 (agri-demo)' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((d) => ({
      name: d.display_name,
      latitude: parseFloat(d.lat),
      longitude: parseFloat(d.lon),
      type: d.type,
    }));
  } catch (e) {
    return [];
  }
}
