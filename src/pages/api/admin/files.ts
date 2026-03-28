import type { APIRoute } from 'astro';
import {
	createDirectory,
	deleteEntry,
	listDirectory,
	moveEntry,
	renameEntry,
	saveUploadedFile,
} from '../../../lib/admin-file-manager';

export const prerender = false;

function requireAdmin(locals: App.Locals) {
	return locals.user?.role === 'admin';
}

export const GET: APIRoute = async ({ request, locals }) => {
	if (!requireAdmin(locals)) {
		return new Response(JSON.stringify({ error: 'Forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const url = new URL(request.url);
	const dir = url.searchParams.get('dir') ?? '';
	const result = listDirectory(dir);
	return new Response(JSON.stringify(result), {
		status: result.ok ? 200 : 400,
		headers: { 'Content-Type': 'application/json' },
	});
};

export const POST: APIRoute = async ({ request, locals }) => {
	if (!requireAdmin(locals)) {
		return new Response(JSON.stringify({ error: 'Forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const ct = request.headers.get('content-type') ?? '';

	// Multipart upload
	if (ct.includes('multipart/form-data')) {
		const form = await request.formData();
		const dir = String(form.get('dir') ?? '');
		const files = form.getAll('files');
		const results: { name: string; ok: boolean; url?: string; error?: string }[] = [];
		for (const f of files) {
			if (!(f instanceof File)) continue;
			const buf = Buffer.from(await f.arrayBuffer());
			const r = saveUploadedFile(dir, f.name, buf);
			results.push({ name: f.name, ok: r.ok, url: r.ok ? r.url : undefined, error: r.ok ? undefined : r.error });
		}
		return new Response(JSON.stringify({ ok: true, results }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const action = String(body.action ?? '');

	if (action === 'delete') {
		const paths = Array.isArray(body.paths) ? body.paths : [body.path];
		const results: { path: string; ok: boolean; error?: string }[] = [];
		for (const p of paths) {
			const r = deleteEntry(String(p));
			results.push({ path: String(p), ok: r.ok, error: r.ok ? undefined : r.error });
		}
		return new Response(JSON.stringify({ ok: true, results }), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (action === 'rename') {
		const result = renameEntry(String(body.path ?? ''), String(body.newName ?? ''));
		return new Response(JSON.stringify(result), {
			status: result.ok ? 200 : 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (action === 'move') {
		const result = moveEntry(String(body.path ?? ''), String(body.targetDir ?? ''));
		return new Response(JSON.stringify(result), {
			status: result.ok ? 200 : 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (action === 'mkdir') {
		const result = createDirectory(String(body.parent ?? ''), String(body.name ?? ''));
		return new Response(JSON.stringify(result), {
			status: result.ok ? 200 : 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ error: 'Unknown action' }), {
		status: 400,
		headers: { 'Content-Type': 'application/json' },
	});
};
