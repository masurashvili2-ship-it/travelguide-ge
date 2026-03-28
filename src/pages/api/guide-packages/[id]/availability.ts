/**
 * /api/guide-packages/[id]/availability
 * GET → public: returns open slots for a package (future dates only)
 */
import type { APIRoute } from 'astro';
import { getPackageById, getSlotsForPackage, calculatePrice } from '../../../../lib/guide-packages-db';

export const GET: APIRoute = async ({ params, url }) => {
	const pkg = getPackageById(params.id ?? '');
	if (!pkg || pkg.status !== 'published') {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const pax = parseInt(url.searchParams.get('pax') ?? '1', 10);
	const clampedPax = Math.max(pkg.min_people, Math.min(pkg.max_people, isNaN(pax) ? 1 : pax));

	const today = new Date().toISOString().slice(0, 10);
	const slots = getSlotsForPackage(pkg.id)
		.filter((s) => s.status === 'open' && s.date >= today && s.booked_count < s.capacity)
		.sort((a, b) => (a.date < b.date ? -1 : 1));

	const result = slots.map((slot) => {
		const breakdown = calculatePrice(pkg, clampedPax, slot.date, slot);
		return {
			id: slot.id,
			date: slot.date,
			time_start: slot.time_start,
			capacity: slot.capacity,
			spots_left: slot.capacity - slot.booked_count,
			...breakdown,
		};
	});

	return new Response(JSON.stringify({ slots: result, base_price: pkg.base_price, currency: pkg.currency }), {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});
};
