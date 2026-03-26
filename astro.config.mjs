// @ts-check
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://travelguide.ge',
	output: 'server',
	adapter: node({ mode: 'standalone' }),
	/** Inline extracted CSS into HTML to avoid many render-blocking <link rel="stylesheet"> (PageSpeed / LCP). */
	build: {
		inlineStylesheets: 'always',
	},
	// Trust X-Forwarded-* on these hosts so URL.origin matches the browser (POST forms + checkOrigin).
	security: {
		allowedDomains: [
			{ hostname: 'travelguide.ge', protocol: 'https' },
			{ hostname: 'www.travelguide.ge', protocol: 'https' },
			{ hostname: '**.ondigitalocean.app', protocol: 'https' },
			{ hostname: 'localhost', protocol: 'http' },
			{ hostname: '127.0.0.1', protocol: 'http' },
		],
	},
	i18n: {
		locales: ['en', 'ka', 'ru'],
		defaultLocale: 'en',
		routing: {
			prefixDefaultLocale: true,
			redirectToDefaultLocale: true,
		},
	},
});
