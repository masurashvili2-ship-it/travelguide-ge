import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { TourCategoryId } from './tour-categories';
import { parseTourCategory } from './tour-categories';
import type { TourPhysicalRatingId } from './tour-physical-rating';
import { parseDrivingDistance, parseTourPhysicalRating } from './tour-physical-rating';
import type { Locale } from './strings';
import { getDataDir } from './data-dir';
import type { TourListItem, TourLocation, TourMapMarker } from './tours-db';
import { isValidTourId, parseTourLocation, tourCoverImageUrl } from './tours-db';

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'guide-packages.json');
const LOCALES: Locale[] = ['en', 'ka', 'ru'];

function normalizePackagePlaceIds(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const out: string[] = [];
	const seen = new Set<string>();
	for (const el of raw) {
		if (typeof el !== 'string') continue;
		const id = el.trim();
		if (!isValidTourId(id) || seen.has(id)) continue;
		seen.add(id);
		out.push(id);
	}
	return out;
}

function normalizeItineraryStop(raw: unknown): ItineraryStop | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const k = o.kind;
	const kind: ItineraryStopKind =
		k === 'start' || k === 'stop' || k === 'optional' || k === 'end' ? k : 'stop';
	return {
		id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : randomUUID(),
		kind,
		title: String(o.title ?? '').trim(),
		body: String(o.body ?? ''),
		timing_note:
			o.timing_note == null || o.timing_note === ''
				? null
				: String(o.timing_note).trim() || null,
	};
}

function normalizeItineraryDays(raw: unknown): ItineraryDay[] {
	if (!Array.isArray(raw)) return [];
	const out: ItineraryDay[] = [];
	let idx = 0;
	for (const el of raw) {
		idx += 1;
		if (!el || typeof el !== 'object') continue;
		const o = el as Record<string, unknown>;
		const stopsRaw = Array.isArray(o.stops) ? o.stops : [];
		const stops = stopsRaw
			.map((s) => normalizeItineraryStop(s))
			.filter((s): s is ItineraryStop => s != null);
		out.push({
			id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : randomUUID(),
			day_index: typeof o.day_index === 'number' && o.day_index >= 1 ? o.day_index : idx,
			title: o.title == null || o.title === '' ? null : String(o.title).trim() || null,
			stops,
		});
	}
	return out;
}

