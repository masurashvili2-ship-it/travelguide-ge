import type { APIRoute } from 'astro';
import {
	buildExportBundle,
	type BackupKind,
	parseBackupKindsFromParams,
	serializeBackupBundle,
} from '../../../lib/admin-data-backup';

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
	const rawTypes = url.searchParams.getAll('types');
	let kinds: BackupKind[] | null = null;

	if (rawTypes.length > 0) {
		const parsed = parseBackupKindsFromParams(rawTypes);
		if ('error' in parsed) {
			return new Response(JSON.stringify({ error: parsed.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		kinds = parsed;
	}

	const bundle = buildExportBundle({
		includeUsers,
		kinds,
	});
	const body = serializeBackupBundle(bundle);
	const day = bundle.exportedAt.slice(0, 10);
	const kindSlug = kinds
		? kinds.join('-').replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'partial'
		: 'full';
	const safeName = `travelguide-ge-${kindSlug}-${day}.json`;

	return new Response(body, {
		status: 200,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="${safeName}"`,
			'Cache-Control': 'no-store',
		},
	});
};
