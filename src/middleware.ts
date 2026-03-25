import { defineMiddleware } from 'astro:middleware';
import { userFromRequest } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
	context.locals.user = (await userFromRequest(context.request.headers.get('cookie'))) ?? undefined;

	const path = context.url.pathname.replace(/\/$/, '') || '/';

	/*
	 * Paths like `/admin` or `/admin/tours/new` are otherwise parsed as locale `admin`
	 * (invalid → MissingLocaleError). Prefix the default locale.
	 * Does not match `/administration` (requires `/` or end after `admin`).
	 */
	if (/^\/admin(?:\/|$)/.test(path)) {
		return context.redirect(`/en${path}${context.url.search}`, 302);
	}

	const adminMatch = path.match(/^\/(en|ka|ru)\/admin(?:\/.*)?$/);
	if (adminMatch) {
		const user = context.locals.user;
		const loc = adminMatch[1];
		if (!user || user.role !== 'admin') {
			const login = new URL(`/${loc}/login`, context.url);
			login.searchParams.set('next', `/${loc}/admin`);
			return Response.redirect(login, 302);
		}
	}

	return next();
});
