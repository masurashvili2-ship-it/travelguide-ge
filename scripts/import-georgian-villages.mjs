/**
 * import-georgian-villages.mjs
 *
 * Fetches village lists from the Georgian Wikipedia for every municipality
 * and writes them into data/regions/{municipality_id}.json.
 *
 * Run:  node scripts/import-georgian-villages.mjs
 *   or  node scripts/import-georgian-villages.mjs --only kakheti,imereti
 *   or  node scripts/import-georgian-villages.mjs --only sighnaghi
 *   or  node scripts/import-georgian-villages.mjs --dry-run
 *
 * Options:
 *   --only <slugs>   Comma-separated municipality or region slugs to process
 *   --dry-run        Print what would be written without touching the FS
 *   --no-wiki-detail Skip per-village Wikipedia summary fetch (faster)
 *   --delay <ms>     Pause between API requests (default 120ms)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Resolve DATA_DIR (same logic as data-dir.ts) ──────────────────────────────
const DATA_DIR =
  process.env.DATA_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/workspace/data'
    : path.join(ROOT, 'data'));
const REGIONS_DIR = path.join(DATA_DIR, 'regions');
const REGIONS_INDEX = path.join(REGIONS_DIR, 'index.json');

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const onlyFlag = args.includes('--only')
  ? args[args.indexOf('--only') + 1]?.split(',').map(s => s.trim().toLowerCase())
  : null;
const missingOnly = args.includes('--missing-only');
const dryRun = args.includes('--dry-run');
const noDetail = args.includes('--no-wiki-detail');
const delayMs = args.includes('--delay')
  ? parseInt(args[args.indexOf('--delay') + 1], 10) || 400
  : 400;

// ── Georgian → Latin transliteration for slugs ───────────────────────────────
// National system (BGN/PCGN) transliteration
const GEO_TO_LAT = {
  'ა':'a', 'ბ':'b', 'გ':'g',  'დ':'d',  'ე':'e',  'ვ':'v',  'ზ':'z',
  'თ':'t', 'ი':'i', 'კ':'k',  'ლ':'l',  'მ':'m',  'ნ':'n',  'ო':'o',
  'პ':'p', 'ჟ':'zh','რ':'r',  'ს':'s',  'ტ':'t',  'უ':'u',  'ფ':'p',
  'ქ':'k', 'ღ':'gh','ყ':'k',  'შ':'sh', 'ჩ':'ch', 'ც':'ts', 'ძ':'dz',
  'წ':'ts','ჭ':'ch','ხ':'kh', 'ჯ':'j',  'ჰ':'h',  'ფ':'f',
};

function geoToSlug(kaName) {
  return kaName
    .split('')
    .map(c => GEO_TO_LAT[c] ?? (c === ' ' || c === '-' ? '-' : ''))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80);
}

// ── Municipality master list: [slug, kaWikiPage, regionName] ─────────────────
// kaWikiPage = Georgian Wikipedia "სოფლების სია" page title
const MUNICIPALITIES = [
  // Adjara
  // Adjara
  ['batumi',         'ბათუმის მუნიციპალიტეტის სოფლების სია',           'Adjara'],
  ['kobuleti',       'ქობულეთის მუნიციპალიტეტის სოფლების სია',          'Adjara'],
  ['khelvachauri',   'ხელვაჩაურის მუნიციპალიტეტის სოფლების სია',        'Adjara'],
  ['keda',           'ქედის მუნიციპალიტეტის სოფლების სია',               'Adjara'],
  ['shuakhevi',      'შუახევის მუნიციპალიტეტის სოფლების სია',            'Adjara'],
  ['khulo',          'ხულოს მუნიციპალიტეტის სოფლების სია',               'Adjara'],
  // Guria
  ['ozurgeti',       'ოზურგეთის მუნიციპალიტეტის სოფლების სია',          'Guria'],
  ['lanchkhuti',     'ლანჩხუთის მუნიციპალიტეტის სოფლების სია',          'Guria'],
  ['chokhatauri',    'ჩოხატაურის მუნიციპალიტეტის სოფლების სია',         'Guria'],
  // Imereti
  ['kutaisi',        'ქუთაისის მუნიციპალიტეტის სოფლების სია',           'Imereti'],
  ['baghdati',       'ბაღდათის მუნიციპალიტეტის სოფლების სია',           'Imereti'],
  ['vani',           'ვანის მუნიციპალიტეტის სოფლების სია',               'Imereti'],
  ['zestafoni',      'ზესტაფონის მუნიციპალიტეტის სოფლების სია',         'Imereti'],
  ['terjola',        'თერჯოლის მუნიციპალიტეტის სოფლების სია',           'Imereti'],
  ['samtredia',      'სამტრედიის მუნიციპალიტეტის სოფლების სია',         'Imereti'],
  ['sachkhere',      'საჩხერის მუნიციპალიტეტის სოფლების სია',           'Imereti'],
  ['tkibuli',        'ტყიბულის მუნიციპალიტეტის სოფლების სია',           'Imereti'],
  ['tskaltubo',      'წყალტუბოს მუნიციპალიტეტის სოფლების სია',          'Imereti'],
  ['chiatura',       'ჭიათურის მუნიციპალიტეტის სოფლების სია',           'Imereti'],
  ['kharagauli',     'ხარაგაულის მუნიციპალიტეტის სოფლების სია',         'Imereti'],
  ['khoni',          'ხონის მუნიციპალიტეტის სოფლების სია',               'Imereti'],
  // Kakheti
  ['telavi',         'თელავის მუნიციპალიტეტის სოფლების სია',            'Kakheti'],
  ['akhmeta',        'ახმეტის მუნიციპალიტეტის სოფლების სია',            'Kakheti'],
  ['gurjaani',       'გურჯაანის მუნიციპალიტეტის სოფლების სია',          'Kakheti'],
  ['dedoplistsqaro', 'დედოფლისწყაროს მუნიციპალიტეტის სოფლების სია',    'Kakheti'],
  ['lagodekhi',      'ლაგოდეხის მუნიციპალიტეტის სოფლების სია',          'Kakheti'],
  ['signagi',        'სიღნაღის მუნიციპალიტეტის სოფლების სია',           'Kakheti'],
  ['sagarejo',       'საგარეჯოს მუნიციპალიტეტის სოფლების სია',          'Kakheti'],
  ['kvareli',        'ყვარლის მუნიციპალიტეტის სოფლების სია',            'Kakheti'],
  // Kvemo Kartli
  ['bolnisi',        'ბოლნისის მუნიციპალიტეტის სოფლების სია',           'Kvemo Kartli'],
  ['dmanisi',        'დმანისის მუნიციპალიტეტის სოფლების სია',           'Kvemo Kartli'],
  ['gardabani',      'გარდაბნის მუნიციპალიტეტის სოფლების სია',          'Kvemo Kartli'],
  ['marneuli',       'მარნეულის მუნიციპალიტეტის სოფლების სია',          'Kvemo Kartli'],
  ['tetritskaro',    'თეთრიწყაროს მუნიციპალიტეტის სოფლების სია',       'Kvemo Kartli'],
  ['tsalka',         'წალკის მუნიციპალიტეტის სოფლების სია',             'Kvemo Kartli'],
  // Mtskheta-Mtianeti
  ['mtskheta',       'მცხეთის მუნიციპალიტეტის სოფლების სია',           'Mtskheta-Mtianeti'],
  ['dusheti',        'დუშეთის მუნიციპალიტეტის სოფლების სია',           'Mtskheta-Mtianeti'],
  ['tianeti',        'თიანეთის მუნიციპალიტეტის სოფლების სია',          'Mtskheta-Mtianeti'],
  ['kazbegi',        'ყაზბეგის მუნიციპალიტეტის სოფლების სია',          'Mtskheta-Mtianeti'],
  // Racha-Lechkhumi
  ['ambrolauri',     'ამბროლაურის მუნიციპალიტეტის სოფლების სია',       'Racha-Lechkhumi and Kvemo Svaneti'],
  ['oni',            'ონის მუნიციპალიტეტის სოფლების სია',               'Racha-Lechkhumi and Kvemo Svaneti'],
  ['lentekhi',       'ლენტეხის მუნიციპალიტეტის სოფლების სია',          'Racha-Lechkhumi and Kvemo Svaneti'],
  ['tsageri',        'ცაგერის მუნიციპალიტეტის სოფლების სია',           'Racha-Lechkhumi and Kvemo Svaneti'],
  // Samegrelo-Zemo Svaneti
  ['zugdidi',        'ზუგდიდის მუნიციპალიტეტის სოფლების სია',          'Samegrelo-Zemo Svaneti'],
  ['abasha',         'აბაშის მუნიციპალიტეტის სოფლების სია',             'Samegrelo-Zemo Svaneti'],
  ['chkhorotsku',    'ჩხოროწყუს მუნიციპალიტეტის სოფლების სია',         'Samegrelo-Zemo Svaneti'],
  ['tsalenjikha',    'წალენჯიხის მუნიციპალიტეტის სოფლების სია',        'Samegrelo-Zemo Svaneti'],
  ['khobi',          'ხობის მუნიციპალიტეტის სოფლების სია',              'Samegrelo-Zemo Svaneti'],
  ['senaki',         'სენაკის მუნიციპალიტეტის სოფლების სია',            'Samegrelo-Zemo Svaneti'],
  ['martvili',       'მარტვილის მუნიციპალიტეტის სოფლების სია',          'Samegrelo-Zemo Svaneti'],
  ['mestia',         'მესტიის მუნიციპალიტეტის სოფლების სია',            'Samegrelo-Zemo Svaneti'],
  // Samtskhe-Javakheti
  ['akhaltsikhe',    'ახალციხის მუნიციპალიტეტის სოფლების სია',         'Samtskhe-Javakheti'],
  ['adigeni',        'ადიგენის მუნიციპალიტეტის სოფლების სია',           'Samtskhe-Javakheti'],
  ['aspindza',       'ასპინძის მუნიციპალიტეტის სოფლების სია',           'Samtskhe-Javakheti'],
  ['borjomi',        'ბორჯომის მუნიციპალიტეტის სოფლების სია',           'Samtskhe-Javakheti'],
  ['akhalkalaki',    'ახალქალაქის მუნიციპალიტეტის სოფლების სია',        'Samtskhe-Javakheti'],
  ['ninotsminda',    'ნინოწმინდის მუნიციპალიტეტის სოფლების სია',       'Samtskhe-Javakheti'],
  // Shida Kartli
  ['gori',           'გორის მუნიციპალიტეტის სოფლების სია',              'Shida Kartli'],
  ['kaspi',          'კასპის მუნიციპალიტეტის სოფლების სია',             'Shida Kartli'],
  ['kareli',         'ქარელის მუნიციპალიტეტის სოფლების სია',            'Shida Kartli'],
  ['khashuri',       'ხაშურის მუნიციპალიტეტის სოფლების სია',            'Shida Kartli'],
];

// ── Wikipedia API helpers ─────────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const WIKI_HEADERS = { 'User-Agent': 'TravelGeorgiaBot/1.0 (contact: admin@travelgeorgia.ge)' };

/** Fetch with retry on rate-limit (HTTP 429 or plain-text "too many requests") */
async function wikiApiFetch(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: WIKI_HEADERS });
      const text = await res.text();
      // Wikipedia rate limit returns plain text, not JSON
      if (text.includes('You are making too many requests') || text.includes('rate limited')) {
        const backoff = delayMs * 5 * attempt;
        console.warn(`    ⏳  Rate limited — waiting ${backoff}ms (attempt ${attempt})`);
        await sleep(backoff);
        continue;
      }
      try {
        return JSON.parse(text);
      } catch {
        if (attempt < retries) { await sleep(delayMs * 2 * attempt); continue; }
        return null;
      }
    } catch (err) {
      if (attempt < retries) { await sleep(delayMs * 2 * attempt); continue; }
      return null;
    }
  }
  return null;
}

