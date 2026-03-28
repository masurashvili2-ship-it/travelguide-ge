import bcrypt from 'bcryptjs';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getDataDir } from './data-dir';

export type UserRole = 'admin' | 'user';

export type StoredUser = {
	id: string;
	email: string;
	/** bcrypt hash; empty string = OAuth-only (password login disabled) */
	passwordHash: string;
	role: UserRole;
	/** Optional display name from registration or Google */
	displayName?: string;
	/** Google account id (sub) when linked */
	googleSub?: string;
};

export type UserPublic = {
	id: string;
	email: string;
	role: UserRole;
};

const SESSION_COOKIE = 'tg_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

function usersPath() {
	return path.join(getDataDir(), 'users.json');
}

let warnedMissingSessionSecret = false;

function secret(): string {
	const s = process.env.SESSION_SECRET;
	if (s && s.length >= 16) return s;
	if (process.env.NODE_ENV === 'production' && !warnedMissingSessionSecret) {
		warnedMissingSessionSecret = true;
		console.error(
			'[auth] SESSION_SECRET missing or shorter than 16 chars at runtime. Set it in App Platform with scope RUN_TIME (not BUILD_TIME-only). See https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/',
		);
	}
	return 'travelguide-dev-secret-change-me';
}

export async function getStoredUserById(id: string): Promise<StoredUser | null> {
	const users = await readUsers();
	return users.find((u) => u.id === id) ?? null;
}

export async function updateUserDisplayName(
	userId: string,
	displayName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const dn = displayName.trim();
	if (dn.length > 120) return { ok: false, error: 'Display name is too long' };
	const users = await readUsers();
	const u = users.find((x) => x.id === userId);
	if (!u) return { ok: false, error: 'User not found' };
	if (dn) u.displayName = dn;
	else delete u.displayName;
	await writeUsers(users);
	return { ok: true };
}

export async function readUsers(): Promise<StoredUser[]> {
	try {
		const raw = await readFile(usersPath(), 'utf-8');
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed as StoredUser[];
	} catch {
		return [];
	}
}

export async function writeUsers(users: StoredUser[]): Promise<void> {
	await mkdir(getDataDir(), { recursive: true });
	await writeFile(usersPath(), JSON.stringify(users, null, 2), 'utf-8');
}

export async function registerUser(
	email: string,
	password: string,
	options?: { displayName?: string },
): Promise<{ ok: true; user: UserPublic } | { ok: false; error: string }> {
	const normalized = email.trim().toLowerCase();
	if (!normalized || !normalized.includes('@')) {
		return { ok: false, error: 'Invalid email' };
	}
	if (password.length < 8) {
		return { ok: false, error: 'Password must be at least 8 characters' };
	}
	const users = await readUsers();
	if (users.some((u) => u.email === normalized)) {
		return { ok: false, error: 'Email already registered' };
	}
	const passwordHash = await bcrypt.hash(password, 10);
	const role: UserRole = users.length === 0 ? 'admin' : 'user';
	const dn = options?.displayName?.trim();
	const user: StoredUser = {
		id: randomBytes(16).toString('hex'),
		email: normalized,
		passwordHash,
		role,
		...(dn ? { displayName: dn } : {}),
	};
	users.push(user);
	await writeUsers(users);
	return {
		ok: true,
		user: { id: user.id, email: user.email, role: user.role },
	};
}

/**
 * Sign in or register via Google. Links `googleSub` to an existing email if present.
 */
