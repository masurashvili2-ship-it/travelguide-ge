/**
 * Legacy shim — real handler is at /auth/google/callback (matches Google Cloud Console URI).
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ url }) => {
	const target = new URL('/auth/google/callback', url.origin);
	target.search = url.search;
	return Response.redirect(target.toString(), 302);
};
