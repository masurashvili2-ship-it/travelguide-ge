import type { APIRoute } from 'astro';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getDataDir } from '../../../lib/data-dir';

export const POST: APIRoute = async ({ locals }) => {
	if (locals.user?.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const DATA_DIR = getDataDir();
	const REGIONS_DIR = path.join(DATA_DIR, 'regions');
	const REGIONS_INDEX = path.join(REGIONS_DIR, 'index.json');

	if (!existsSync(REGIONS_INDEX)) {
		return new Response(JSON.stringify({ error: 'Regions index not found. Run the seed script first.' }), { status: 400 });
	}

	// ── Georgian → Latin transliteration ────────────────────────
	const GEO_TO_LAT: Record<string, string> = {
		'ა':'a','ბ':'b','გ':'g','დ':'d','ე':'e','ვ':'v','ზ':'z',
		'თ':'t','ი':'i','კ':'k','ლ':'l','მ':'m','ნ':'n','ო':'o',
		'პ':'p','ჟ':'zh','რ':'r','ს':'s','ტ':'t','უ':'u','ფ':'f',
		'ქ':'k','ღ':'gh','ყ':'k','შ':'sh','ჩ':'ch','ც':'ts','ძ':'dz',
		'წ':'ts','ჭ':'ch','ხ':'kh','ჯ':'j','ჰ':'h',
	};

	function geoToSlug(name: string): string {
		return name.split('')
			.map(c => GEO_TO_LAT[c] ?? (c === ' ' || c === '-' ? '-' : ''))
			.join('').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80);
	}

	const usedSlugs = new Set<string>();
	function uniqueSlug(base: string): string {
		let slug = base, n = 2;
		while (usedSlugs.has(slug)) { slug = `${base}-${n}`; n++; }
		usedSlugs.add(slug);
		return slug;
	}

	// ── Wikidata municipality QID → DB slug ──────────────────────
	const MUNI_WIKIDATA: Record<string, string> = {
		'Q25475':'batumi','Q175786':'khelvachauri','Q660888':'shuakhevi','Q1252978':'khulo',
		'Q510761':'ozurgeti','Q2380601':'lanchkhuti','Q2466860':'chokhatauri',
		'Q2018619':'baghdati','Q893220':'vani','Q2464187':'zestafoni','Q2374974':'terjola',
		'Q2142574':'samtredia','Q893325':'sachkhere','Q2212773':'tkibuli','Q1892810':'tskaltubo',
		'Q269506':'chiatura','Q2513642':'kharagauli',
		'Q1953364':'telavi','Q748753':'akhmeta','Q1560942':'gurjaani','Q1490703':'dedoplistsqaro',
		'Q941140':'lagodekhi','Q1953363':'signagi','Q1647344':'sagarejo','Q1789499':'kvareli',
		'Q2513580':'bolnisi','Q681371':'dmanisi','Q2512996':'gardabani','Q2410306':'marneuli',
		'Q1954407':'tetritskaro','Q2238147':'tsalka',
		'Q2266679':'mtskheta','Q2474310':'dusheti','Q2586447':'tianeti','Q2475628':'kazbegi',
		'Q2464159':'ambrolauri','Q893287':'oni','Q2464174':'lentekhi','Q2489909':'tsageri',
		'Q2176973':'zugdidi','Q2513666':'abasha','Q2327517':'chkhorotsku','Q2475606':'tsalenjikha',
		'Q2490876':'senaki','Q2511190':'martvili','Q2490962':'mestia',
		'Q2513568':'akhaltsikhe','Q2382197':'adigeni','Q2305733':'aspindza','Q2475809':'borjomi',
		'Q1851196':'akhalkalaki','Q1025123':'ninotsminda',
		'Q1417170':'gori','Q1518087':'kaspi','Q1756629':'kareli','Q1790675':'khashuri',
	};

	// ── Load DB index ────────────────────────────────────────────
	const indexRaw = JSON.parse(readFileSync(REGIONS_INDEX, 'utf8')) as { posts: Array<Record<string, unknown>> };
	const allMunis = indexRaw.posts.filter(p => p.level === 'municipality') as Array<{
		id: string; slug: string;
		i18n?: { en?: { title?: string; subtitle?: string }; ka?: { title?: string } };
	}>;
	const muniBySlug = new Map(allMunis.map(m => [m.slug, m]));

	// Pre-fill used slugs
	for (const m of allMunis) {
		const fp = path.join(REGIONS_DIR, `${m.id}.json`);
		if (!existsSync(fp)) continue;
		const vd = JSON.parse(readFileSync(fp, 'utf8')) as { posts: Array<{ slug: string }> };
		for (const v of vd.posts ?? []) usedSlugs.add(v.slug);
	}

	// ── SPARQL query ─────────────────────────────────────────────
	const sparql = `SELECT DISTINCT ?item ?kaLabel ?enLabel ?ruLabel ?coord ?muni WHERE {
  ?item wdt:P17 wd:Q230 .
  { ?item wdt:P31 wd:Q532 } UNION { ?item wdt:P31 wd:Q5084 } UNION { ?item wdt:P31 wd:Q1115575 } UNION { ?item wdt:P31 wd:Q3957 }
  ?item wdt:P131 ?muni .
  OPTIONAL { ?item wdt:P625 ?coord. }
  OPTIONAL { ?item rdfs:label ?kaLabel . FILTER(LANG(?kaLabel)="ka") }
  OPTIONAL { ?item rdfs:label ?enLabel . FILTER(LANG(?enLabel)="en") }
  OPTIONAL { ?item rdfs:label ?ruLabel . FILTER(LANG(?ruLabel)="ru") }
} LIMIT 5000`;

	let wikidataRows: Array<Record<string, { value: string }>> = [];
	try {
		const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
		const res = await fetch(url, {
			headers: { 'User-Agent': 'TravelGeorgiaBot/1.0', 'Accept': 'application/sparql-results+json' },
			signal: AbortSignal.timeout(45_000),
		});
		if (res.ok) {
			const data = await res.json() as { results: { bindings: Array<Record<string, { value: string }>> } };
			wikidataRows = data.results?.bindings ?? [];
		}
	} catch {
		// timeout or network error — proceed with 0 wikidata results
	}

	// Group by municipality Wikidata QID
	const byMuniQid = new Map<string, Array<{ itemQid: string; kaLabel: string | null; enLabel: string | null; ruLabel: string | null; lat: number | null; lon: number | null }>>();
	for (const row of wikidataRows) {
		const itemQid = row.item?.value?.replace('http://www.wikidata.org/entity/', '') ?? null;
		const muniQid = row.muni?.value?.replace('http://www.wikidata.org/entity/', '') ?? null;
		if (!muniQid || !itemQid) continue;

		const kaLabel = row.kaLabel?.value ?? null;
		const enLabel = row.enLabel?.value ?? null;
		const ruLabel = row.ruLabel?.value ?? null;

		let lat: number | null = null, lon: number | null = null;
		if (row.coord?.value) {
			const m = row.coord.value.match(/Point\(([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\)/);
			if (m) { lon = parseFloat(m[1]); lat = parseFloat(m[2]); }
		}
		if (!byMuniQid.has(muniQid)) byMuniQid.set(muniQid, []);
		byMuniQid.get(muniQid)!.push({ itemQid, kaLabel, enLabel, ruLabel, lat, lon });
	}

	// ── Import villages ──────────────────────────────────────────
	let totalAdded = 0;
	let muniProcessed = 0;

	for (const [muniQid, dbSlug] of Object.entries(MUNI_WIKIDATA)) {
		const dbMuni = muniBySlug.get(dbSlug);
		if (!dbMuni) continue;

		const wdVillages = byMuniQid.get(muniQid) ?? [];
		if (wdVillages.length === 0) continue;

		const muniEnName = (dbMuni.i18n?.en?.title as string | undefined) ?? dbSlug;
		const muniKaName = (dbMuni.i18n?.ka?.title as string | undefined) ?? dbSlug;
		const regionName = (dbMuni.i18n?.en?.subtitle as string | undefined)?.split('·')[0]?.trim() ?? 'Georgia';

		const fp = path.join(REGIONS_DIR, `${dbMuni.id}.json`);
		const existing: Array<{ wikidata_id?: string; i18n?: { ka?: { title?: string } }; slug: string }> =
			existsSync(fp) ? (JSON.parse(readFileSync(fp, 'utf8')) as { posts: unknown[] }).posts as typeof existing : [];

		const existingQids = new Set(existing.map(v => v.wikidata_id).filter(Boolean));
		const existingKaNames = new Set(existing.map(v => v.i18n?.ka?.title).filter(Boolean));

		const newVillages = [...existing];
		let addedHere = 0;

		for (const v of wdVillages) {
			if (existingQids.has(v.itemQid)) continue;
			if (v.kaLabel && existingKaNames.has(v.kaLabel)) continue;

			const kaName = v.kaLabel ?? '';
			const enName = v.enLabel ?? geoToSlug(kaName).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
			const ruName = v.ruLabel ?? enName;
			const slug = uniqueSlug(geoToSlug(kaName || enName));
			const wikiUrl = kaName ? `https://ka.wikipedia.org/wiki/${encodeURIComponent(kaName)}` : null;
			const enExcerpt = `${enName} is a village in ${muniEnName} municipality, ${regionName}, Georgia.`;
			const kaExcerpt = kaName ? `${kaName} — სოფელი ${muniKaName}ის მუნიციპალიტეტში.` : enExcerpt;

			newVillages.push({
				id: randomUUID(),
				slug,
				level: 'village',
				parent_id: dbMuni.id,
				image: null, gallery: [], location: v.lat && v.lon ? { lat: v.lat, lon: v.lon } : null,
				population: null, area_km2: null, elevation_m: null,
				admin_center_name: null, iso_3166_2: null, official_code: null,
				official_website: null, wikipedia_url: wikiUrl, wikidata_id: v.itemQid, geonames_id: null,
				settlement_type: 'village',
				i18n: {
					en: { title: enName, subtitle: `Village · ${muniEnName} municipality · ${regionName}`, excerpt: enExcerpt, seo_title: `${enName} village — ${muniEnName}, ${regionName} | Travel Georgia`, seo_description: enExcerpt.slice(0, 155), body: `## About ${enName}\n\n${enExcerpt}\n\n## Location\n\n${enName} is situated in **${muniEnName} municipality**, ${regionName} region of Georgia.` },
					ka: { title: kaName || enName, subtitle: `სოფელი · ${muniKaName}ის მუნიციპალიტეტი`, excerpt: kaExcerpt, seo_title: `${kaName || enName} — სოფელი | ${muniKaName}ის მუნიციპალიტეტი`, seo_description: kaExcerpt.slice(0, 155), body: `## ${kaName || enName}\n\n${kaExcerpt}` },
					ru: { title: ruName, subtitle: `Cело · муниципалитет ${muniEnName} · ${regionName}`, excerpt: `${ruName} — село в муниципалитете ${muniEnName}, ${regionName}, Грузия.`, seo_title: `${ruName} — село · ${muniEnName} | Грузия`, seo_description: `${ruName} — село в муниципалитете ${muniEnName}.`, body: `## ${ruName}\n\n${ruName} — **муниципалитет ${muniEnName}**, ${regionName}, Грузия.` },
				},
				updated_at: Date.now(),
			});
			addedHere++;
			totalAdded++;
		}

		if (addedHere > 0) {
			mkdirSync(REGIONS_DIR, { recursive: true });
			writeFileSync(fp, JSON.stringify({ posts: newVillages }, null, '\t') + '\n', 'utf8');
			muniProcessed++;
		}
	}

	return new Response(JSON.stringify({
		ok: true,
		total_added: totalAdded,
		municipalities_updated: muniProcessed,
		wikidata_records: wikidataRows.length,
		message: totalAdded > 0
			? `Successfully imported ${totalAdded} new villages across ${muniProcessed} municipalities.`
			: wikidataRows.length === 0
			? 'Could not reach Wikidata SPARQL endpoint. Please try again.'
			: 'All villages already imported — nothing new to add.',
	}), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
