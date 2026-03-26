import { deleteAllCommentsForPost } from './tour-comments-data';
import { deleteContentPostById, type ContentPostKind } from './tours-db';

/**
 * Admin-only: delete a tour or what-to-do post, its reviews, and redirect or JSON-respond.
 */
export async function adminDeleteContentPostResponse(
	kind: ContentPostKind,
	request: Request,
	fields: Record<string, string>,
	respondJson: boolean,
): Promise<Response> {
	const id = fields.id?.trim();
	if (!id) {
		if (!respondJson) {
			const back = fields.redirect?.trim() || `/en/admin`;
			const u = new URL(back, request.url);
			u.searchParams.set('error', 'Missing post id');
			return Response.redirect(u.toString(), 303);
		}
		return new Response(JSON.stringify({ error: 'Missing post id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	await deleteAllCommentsForPost(kind, id);
	const del = deleteContentPostById(kind, id);
	if (!del.ok) {
		if (!respondJson) {
			const back = fields.redirect?.trim() || `/en/admin`;
			const u = new URL(back, request.url);
			u.searchParams.set('error', del.error);
			return Response.redirect(u.toString(), 303);
		}
		return new Response(JSON.stringify({ error: del.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (respondJson) {
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const back = fields.redirect?.trim() || `/en/admin`;
	return Response.redirect(new URL(back, request.url).toString(), 303);
}

/**
 * Admin-only: delete many tour or what-to-do posts (and their reviews) in one request.
 */
export async function adminBulkDeleteContentPostResponse(
	kind: ContentPostKind,
	request: Request,
	ids: string[],
	fields: Record<string, string>,
	respondJson: boolean,
): Promise<Response> {
	const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
	if (unique.length === 0) {
		const msg = 'No posts selected';
		if (!respondJson) {
			const back = fields.redirect?.trim() || `/en/admin`;
			const u = new URL(back, request.url);
			u.searchParams.set('error', msg);
			return Response.redirect(u.toString(), 303);
		}
		return new Response(JSON.stringify({ error: msg }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	for (const id of unique) {
		await deleteAllCommentsForPost(kind, id);
		const del = deleteContentPostById(kind, id);
		if (!del.ok) {
			if (!respondJson) {
				const back = fields.redirect?.trim() || `/en/admin`;
				const u = new URL(back, request.url);
				u.searchParams.set('error', `Bulk delete stopped: ${del.error}`);
				return Response.redirect(u.toString(), 303);
			}
			return new Response(JSON.stringify({ error: del.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}
	if (respondJson) {
		return new Response(JSON.stringify({ ok: true, deleted: unique.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const back = fields.redirect?.trim() || `/en/admin`;
	return Response.redirect(new URL(back, request.url).toString(), 303);
}
