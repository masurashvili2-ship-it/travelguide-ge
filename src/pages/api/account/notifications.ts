import type { APIRoute } from 'astro';
import { countUnreadPlatformMessages } from '../../../lib/platform-messages-db';

export const GET: APIRoute = async ({ locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const unreadMessages = countUnreadPlatformMessages(locals.user.id);
	return new Response(JSON.stringify({ unreadMessages }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