/** Number of itinerary “days” to edit/show (multi-day tours use one block per calendar day). */
export function packageDayCountFromDurationHours(duration_hours: number): number {
	return Math.max(1, Math.ceil(Math.max(1, duration_hours) / 24));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransportType = 'sedan' | 'suv' | 'minivan' | 'minibus' | 'bus' | 'boat' | 'other';

/**
 * A fixed-price group-size tier for private tours.
 * If price is 0 the tier is considered disabled and hidden from booking.
 */
export type PrivateTier = {
	id: string;
	label: string;   // e.g. "Solo & Couple", "Small Group"
	min_pax: number;
	max_pax: number;
	price: number;   // total fixed price for the whole group (0 = disabled)
	/** Vehicle for this price tier (private tours) */
	vehicle_type: TransportType | null;
	/** Transport details for this tier (private tours), e.g. vehicle model */
	transport_notes: string | null;
};

export type PricingRule = {
	id: string;
	/** Group size discount (applied when pax is between min_pax and max_pax) */
	kind: 'group' | 'early_bird' | 'seasonal';
	label: string | null;
	discount_pct: number; // 0–100
	// Group discount
	min_pax: number | null;
	max_pax: number | null;
	// Early bird
	days_before: number | null;
	// Seasonal date range
	date_from: string | null; // YYYY-MM-DD
	date_to: string | null;
};

export type AvailabilitySlot = {
	id: string;
	package_id: string;
	date: string; // YYYY-MM-DD
	time_start: string | null; // HH:MM
	capacity: number;
	booked_count: number;
	/** blocked = guide blocked the date, open = available */
	status: 'open' | 'blocked';
	/** Override the package base_price for this slot */
	custom_price: number | null;
};

/** One segment of the day-by-day itinerary (per locale). */
export type ItineraryStopKind = 'start' | 'stop' | 'optional' | 'end';

export type ItineraryStop = {
	id: string;
	kind: ItineraryStopKind;
	title: string;
	body: string;
	/** e.g. “Morning”, “Approx. 2h” — optional */
	timing_note: string | null;
};

export type ItineraryDay = {
	id: string;
	/** 1-based day number within the tour */
	day_index: number;
	/** Optional heading for the day card */
	title: string | null;
	stops: ItineraryStop[];
};

export type PackageLocaleBlock = {
	title: string;
	/** Short intro / card text (Markdown ok) */
	description: string;
	/** Long-form article below booking details (Markdown) */
	body: string;
	/** Structured itinerary; length should match ceil(duration_hours / 24) for complete packages */
	itinerary_days: ItineraryDay[];
	includes_text: string | null;
	excludes_text: string | null;
	meeting_point_text: string | null;
	seo_title: string | null;
	seo_description: string | null;
};

export type PackagePaymentMethod = 'paypal_full' | 'paypal_deposit' | 'cash';

export type PackagePaymentOption = {
	/** Whether this payment method is offered for this package */
	enabled: boolean;
	/** Extra discount % when paying with this method (0 = no extra discount) */
	discount_pct: number;
};

export type PackagePaymentOptions = Record<PackagePaymentMethod, PackagePaymentOption>;

export const DEFAULT_PAYMENT_OPTIONS: PackagePaymentOptions = {
	paypal_full:    { enabled: true, discount_pct: 0 },
	paypal_deposit: { enabled: true, discount_pct: 0 },
	cash:           { enabled: true, discount_pct: 0 },
};

/** Optional add-ons (e.g. water, meals); priced per person or per booking. */
export type PackageExtra = {
	id: string;
	label: string;
	price: number;
	unit: 'per_person' | 'per_booking';
	max_quantity: number;
};

export type GuidePackage = {
	id: string;
	guide_id: string;
	slug: string;
	status: 'draft' | 'pending_review' | 'published';
	cover_photo: string | null;
	gallery: string[];
	duration_hours: number;
	duration_label: string | null;
	min_people: number;
	max_people: number;
	languages: string[];
	/** 'group' = per-person pricing; 'private' = fixed price per group size tier */
	tour_style: 'private' | 'group';
	/** Fixed-price tiers for private tours (only used when tour_style === 'private') */
	private_tiers: PrivateTier[];
	base_price: number;
	currency: string;
	pricing_rules: PricingRule[];
	/** Whether transportation is included in the price */
	transport_included: boolean;
	transport_type: TransportType | null;
	/** Group tours only; private tours use per-tier `private_tiers[].transport_notes` */
	transport_notes: string | null;
	/** Whether hotel/airport pickup is offered */
	pickup_offered: boolean;
	pickup_notes: string | null;
	/** Difficulty level (optional) */
	difficulty: 'easy' | 'moderate' | 'challenging' | null;
	/** Minimum age (null = no restriction) */
	min_age: number | null;
	/** Cancellation / refund policy (free text) */
	cancellation_policy: string | null;
	/** Same taxonomy as former editorial tours */
	category: TourCategoryId | null;
	/** Map pin (WGS84); optional */
	location: TourLocation | null;
	/** Linked region / municipality / village ids */
	place_ids: string[];
	physical_rating: TourPhysicalRatingId | null;
	driving_distance: string | null;
	/** Per-method payment configuration set by the guide */
	payment_options: PackagePaymentOptions;
	/** Optional paid add-ons at booking time */
	extras: PackageExtra[];
	i18n: Partial<Record<Locale, PackageLocaleBlock>>;
	created_at: number;
	updated_at: number;
};

type StoreFile = {
	packages: GuidePackage[];
	availability: AvailabilitySlot[];
};

// ─── Cache ────────────────────────────────────────────────────────────────────

let _cachedPackages: GuidePackage[] | null = null;
let _cachedSlots: AvailabilitySlot[] | null = null;

export function invalidateGuidePackagesCache(): void {
	_cachedPackages = null;
	_cachedSlots = null;
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

function ensureDataDir() {
	mkdirSync(DATA_DIR, { recursive: true });
}

function readStore(): StoreFile {
	ensureDataDir();
	if (!existsSync(STORE_FILE)) {
		const empty: StoreFile = { packages: [], availability: [] };
		writeFileSync(STORE_FILE, JSON.stringify(empty, null, 2) + '\n', 'utf8');
		return empty;
	}
	try {
		const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as StoreFile;
		return {
			packages: Array.isArray(raw.packages) ? raw.packages.map(normalizePackage) : [],
			availability: Array.isArray(raw.availability)
				? raw.availability.map(normalizeSlot)
				: [],
		};
	} catch {
		return { packages: [], availability: [] };
	}
}

function writeStore(s: StoreFile) {
	ensureDataDir();
	writeFileSync(STORE_FILE, JSON.stringify(s, null, 2) + '\n', 'utf8');
	_cachedPackages = [...s.packages];
	_cachedSlots = [...s.availability];
}

function getStore(): StoreFile {
	if (_cachedPackages && _cachedSlots) {
		return { packages: _cachedPackages, availability: _cachedSlots };
	}
	const s = readStore();
	_cachedPackages = s.packages;
	_cachedSlots = s.availability;
	return s;
}

// ─── Normalization ────────────────────────────────────────────────────────────

function normalizePackage(raw: GuidePackage): GuidePackage {
	const i18n: Partial<Record<Locale, PackageLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const b = raw.i18n?.[loc];
		if (!b?.title?.trim()) continue;
		i18n[loc] = {
			title: String(b.title ?? '').trim(),
			description: String(b.description ?? ''),
			body: String((b as { body?: string }).body ?? ''),
			itinerary_days: normalizeItineraryDays((b as { itinerary_days?: unknown }).itinerary_days),
			includes_text: b.includes_text?.trim() || null,
			excludes_text: b.excludes_text?.trim() || null,
			meeting_point_text: b.meeting_point_text?.trim() || null,
			seo_title: b.seo_title?.trim() || null,
			seo_description: b.seo_description?.trim() || null,
		};
	}
	return {
		id: String(raw.id ?? ''),
		guide_id: String(raw.guide_id ?? ''),
		slug: String(raw.slug ?? ''),
		status: raw.status === 'published' ? 'published' : raw.status === 'pending_review' ? 'pending_review' : 'draft',
		cover_photo: raw.cover_photo?.trim() || null,
		gallery: Array.isArray(raw.gallery)
			? (raw.gallery as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
			: [],
		duration_hours: typeof raw.duration_hours === 'number' ? raw.duration_hours : 2,
		duration_label: raw.duration_label?.trim() || null,
		min_people: typeof raw.min_people === 'number' ? raw.min_people : 1,
		max_people: typeof raw.max_people === 'number' ? raw.max_people : 10,
		languages: Array.isArray(raw.languages)
			? (raw.languages as unknown[]).filter((x): x is string => typeof x === 'string')
			: [],
		tour_style: raw.tour_style === 'private' ? 'private' : 'group',
		private_tiers: (() => {
			const legacyPkgNotes = (raw.transport_notes as string)?.trim() || null;
			let tiers: PrivateTier[] = Array.isArray(raw.private_tiers)
				? (raw.private_tiers as unknown[])
						.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
						.map((t) => {
							const tn = (t.transport_notes as string)?.trim() || null;
							return {
								id: String(t.id ?? ''),
								label: String(t.label ?? ''),
								min_pax: typeof t.min_pax === 'number' ? t.min_pax : 1,
								max_pax: typeof t.max_pax === 'number' ? t.max_pax : 1,
								price: typeof t.price === 'number' ? t.price : 0,
								vehicle_type: (['sedan', 'suv', 'minivan', 'minibus', 'bus', 'boat', 'other'] as const).includes(
									(t.vehicle_type as string) as TransportType,
								)
									? (t.vehicle_type as TransportType)
									: null,
								transport_notes: tn,
							};
						})
				: [];
			if (
				raw.tour_style === 'private' &&
				legacyPkgNotes &&
				tiers.length > 0 &&
				!tiers.some((x) => x.transport_notes)
			) {
				tiers = tiers.map((t) =>
					t.price > 0 ? { ...t, transport_notes: legacyPkgNotes } : t,
				);
			}
			return tiers;
		})(),
		base_price: typeof raw.base_price === 'number' ? raw.base_price : 0,
		currency: String(raw.currency ?? 'USD'),
		pricing_rules: Array.isArray(raw.pricing_rules)
			? (raw.pricing_rules as unknown[]).filter((x): x is PricingRule => x != null && typeof x === 'object')
			: [],
		transport_included: raw.transport_included === true,
		transport_type: (['sedan','suv','minivan','minibus','bus','boat','other'] as const).includes(raw.transport_type as TransportType)
			? (raw.transport_type as TransportType)
			: null,
		transport_notes: (raw.transport_notes as string)?.trim() || null,
		pickup_offered: raw.pickup_offered === true,
		pickup_notes: (raw.pickup_notes as string)?.trim() || null,
		difficulty: (['easy','moderate','challenging'] as const).includes(raw.difficulty as string)
			? (raw.difficulty as 'easy' | 'moderate' | 'challenging')
			: null,
		min_age: typeof raw.min_age === 'number' && raw.min_age > 0 ? raw.min_age : null,
		cancellation_policy: (raw.cancellation_policy as string)?.trim() || null,
		category: parseTourCategory((raw as { category?: unknown }).category),
		location: parseTourLocation((raw as { location?: unknown }).location),
		place_ids: normalizePackagePlaceIds((raw as { place_ids?: unknown }).place_ids),
		physical_rating: parseTourPhysicalRating((raw as { physical_rating?: unknown }).physical_rating),
		driving_distance: parseDrivingDistance((raw as { driving_distance?: unknown }).driving_distance),
		payment_options: (() => {
			const raw_po = (raw as { payment_options?: unknown }).payment_options;
			const defaults = structuredClone(DEFAULT_PAYMENT_OPTIONS);
			if (!raw_po || typeof raw_po !== 'object') return defaults;
			const po = raw_po as Record<string, unknown>;
			const methods: PackagePaymentMethod[] = ['paypal_full', 'paypal_deposit', 'cash'];
			for (const m of methods) {
				const entry = po[m];
				if (entry && typeof entry === 'object') {
					const e = entry as Record<string, unknown>;
					defaults[m].enabled = e.enabled !== false;
					defaults[m].discount_pct = typeof e.discount_pct === 'number'
						? Math.min(100, Math.max(0, e.discount_pct)) : 0;
				}
			}
			return defaults;
		})(),
		extras: (() => {
			const rawEx = (raw as { extras?: unknown }).extras;
			if (!Array.isArray(rawEx)) return [];
			const out: PackageExtra[] = [];
			for (const el of rawEx) {
				if (!el || typeof el !== 'object') continue;
				const o = el as Record<string, unknown>;
				const unit = o.unit === 'per_booking' ? 'per_booking' : 'per_person';
				const price = typeof o.price === 'number' && o.price >= 0 ? o.price : 0;
				const maxQ =
					typeof o.max_quantity === 'number' && o.max_quantity >= 1
						? Math.min(99, Math.floor(o.max_quantity))
						: 10;
				const label = String(o.label ?? '').trim();
				if (!label || price <= 0) continue;
				out.push({
					id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : randomUUID(),
					label,
					price,
					unit,
					max_quantity: maxQ,
				});
			}
			return out;
		})(),
		i18n,
		created_at: typeof raw.created_at === 'number' ? raw.created_at : 0,
		updated_at: typeof raw.updated_at === 'number' ? raw.updated_at : 0,
	};
}

function normalizeSlot(raw: AvailabilitySlot): AvailabilitySlot {
	return {
		id: String(raw.id ?? ''),
		package_id: String(raw.package_id ?? ''),
		date: String(raw.date ?? ''),
		time_start: raw.time_start?.trim() || null,
		capacity: typeof raw.capacity === 'number' ? raw.capacity : 1,
		booked_count: typeof raw.booked_count === 'number' ? raw.booked_count : 0,
		status: raw.status === 'blocked' ? 'blocked' : 'open',
		custom_price: typeof raw.custom_price === 'number' ? raw.custom_price : null,
	};
}

// ─── Package CRUD ─────────────────────────────────────────────────────────────

export function getPackages(): GuidePackage[] {
	return getStore().packages;
}

export function getPackageById(id: string): GuidePackage | null {
	return getStore().packages.find((p) => p.id === id) ?? null;
}

export function getPackageBySlug(slug: string): GuidePackage | null {
	return getStore().packages.find((p) => p.slug === slug) ?? null;
}

/** Published package only (for public /tours/[slug] resolution). */
export function getPublishedPackageBySlug(slug: string): GuidePackage | null {
	const p = getPackageBySlug(slug);
	if (!p || p.status !== 'published') return null;
	return p;
}

export function packageSnapshotForActivity(pkg: GuidePackage): { postTitle: string; postSlug: string } {
	const title =
		pkg.i18n.en?.title?.trim() ||
		pkg.i18n.ka?.title?.trim() ||
		pkg.i18n.ru?.title?.trim() ||
		pkg.slug;
	return { postTitle: title, postSlug: pkg.slug };
}

export function listPackagesForGuide(guideId: string): GuidePackage[] {
	return getStore().packages.filter((p) => p.guide_id === guideId);
}

export function listPublishedPackagesForGuide(guideId: string): GuidePackage[] {
	return getStore().packages.filter((p) => p.guide_id === guideId && p.status === 'published');
}

export function listAllPublishedPackages(): GuidePackage[] {
	return getStore().packages.filter((p) => p.status === 'published');
}

export function countPendingReviewPackages(): number {
	return getStore().packages.filter((p) => p.status === 'pending_review').length;
}

export function listPendingReviewPackages(): GuidePackage[] {
	return getStore().packages.filter((p) => p.status === 'pending_review');
}

const SIMILAR_PKG_DEFAULT = 4;

function packageTitleForLocale(pkg: GuidePackage, locale: Locale): string {
	return (
		pkg.i18n[locale]?.title?.trim() ||
		pkg.i18n.en?.title?.trim() ||
		pkg.i18n.ka?.title?.trim() ||
		pkg.i18n.ru?.title?.trim() ||
		pkg.slug
	);
}

/** Other published packages in the same locale, preferring the same tour category. */
export function listSimilarPublishedPackages(
	locale: Locale,
	excludeSlug: string,
	category: TourCategoryId | null,
	limit = SIMILAR_PKG_DEFAULT,
): GuidePackage[] {
	const all = listAllPublishedPackages().filter((p) => p.slug !== excludeSlug);
	const withTitle = all.filter((p) => packageTitleForLocale(p, locale).length > 0);
	const same: GuidePackage[] = [];
	const other: GuidePackage[] = [];
	for (const p of withTitle) {
		if (category && p.category === category) same.push(p);
		else other.push(p);
	}
	const cmp = (a: GuidePackage, b: GuidePackage) =>
		packageTitleForLocale(a, locale).localeCompare(packageTitleForLocale(b, locale), locale, {
			sensitivity: 'base',
		});
	same.sort(cmp);
	other.sort(cmp);
	return [...same, ...other].slice(0, limit);
}

/** Map pins for published packages that have coordinates. */
export function listPublishedPackageMapMarkers(locale: Locale): TourMapMarker[] {
	if (!LOCALES.includes(locale)) return [];
	const out: TourMapMarker[] = [];
	for (const p of listAllPublishedPackages()) {
		const loc = p.location;
		if (!loc) continue;
		const block = p.i18n[locale] ?? p.i18n.en ?? p.i18n.ka ?? p.i18n.ru;
		const title = block?.title?.trim();
		if (!title) continue;
		const excerpt = (block?.description ?? '').trim().slice(0, 280);
		const cover = tourCoverImageUrl({ image: p.cover_photo, gallery: p.gallery });
		out.push({
			slug: p.slug,
			title,
			lat: loc.lat,
			lng: loc.lng,
			label: loc.label,
			href: `/${locale}/tours/${p.slug}`,
			kind: 'packages',
			mapIconKey: 'tour',
			coverUrl: cover ?? null,
			excerpt,
			tourCategory: p.category,
			whatDoCategoryIds: [],
		});
	}
	return out;
}

export function publishedPackageAsTourListItem(pkg: GuidePackage, locale: Locale): TourListItem | null {
	const block = pkg.i18n[locale] ?? pkg.i18n.en ?? pkg.i18n.ka ?? pkg.i18n.ru;
	if (!block?.title?.trim()) return null;
	const excerpt = block.description.trim().slice(0, 400) || block.title;
	return {
		slug: pkg.slug,
		data: {
			title: block.title.trim(),
			locale,
			slug: pkg.slug,
			duration: pkg.duration_label?.trim() || `${pkg.duration_hours}h`,
			price: undefined,
			excerpt,
			image: pkg.cover_photo ?? undefined,
			gallery: pkg.gallery.length ? pkg.gallery : undefined,
			location: pkg.location ?? undefined,
			category: pkg.category ?? undefined,
			physical_rating: pkg.physical_rating ?? undefined,
			driving_distance: pkg.driving_distance ?? undefined,
			seoTitle: block.seo_title ?? undefined,
			seoDescription: block.seo_description ?? undefined,
		},
		body: block.body ?? '',
	};
}

export function publishedPackagesAsTourListItems(locale: Locale): TourListItem[] {
	return listAllPublishedPackages()
		.map((p) => publishedPackageAsTourListItem(p, locale))
		.filter((x): x is TourListItem => x != null)
		.sort((a, b) =>
			a.data.title.localeCompare(b.data.title, locale, { sensitivity: 'base' }),
		);
}

export function isPackageSlugUsed(slug: string, exceptId: string | null): boolean {
	return getStore().packages.some((p) => p.slug === slug && p.id !== exceptId);
}

function emptyLocaleBlock(): PackageLocaleBlock {
	return {
		title: '',
		description: '',
		body: '',
		itinerary_days: [],
		includes_text: null,
		excludes_text: null,
		meeting_point_text: null,
		seo_title: null,
		seo_description: null,
	};
}

function mergePackageI18n(
	prev: Partial<Record<Locale, PackageLocaleBlock>>,
	incoming: Partial<Record<Locale, PackageLocaleBlockPatch>>,
): Partial<Record<Locale, PackageLocaleBlock>> {
	const out: Partial<Record<Locale, PackageLocaleBlock>> = { ...prev };
	for (const loc of LOCALES) {
		const inc = incoming[loc];
		if (!inc) continue;
		const base = { ...emptyLocaleBlock(), ...(prev[loc] ?? {}) };
		out[loc] = {
			...base,
			...inc,
			title: inc.title !== undefined ? String(inc.title).trim() : base.title,
			description: inc.description !== undefined ? String(inc.description) : base.description,
			body: inc.body !== undefined ? String(inc.body) : base.body,
			itinerary_days:
				inc.itinerary_days !== undefined
					? normalizeItineraryDays(inc.itinerary_days)
					: base.itinerary_days,
		};
	}
	return out;
}

/**
 * Parse `body.i18n` from JSON API into locale blocks (shared by create/update routes).
 */
/** Parsed locale blocks from the API; omit keys you are not updating (merge preserves previous). */
export type PackageLocaleBlockPatch = Partial<
	Omit<PackageLocaleBlock, 'title' | 'description' | 'body'>
> & {
	title?: string;
	description?: string;
	body?: string;
};

export function parsePackageLocaleBlocksFromJsonBody(
	body: Record<string, unknown>,
): Partial<Record<Locale, PackageLocaleBlockPatch>> {
	const i18n: Partial<Record<Locale, PackageLocaleBlockPatch>> = {};
	const raw = body.i18n as Record<string, unknown> | null | undefined;
	if (!raw) return i18n;
	for (const loc of LOCALES) {
		const block = raw[loc] as Record<string, unknown> | undefined;
		if (!block?.title) continue;
		const patch: PackageLocaleBlockPatch = {
			title: String(block.title ?? '').trim(),
			description: String(block.description ?? ''),
			body: String(block.body ?? ''),
			includes_text: (block.includes_text as string)?.trim() || null,
			excludes_text: (block.excludes_text as string)?.trim() || null,
			meeting_point_text: (block.meeting_point_text as string)?.trim() || null,
			seo_title: (block.seo_title as string)?.trim() || null,
			seo_description: (block.seo_description as string)?.trim() || null,
		};
		if (block.itinerary_days !== undefined) {
			patch.itinerary_days = normalizeItineraryDays(block.itinerary_days);
		}
		i18n[loc] = patch;
	}
	return i18n;
}

/** Required fields for `pending_review` / `published` (draft saves skip this). */
export function validatePackageForReview(pkg: GuidePackage): string[] {
	const errs: string[] = [];
	if (!pkg.cover_photo?.trim()) {
		errs.push('Add a cover photo before submitting for review or publishing.');
	}
	if (!pkg.gallery?.length) {
		errs.push('Add at least one gallery image before submitting for review or publishing.');
	}
	const en = pkg.i18n.en;
	if (!en?.title?.trim()) errs.push('English title is required.');
	if (pkg.tour_style === 'private') {
		if (!pkg.private_tiers.some((t) => t.price > 0)) {
			errs.push('Private tours need at least one group-size tier with a price.');
		}
	} else if (!pkg.base_price || pkg.base_price <= 0) {
		errs.push('Set a base price per person for group tours.');
	}
	const daysNeeded = packageDayCountFromDurationHours(pkg.duration_hours);
	const it = en?.itinerary_days ?? [];
	if (it.length < daysNeeded) {
		errs.push(`Complete the itinerary: ${daysNeeded} day block(s) required in English (matches tour length).`);
	}
	for (let d = 0; d < daysNeeded; d++) {
		const day = it[d];
		const label = `Day ${d + 1}`;
		if (!day?.stops?.length) {
			errs.push(`${label}: add itinerary segments (starting point, stops, ending).`);
			continue;
		}
		const stops = day.stops;
		if (stops[0].kind !== 'start') {
			errs.push(`${label}: the first segment should be “Starting the trip”.`);
		}
		if (stops[stops.length - 1].kind !== 'end') {
			errs.push(`${label}: the last segment should be “Ending the trip”.`);
		}
		const middle = stops.slice(1, -1);
		if (middle.length < 1) {
			errs.push(`${label}: add at least one main stop between start and end.`);
		}
		for (let i = 0; i < stops.length; i++) {
			const s = stops[i];
			if (!s.title.trim()) errs.push(`${label}, segment ${i + 1}: add a title.`);
			if (!s.body.trim()) errs.push(`${label}, segment ${i + 1}: add a description.`);
			if (i > 0 && i < stops.length - 1 && s.kind !== 'stop' && s.kind !== 'optional') {
				errs.push(`${label}, segment ${i + 1}: use “Stop” or “Optional stop” between start and end.`);
			}
		}
	}
	return errs;
}

export type SavePackageInput = {
	id?: string;
	mode: 'create' | 'update';
	guide_id: string;
	slug: string;
	status: 'draft' | 'pending_review' | 'published';
	cover_photo: string | null;
	gallery: string[];
	duration_hours: number;
	duration_label: string | null;
	min_people: number;
	max_people: number;
	languages: string[];
	tour_style: 'private' | 'group';
	private_tiers: PrivateTier[];
	base_price: number;
	currency: string;
	pricing_rules: PricingRule[];
	transport_included: boolean;
	transport_type: TransportType | null;
	/** Omitted on update = keep previous (group tours). Private tours always clear package-level notes. */
	transport_notes?: string | null;
	pickup_offered: boolean;
	pickup_notes: string | null;
	difficulty: 'easy' | 'moderate' | 'challenging' | null;
	min_age: number | null;
	cancellation_policy: string | null;
	category: TourCategoryId | null;
	location: TourLocation | null;
	place_ids: string[];
	physical_rating: TourPhysicalRatingId | null;
	driving_distance: string | null;
	extras: PackageExtra[];
	i18n: Partial<Record<Locale, PackageLocaleBlock | PackageLocaleBlockPatch>>;
};

function parsePackageExtrasFromJson(raw: unknown): PackageExtra[] {
	if (!Array.isArray(raw)) return [];
	const out: PackageExtra[] = [];
	for (const el of raw) {
		if (!el || typeof el !== 'object') continue;
		const o = el as Record<string, unknown>;
		const label = String(o.label ?? '').trim();
		const price = Number(o.price ?? 0);
		const unit = o.unit === 'per_booking' ? 'per_booking' : 'per_person';
		const maxQ = Math.min(99, Math.max(1, Math.floor(Number(o.max_quantity ?? 10))));
		if (!label || price <= 0) continue;
		out.push({
			id: String(o.id ?? randomUUID()),
			label,
			price,
			unit,
			max_quantity: maxQ,
		});
	}
	return out;
}

function guidePackageFromSaveInput(input: SavePackageInput, id: string, createdAt: number): GuidePackage {
	return {
		id,
		guide_id: input.guide_id,
		slug: input.slug.trim(),
		status: input.status,
		cover_photo: input.cover_photo,
		gallery: input.gallery,
		duration_hours: input.duration_hours,
		duration_label: input.duration_label,
		min_people: input.min_people,
		max_people: input.max_people,
		languages: input.languages,
		tour_style: input.tour_style,
		private_tiers: input.private_tiers,
		base_price: input.base_price,
		currency: input.currency,
		pricing_rules: input.pricing_rules,
		transport_included: input.transport_included,
		transport_type: input.transport_type,
		transport_notes:
			input.tour_style === 'private' ? null : (input.transport_notes ?? null),
		pickup_offered: input.pickup_offered,
		pickup_notes: input.pickup_notes,
		difficulty: input.difficulty,
		min_age: input.min_age,
		cancellation_policy: input.cancellation_policy,
		category: input.category,
		location: input.location,
		place_ids: input.place_ids,
		physical_rating: input.physical_rating,
		driving_distance: input.driving_distance,
		payment_options: structuredClone(DEFAULT_PAYMENT_OPTIONS),
		extras: input.extras ?? [],
		i18n: input.i18n as GuidePackage['i18n'],
		created_at: createdAt,
		updated_at: createdAt,
	};
}

/** Map HTTP JSON body to `SavePackageInput` (shared by POST /api/guide-packages and PUT /api/guide-packages/[id]). */
export function buildSavePackageInputFromJsonBody(
	body: Record<string, unknown>,
	opts: { guideId: string; mode: 'create' | 'update'; existingId?: string },
): SavePackageInput {
	const i18n = parsePackageLocaleBlocksFromJsonBody(body);
	const rules = Array.isArray(body.pricing_rules)
		? (body.pricing_rules as unknown[]).map((r: unknown) => {
				const rule = r as Record<string, unknown>;
				return {
					id: String(rule.id ?? randomUUID()),
					kind: (['group', 'early_bird', 'seasonal'].includes(rule.kind as string)
						? rule.kind
						: 'group') as PricingRule['kind'],
					label: (rule.label as string)?.trim() || null,
					discount_pct: Number(rule.discount_pct ?? 0),
					min_pax: rule.min_pax != null ? Number(rule.min_pax) : null,
					max_pax: rule.max_pax != null ? Number(rule.max_pax) : null,
					days_before: rule.days_before != null ? Number(rule.days_before) : null,
					date_from: (rule.date_from as string)?.trim() || null,
					date_to: (rule.date_to as string)?.trim() || null,
				} satisfies PricingRule;
			})
		: [];

	const privateTiersRaw = Array.isArray(body.private_tiers) ? (body.private_tiers as unknown[]) : [];
	const transportTypes = ['sedan', 'suv', 'minivan', 'minibus', 'bus', 'boat', 'other'] as const;
	const private_tiers = privateTiersRaw
		.filter((t): t is Record<string, unknown> => t != null && typeof t === 'object')
		.map((t) => {
			const rawV = t.vehicle_type as string | undefined;
			const rawNotes = t.transport_notes as string | undefined;
			return {
				id: String(t.id ?? randomUUID()),
				label: String(t.label ?? ''),
				min_pax: Number(t.min_pax ?? 1),
				max_pax: Number(t.max_pax ?? 1),
				price: Number(t.price ?? 0),
				vehicle_type: transportTypes.includes(rawV as (typeof transportTypes)[number])
					? (rawV as TransportType)
					: null,
				transport_notes: rawNotes != null && String(rawNotes).trim() ? String(rawNotes).trim() : null,
			};
		});
	const rawTransport = body.transport_type as string;
	const difficultyVals = ['easy', 'moderate', 'challenging'] as const;
	const rawDiff = body.difficulty as string;
	const tourStyle = body.tour_style === 'private' ? 'private' : 'group';

	const base = {
		...(opts.existingId ? { id: opts.existingId } : {}),
		mode: opts.mode,
		guide_id: opts.guideId,
		slug: String(body.slug ?? '').trim(),
		status:
			body.status === 'published'
				? 'published'
				: body.status === 'pending_review'
					? 'pending_review'
					: 'draft',
		cover_photo: (body.cover_photo as string)?.trim() || null,
		gallery: Array.isArray(body.gallery)
			? (body.gallery as unknown[]).filter((x): x is string => typeof x === 'string')
			: [],
		duration_hours: Number(body.duration_hours ?? 2),
		duration_label: (body.duration_label as string)?.trim() || null,
		min_people: Number(body.min_people ?? 1),
		max_people: Number(body.max_people ?? 10),
		languages: Array.isArray(body.languages)
			? (body.languages as unknown[]).filter((x): x is string => typeof x === 'string')
			: [],
		tour_style: tourStyle,
		private_tiers,
		base_price: Number(body.base_price ?? 0),
		currency: String(body.currency ?? 'USD'),
		pricing_rules: rules,
		transport_included: body.transport_included === true || body.transport_included === 'true',
		transport_type: transportTypes.includes(rawTransport as (typeof transportTypes)[number])
			? (rawTransport as TransportType)
			: null,
		pickup_offered: body.pickup_offered === true || body.pickup_offered === 'true',
		pickup_notes: (body.pickup_notes as string)?.trim() || null,
		difficulty: difficultyVals.includes(rawDiff as (typeof difficultyVals)[number])
			? (rawDiff as 'easy' | 'moderate' | 'challenging')
			: null,
		min_age: body.min_age != null && Number(body.min_age) > 0 ? Number(body.min_age) : null,
		cancellation_policy: (body.cancellation_policy as string)?.trim() || null,
		category: parseTourCategory((body as { category?: unknown }).category),
		location: parseTourLocation((body as { location?: unknown }).location),
		place_ids: normalizePackagePlaceIds((body as { place_ids?: unknown }).place_ids),
		physical_rating: parseTourPhysicalRating((body as { physical_rating?: unknown }).physical_rating),
		driving_distance: parseDrivingDistance((body as { driving_distance?: unknown }).driving_distance),
		extras: parsePackageExtrasFromJson(body.extras),
		i18n,
	} satisfies Omit<SavePackageInput, 'transport_notes'>;

	if (tourStyle === 'private') {
		return { ...base, transport_notes: null };
	}
	if (Object.prototype.hasOwnProperty.call(body, 'transport_notes')) {
		return {
			...base,
			transport_notes: (body.transport_notes as string)?.trim() || null,
		};
	}
	return base;
}

/** Keys the contribute edit form may omit; without this, `buildSavePackageInputFromJsonBody` would overwrite with null/[]. */
const UPDATE_BODY_KEYS_TO_PRESERVE: (keyof Pick<
	GuidePackage,
	'category' | 'location' | 'place_ids' | 'physical_rating' | 'driving_distance'
>)[] = ['category', 'location', 'place_ids', 'physical_rating', 'driving_distance'];

/**
 * For PUT updates: if the client JSON omitted a field, keep the existing package value.
 * (The web form does not POST category, map fields, etc.)
 */
export function mergeUpdateInputWithPrevPackage(
	body: Record<string, unknown>,
	prev: GuidePackage,
	input: SavePackageInput,
): SavePackageInput {
	const out: SavePackageInput = { ...input };
	for (const k of UPDATE_BODY_KEYS_TO_PRESERVE) {
		if (!(k in body)) {
			(out as Record<string, unknown>)[k] = prev[k];
		}
	}
	if (!('extras' in body)) {
		out.extras = prev.extras;
	}
	return out;
}

export type SavePackageOptions = {
	/** Admin edits: skip completeness checks for published / pending_review */
	skipReviewValidation?: boolean;
};

export function savePackage(
	input: SavePackageInput,
	opts?: SavePackageOptions,
): { ok: true; id: string } | { ok: false; error: string; errors?: string[] } {
	const slugTrim = input.slug.trim();
	if (!slugTrim || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slugTrim)) {
		return { ok: false, error: 'Invalid slug' };
	}
	const hasTitle = LOCALES.some((loc) => input.i18n[loc]?.title?.trim());
	if (!hasTitle) {
		return { ok: false, error: 'At least one language title is required' };
	}
	if (input.base_price < 0) {
		return { ok: false, error: 'Base price cannot be negative' };
	}

	const store = getStore();
	const now = Date.now();

	if (input.mode === 'update') {
		if (!input.id) return { ok: false, error: 'Missing id' };
		const idx = store.packages.findIndex((p) => p.id === input.id);
		if (idx === -1) return { ok: false, error: 'Package not found' };
		if (isPackageSlugUsed(slugTrim, input.id)) {
			return { ok: false, error: 'Slug already used' };
		}
		const prev = store.packages[idx];
		let privateTiers = input.private_tiers;
		if (input.tour_style === 'group' && privateTiers.length === 0) {
			privateTiers = prev.private_tiers;
		}
		let minPeople = input.min_people;
		let maxPeople = input.max_people;
		let basePrice = input.base_price;
		if (input.tour_style === 'private') {
			minPeople = prev.min_people;
			maxPeople = prev.max_people;
			if (basePrice <= 0 && prev.base_price > 0) {
				basePrice = prev.base_price;
			}
		}
		const inputAdjusted: SavePackageInput = {
			...input,
			private_tiers: privateTiers,
			min_people: minPeople,
			max_people: maxPeople,
			base_price: basePrice,
		};
		const mergedI18n = mergePackageI18n(prev.i18n, inputAdjusted.i18n);
		const nextTransportNotes =
			inputAdjusted.tour_style === 'private'
				? null
				: 'transport_notes' in inputAdjusted
					? inputAdjusted.transport_notes ?? null
					: prev.transport_notes;
		const next: GuidePackage = {
			...prev,
			...inputAdjusted,
			slug: slugTrim,
			i18n: mergedI18n as GuidePackage['i18n'],
			transport_notes: nextTransportNotes,
			updated_at: now,
		};
		if (
			!opts?.skipReviewValidation &&
			(next.status === 'pending_review' || next.status === 'published')
		) {
			const v = validatePackageForReview(next);
			if (v.length) return { ok: false, error: v.join('\n'), errors: v };
		}
		store.packages[idx] = next;
		writeStore(store);
		return { ok: true, id: input.id };
	}

	if (isPackageSlugUsed(slugTrim, null)) {
		return { ok: false, error: 'Slug already used' };
	}
	const newId = randomUUID();
	const pkg = guidePackageFromSaveInput(input, newId, now);
	if (
		!opts?.skipReviewValidation &&
		(pkg.status === 'pending_review' || pkg.status === 'published')
	) {
		const v = validatePackageForReview(pkg);
		if (v.length) return { ok: false, error: v.join('\n'), errors: v };
	}
	store.packages.push(pkg);
	writeStore(store);
	return { ok: true, id: pkg.id };
}

export function deletePackage(id: string): { ok: true } | { ok: false; error: string } {
	const store = getStore();
	const idx = store.packages.findIndex((p) => p.id === id);
	if (idx === -1) return { ok: false, error: 'Package not found' };
	store.packages = store.packages.filter((_, i) => i !== idx);
	store.availability = store.availability.filter((s) => s.package_id !== id);
	writeStore(store);
	return { ok: true };
}

// ─── Availability ─────────────────────────────────────────────────────────────

export function getSlotsForPackage(packageId: string): AvailabilitySlot[] {
	return getStore().availability.filter((s) => s.package_id === packageId);
}

export function getSlotById(id: string): AvailabilitySlot | null {
	return getStore().availability.find((s) => s.id === id) ?? null;
}

export function getSlotByPackageAndDate(
	packageId: string,
	date: string,
): AvailabilitySlot | null {
	return (
		getStore().availability.find((s) => s.package_id === packageId && s.date === date) ?? null
	);
}

export function upsertSlot(
	packageId: string,
	date: string,
	update: Partial<Omit<AvailabilitySlot, 'id' | 'package_id' | 'date' | 'booked_count'>>,
): { ok: true; slot: AvailabilitySlot } | { ok: false; error: string } {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return { ok: false, error: 'Invalid date format (YYYY-MM-DD)' };
	}
	const store = getStore();
	let slot = store.availability.find((s) => s.package_id === packageId && s.date === date);
	if (slot) {
		Object.assign(slot, update);
	} else {
		slot = {
			id: randomUUID(),
			package_id: packageId,
			date,
			time_start: update.time_start ?? null,
			capacity: update.capacity ?? 1,
			booked_count: 0,
			status: update.status ?? 'open',
			custom_price: update.custom_price ?? null,
		};
		store.availability.push(slot);
	}
	writeStore(store);
	return { ok: true, slot };
}

