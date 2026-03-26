import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { tourMapPinDataUrl, whatToDoMapPinDataUrl } from './map-pin-icons';
import type { TourMapMarker } from './tours-db';

function escapeHtml(s: string) {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function truncateText(s: string, max: number): string {
	const t = s.trim();
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1)}…`;
}

const iconCache = new Map<string, L.Icon>();

function markerIconForKey(mapIconKey: string): L.Icon {
	let icon = iconCache.get(mapIconKey);
	if (icon) return icon;
	const url = mapIconKey === 'tour' ? tourMapPinDataUrl() : whatToDoMapPinDataUrl(mapIconKey);
	icon = L.icon({
		iconUrl: url,
		iconSize: [36, 46],
		iconAnchor: [18, 46],
		popupAnchor: [0, -42],
		className: 'map-leaflet-pin',
	});
	iconCache.set(mapIconKey, icon);
	return icon;
}

function buildPopupHtml(m: TourMapMarker, viewDetailsLabel: string): string {
	const labelLine =
		m.label && String(m.label).trim()
			? `<div class="map-popup__label">${escapeHtml(String(m.label).trim())}</div>`
			: '';
	const img = m.coverUrl
		? `<a class="map-popup__media" href="${escapeHtml(m.href)}"><img class="map-popup__img" src="${escapeHtml(m.coverUrl)}" alt="" width="260" height="146" loading="lazy" decoding="async" /></a>`
		: '';
	const excerpt = m.excerpt
		? `<p class="map-popup__excerpt">${escapeHtml(truncateText(m.excerpt, 220))}</p>`
		: '';
	return `<div class="map-popup">
