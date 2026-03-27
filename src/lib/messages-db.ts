import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { getDataDir } from './data-dir';

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'messages.json');

export type MessageReply = {
	sent_at: number;
	body: string;
};

export type ContactMessage = {
	id: string;
	created_at: number;
	name: string;
	email: string;
	subject: string;
	body: string;
	read: boolean;
	replies: MessageReply[];
};

let _cache: ContactMessage[] | null = null;

function readAll(): ContactMessage[] {
	if (_cache) return _cache;
	if (!existsSync(STORE_FILE)) return (_cache = []);
	try {
		_cache = JSON.parse(readFileSync(STORE_FILE, 'utf-8')) as ContactMessage[];
	} catch {
		_cache = [];
	}
	return _cache;
}

function writeAll(msgs: ContactMessage[]): void {
	if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
	writeFileSync(STORE_FILE, JSON.stringify(msgs, null, 2), 'utf-8');
	_cache = msgs;
}

export function listMessages(): ContactMessage[] {
	return readAll().slice().sort((a, b) => b.created_at - a.created_at);
}

export function getMessage(id: string): ContactMessage | null {
	return readAll().find((m) => m.id === id) ?? null;
}

export function countUnread(): number {
	return readAll().filter((m) => !m.read).length;
}

export function addMessage(data: Omit<ContactMessage, 'id' | 'created_at' | 'read' | 'replies'>): ContactMessage {
	const msgs = readAll();
	const msg: ContactMessage = {
		id: randomBytes(10).toString('hex'),
		created_at: Date.now(),
		read: false,
		replies: [],
		...data,
	};
	msgs.push(msg);
	writeAll(msgs);
	return msg;
}

export function markRead(id: string): boolean {
	const msgs = readAll();
	const m = msgs.find((x) => x.id === id);
	if (!m) return false;
	m.read = true;
	writeAll(msgs);
	return true;
}

export function addReply(id: string, body: string): boolean {
	const msgs = readAll();
	const m = msgs.find((x) => x.id === id);
	if (!m) return false;
	m.replies.push({ sent_at: Date.now(), body });
	m.read = true;
	writeAll(msgs);
	return true;
}

export function deleteMessage(id: string): boolean {
	const msgs = readAll();
	const idx = msgs.findIndex((x) => x.id === id);
	if (idx === -1) return false;
	msgs.splice(idx, 1);
	writeAll(msgs);
	return true;
}

export function bustMessagesCache(): void {
	_cache = null;
}