export async function registerOrLoginGoogleUser(
	googleSub: string,
	email: string,
	displayName: string | undefined,
): Promise<{ ok: true; user: UserPublic } | { ok: false; error: string }> {
	const sub = googleSub.trim();
	if (!sub) return { ok: false, error: 'Invalid Google account' };
	const normalized = email.trim().toLowerCase();
	if (!normalized || !normalized.includes('@')) {
		return { ok: false, error: 'Invalid email' };
	}
	const users = await readUsers();
	const bySub = users.find((u) => u.googleSub === sub);
	if (bySub) {
		return { ok: true, user: { id: bySub.id, email: bySub.email, role: bySub.role } };
	}
	const byEmail = users.find((u) => u.email === normalized);
	if (byEmail) {
		byEmail.googleSub = sub;
		const dn = displayName?.trim();
		if (dn && !byEmail.displayName) byEmail.displayName = dn;
		await writeUsers(users);
		return { ok: true, user: { id: byEmail.id, email: byEmail.email, role: byEmail.role } };
	}
	const role: UserRole = users.length === 0 ? 'admin' : 'user';
	const dn = displayName?.trim();
	const user: StoredUser = {
		id: randomBytes(16).toString('hex'),
		email: normalized,
		passwordHash: '',
		googleSub: sub,
		role,
		...(dn ? { displayName: dn } : {}),
	};
	users.push(user);
	await writeUsers(users);
	return {
		ok: true,
		user: { id: user.id, email: user.email, role: user.role },
	};
}

export async function verifyLogin(
	email: string,
	password: string,
): Promise<UserPublic | null> {
	const normalized = email.trim().toLowerCase();
	const users = await readUsers();
	const user = users.find((u) => u.email === normalized);
	if (!user) return null;
	if (!user.passwordHash) return null;
	const ok = await bcrypt.compare(password, user.passwordHash);
	if (!ok) return null;
	return { id: user.id, email: user.email, role: user.role };
}

type SessionPayloadV2 = {
	v: 2;
	sub: string;
	exp: number;
	email: string;
	role: UserRole;
};

/** Signed payload includes identity so we do not re-read users.json per request (fixes App Platform multi-instance). */
function signSessionV2(user: UserPublic, exp: number): string {
	const payload: SessionPayloadV2 = { v: 2, sub: user.id, exp, email: user.email, role: user.role };
	const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
	const sig = createHmac('sha256', secret()).update(b64).digest('base64url');
	return `v2.${b64}.${sig}`;
}

function extractCookie(cookieHeader: string | null, name: string): string | null {
	if (!cookieHeader) return null;
	const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match ? match[1] : null;
}

/** Read a single cookie value (URL-decoded). */
export function getCookieFromHeader(cookieHeader: string | null, name: string): string | null {
	const raw = extractCookie(cookieHeader, name);
	if (!raw) return null;
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}

export function getGoogleOAuthConfig(): { clientId: string; clientSecret: string } | null {
	const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
	if (!clientId || !clientSecret) return null;
	return { clientId, clientSecret };
}

export function oauthStateCookieHeader(state: string, request: Request): string {
	const secure = isRequestHttps(request) ? '; Secure' : '';
	return `oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=600`;
}

export function oauthNextCookieHeader(nextPath: string, request: Request): string {
	const secure = isRequestHttps(request) ? '; Secure' : '';
	return `oauth_next=${encodeURIComponent(nextPath)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=600`;
}

