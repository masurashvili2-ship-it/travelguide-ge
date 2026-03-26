import type { Locale } from './strings';
import type { PageLocaleBlock } from './pages-db';
import type { TourLocaleBlock } from './tours-db';

const LOCALES: Locale[] = ['en', 'ka', 'ru'];

export function buildTourI18nFromContributeForm(
	fields: Record<string, string>,
	options: { contactSidebar: boolean },
): Partial<Record<Locale, TourLocaleBlock>> {
	const i18n: Partial<Record<Locale, TourLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const title = (fields[`${loc}_title`] ?? '').trim();
		const duration = (fields[`${loc}_duration`] ?? '').trim();
		const excerpt = (fields[`${loc}_excerpt`] ?? '').trim();
		if (!title && !duration && !excerpt) continue;
		const block: TourLocaleBlock = {
			title,
			duration,
			excerpt,
			price: (fields[`${loc}_price`] ?? '').trim() || null,
			seo_title: (fields[`${loc}_seo_title`] ?? '').trim() || null,
			seo_description: (fields[`${loc}_seo_description`] ?? '').trim() || null,
			body: fields[`${loc}_body`] ?? '',
			contact_sidebar: options.contactSidebar ? (fields[`${loc}_contact_sidebar`] ?? '') : '',
		};
		i18n[loc] = block;
	}
	return i18n;
}

export function buildPageI18nFromContributeForm(
	fields: Record<string, string>,
): Partial<Record<Locale, PageLocaleBlock>> {
	const i18n: Partial<Record<Locale, PageLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const title = (fields[`${loc}_title`] ?? '').trim();
		const body = fields[`${loc}_body`] ?? '';
		const st = (fields[`${loc}_seo_title`] ?? '').trim();
		const sd = (fields[`${loc}_seo_description`] ?? '').trim();
		if (!title && !body.trim() && !st && !sd) continue;
		i18n[loc] = {
			title,
			body,
			seo_title: st || null,
			seo_description: sd || null,
		};
	}
	return i18n;
}