export function deleteSlot(
	packageId: string,
	date: string,
): { ok: true } | { ok: false; error: string } {
	const store = getStore();
	const before = store.availability.length;
	store.availability = store.availability.filter(
		(s) => !(s.package_id === packageId && s.date === date),
	);
	if (store.availability.length === before) {
		return { ok: false, error: 'Slot not found' };
	}
	writeStore(store);
	return { ok: true };
}

/** Increment booked_count for a slot */
export function incrementSlotBooked(
	slotId: string,
	pax: number,
): { ok: true } | { ok: false; error: string } {
	const store = getStore();
	const slot = store.availability.find((s) => s.id === slotId);
	if (!slot) return { ok: false, error: 'Slot not found' };
	if (slot.status === 'blocked') return { ok: false, error: 'Slot is blocked' };
	if (slot.booked_count + pax > slot.capacity) {
		return { ok: false, error: 'Not enough capacity' };
	}
	slot.booked_count += pax;
	writeStore(store);
	return { ok: true };
}

export function decrementSlotBooked(slotId: string, pax: number): void {
	const store = getStore();
	const slot = store.availability.find((s) => s.id === slotId);
	if (!slot) return;
	slot.booked_count = Math.max(0, slot.booked_count - pax);
	writeStore(store);
}

// ─── Grid card pricing (list views) ───────────────────────────────────────────

