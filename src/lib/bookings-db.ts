import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getDataDir } from './data-dir';

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'bookings.json');

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentMethod = 'paypal_full' | 'paypal_deposit' | 'cash' | null;
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'fully_paid' | 'refunded';

export type Booking = {
	id: string;
	/** Human-readable reference, e.g. "TG-250328-ABCD" */
	ref: string;
	package_id: string;
	guide_id: string;
	/** ID of the availability slot (if one was selected) */
	slot_id: string | null;
	date: string; // YYYY-MM-DD
	time_start: string | null;
	pax: number;
	unit_price: number;
	total_price: number;
	currency: string;
	discount_pct: number;
	discount_label: string | null;
	/** 'group' or 'private' — snapshot from package at booking time */
	tour_style: 'private' | 'group';
	/** For private tours: the selected tier ID */
	tier_id: string | null;
	/** For private tours: label e.g. "Small Group (4–6 pax)" */
	tier_label: string | null;
	status: BookingStatus;
	/** How the customer chose to pay */
	payment_method: PaymentMethod;
	/** Current payment state */
	payment_status: PaymentStatus;
	/** Amount actually paid so far */
	amount_paid: number;
	/** Deposit amount (if deposit chosen) */
	deposit_amount: number | null;
	/** PayPal order ID (pending capture) */
	paypal_order_id: string | null;
	/** PayPal capture ID (after successful payment) */
	paypal_capture_id: string | null;
	customer_name: string;
	customer_email: string;
	customer_phone: string | null;
	special_requests: string | null;
	guide_notes: string | null;
	package_title: string; // snapshot at time of booking
	created_at: number;
	updated_at: number;
	confirmed_at: number | null;
	cancelled_at: number | null;
	cancellation_reason: string | null;
};

type StoreFile = { bookings: Booking[] };

// ─── Cache ────────────────────────────────────────────────────────────────────

let _cached: Booking[] | null = null;

export function invalidateBookingsCache(): void {
	_cached = null;
}

// ─── I/O ──────────────────────────────────────────────────────────────────────

function ensureDataDir() {
	mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): Booking[] {
	ensureDataDir();
	if (!existsSync(STORE_FILE)) {
		writeFileSync(STORE_FILE, JSON.stringify({ bookings: [] }, null, 2) + '\n', 'utf8');
		return [];
	}
	try {
		const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as StoreFile;
		if (!Array.isArray(raw.bookings)) return [];
		return raw.bookings.filter((b): b is Booking => typeof b?.id === 'string').map(normalizeBooking);
	} catch {
		return [];
	}
}

function writeAll(bookings: Booking[]) {
	ensureDataDir();
	writeFileSync(STORE_FILE, JSON.stringify({ bookings }, null, 2) + '\n', 'utf8');
	_cached = [...bookings];
}

function getAll(): Booking[] {
	if (_cached !== null) return _cached;
	_cached = readAll();
	return _cached;
}

const VALID_PAYMENT_METHODS: PaymentMethod[] = ['paypal_full', 'paypal_deposit', 'cash', null];
const VALID_PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'deposit_paid', 'fully_paid', 'refunded'];

function normalizeBooking(raw: Booking): Booking {
	return {
		id: String(raw.id ?? ''),
		ref: String(raw.ref ?? ''),
		package_id: String(raw.package_id ?? ''),
		guide_id: String(raw.guide_id ?? ''),
		slot_id: raw.slot_id?.trim() || null,
		date: String(raw.date ?? ''),
		time_start: raw.time_start?.trim() || null,
		pax: typeof raw.pax === 'number' ? raw.pax : 1,
		unit_price: typeof raw.unit_price === 'number' ? raw.unit_price : 0,
		total_price: typeof raw.total_price === 'number' ? raw.total_price : 0,
		currency: String(raw.currency ?? 'USD'),
		discount_pct: typeof raw.discount_pct === 'number' ? raw.discount_pct : 0,
		discount_label: raw.discount_label?.trim() || null,
		tour_style: raw.tour_style === 'private' ? 'private' : 'group',
		tier_id: (raw.tier_id as string)?.trim() || null,
		tier_label: (raw.tier_label as string)?.trim() || null,
		status: (['pending', 'confirmed', 'completed', 'cancelled'] as BookingStatus[]).includes(raw.status)
			? raw.status : 'pending',
		payment_method: VALID_PAYMENT_METHODS.includes(raw.payment_method) ? raw.payment_method : null,
		payment_status: VALID_PAYMENT_STATUSES.includes(raw.payment_status) ? raw.payment_status : 'unpaid',
		amount_paid: typeof raw.amount_paid === 'number' ? raw.amount_paid : 0,
		deposit_amount: typeof raw.deposit_amount === 'number' ? raw.deposit_amount : null,
		paypal_order_id: (raw.paypal_order_id as string)?.trim() || null,
		paypal_capture_id: (raw.paypal_capture_id as string)?.trim() || null,
		customer_name: String(raw.customer_name ?? ''),
		customer_email: String(raw.customer_email ?? ''),
		customer_phone: raw.customer_phone?.trim() || null,
		special_requests: raw.special_requests?.trim() || null,
		guide_notes: raw.guide_notes?.trim() || null,
		package_title: String(raw.package_title ?? ''),
		created_at: typeof raw.created_at === 'number' ? raw.created_at : 0,
		updated_at: typeof raw.updated_at === 'number' ? raw.updated_at : 0,
		confirmed_at: typeof raw.confirmed_at === 'number' ? raw.confirmed_at : null,
		cancelled_at: typeof raw.cancelled_at === 'number' ? raw.cancelled_at : null,
		cancellation_reason: raw.cancellation_reason?.trim() || null,
	};
}

