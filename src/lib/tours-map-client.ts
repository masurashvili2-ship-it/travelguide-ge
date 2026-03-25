import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { TourMapMarker } from './tours-db';

function escapeHtml(s: string) {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Client-only: call after DOM has #tours-leaflet-map */
export function initTourMap(markerList: TourMapMarker[]) {
	const el = document.getElementById('tours-leaflet-map');
	if (!el) return;

	const map = L.map(el, { scrollWheelZoom: true }).setView([41.7, 44.8], 7);
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		maxZoom: 19,
	}).addTo(map);

	const bounds: L.LatLngTuple[] = [];
	for (const m of markerList) {
		const cm = L.circleMarker([m.lat, m.lng], {
			radius: 10,
			color: '#6b4f1e',
			fillColor: '#c9a227',
			fillOpacity: 0.88,
			weight: 2,
		}).addTo(map);
		const popupLine =
			m.label && String(m.label).trim()
				? `<strong>${escapeHtml(m.label)}</strong><br /><a href="${escapeHtml(m.href)}">${escapeHtml(m.title)}</a>`
				: `<a href="${escapeHtml(m.href)}">${escapeHtml(m.title)}</a>`;
		cm.bindPopup(popupLine);
		bounds.push([m.lat, m.lng]);
	}

	if (bounds.length) {
		map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
	}

	function fixSize() {
		map.invalidateSize({ animate: false });
	}
	map.whenReady(fixSize);
	requestAnimationFrame(fixSize);
	setTimeout(fixSize, 50);
	setTimeout(fixSize, 300);
	window.addEventListener('load', fixSize);
}
