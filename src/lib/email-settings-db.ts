import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getDataDir } from './data-dir';

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'email-settings.json');

export type EmailSettings = {
	updated_at: number;
	smtp_host: string;
	smtp_port: number;
	smtp_user: string;
	/** Stored as plain text — admin-only file, never exposed publicly. */
	smtp_pass: string;
	/** Optional display name + address: "Travel Guide Georgia <contact@travelguide.ge>" */
	smtp_from: string;
	/** Inbox that receives contact-form messages and submission notifications. Defaults to smtp_user. */
	admin_notify_email: string;
	/** Toggle admin notification emails on new content submissions. */
	notify_on_submission: boolean;
};

const DEFAULTS: EmailSettings = {
	updated_at: 0,
	smtp_host: '',
	smtp_port: 587,
	smtp_user: '',
	smtp_pass: '',
	smtp_from: '',
	admin_notify_email: '',
	notify_on_submission: true,
};

let _cache: EmailSettings | null = null;

export function getEmailSettings(): EmailSettings {
	if (_cache) return _cache;
	if (!existsSync(STORE_FILE)) {
		// Fall back to env vars so existing setups keep working
		_cache = {
			...DEFAULTS,
			smtp_host: process.env.SMTP_HOST?.trim() ?? '',
			smtp_port: parseInt(process.env.SMTP_PORT?.trim() ?? '587', 10),
			smtp_user: process.env.SMTP_USER?.trim() ?? '',
			smtp_pass: process.env.SMTP_PASS?.trim() ?? '',
			smtp_from: process.env.SMTP_FROM?.trim() ?? '',
			admin_notify_email: process.env.ADMIN_NOTIFY_EMAIL?.trim() ?? '',
		};
		return _cache;
	}
	try {
		const raw = readFileSync(STORE_FILE, 'utf-8');
		_cache = { ...DEFAULTS, ...JSON.parse(raw) } as EmailSettings;
	} catch {
		_cache = { ...DEFAULTS };
	}
	return _cache;
}

export function saveEmailSettings(patch: Partial<Omit<EmailSettings, 'updated_at'>>): EmailSettings {
	const current = getEmailSettings();
	const next: EmailSettings = {
		...current,
		...patch,
		updated_at: Date.now(),
	};
	if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
	writeFileSync(STORE_FILE, JSON.stringify(next, null, 2), 'utf-8');
	_cache = next;
	return next;
}

/** Bust cache — call after writing so next read is fresh. */
export function bustEmailSettingsCache(): void {
	_cache = null;
}