export function clearOAuthCookieHeaders(request: Request): string[] {
	const secure = isRequestHttps(request) ? '; Secure' : '';
	const c = `Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
	return [`oauth_state=; ${c}`, `oauth_next=; ${c}`];
}

function verifySessionV2(token: string): UserPublic | null {
	const raw = decodeURIComponent(token.trim());
	if (!raw.startsWith('v2.')) return null;
	const rest = raw.slice(3);
	const lastDot = rest.lastIndexOf('.');
	if (lastDot <= 0) return null;
	const b64 = rest.slice(0, lastDot);
	const sig = rest.slice(lastDot + 1);
	const expected = createHmac('sha256', secret()).update(b64).digest('base64url');
	try {
		if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
			return null;
		}
	} catch {
		return null;
	}
	let p: SessionPayloadV2;
	try {
		p = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as SessionPayloadV2;
	} catch {
		return null;
	}
	if (p.v !== 2 || !p.sub || typeof p.exp !== 'number' || p.exp < Date.now()) return null;
	if (p.role !== 'admin' && p.role !== 'user') return null;
	if (!p.email || typeof p.email !== 'string' || !p.email.includes('@')) return null;
	return { id: p.sub, email: p.email, role: p.role };
}

function verifyLegacySessionToken(token: string): { userId: string } | null {
	const raw = decodeURIComponent(token.trim());
	if (raw.startsWith('v2.')) return null;
	const parts = raw.split('.');
	if (parts.length !== 3) return null;
	const [userId, expStr, sig] = parts;
	const exp = Number(expStr);
	if (!userId || !Number.isFinite(exp) || exp < Date.now()) return null;
	const payload = `${userId}.${exp}`;
	const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
	try {
		if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
			return null;
		}
	} catch {
		return null;
	}
	return { userId };
}

export async function userFromRequest(cookieHeader: string | null): Promise<UserPublic | null> {
	const token = extractCookie(cookieHeader, SESSION_COOKIE);
	if (!token) return null;
	const v2 = verifySessionV2(token);
	if (v2) return v2;
	const v1 = verifyLegacySessionToken(token);
	if (!v1) return null;
	const users = await readUsers();
	const full = users.find((u) => u.id === v1.userId);
	if (!full) return null;
	return { id: full.id, email: full.email, role: full.role };
}

/** True when the client used HTTPS (or a TLS-terminating proxy). */
export function isRequestHttps(request: Request): boolean {
	const url = new URL(request.url);
	if (url.protocol === 'https:') return true;
	const xf = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
	return xf === 'https';
}

/**
 * Public site origin for redirects (Location) behind proxies where `request.url` may be internal http.
 */
export function publicOriginFromRequest(request: Request): string {
	const proto = isRequestHttps(request) ? 'https' : 'http';
	const xfHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
	const url = new URL(request.url);
	const host = xfHost || request.headers.get('host') || url.host;
	return `${proto}://${host}`;
}

/** `/en/login` or `/ka/register` derived from `next` path for auth error redirects. */
export function localeAuthPagePath(nextSanitizedPath: string, page: 'login' | 'register'): string {
	const m = nextSanitizedPath.trim().match(/^\/(en|ka|ru)(\/|$)/);
	const loc = m ? m[1] : 'en';
	return `/${loc}/${page}`;
}

/** Only allow same-site path redirects (login/register `next`). */
export function sanitizeAuthNextPath(next: string, fallback: string): string {
	const t = next.trim();
	if (!t.startsWith('/') || t.startsWith('//')) return fallback;
	if (/^https?:/i.test(t)) return fallback;
	if (t.length > 2048) return fallback;
	return t;
}

export function sessionCookieHeader(user: UserPublic, request: Request): string {
	const exp = Date.now() + SESSION_MAX_AGE_MS;
	const token = signSessionV2(user, exp);
	const secure = isRequestHttps(request) ? '; Secure' : '';
	return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`;
}

export function clearSessionCookieHeader(request: Request): string {
	const secure = isRequestHttps(request) ? '; Secure' : '';
	return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}

let _seedDone = false;

/**
 * Called once per server start (from middleware).
 * If `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` env vars are set and `users.json`
 * is empty (fresh deploy), creates the admin account automatically so logins work
 * immediately without re-registering after every redeploy.
 *
 * Set on your hosting platform (e.g. DigitalOcean App Platform → Environment → RUN_TIME):
 *   SEED_ADMIN_EMAIL=you@example.com
 *   SEED_ADMIN_PASSWORD=yourpassword
 */
export async function seedAdminIfEmpty(): Promise<void> {
	if (_seedDone) return;
	_seedDone = true;
	const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
	const password = process.env.SEED_ADMIN_PASSWORD?.trim();
	if (!email || !email.includes('@') || !password || password.length < 8) return;
	const users = await readUsers();
	if (users.length > 0) return;
	const passwordHash = await bcrypt.hash(password, 10);
	const user: StoredUser = {
		id: randomBytes(16).toString('hex'),
		email,
		passwordHash,
		role: 'admin',
	};
	await writeUsers([user]);
	console.log(`[auth] Seeded admin from env: ${email}`);
}