/** Fetch all wikilinks from a ka.wikipedia.org page via wikitext parsing */
async function wikiLinks(kaTitle) {
  const url = new URL('https://ka.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'parse');
  url.searchParams.set('page', kaTitle);
  url.searchParams.set('prop', 'wikitext');
  url.searchParams.set('format', 'json');
  const data = await wikiApiFetch(url.toString());
  if (!data || data.error) return [];
  const wikitext = data.parse?.wikitext?.['*'] ?? '';
  // Extract all [[Link]] and [[Link|Display]] wikilinks
  const links = [...wikitext.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/g)]
    .map(m => m[1].trim());
  // Deduplicate
  return [...new Set(links)];
}

async function wikiSummary(kaTitle) {
  if (noDetail) return null;
  const encoded = encodeURIComponent(kaTitle);
  try {
    const res = await fetch(
      `https://ka.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { headers: WIKI_HEADERS }
    );
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes('too many requests') || text.includes('rate limited')) {
      await sleep(delayMs * 5);
      return null;
    }
    const data = JSON.parse(text);
    if (data.type?.includes('not_found')) return null;
    return data;
  } catch {
    return null;
  }
}

/** Get the English Wikipedia title for a Georgian Wikipedia article via langlinks */
async function getEnTitleFromLanglinks(kaTitle) {
  if (noDetail) return null;
  const url = new URL('https://ka.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', kaTitle);
  url.searchParams.set('prop', 'langlinks');
  url.searchParams.set('lllang', 'en');
  url.searchParams.set('format', 'json');
  const data = await wikiApiFetch(url.toString());
  if (!data) return null;
  const pages = Object.values(data.query?.pages ?? {});
  const ll = pages[0]?.langlinks;
  if (!ll?.length) return null;
  return ll[0]['*'] ?? null;
}

async function wikiEnSummary(enTitle) {
  if (noDetail || !enTitle) return null;
  const encoded = encodeURIComponent(enTitle);
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { headers: WIKI_HEADERS }
    );
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes('too many requests')) { await sleep(delayMs * 5); return null; }
    const data = JSON.parse(text);
    if (data.type?.includes('not_found')) return null;
    return data;
  } catch {
    return null;
  }
}

// Words that indicate it's not a village
const NOT_VILLAGE_WORDS = [
  'კატეგო', 'მუნიციპალიტეტი', 'მუნიციპალიტეტის სოფ', 'მხარე', 'მხარის',
  'ფაილი:', 'სია ', 'სიების', 'რაიო', 'ქალაქი', 'ქალაქ ', 'Template',
  'Wikipedia', 'საქართველო', 'თბილისი', 'კახეთი', 'იმერეთი', 'გურია',
  'სამეგრელო', 'სამცხე', 'ჯავახეთი', 'ქართლი', 'ადჟარა', 'აჭარა',
  'სვანეთი', 'ლეჩხუმი', 'რაჭა', 'კოდი', 'წყარო',
];

function isVillageName(title) {
  if (!title || title.length < 2) return false;
  for (const w of NOT_VILLAGE_WORDS) {
    if (title.includes(w)) return false;
  }
  const hasGeorgian = /[\u10D0-\u10FF]/.test(title);
  return hasGeorgian;
}

/** Clean display name: strip disambiguation "(Municipality name)" */
function cleanKaName(rawTitle) {
  return rawTitle.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

// ── Slug deduplication ────────────────────────────────────────────────────────
const usedSlugs = new Set();

function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  usedSlugs.add(slug);
  return slug;
}

// ── Build a RegionPost for a village ─────────────────────────────────────────
function makeVillagePost({ kaName, wikiTitle, muniSlug, muniKaName, muniEnName, regionName, parentId, wikiData, enData }) {
  const slug = uniqueSlug(geoToSlug(kaName));
  const wikiUrl = `https://ka.wikipedia.org/wiki/${encodeURIComponent(wikiTitle ?? kaName)}`;

  // English name: prefer en.wikipedia title, else transliteration (never use Georgian script for EN)
  const rawEnTitle = enData?.title;
  const translitName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const enName = (rawEnTitle && !/[\u10D0-\u10FF]/.test(rawEnTitle)) ? rawEnTitle : translitName;

  // Excerpt: Wikipedia extract if available, otherwise a sensible template
  const enExcerpt = enData?.extract
    ? enData.extract.slice(0, 180).trim()
    : `${enName} is a village in ${muniEnName} municipality, ${regionName}, Georgia.`;

  const kaExcerpt = wikiData?.extract
    ? wikiData.extract.slice(0, 180).trim()
    : `${kaName} — სოფელი ${muniKaName}ის მუნიციპალიტეტში, ${regionName === 'Kakheti' ? 'კახეთი' : regionName}.`;

  const ruExcerpt = `${enName} — село в муниципалитете ${muniEnName}, ${regionName}, Грузия.`;

  // Coordinates
  const lat = wikiData?.coordinates?.lat ?? enData?.coordinates?.lat ?? null;
  const lon = wikiData?.coordinates?.lon ?? enData?.coordinates?.lon ?? null;
  const location = lat && lon ? { lat, lon } : null;

  // Elevation
  const elevation = wikiData?.content_urls ? null : null; // not available in summary API

  return {
    id: randomUUID(),
    slug,
    level: 'village',
    parent_id: parentId,
    image: null,
    gallery: [],
    location,
    population: null,
    area_km2: null,
    elevation_m: null,
    admin_center_name: null,
    iso_3166_2: null,
    official_code: null,
    official_website: null,
    wikipedia_url: wikiUrl,
    wikidata_id: wikiData?.wikibase_item ?? null,
    geonames_id: null,
    settlement_type: 'village',
    i18n: {
      en: {
        title: enName,
        subtitle: `Village · ${muniEnName} municipality · ${regionName}`,
        excerpt: enExcerpt,
        seo_title: `${enName} village — ${muniEnName}, ${regionName} | Travel Georgia`,
        seo_description: `${enExcerpt.slice(0, 155)}`,
        body: buildEnBody(enName, muniEnName, regionName, enData?.extract ?? null, wikiUrl),
      },
      ka: {
        title: kaName,
        subtitle: `სოფელი · ${muniKaName}ის მუნიციპალიტეტი`,
        excerpt: kaExcerpt,
        seo_title: `${kaName} — სოფელი | ${muniKaName}ის მუნიციპალიტეტი`,
        seo_description: kaExcerpt.slice(0, 155),
        body: buildKaBody(kaName, muniKaName, wikiUrl),
      },
      ru: {
        title: enName,
        subtitle: `Cело · муниципалитет ${muniEnName} · ${regionName}`,
        excerpt: ruExcerpt,
        seo_title: `${enName} — село · ${muniEnName}, ${regionName} | Грузия`,
        seo_description: ruExcerpt.slice(0, 155),
        body: buildRuBody(enName, muniEnName, regionName, wikiUrl),
      },
    },
    updated_at: Date.now(),
  };
}

function buildEnBody(enName, muniEnName, regionName, extract, wikiUrl) {
  const intro = extract
    ? extract.slice(0, 400).trim()
    : `${enName} is a village located in ${muniEnName} municipality in the ${regionName} region of Georgia.`;

  return `## About ${enName}\n\n${intro}\n\n## Location\n\n${enName} is situated in **${muniEnName} municipality**, which is part of the **${regionName}** administrative region of Georgia. The village is part of Georgia's rich tapestry of rural settlements, each with its own character and connection to the surrounding landscape.\n\n## Travel\n\nThe village can be reached via the municipal road network. Visitors to ${muniEnName} can explore the surrounding villages and landscapes as part of a broader regional itinerary.\n\n## External links\n\n- [Wikipedia (Georgian)](${wikiUrl})`;
}

function buildKaBody(kaName, muniKaName, wikiUrl) {
  return `## ${kaName}\n\n${kaName} — სოფელი **${muniKaName}ის მუნიციპალიტეტში**. სოფელი საქართველოს სოფლური გარემოს ნაწილია, შეინარჩუნებს ადგილობრივ ტრადიციებსა და ლანდშაფტს.\n\n## მდებარეობა\n\nსოფელი განლაგებულია ${muniKaName}ის მუნიციპალიტეტში. ადგილობრივ გზებთან კავშირში.\n\n## ვიკიპედია\n\n- [ვიკიპედია](${wikiUrl})`;
}

function buildRuBody(enName, muniEnName, regionName, wikiUrl) {
  return `## ${enName}\n\n${enName} — село в муниципалитете **${muniEnName}**, регион **${regionName}**, Грузия. Типичное сельское поселение с богатой историей и местными традициями.\n\n## Расположение\n\nСело находится в муниципалитете ${muniEnName}. Добраться можно по местным дорогам.\n\n## Ссылки\n\n- [Википедия (груз.)](${wikiUrl})`;
}

// ── Read index and find municipality IDs ──────────────────────────────────────
function loadIndex() {
  if (!existsSync(REGIONS_INDEX)) {
    console.error(`❌  Regions index not found at: ${REGIONS_INDEX}`);
    console.error(`    Run the site at least once to create the data directory, or run:`);
    console.error(`    node scripts/seed-georgia-regions.mjs`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(REGIONS_INDEX, 'utf8'));
  return raw.posts ?? [];
}

function findMuniId(indexPosts, slug) {
  const post = indexPosts.find(
    p => p.level === 'municipality' && (p.slug === slug || p.slug === slug.replace(/_/g, '-'))
  );
  return post?.id ?? null;
}

function loadExistingVillages(muniId) {
  const fpath = path.join(REGIONS_DIR, `${muniId}.json`);
  if (!existsSync(fpath)) return [];
  try {
    const raw = JSON.parse(readFileSync(fpath, 'utf8'));
    return raw.posts ?? [];
  } catch {
    return [];
  }
}

function writeVillages(muniId, villages) {
  mkdirSync(REGIONS_DIR, { recursive: true });
  writeFileSync(
    path.join(REGIONS_DIR, `${muniId}.json`),
    JSON.stringify({ posts: villages }, null, '\t') + '\n',
    'utf8'
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🗺  Georgian villages import`);
  console.log(`   DATA_DIR: ${DATA_DIR}`);
  console.log(`   Dry run:  ${dryRun}`);
  console.log(`   No wiki:  ${noDetail}`);
  console.log(`   Delay:    ${delayMs}ms\n`);

  if (dryRun) console.log('⚠️  DRY RUN — nothing will be written\n');

  const indexPosts = loadIndex();
  console.log(`📋  Found ${indexPosts.filter(p => p.level === 'municipality').length} municipalities in index\n`);

  let totalAdded = 0;
  let totalSkipped = 0;

  // Municipality names lookup
  const muniNames = {};
  for (const p of indexPosts) {
    if (p.level !== 'municipality') continue;
    muniNames[p.slug] = {
      en: p.i18n?.en?.title ?? p.slug,
      ka: p.i18n?.ka?.title ?? p.slug,
    };
  }

  for (const [muniSlug, wikiPageTitle, regionName] of MUNICIPALITIES) {
    // Filter by --only if set
    if (onlyFlag) {
      const matchesRegion = onlyFlag.some(f =>
        regionName.toLowerCase().replace(/[\s-]/g, '') === f.replace(/[\s-]/g, '')
      );
      const matchesMuni = onlyFlag.includes(muniSlug);
      if (!matchesRegion && !matchesMuni) continue;
    }

    const muniId = findMuniId(indexPosts, muniSlug);
    if (!muniId) {
      console.warn(`⚠️  Municipality "${muniSlug}" not found in index — skipping`);
      continue;
    }

    const muniEnName = muniNames[muniSlug]?.en ?? muniSlug;
    const muniKaName = muniNames[muniSlug]?.ka ?? muniSlug;

    console.log(`\n🏘  ${muniEnName} (${muniSlug})`);
    console.log(`    Wiki page: ${wikiPageTitle}`);

    // Fetch village list
    await sleep(delayMs);
    const links = await wikiLinks(wikiPageTitle);
    const villageNames = links.filter(isVillageName);

    console.log(`    Found ${villageNames.length} village links`);

    if (villageNames.length === 0) {
      console.warn(`    ⚠️  No villages found — check Wikipedia page name`);
      continue;
    }

    // Load existing villages (to avoid duplicates)
    const existing = loadExistingVillages(muniId);

    // --missing-only: skip municipalities that already have villages
    if (missingOnly && existing.length > 0) {
      console.log(`    ⏭  Skipping — ${existing.length} villages already exist`);
      continue;
    }
    const existingKaNames = new Set(existing.map(v => v.i18n?.ka?.title).filter(Boolean));
    const existingEnNames = new Set(existing.map(v => v.i18n?.en?.title).filter(Boolean));

    // Populate usedSlugs with existing
    for (const v of existing) usedSlugs.add(v.slug);

    const newVillages = [...existing];
    let addedCount = 0;

    for (const wikiTitle of villageNames) {
      // Clean display name (strip disambiguation)
      const kaName = cleanKaName(wikiTitle);

      if (existingKaNames.has(kaName)) {
        totalSkipped++;
        continue;
      }

      await sleep(delayMs);

      // Fetch Wikipedia detail (Georgian)
      let wikiData = null;
      let enData = null;

      if (!noDetail) {
        wikiData = await wikiSummary(wikiTitle);
        if (wikiData) {
          // Get real English Wikipedia title via langlinks
          await sleep(delayMs);
          const enTitle = await getEnTitleFromLanglinks(wikiTitle);
          if (enTitle) {
            await sleep(delayMs);
            enData = await wikiEnSummary(enTitle);
          }
        }
      }

      const post = makeVillagePost({
        kaName,
        wikiTitle,
        muniSlug,
        muniKaName,
        muniEnName,
        regionName,
        parentId: muniId,
        wikiData,
        enData,
      });

      newVillages.push(post);
      addedCount++;
      totalAdded++;

      process.stdout.write(`    + ${kaName} (${post.i18n.en.title})\n`);
    }

    console.log(`    ✅  Added ${addedCount} new villages (${existing.length} already existed)`);

    if (!dryRun && addedCount > 0) {
      writeVillages(muniId, newVillages);
    }

    // Pause between municipalities to avoid rate limiting
    await sleep(delayMs * 3);
  }

  console.log(`\n✅  Done!`);
  console.log(`   Total added:   ${totalAdded}`);
  console.log(`   Total skipped: ${totalSkipped} (already existed)`);

  if (dryRun) {
    console.log(`\n⚠️  DRY RUN — no files were written`);
  }
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err);
  process.exit(1);
});
