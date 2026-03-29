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
	kind: 'tours' | 'what-to-do' | 'regions' | 'page' | 'guides',
	slug: string,
): string {
	let path: string;
	if (kind === 'page') {
		path = `/${locale}/${slug}`;
	} else if (kind === 'tours') {
		path = `/${locale}/tours/${slug}`;
	} else if (kind === 'what-to-do') {
		path = `/${locale}/what-to-do/${slug}`;
	} else if (kind === 'guides') {
		path = `/${locale}/guides/${slug}`;
	} else {
		path = `/${locale}/regions/${slug}`;
	}
	return new URL(path, request.url).href;
}
