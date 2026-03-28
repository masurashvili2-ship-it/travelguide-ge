import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Locale } from './strings';
import { getDataDir } from './data-dir';

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'guide-packages.json');
const LOCALES: Locale[] = ['en', 'ka', 'ru'];

// ─── Types ────────────────────────────────────────────────────────────────────

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
};

export type TransportType = 'sedan' | 'suv' | 'minivan' | 'minibus' | 'bus' | 'boat' | 'other';

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

export type PackageLocaleBlock = {
	title: string;
	description: string;
	includes_text: string | null;
	excludes_text: string | null;
	meeting_point_text: string | null;
	seo_title: string | null;
	seo_description: string | null;
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
		private_tiers: Array.isArray(raw.private_tiers)
			? (raw.private_tiers as unknown[])
					.filter((x): x is PrivateTier => x != null && typeof x === 'object')
					.map((t) => ({
						id: String(t.id ?? ''),
						label: String(t.label ?? ''),
						min_pax: typeof t.min_pax === 'number' ? t.min_pax : 1,
						max_pax: typeof t.max_pax === 'number' ? t.max_pax : 1,
						price: typeof t.price === 'number' ? t.price : 0,
					}))
			: [],
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

export function isPackageSlugUsed(slug: string, exceptId: string | null): boolean {
	return getStore().packages.some((p) => p.slug === slug && p.id !== exceptId);
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
	transport_notes: string | null;
	pickup_offered: boolean;
	pickup_notes: string | null;
	difficulty: 'easy' | 'moderate' | 'challenging' | null;
	min_age: number | null;
	cancellation_policy: string | null;
	i18n: Partial<Record<Locale, PackageLocaleBlock>>;
};

export function savePackage(
	input: SavePackageInput,
): { ok: true; id: string } | { ok: false; error: string } {
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
		store.packages[idx] = { ...store.packages[idx], ...input, slug: slugTrim, updated_at: now };
		writeStore(store);
		return { ok: true, id: input.id };
	}

	if (isPackageSlugUsed(slugTrim, null)) {
		return { ok: false, error: 'Slug already used' };
	}
	const pkg: GuidePackage = {
		id: randomUUID(),
		guide_id: input.guide_id,
		slug: slugTrim,
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
		transport_notes: input.transport_notes,
		pickup_offered: input.pickup_offered,
		pickup_notes: input.pickup_notes,
		difficulty: input.difficulty,
		min_age: input.min_age,
		cancellation_policy: input.cancellation_policy,
		i18n: input.i18n,
		created_at: now,
		updated_at: now,
	};
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
