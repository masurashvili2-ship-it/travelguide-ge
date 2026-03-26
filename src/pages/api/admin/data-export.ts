import type { APIRoute } from 'astro';
import { buildExportBundle, serializeBackupBundle } from '../../../lib/admin-data-backup';

function requireAdmin(locals: App.Locals): Response | null {
	if (!locals.user || locals.user.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return null;
}

export const GET: APIRoute = async ({ locals, url }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	const includeUsers = url.searchParams.get('include_users') !== '0';
	const bundle = buildExportBundle(includeUsers);
	const body = serializeBackupBundle(bundle);
	const day = bundle.exportedAt.slice(0, 10);
	const safeName = `travelguide-ge-backup-${day}.json`;

	return new Response(body, {
		status: 200,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="${safeName}"`,
			'Cache-Control': 'no-store',
		},
	});
};
