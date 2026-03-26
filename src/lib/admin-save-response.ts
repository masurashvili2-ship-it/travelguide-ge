import type { Locale } from './strings';

export function isJsonRequestBody(contentType: string): boolean {
	return contentType.includes('application/json');
}

/** True when the client wants a JSON body (JSON POST or fetch with Accept: application/json). */
export function wantsJsonApiResponse(request: Request, isJsonBody: boolean): boolean {
	if (isJsonBody) return true;
	const accept = (request.headers.get('accept') ?? '').toLowerCase();
	return accept.includes('application/json');
}

export function parseAdminLocale(fields: Record<string, string>): Locale {
	const raw = (fields.admin_locale ?? '').trim().toLowerCase();
	if (raw === 'en' || raw === 'ka' || raw === 'ru') return raw;
	return 'en';
}

export function publicContentUrl(
	request: Request,
	locale: Locale,
	kind: 'tours' | 'what-to-do' | 'page',
	slug: string,
): string {
	const path =
		kind === 'page'
			? `/${locale}/${slug}`
			: `/${locale}/${kind === 'tours' ? 'tours' : 'what-to-do'}/${slug}`;
	return new URL(path, request.url).href;
}
