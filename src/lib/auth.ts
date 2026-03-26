import bcrypt from 'bcryptjs';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type UserRole = 'admin' | 'user';

export type StoredUser = {
	id: string;
	email: string;
	passwordHash: string;
	role: UserRole;
};

export type UserPublic = {
	id: string;
	email: string;
	role: UserRole;
};

const SESSION_COOKIE = 'tg_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

function dataDir() {
	return path.join(process.cwd(), 'data');
}

function usersPath() {
	return path.join(dataDir(), 'users.json');
}

function secret(): string {
	const s = process.env.SESSION_SECRET;
	if (s && s.length >= 16) return s;
	return 'travelguide-dev-secret-change-me';
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
	await mkdir(dataDir(), { recursive: true });
	await writeFile(usersPath(), JSON.stringify(users, null, 2), 'utf-8');
}

export async function registerUser(
	email: string,
	password: string,
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
	const user: StoredUser = {
		id: randomBytes(16).toString('hex'),
		email: normalized,
		passwordHash,
		role,
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
	const ok = await bcrypt.compare(password, user.passwordHash);
	if (!ok) return null;
	return { id: user.id, email: user.email, role: user.role };
}

function signSession(userId: string, exp: number): string {
	const payload = `${userId}.${exp}`;
	const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
	return `${payload}.${sig}`;
}

function extractCookie(cookieHeader: string | null, name: string): string | null {
	if (!cookieHeader) return null;
	const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match ? match[1] : null;
}

function verifySessionToken(token: string): { userId: string } | null {
	const raw = decodeURIComponent(token.trim());
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
	const v = verifySessionToken(token);
	if (!v) return null;
	const users = await readUsers();
	const full = users.find((u) => u.id === v.userId);
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

/** Only allow same-site path redirects (login/register `next`). */
export function sanitizeAuthNextPath(next: string, fallback: string): string {
	const t = next.trim();
	if (!t.startsWith('/') || t.startsWith('//')) return fallback;
	if (/^https?:/i.test(t)) return fallback;
	if (t.length > 2048) return fallback;
	return t;
}

export function sessionCookieHeader(userId: string, request: Request): string {
	const exp = Date.now() + SESSION_MAX_AGE_MS;
	const token = signSession(userId, exp);
	const secure = isRequestHttps(request) ? '; Secure' : '';
	return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`;
}

export function clearSessionCookieHeader(request: Request): string {
	const secure = isRequestHttps(request) ? '; Secure' : '';
	return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}
