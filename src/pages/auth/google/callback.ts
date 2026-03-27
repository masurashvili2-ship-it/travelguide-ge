/**
 * Redirect shim: Google Cloud Console has /auth/google/callback registered,
 * but the real handler lives at /api/auth/google/callback.
 * Forward the full query string so the OAuth code/state reach the handler.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ url }) => {
	const target = new URL('/api/auth/google/callback', url.origin);
	target.search = url.search;
	return Response.redirect(target.toString(), 302);
};