// ─── Reference generator ──────────────────────────────────────────────────────

function generateRef(): string {
	const now = new Date();
	const yy = String(now.getFullYear()).slice(2);
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `TG-${yy}${mm}${dd}-${suffix}`;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getBookingById(id: string): Booking | null {
	return getAll().find((b) => b.id === id) ?? null;
}

export function getBookingByRef(ref: string): Booking | null {
	return getAll().find((b) => b.ref === ref) ?? null;
}

export function listBookingsForGuide(guideId: string): Booking[] {
	return getAll()
		.filter((b) => b.guide_id === guideId)
		.sort((a, b) => b.created_at - a.created_at);
}

/** Bookings where the customer email matches a registered user's email (case-insensitive). */
export function listBookingsForCustomerEmail(email: string): Booking[] {
	const em = email.trim().toLowerCase();
	if (!em) return [];
	return getAll()
		.filter((b) => b.customer_email.trim().toLowerCase() === em)
		.sort((a, b) => b.created_at - a.created_at);
}

export function listBookingsForPackage(packageId: string): Booking[] {
	return getAll()
		.filter((b) => b.package_id === packageId)
		.sort((a, b) => b.created_at - a.created_at);
}

export function listAllBookingsAdmin(): Booking[] {
	return getAll().sort((a, b) => b.created_at - a.created_at);
}

export function countPendingBookings(): number {
	return getAll().filter((b) => b.status === 'pending').length;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export type CreateBookingInput = {
	package_id: string;
	guide_id: string;
	slot_id: string | null;
	date: string;
	time_start: string | null;
	pax: number;
	unit_price: number;
	total_price: number;
	currency: string;
	discount_pct: number;
	discount_label: string | null;
	tour_style: 'private' | 'group';
	tier_id: string | null;
	tier_label: string | null;
	customer_name: string;
	customer_email: string;
	customer_phone: string | null;
	special_requests: string | null;
	package_title: string;
	payment_method?: PaymentMethod;
	deposit_amount?: number | null;
};

export function createBooking(
	input: CreateBookingInput,
): { ok: true; booking: Booking } | { ok: false; error: string } {
	if (!input.customer_name.trim()) return { ok: false, error: 'Customer name is required' };
	if (!input.customer_email.trim()) return { ok: false, error: 'Customer email is required' };
	if (!input.date.match(/^\d{4}-\d{2}-\d{2}$/)) return { ok: false, error: 'Invalid date' };
	if (input.pax < 1) return { ok: false, error: 'At least 1 person required' };

	const list = getAll();
	const booking: Booking = {
		id: randomUUID(),
		ref: generateRef(),
		...input,
		status: 'pending',
		payment_method: input.payment_method ?? null,
		payment_status: 'unpaid',
		amount_paid: 0,
		deposit_amount: input.deposit_amount ?? null,
		paypal_order_id: null,
		paypal_capture_id: null,
		guide_notes: null,
		created_at: Date.now(),
		updated_at: Date.now(),
		confirmed_at: null,
		cancelled_at: null,
		cancellation_reason: null,
	};
	list.push(booking);
	writeAll(list);
	return { ok: true, booking };
}

export function updateBookingStatus(
	id: string,
	status: BookingStatus,
	opts?: { reason?: string; notes?: string },
): { ok: true; booking: Booking } | { ok: false; error: string } {
	const list = getAll();
	const idx = list.findIndex((b) => b.id === id);
	if (idx === -1) return { ok: false, error: 'Booking not found' };
	const b = { ...list[idx] };
	b.status = status;
	b.updated_at = Date.now();
	if (status === 'confirmed') b.confirmed_at = Date.now();
	if (status === 'cancelled') {
		b.cancelled_at = Date.now();
		b.cancellation_reason = opts?.reason?.trim() || null;
	}
	if (opts?.notes !== undefined) b.guide_notes = opts.notes.trim() || null;
	list[idx] = b;
	writeAll(list);
	return { ok: true, booking: b };
}

export function updateBookingNotes(
	id: string,
	notes: string,
): { ok: true } | { ok: false; error: string } {
	const list = getAll();
	const idx = list.findIndex((b) => b.id === id);
	if (idx === -1) return { ok: false, error: 'Booking not found' };
	list[idx] = { ...list[idx], guide_notes: notes.trim() || null, updated_at: Date.now() };
	writeAll(list);
	return { ok: true };
}

export function updateBookingPayment(
	id: string,
	opts: {
		payment_status?: PaymentStatus;
		amount_paid?: number;
		paypal_order_id?: string | null;
		paypal_capture_id?: string | null;
	},
): { ok: true; booking: Booking } | { ok: false; error: string } {
	const list = getAll();
	const idx = list.findIndex((b) => b.id === id);
	if (idx === -1) return { ok: false, error: 'Booking not found' };
	const b = { ...list[idx] };
	if (opts.payment_status !== undefined) b.payment_status = opts.payment_status;
	if (opts.amount_paid !== undefined) b.amount_paid = opts.amount_paid;
	if (opts.paypal_order_id !== undefined) b.paypal_order_id = opts.paypal_order_id;
	if (opts.paypal_capture_id !== undefined) b.paypal_capture_id = opts.paypal_capture_id;
	b.updated_at = Date.now();
	list[idx] = b;
	writeAll(list);
	return { ok: true, booking: b };
}

export function deleteBooking(id: string): { ok: true } | { ok: false; error: string } {
	const list = getAll();
	const idx = list.findIndex((b) => b.id === id);
	if (idx === -1) return { ok: false, error: 'Booking not found' };
	writeAll(list.filter((_, i) => i !== idx));
	return { ok: true };
}