export type PackageGridPriceInfo = {
	currency: string;
	fromAmount: number;
	unit: 'person' | 'group';
	/** Calendar custom_price lower than base (group tours) */
	strikeAmount: number | null;
	calendarPctOff: number | null;
	rulesMaxPct: number;
};

export function getPackageGridPriceInfo(pkg: GuidePackage): PackageGridPriceInfo {
	const currency = pkg.currency;
	const rulesMaxPct = pkg.pricing_rules.length
		? Math.max(0, ...pkg.pricing_rules.map((r) => r.discount_pct))
		: 0;
	if (pkg.tour_style === 'private') {
		const enabled = pkg.private_tiers.filter((t) => t.price > 0);
		const fromAmount = enabled.length ? Math.min(...enabled.map((t) => t.price)) : 0;
		return {
			currency,
			fromAmount,
			unit: 'group',
			strikeAmount: null,
			calendarPctOff: null,
			rulesMaxPct,
		};
	}
	const today = new Date().toISOString().slice(0, 10);
	const slots = getSlotsForPackage(pkg.id).filter(
		(s) => s.status === 'open' && s.date >= today && s.booked_count < s.capacity,
	);
	const base = pkg.base_price;
	let minUnit = base;
	for (const s of slots) {
		const u =
			s.custom_price != null && s.custom_price > 0 ? s.custom_price : base;
		if (u < minUnit) minUnit = u;
	}
	const hasCal = base > 0 && minUnit + 1e-9 < base;
	const calPct = hasCal ? Math.round((1 - minUnit / base) * 100) : null;
	return {
		currency,
		fromAmount: hasCal ? minUnit : base,
		unit: 'person',
		strikeAmount: hasCal ? base : null,
		calendarPctOff: calPct,
		rulesMaxPct,
	};
}

