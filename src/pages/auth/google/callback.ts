/**
 * Shim for the URL registered in Google Cloud Console (/auth/google/callback).
 * Real handler lives at /api/auth/google/callback.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ url }) => {
	const target = new URL('/api/auth/google/callback', url.origin);
	target.search = url.search;
	return Response.redirect(target.toString(), 302);
};
