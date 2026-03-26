import type { APIRoute } from 'astro';
import {
	applyImportBundle,
	type BackupKind,
	type ImportMode,
	parseBackupBundle,
	parseBackupKindsFromParams,
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

function redirectWithMessage(request: Request, baseRedirect: string, params: Record<string, string>): Response {
	const u = new URL(baseRedirect.trim() || '/en/admin/backup', request.url);
	for (const [k, v] of Object.entries(params)) {
		if (v) u.searchParams.set(k, v);
	}
	return Response.redirect(u.toString(), 303);
}

export const POST: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	const ct = request.headers.get('content-type') ?? '';
	if (!ct.includes('multipart/form-data')) {
		return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let fd: FormData;
	try {
		fd = await request.formData();
	} catch {
		return new Response(JSON.stringify({ error: 'Request body too large or invalid' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const redirectRaw = fd.get('redirect');
	const redirectTo = typeof redirectRaw === 'string' ? redirectRaw : '/en/admin/backup';
	const importUsers = fd.get('import_users') === 'on' || fd.get('import_users') === 'true';

	const importModeRaw = String(fd.get('import_mode') ?? 'replace').toLowerCase();
	const importMode: ImportMode = importModeRaw === 'merge' ? 'merge' : 'replace';

	const importScope = String(fd.get('import_scope') ?? 'all').toLowerCase();
	let kindsFilter: BackupKind[] | null = null;
	if (importScope === 'pick') {
		const picked = fd.getAll('import_kind').map((v) => String(v));
		const parsed = parseBackupKindsFromParams(picked);
		if ('error' in parsed) {
			return redirectWithMessage(request, redirectTo, { error: parsed.error });
		}
		kindsFilter = parsed;
	}

	const file = fd.get('file');
	if (!file || typeof file === 'string') {
		return redirectWithMessage(request, redirectTo, { error: 'Choose a backup JSON file.' });
	}

	let text: string;
	try {
		text = await file.text();
	} catch {
		return redirectWithMessage(request, redirectTo, { error: 'Could not read uploaded file.' });
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(text) as unknown;
	} catch {
		return redirectWithMessage(request, redirectTo, { error: 'File is not valid JSON.' });
	}

	const bundle = parseBackupBundle(parsed);
	if ('error' in bundle) {
		return redirectWithMessage(request, redirectTo, { error: bundle.error });
	}

	const result = applyImportBundle(bundle, { importUsers, kindsFilter, importMode });
	if (!result.ok) {
		return redirectWithMessage(request, redirectTo, { error: result.error });
	}

	const u = new URL(redirectTo.trim() || '/en/admin/backup', request.url);
	u.searchParams.set('import', 'ok');
	u.searchParams.set('n', String(result.written.length));
	if (result.importMode === 'merge') {
		u.searchParams.set('merge', '1');
		u.searchParams.set('ma', String(result.mergeAdded));
	}
	return Response.redirect(u.toString(), 303);
};