// ─── Booking extras ───────────────────────────────────────────────────────────

export type ExtraLine = {
	extra_id: string;
	label: string;
	quantity: number;
	line_total: number;
};

export function computeExtrasForBooking(
	pkg: GuidePackage,
	selections: { id: string; quantity: number }[],
	pax: number,
): { ok: true; total: number; lines: ExtraLine[] } | { ok: false; error: string } {
	const byId = new Map(pkg.extras.map((e) => [e.id, e]));
	let total = 0;
	const lines: ExtraLine[] = [];
	for (const sel of selections) {
		const q = Math.floor(Number(sel.quantity ?? 0));
		if (!Number.isFinite(q) || q <= 0) continue;
		const ex = byId.get(sel.id);
		if (!ex) return { ok: false, error: 'Invalid extra option' };
		if (q > ex.max_quantity) return { ok: false, error: 'Extra quantity too high' };
		const line =
			ex.unit === 'per_person'
				? Math.round(q * ex.price * pax * 100) / 100
				: Math.round(q * ex.price * 100) / 100;
		total = Math.round((total + line) * 100) / 100;
		lines.push({ extra_id: ex.id, label: ex.label, quantity: q, line_total: line });
	}
	return { ok: true, total, lines };
}

// ─── Pricing Engine ───────────────────────────────────────────────────────────