${labelLine}
${img}
<h3 class="map-popup__title"><a href="${escapeHtml(m.href)}">${escapeHtml(m.title)}</a></h3>
${excerpt}
<p class="map-popup__cta"><a class="map-popup__link" href="${escapeHtml(m.href)}">${escapeHtml(viewDetailsLabel)}</a></p>
</div>`;
}

export type TourMapFocusOptions = {
	lat: number;
	lng: number;
	zoom?: number;
	slug?: string;
	kind?: 'tours' | 'what-to-do';
};

export type TourMapInitOptions = {
	focus?: TourMapFocusOptions;
	popupViewDetailsLabel?: string;
	enableFilters?: boolean;
};

function markerKey(m: TourMapMarker): string {
	return `${m.kind}:${m.slug}`;
}

function filterMarkers(all: TourMapMarker[], root: HTMLElement): TourMapMarker[] {
	const activeKind = root.querySelector<HTMLButtonElement>('[data-map-kind].is-active');
	const kindMode = activeKind?.dataset.mapKind ?? 'all';

	const tourChecked = [
		...root.querySelectorAll<HTMLInputElement>('input[name="map-tour-cat"]:checked'),
	].map((i) => i.value);
	const wtdChecked = [
		...root.querySelectorAll<HTMLInputElement>('input[name="map-wtd-cat"]:checked'),
	].map((i) => i.value);
	const tourSet = new Set(tourChecked);
	const wtdSet = new Set(wtdChecked);

	return all.filter((m) => {
		if (kindMode === 'tours' && m.kind !== 'tours') return false;
		if (kindMode === 'what-to-do' && m.kind !== 'what-to-do') return false;

		if (m.kind === 'tours') {
			if (tourSet.size === 0) return true;
			return m.tourCategory != null && tourSet.has(m.tourCategory);
		}
		if (m.kind === 'what-to-do') {
			if (wtdSet.size === 0) return true;
			const ids = m.whatDoCategoryIds ?? [];
			if (ids.length === 0) return false;
			return ids.some((id) => wtdSet.has(id));
		}
		return true;
	});
}

function updateFilterCount(root: HTMLElement, visible: number, total: number) {
	const el = root.querySelector('[data-map-filter-count]');
	if (!el) return;
	const tpl = root.dataset.mapFilterShowingTpl ?? '';
	el.textContent = tpl.replace(/\{visible\}/g, String(visible)).replace(/\{total\}/g, String(total));
}

/** Client-only: call after DOM has #tours-leaflet-map */
export function initTourMap(markerList: TourMapMarker[], options?: TourMapInitOptions) {
	const el = document.getElementById('tours-leaflet-map');
	if (!el) return;

	const viewDetails = options?.popupViewDetailsLabel?.trim() || 'View details';
	const enableFilters = Boolean(options?.enableFilters);
	const filterRoot = document.getElementById('tours-map-filters');
	const allMarkers = markerList;

	const map = L.map(el, { scrollWheelZoom: true }).setView([41.7, 44.8], 7);
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		maxZoom: 19,
	}).addTo(map);

	const markerLayer = L.layerGroup().addTo(map);

	function drawMarkers(list: TourMapMarker[]): {
		bounds: L.LatLngTuple[];
		markerByKey: Map<string, L.Marker>;
		firstMarker: L.Marker | undefined;
	} {
		markerLayer.clearLayers();
		const bounds: L.LatLngTuple[] = [];
		const markerByKey = new Map<string, L.Marker>();
		let firstMarker: L.Marker | undefined;
		for (const m of list) {
			const marker = L.marker([m.lat, m.lng], {
				icon: markerIconForKey(m.mapIconKey),
			});
			marker.bindPopup(buildPopupHtml(m, viewDetails), { maxWidth: 300, className: 'map-popup-wrap' });
			markerLayer.addLayer(marker);
			bounds.push([m.lat, m.lng]);
			markerByKey.set(markerKey(m), marker);
			if (!firstMarker) firstMarker = marker;
		}
		return { bounds, markerByKey, firstMarker };
	}

	function applyView(
		list: TourMapMarker[],
		bounds: L.LatLngTuple[],
		markerByKey: Map<string, L.Marker>,
		firstMarker: L.Marker | undefined,
	) {
		const focus = options?.focus;
		const featuredKey =
			focus?.slug && focus?.kind && (focus.kind === 'tours' || focus.kind === 'what-to-do')
				? `${focus.kind}:${focus.slug}`
				: null;
		const featuredMarker = featuredKey ? markerByKey.get(featuredKey) : undefined;

		if (list.length === 0) {
			map.setView([41.7, 44.8], 7);
			return;
		}

		if (enableFilters) {
			map.fitBounds(bounds, { padding: [52, 52], maxZoom: list.length === 1 ? 14 : 15 });
			map.closePopup();
			return;
		}

		if (featuredKey && list.length > 1) {
			map.fitBounds(bounds, { padding: [52, 52], maxZoom: 15 });
			const open = featuredMarker ?? firstMarker;
			if (open) setTimeout(() => open.openPopup(), 280);
			return;
		}
		if (
			featuredKey &&
			list.length === 1 &&
			focus &&
			Number.isFinite(focus.lat) &&
			Number.isFinite(focus.lng)
		) {
			map.setView([focus.lat, focus.lng], focus.zoom ?? 14);
			const open = featuredMarker ?? firstMarker;
			if (open) setTimeout(() => open.openPopup(), 200);
			return;
		}
		if (focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lng) && list.length === 1) {
			map.setView([focus.lat, focus.lng], focus.zoom ?? 13);
			if (firstMarker) setTimeout(() => firstMarker.openPopup(), 200);
			return;
		}
		map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
	}

	function redraw() {
		const list =
			enableFilters && filterRoot instanceof HTMLElement
				? filterMarkers(allMarkers, filterRoot)
				: allMarkers;
		if (enableFilters && filterRoot instanceof HTMLElement) {
			updateFilterCount(filterRoot, list.length, allMarkers.length);
		}
		const { bounds, markerByKey, firstMarker } = drawMarkers(list);
		applyView(list, bounds, markerByKey, firstMarker);
	}

	redraw();

	if (enableFilters && filterRoot) {
		filterRoot.addEventListener('click', (e) => {
			const kindBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-map-kind]');
			if (!kindBtn || !filterRoot.contains(kindBtn)) return;
			e.preventDefault();
			filterRoot.querySelectorAll('[data-map-kind]').forEach((b) => {
				b.classList.remove('is-active');
				b.setAttribute('aria-selected', 'false');
			});
			kindBtn.classList.add('is-active');
			kindBtn.setAttribute('aria-selected', 'true');
			redraw();
		});
		const clearBtn = filterRoot.querySelector<HTMLButtonElement>('[data-map-filter-clear]');
		clearBtn?.addEventListener('click', () => {
			filterRoot.querySelectorAll('input[type="checkbox"]').forEach((i) => {
				(i as HTMLInputElement).checked = false;
			});
			filterRoot.querySelectorAll('[data-map-kind]').forEach((b) => {
				b.classList.remove('is-active');
				b.setAttribute('aria-selected', 'false');
			});
			const allBtn = filterRoot.querySelector<HTMLButtonElement>('[data-map-kind="all"]');
			allBtn?.classList.add('is-active');
			allBtn?.setAttribute('aria-selected', 'true');
			redraw();
		});
		filterRoot.addEventListener('change', (e) => {
			if ((e.target as HTMLElement).matches('input[type="checkbox"]')) redraw();
		});
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
