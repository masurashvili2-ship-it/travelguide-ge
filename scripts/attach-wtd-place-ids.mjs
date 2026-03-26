/**
 * One-off: set what-to-do place_ids (region.json UUIDs) from curated region slugs.
 * Run: node scripts/attach-wtd-place-ids.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const regionsPath = path.join(root, 'data', 'regions.json');
const wtdPath = path.join(root, 'data', 'what-to-do.json');

/** Region slugs (top-level) per what-to-do slug — rivers may list several. */
const REGION_SLUGS_BY_WTD_SLUG = {
	'old-tbilisi-evening-walk': ['tbilisi'],
	'sulphur-baths-chreli-abano': ['tbilisi'],
	'dry-bridge-flea-market': ['tbilisi'],
	'mtatsminda-park-and-funicular': ['tbilisi'],
	'turtle-lake-kus-tba': ['tbilisi'],
	'georgian-national-museum-rustaveli': ['tbilisi'],
	'bridge-of-peace': ['tbilisi'],
	jyujuy: ['tbilisi'],
	'mtkvari-river-valley': ['tbilisi', 'kvemo-kartli', 'shida-kartli'],
	'aragvi-river-mtskheta': ['mtskheta-mtianeti'],
	'tetri-aragvi-gudauri': ['mtskheta-mtianeti'],
	'shavi-aragvi': ['mtskheta-mtianeti', 'racha-lechkhumi-lower-svaneti'],
	'rioni-river-kutaisi': ['imereti'],
	'enguri-river': ['samegrelo-upper-svaneti'],
	'tergi-river-stepantsminda': ['mtskheta-mtianeti'],
	'chorokhi-river-adjara': ['adjara'],
	'alazani-valley-kakheti': ['kakheti'],
	'iori-river': ['kakheti', 'kvemo-kartli'],
	'khrami-river': ['kvemo-kartli', 'tbilisi'],
	'ksani-river': ['shida-kartli', 'mtskheta-mtianeti'],
	'liakhvi-river': ['shida-kartli'],
	'duruji-river': ['kakheti'],
	'supsa-river': ['guria'],
	'natanebi-river': ['guria', 'adjara'],
	'tekhura-river': ['samegrelo-upper-svaneti'],
	'kvirila-river': ['imereti'],
	'dzirula-river': ['imereti'],
	'vere-river-tbilisi': ['tbilisi'],
	'adjaristsqali-river': ['adjara'],
	'machakhela-river': ['adjara'],
	'kintrishi-river': ['adjara'],
	'choloki-river': ['adjara'],
	'khanistskali-river': ['imereti'],
	'tskhenistskali-racha': ['racha-lechkhumi-lower-svaneti'],
	'khevistskali-racha': ['racha-lechkhumi-lower-svaneti'],
	'jejora-svaneti': ['samegrelo-upper-svaneti'],
	'nenskra-river': ['samegrelo-upper-svaneti'],
	'mulkhura-river': ['samegrelo-upper-svaneti'],
	'chkheristskali-svaneti': ['samegrelo-upper-svaneti'],
	'kodori-river-valley': ['abkhazia'],
	'bzyb-river': ['abkhazia'],
	'gumista-river': ['abkhazia'],
	'prone-river': ['abkhazia'],
	'dzirula-kharagauli': ['imereti'],
	'rioni-delta-poti': ['samegrelo-upper-svaneti'],
	'mtkvari-confluence-borjomi': ['samtskhe-javakheti'],
	'khrami-tsalka-headwaters': ['kvemo-kartli'],
	'algeti-river': ['kvemo-kartli'],
	'lashistskali-adjara': ['adjara'],
	'sharapkhana-river': ['adjara'],
	'stori-river-kakheti': ['kakheti'],
	'laliskhevi-river': ['kakheti'],
	'andaki-river': ['kakheti'],
	'arghuni-river-pankisi': ['kakheti'],
	'asani-river': ['kakheti'],
	'abashistskali-river': ['adjara'],
	'chechla-river': ['mtskheta-mtianeti'],
	'paravani-river-outflow': ['samtskhe-javakheti'],
};

const regions = JSON.parse(readFileSync(regionsPath, 'utf8'));
const bySlug = new Map(regions.posts.map((p) => [p.slug, p]));

function idsForRegionSlugs(slugs) {
	const out = [];
	const seen = new Set();
	for (const s of slugs) {
		const p = bySlug.get(s);
		if (!p || p.level !== 'region') {
			console.warn('Missing region slug:', s);
			continue;
		}
		if (seen.has(p.id)) continue;
		seen.add(p.id);
		out.push(p.id);
	}
	return out;
}

const wtd = JSON.parse(readFileSync(wtdPath, 'utf8'));
let n = 0;
for (const post of wtd.posts) {
	const slugs = REGION_SLUGS_BY_WTD_SLUG[post.slug];
	if (!slugs) {
		console.warn('No mapping for slug:', post.slug);
		continue;
	}
	const ids = idsForRegionSlugs(slugs);
	if (!ids.length) continue;
	post.place_ids = ids;
	n++;
}

writeFileSync(wtdPath, `${JSON.stringify(wtd, null, 2)}\n`, 'utf8');
console.log(`Updated place_ids on ${n} what-to-do posts.`);