export type PriceBreakdown = {
	unit_price: number;
	pax: number;
	total_before_discount: number;
	discount_pct: number;
	discount_label: string | null;
	total_price: number;
	currency: string;
	/** For private tours: the matched tier */
	tier: PrivateTier | null;
};

export function calculatePrice(
	pkg: GuidePackage,
	pax: number,
	date: string,
	slot: AvailabilitySlot | null,
	tierId?: string | null,
): PriceBreakdown {
	// ── Private tour: fixed tier price ────────────────────────
	if (pkg.tour_style === 'private') {
		const enabledTiers = pkg.private_tiers.filter((t) => t.price > 0);
		const tier = tierId
			? (enabledTiers.find((t) => t.id === tierId) ?? null)
			: (enabledTiers.find((t) => pax >= t.min_pax && pax <= t.max_pax) ?? null);
		const tierPrice = tier?.price ?? 0;
		const total_before_discount = tierPrice;

		let bestDiscount = 0;
		let bestLabel: string | null = null;
		for (const rule of pkg.pricing_rules) {
			let applies = false;
			if (rule.kind === 'early_bird' && rule.days_before != null) {
				const diff = Math.floor((new Date(date).getTime() - Date.now()) / 86_400_000);
				if (diff >= rule.days_before) applies = true;
			} else if (rule.kind === 'seasonal') {
				const df = rule.date_from; const dt = rule.date_to;
				if (df && dt && date >= df && date <= dt) applies = true;
			}
			if (applies && rule.discount_pct > bestDiscount) {
				bestDiscount = rule.discount_pct;
				bestLabel = rule.label ?? null;
			}
		}
		const total_price = Math.round(total_before_discount * (1 - bestDiscount / 100) * 100) / 100;
		return {
			unit_price: tierPrice,
			pax,
			total_before_discount,
			discount_pct: bestDiscount,
			discount_label: bestLabel,
			total_price,
			currency: pkg.currency,
			tier: tier ?? null,
		};
	}

	// ── Group tour: per-person pricing ────────────────────────
	const unit_price = slot?.custom_price ?? pkg.base_price;
	const total_before_discount = unit_price * pax;

	// Find best applicable discount
	let bestDiscount = 0;
	let bestLabel: string | null = null;

	for (const rule of pkg.pricing_rules) {
		let applies = false;
		if (rule.kind === 'group') {
			const min = rule.min_pax ?? 1;
			const max = rule.max_pax ?? Infinity;
			if (pax >= min && pax <= max) applies = true;
		} else if (rule.kind === 'early_bird') {
			if (rule.days_before != null) {
				const bookDate = new Date();
				const tourDate = new Date(date);
				const diff = Math.floor((tourDate.getTime() - bookDate.getTime()) / 86_400_000);
				if (diff >= rule.days_before) applies = true;
			}
		} else if (rule.kind === 'seasonal') {
			const df = rule.date_from;
			const dt = rule.date_to;
			if (df && dt && date >= df && date <= dt) applies = true;
		}
		if (applies && rule.discount_pct > bestDiscount) {
			bestDiscount = rule.discount_pct;
			bestLabel = rule.label ?? null;
		}
	}

	const total_price = Math.round(total_before_discount * (1 - bestDiscount / 100) * 100) / 100;

	return {
		unit_price,
		pax,
		total_before_discount,
		discount_pct: bestDiscount,
		discount_label: bestLabel,
		total_price,
		currency: pkg.currency,
		tier: null,
	};
}
