/**
 * Validates a user-supplied URL for “Get directions” links.
 * Only http(s) URLs on known Google Maps hosts are accepted.
 */
export function parseGoogleMapsDirectionsUrl(raw: unknown): string | null {
	if (raw == null || raw === '') return null;
	const s = String(raw).trim();
	if (!s) return null;
	let u: URL;
	try {
		u = new URL(s);
	} catch {
		return null;
	}
	if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
	const h = u.hostname.toLowerCase();
	const ok =
		h === 'google.com' ||
		h === 'www.google.com' ||
		h.endsWith('.google.com') ||
		h === 'maps.google.com' ||
		h === 'google.ge' ||
		h.endsWith('.google.ge') ||
		h === 'goo.gl' ||
		h.endsWith('.goo.gl') ||
		h === 'g.co' ||
		h.endsWith('.app.goo.gl');
	if (!ok) return null;
	return u.href;
}

/** Fallback when no custom URL is stored but coordinates exist. */
export function googleDirectionsUrlFromCoords(lat: number, lng: number): string {
	return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}
