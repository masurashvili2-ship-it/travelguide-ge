/** Optional structured links shown under “Contact & hours” on what-to-do pages (shared for all locales). */

export const CONTACT_SOCIAL_LINK_KEYS = [
	'website',
	'facebook',
	'instagram',
	'x',
	'youtube',
	'tiktok',
	'linkedin',
	'tripadvisor',
	'whatsapp',
	'telegram',
	'email',
	'phone',
] as const;

export type ContactSocialLinkKey = (typeof CONTACT_SOCIAL_LINK_KEYS)[number];

export type ContactSocialLinks = Partial<Record<ContactSocialLinkKey, string>>;

export const CONTACT_SOCIAL_LABELS: Record<ContactSocialLinkKey, string> = {
	website: 'Website',
	facebook: 'Facebook',
	instagram: 'Instagram',
	x: 'X (Twitter)',
	youtube: 'YouTube',
	tiktok: 'TikTok',
	linkedin: 'LinkedIn',
	tripadvisor: 'TripAdvisor',
	whatsapp: 'WhatsApp',
	telegram: 'Telegram',
	email: 'Email',
	phone: 'Phone',
};

function isDangerousScheme(s: string): boolean {
	const t = s.trim().toLowerCase();
	return t.startsWith('javascript:') || t.startsWith('data:') || t.startsWith('vbscript:');
}

/** Safe `href` for a stored value, or null if unusable. */
export function hrefForContactSocialLink(key: ContactSocialLinkKey, raw: string): string | null {
	const t = raw.trim();
	if (!t || isDangerousScheme(t)) return null;

	if (key === 'email') {
		const addr = t.replace(/^mailto:/i, '').trim();
		if (!addr.includes('@')) return null;
		return `mailto:${addr}`;
	}

	if (key === 'phone') {
		const body = t.replace(/^tel:/i, '').trim();
		if (!body) return null;
		const compact = body.replace(/[^\d+]/g, '');
		if (!compact) return null;
		return `tel:${compact}`;
	}

	if (/^https?:\/\//i.test(t)) return t;
	if (t.startsWith('/')) return t;
	if (t.startsWith('//')) return `https:${t}`;

	if (key === 'whatsapp') {
		const digits = t.replace(/[^\d]/g, '');
		if (digits.length >= 8) return `https://wa.me/${digits}`;
		return null;
	}

	if (key === 'telegram') {
		const h = t
			.replace(/^@/, '')
			.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '')
			.trim();
		if (/^[a-z0-9_]{3,}$/i.test(h)) return `https://t.me/${h}`;
		return null;
	}

	if (key === 'instagram' && /^@?[\w.]{1,30}$/.test(t)) {
		const u = t.replace('@', '');
		return `https://instagram.com/${u}`;
	}
	if (key === 'x' && /^@?[\w]{1,20}$/.test(t)) {
		const u = t.replace('@', '');
		return `https://x.com/${u}`;
	}
	if (key === 'tiktok' && /^@?[\w.]{1,30}$/.test(t)) {
		const u = t.replace('@', '');
		return `https://www.tiktok.com/@${u}`;
	}
	if (key === 'facebook' && /^[\w.-]{2,}$/.test(t)) {
		return `https://facebook.com/${t}`;
	}
	if (key === 'youtube') {
		const u = t.replace(/^@/, '').trim();
		if (/^[\w-]{2,}$/.test(u)) return `https://www.youtube.com/@${u}`;
		return null;
	}

	if (/^[\w.-]+\.[a-z]{2,}([/?#][^\s]*)?$/i.test(t)) {
		return `https://${t.replace(/^\/+/, '')}`;
	}

	return null;
}

export function normalizeSocialLinksFromJson(raw: unknown): ContactSocialLinks | undefined {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
	const o = raw as Record<string, unknown>;
	const out: ContactSocialLinks = {};
	for (const key of CONTACT_SOCIAL_LINK_KEYS) {
		const v = o[key];
		if (typeof v === 'string' && v.trim()) (out as Record<string, string>)[key] = v.trim();
	}
	return Object.keys(out).length ? out : undefined;
}

export function parseContactSocialLinksFromForm(
	fields: Record<string, string>,
	loc: string,
): ContactSocialLinks | undefined {
	const out: ContactSocialLinks = {};
	for (const key of CONTACT_SOCIAL_LINK_KEYS) {
		const v = (fields[`${loc}_social_${key}`] ?? '').trim();
		if (v) (out as Record<string, string>)[key] = v;
	}
	return Object.keys(out).length ? out : undefined;
}

/** Shared fields `social_website`, `social_facebook`, … (no locale prefix). */
export function parseContactSocialLinksFromFormGlobal(fields: Record<string, string>): ContactSocialLinks {
	const out: ContactSocialLinks = {};
	for (const key of CONTACT_SOCIAL_LINK_KEYS) {
		const v = (fields[`social_${key}`] ?? '').trim();
		if (v) (out as Record<string, string>)[key] = v;
	}
	return trimSocialLinks(out);
}

/** Drop empty strings; used when persisting from API blocks. */
export function trimSocialLinks(raw: ContactSocialLinks | undefined): ContactSocialLinks {
	if (!raw) return {};
	const out: ContactSocialLinks = {};
	for (const key of CONTACT_SOCIAL_LINK_KEYS) {
		const v = raw[key]?.trim();
		if (v) (out as Record<string, string>)[key] = v;
	}
	return out;
}

export function listRenderableContactSocialLinks(
	links: ContactSocialLinks | undefined | null,
): { key: ContactSocialLinkKey; label: string; href: string }[] {
	if (!links) return [];
	const rows: { key: ContactSocialLinkKey; label: string; href: string }[] = [];
	for (const key of CONTACT_SOCIAL_LINK_KEYS) {
		const raw = links[key];
		if (!raw) continue;
		const href = hrefForContactSocialLink(key, raw);
		if (!href) continue;
		rows.push({ key, label: CONTACT_SOCIAL_LABELS[key], href });
	}
	return rows;
}

export function hasRenderableContactSocialLinks(links: ContactSocialLinks | undefined | null): boolean {
	return listRenderableContactSocialLinks(links).length > 0;
}
