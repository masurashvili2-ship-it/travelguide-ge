// @ts-check
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://travelguide.ge',
	output: 'server',
	adapter: node({ mode: 'standalone' }),
	i18n: {
		locales: ['en', 'ka', 'ru'],
		defaultLocale: 'en',
		routing: {
			prefixDefaultLocale: true,
			redirectToDefaultLocale: true,
		},
	},
});
