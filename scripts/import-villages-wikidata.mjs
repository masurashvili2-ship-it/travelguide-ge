/**
 * import-villages-wikidata.mjs
 *
 * Fetches ALL Georgian villages from the Wikidata SPARQL endpoint in one query,
 * then writes them to data/regions/{municipality_id}.json.
 *
 * This is the preferred approach for municipalities that weren't imported by
 * the Wikipedia-API-based script due to rate limiting.
 *
 * Run:  node scripts/import-villages-wikidata.mjs
 *   or  node scripts/import-villages-wikidata.mjs --dry-run
 *   or  node scripts/import-villages-wikidata.mjs --missing-only
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DATA_DIR =
  process.env.DATA_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/workspace/data'
    : path.join(ROOT, 'data'));
const REGIONS_DIR = path.join(DATA_DIR, 'regions');
const REGIONS_INDEX = path.join(REGIONS_DIR, 'index.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const missingOnly = args.includes('--missing-only');

// ── Georgian → Latin transliteration ─────────────────────────────────────────
const GEO_TO_LAT = {
  'ა':'a', 'ბ':'b', 'გ':'g', 'დ':'d', 'ე':'e', 'ვ':'v', 'ზ':'z',
  'თ':'t', 'ი':'i', 'კ':'k', 'ლ':'l', 'მ':'m', 'ნ':'n', 'ო':'o',
  'პ':'p', 'ჟ':'zh','რ':'r', 'ს':'s', 'ტ':'t', 'უ':'u', 'ფ':'f',
  'ქ':'k', 'ღ':'gh','ყ':'k', 'შ':'sh','ჩ':'ch','ც':'ts','ძ':'dz',
  'წ':'ts','ჭ':'ch','ხ':'kh','ჯ':'j', 'ჰ':'h',
};

function geoToSlug(kaName) {
  return kaName
    .split('').map(c => GEO_TO_LAT[c] ?? (c === ' ' || c === '-' ? '-' : ''))
    .join('')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80);
}

const usedSlugs = new Set();
function uniqueSlug(base) {
  let slug = base, n = 2;
  while (usedSlugs.has(slug)) { slug = `${base}-${n}`; n++; }
  usedSlugs.add(slug);
  return slug;
}

// ── Wikidata SPARQL query ─────────────────────────────────────────────────────
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

// Georgian municipality Wikidata IDs → site slugs
// QIDs verified from Wikidata SPARQL results
const MUNI_WIKIDATA = {
  // Adjara
  'Q25475':     'batumi',         // Batumi (city treated as municipality)
  'Q175786':    'khelvachauri',   'Q660888':    'shuakhevi',
  'Q1252978':   'khulo',
  // Guria
  'Q510761':    'ozurgeti',       'Q2380601':   'lanchkhuti',
  'Q2466860':   'chokhatauri',
  // Imereti
  'Q2018619':   'baghdati',       'Q893220':    'vani',
  'Q2464187':   'zestafoni',      'Q2374974':   'terjola',
  'Q2142574':   'samtredia',      'Q893325':    'sachkhere',
  'Q2212773':   'tkibuli',        'Q1892810':   'tskaltubo',
  'Q269506':    'chiatura',       'Q2513642':   'kharagauli',
  // Kakheti
  'Q1953364':   'telavi',         'Q748753':    'akhmeta',
  'Q1560942':   'gurjaani',       'Q1490703':   'dedoplistsqaro',
  'Q941140':    'lagodekhi',      'Q1953363':   'signagi',
  'Q1647344':   'sagarejo',       'Q1789499':   'kvareli',
  // Kvemo Kartli
  'Q2513580':   'bolnisi',        'Q681371':    'dmanisi',
  'Q2512996':   'gardabani',      'Q2410306':   'marneuli',
  'Q1954407':   'tetritskaro',    'Q2238147':   'tsalka',
  // Mtskheta-Mtianeti
  'Q2266679':   'mtskheta',       'Q2474310':   'dusheti',
  'Q2586447':   'tianeti',        'Q2475628':   'kazbegi',
  // Racha-Lechkhumi
  'Q2464159':   'ambrolauri',     'Q893287':    'oni',
  'Q2464174':   'lentekhi',       'Q2489909':   'tsageri',
  // Samegrelo-Zemo Svaneti
  'Q2176973':   'zugdidi',        'Q2513666':   'abasha',
  'Q2327517':   'chkhorotsku',    'Q2475606':   'tsalenjikha',
  'Q2490876':   'senaki',         'Q2511190':   'martvili',
  'Q2490962':   'mestia',
  // Samtskhe-Javakheti
  'Q2513568':   'akhaltsikhe',    'Q2382197':   'adigeni',
  'Q2305733':   'aspindza',       'Q2475809':   'borjomi',
  'Q1851196':   'akhalkalaki',    'Q1025123':   'ninotsminda',
  // Shida Kartli
  'Q1417170':   'gori',           'Q1518087':   'kaspi',
  'Q1756629':   'kareli',         'Q1790675':   'khashuri',
};

async function runSparql(sparql) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'TravelGeorgiaBot/1.0 (admin@travelgeorgia.ge)',
      'Accept': 'application/sparql-results+json',
    }
  });
  if (!res.ok) throw new Error(`SPARQL HTTP ${res.status}`);
  return res.json();
}

// ── Load DB ───────────────────────────────────────────────────────────────────
function loadIndex() {
  if (!existsSync(REGIONS_INDEX)) {
    console.error('❌ Regions index not found:', REGIONS_INDEX);
    process.exit(1);
  }
  return JSON.parse(readFileSync(REGIONS_INDEX, 'utf8')).posts ?? [];
}

function loadExistingVillages(muniId) {
  const fp = path.join(REGIONS_DIR, `${muniId}.json`);
  if (!existsSync(fp)) return [];
  try { return JSON.parse(readFileSync(fp, 'utf8')).posts ?? []; } catch { return []; }
}

function writeVillages(muniId, villages) {
  mkdirSync(REGIONS_DIR, { recursive: true });
  writeFileSync(
    path.join(REGIONS_DIR, `${muniId}.json`),
    JSON.stringify({ posts: villages }, null, '\t') + '\n', 'utf8'
  );
}

// ── Build village post ────────────────────────────────────────────────────────
function makeVillage({ kaName, enName, ruName, muniSlug, muniEnName, muniKaName, regionName, parentId, lat, lon, wikidataId, wikiUrl }) {
  const displayKa = kaName ?? '';
  const displayEn = enName ?? geoToSlug(displayKa).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const displayRu = ruName ?? displayEn;
  const slug = uniqueSlug(geoToSlug(displayKa || displayEn));

  const enExcerpt = `${displayEn} is a village in ${muniEnName} municipality, ${regionName}, Georgia.`;
  const kaExcerpt = displayKa
    ? `${displayKa} — სოფელი ${muniKaName}ის მუნიციპალიტეტში.`
    : enExcerpt;
  const ruExcerpt = `${displayEn} — село в муниципалитете ${muniEnName}, ${regionName}, Грузия.`;

  return {
    id: randomUUID(),
    slug,
    level: 'village',
    parent_id: parentId,
    image: null,
    gallery: [],
    location: lat && lon ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null,
    population: null,
    area_km2: null,
    elevation_m: null,
    admin_center_name: null,
    iso_3166_2: null,
    official_code: null,
    official_website: null,
    wikipedia_url: wikiUrl ?? null,
    wikidata_id: wikidataId ?? null,
    geonames_id: null,
    settlement_type: 'village',
    i18n: {
      en: {
        title: displayEn,
        subtitle: `Village · ${muniEnName} municipality · ${regionName}`,
        excerpt: enExcerpt,
        seo_title: `${displayEn} village — ${muniEnName}, ${regionName} | Travel Georgia`,
        seo_description: enExcerpt.slice(0, 155),
        body: `## About ${displayEn}\n\n${enExcerpt}\n\n## Location\n\n${displayEn} is situated in **${muniEnName} municipality**, ${regionName} region of Georgia.${wikidataId ? `\n\n## Links\n\n- [Wikidata](https://www.wikidata.org/wiki/${wikidataId})` : ''}${wikiUrl ? `\n- [Wikipedia (Georgian)](${wikiUrl})` : ''}`,
      },
      ka: {
        title: displayKa || displayEn,
        subtitle: `სოფელი · ${muniKaName}ის მუნიციპალიტეტი`,
        excerpt: kaExcerpt,
        seo_title: `${displayKa || displayEn} — სოფელი | ${muniKaName}ის მუნიციპალიტეტი`,
        seo_description: kaExcerpt.slice(0, 155),
        body: `## ${displayKa || displayEn}\n\n${kaExcerpt}\n\n## მდებარეობა\n\n${displayKa || displayEn} განლაგებულია **${muniKaName}ის მუნიციპალიტეტში**.`,
      },
      ru: {
        title: displayRu,
        subtitle: `Cело · муниципалитет ${muniEnName} · ${regionName}`,
        excerpt: ruExcerpt,
        seo_title: `${displayRu} — село · ${muniEnName}, ${regionName} | Грузия`,
        seo_description: ruExcerpt.slice(0, 155),
        body: `## ${displayRu}\n\n${ruExcerpt}\n\n## Расположение\n\n${displayRu} — **муниципалитет ${muniEnName}**, ${regionName}, Грузия.`,
      },
    },
    updated_at: Date.now(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🗺  Georgian villages import — Wikidata SPARQL');
  console.log(`   DATA_DIR: ${DATA_DIR}`);
  console.log(`   Dry run: ${dryRun}`);
  console.log(`   Missing only: ${missingOnly}\n`);

  const indexPosts = loadIndex();
  const muniById = new Map(
    indexPosts.filter(p => p.level === 'municipality').map(p => [p.id, p])
  );
  const muniBySlug = new Map(
    indexPosts.filter(p => p.level === 'municipality').map(p => [p.slug, p])
  );

  // Pre-fill used slugs from existing villages
  for (const m of muniBySlug.values()) {
    const existing = loadExistingVillages(m.id);
    for (const v of existing) usedSlugs.add(v.slug);
  }

  // Build municipality ID → slug lookup via Wikidata IDs
  // We need to match Wikidata muni QIDs to our DB slugs
  const wikidataToMuniSlug = MUNI_WIKIDATA;

  // Determine which municipalities to process
  const targetSlugs = new Set(Object.values(wikidataToMuniSlug));
  if (missingOnly) {
    for (const [qid, slug] of Object.entries(wikidataToMuniSlug)) {
      const m = muniBySlug.get(slug);
      if (!m) continue;
      const existing = loadExistingVillages(m.id);
      if (existing.length > 0) {
        targetSlugs.delete(slug);
      }
    }
    console.log(`⚡  Processing ${targetSlugs.size} municipalities with 0 villages\n`);
  }

  // Query ALL Georgian villages + settlements in one call
  // Use P131* (direct or parent) to find villages under any Georgian municipality
  console.log('📡  Querying Wikidata SPARQL for ALL Georgian villages...');
  console.log('    Using direct country=Georgia filter (Q230)\n');

  const sparql = `
SELECT DISTINCT ?item ?kaLabel ?enLabel ?ruLabel ?coord ?muni WHERE {
  ?item wdt:P17 wd:Q230 .
  { ?item wdt:P31 wd:Q532 }
  UNION { ?item wdt:P31 wd:Q5084 }
  UNION { ?item wdt:P31 wd:Q1115575 }
  UNION { ?item wdt:P31 wd:Q3957 }
  ?item wdt:P131 ?muni .
  OPTIONAL { ?item wdt:P625 ?coord. }
  OPTIONAL { ?item rdfs:label ?kaLabel . FILTER(LANG(?kaLabel)="ka") }
  OPTIONAL { ?item rdfs:label ?enLabel . FILTER(LANG(?enLabel)="en") }
  OPTIONAL { ?item rdfs:label ?ruLabel . FILTER(LANG(?ruLabel)="ru") }
}
LIMIT 5000`;

  let villages = [];
  try {
    const data = await runSparql(sparql);
    villages = data.results?.bindings ?? [];
    console.log(`   Got ${villages.length} village records from Wikidata\n`);
  } catch (err) {
    console.error('❌  SPARQL query failed:', err.message);
    // Fallback: try smaller query
    console.log('   Trying fallback query (villages only, no union)...');
    try {
      const fallbackSparql = `
SELECT DISTINCT ?item ?kaLabel ?enLabel ?ruLabel ?coord ?muni WHERE {
  ?item wdt:P17 wd:Q230 .
  ?item wdt:P31 wd:Q532 .
  ?item wdt:P131 ?muni .
  OPTIONAL { ?item wdt:P625 ?coord. }
  OPTIONAL { ?item rdfs:label ?kaLabel . FILTER(LANG(?kaLabel)="ka") }
  OPTIONAL { ?item rdfs:label ?enLabel . FILTER(LANG(?enLabel)="en") }
  OPTIONAL { ?item rdfs:label ?ruLabel . FILTER(LANG(?ruLabel)="ru") }
}`;
      const data2 = await runSparql(fallbackSparql);
      villages = data2.results?.bindings ?? [];
      console.log(`   Got ${villages.length} village records (fallback)\n`);
    } catch (err2) {
      console.error('❌  Fallback also failed:', err2.message);
      process.exit(1);
    }
  }

  // Build a lookup: muni Wikidata QID → array of villages
  // Also do a reverse lookup from the query results to find parent municipality chain

  // Group by municipality
  const byMuni = new Map();
  for (const row of villages) {
    const itemQid = row.item?.value?.replace('http://www.wikidata.org/entity/', '') ?? null;
    const muniQid = row.muni?.value?.replace('http://www.wikidata.org/entity/', '') ?? null;
    if (!muniQid || !itemQid) continue;

    const kaLabel = row.kaLabel?.value ?? null;
    const enLabel = row.enLabel?.value ?? null;
    const ruLabel = row.ruLabel?.value ?? null;

    // Parse coordinates
    let lat = null, lon = null;
    if (row.coord?.value) {
      const m = row.coord.value.match(/Point\(([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\)/);
      if (m) { lon = parseFloat(m[1]); lat = parseFloat(m[2]); }
    }

    if (!byMuni.has(muniQid)) byMuni.set(muniQid, []);
    byMuni.get(muniQid).push({ itemQid, kaLabel, enLabel, ruLabel, lat, lon });
  }

  // Walk through municipalities and build villages
  let totalAdded = 0;
  let totalSkipped = 0;
  let muniProcessed = 0;

  // Walk Wikidata muni QIDs
  for (const [muniQid, dbSlug] of Object.entries(wikidataToMuniSlug)) {
    if (!targetSlugs.has(dbSlug)) continue;

    const dbMuni = muniBySlug.get(dbSlug);
    if (!dbMuni) {
      console.warn(`⚠️  Municipality ${dbSlug} not found in DB index`);
      continue;
    }

    const muniEnName = dbMuni.i18n?.en?.title ?? dbSlug;
    const muniKaName = dbMuni.i18n?.ka?.title ?? dbSlug;
    const regionName = dbMuni.i18n?.en?.subtitle?.split('·')[0]?.trim() ?? 'Georgia';

    const wikidataVillages = byMuni.get(muniQid) ?? [];
    const existing = loadExistingVillages(dbMuni.id);
    const existingQids = new Set(existing.map(v => v.wikidata_id).filter(Boolean));
    const existingKaNames = new Set(existing.map(v => v.i18n?.ka?.title).filter(Boolean));

    console.log(`🏘  ${muniEnName} (${dbSlug}) — Wikidata muni ${muniQid}`);
    console.log(`    Wikidata villages: ${wikidataVillages.length} | Existing in DB: ${existing.length}`);

    if (wikidataVillages.length === 0) {
      console.log(`    ⚠️  No villages in Wikidata for this municipality`);
      continue;
    }

    const newVillages = [...existing];
    let addedCount = 0;

    for (const v of wikidataVillages) {
      // Skip if already in DB (by Wikidata ID or Georgian name)
      if (existingQids.has(v.itemQid)) { totalSkipped++; continue; }
      if (v.kaLabel && existingKaNames.has(v.kaLabel)) { totalSkipped++; continue; }

      const post = makeVillage({
        kaName: v.kaLabel,
        enName: v.enLabel,
        ruName: v.ruLabel,
        muniSlug: dbSlug,
        muniEnName,
        muniKaName,
        regionName,
        parentId: dbMuni.id,
        lat: v.lat,
        lon: v.lon,
        wikidataId: v.itemQid,
        wikiUrl: v.kaLabel ? `https://ka.wikipedia.org/wiki/${encodeURIComponent(v.kaLabel)}` : null,
      });

      newVillages.push(post);
      addedCount++;
      totalAdded++;
    }

    console.log(`    ✅  Added ${addedCount} new villages`);

    if (!dryRun && addedCount > 0) {
      writeVillages(dbMuni.id, newVillages);
    }

    muniProcessed++;
  }

  console.log(`\n✅  Done!`);
  console.log(`   Municipalities processed: ${muniProcessed}`);
  console.log(`   Total added: ${totalAdded}`);
  console.log(`   Total skipped (already in DB): ${totalSkipped}`);
  if (dryRun) console.log('\n⚠️  DRY RUN — no files written');
}

main().catch(err => {
  console.error('\n❌  Fatal:', err);
  process.exit(1);
});
