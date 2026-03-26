import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataPath = path.join(root, 'data', 'what-to-do.json');

/** 50 major / notable Georgian rivers: slug key, EN name, approximate label, lat, lng */
const RIVERS = [
	['mtkvari-river-valley', 'Mtkvari (Kura) River valley', 'Mtkvari near Mtskheta', 41.8414, 44.7134],
	['aragvi-river-mtskheta', 'Aragvi River (Mtskheta)', 'Mtskheta', 41.8422, 44.7126],
	['tetri-aragvi-gudauri', 'Tetri Aragvi (White Aragvi)', 'Gudauri area', 42.478, 44.478],
	['shavi-aragvi', 'Shavi Aragvi (Black Aragvi)', 'Pasanauri area', 42.349, 44.688],
	['rioni-river-kutaisi', 'Rioni River (Kutaisi)', 'Kutaisi', 42.2719, 42.694],
	['enguri-river', 'Enguri River & valley', 'Jvari (Enguri)', 42.716, 42.384],
	['tergi-river-stepantsminda', 'Tergi (Terek) River', 'Stepantsminda', 42.656, 44.643],
	['chorokhi-river-adjara', 'Chorokhi River', 'Kobuleti coast', 41.821, 41.775],
	['alazani-valley-kakheti', 'Alazani River valley', 'Telavi', 41.919, 45.471],
	['iori-river', 'Iori River', 'Sagarejo area', 41.737, 45.331],
	['khrami-river', 'Khrami River', 'Bolnisi area', 41.447, 44.538],
	['ksani-river', 'Ksani River', 'Mtskheta municipality', 41.903, 44.612],
	['liakhvi-river', 'Liakhvi River', 'Gori area', 42.035, 44.302],
	['duruji-river', 'Duruji River', 'Kvareli', 41.951, 45.812],
	['supsa-river', 'Supsa River', 'Lanchkhuti', 42.088, 42.032],
	['natanebi-river', 'Natanebi River', 'Ozurgeti', 41.924, 41.994],
	['tekhura-river', 'Tekhura River', 'Tkibuli', 42.351, 42.998],
	['kvirila-river', 'Kvirila River', 'Chiatura', 42.290, 43.288],
	['dzirula-river', 'Dzirula River', 'Zestaponi', 42.108, 43.052],
	['vere-river-tbilisi', 'Vere River (Tbilisi)', 'Vake, Tbilisi', 41.709, 44.745],
	['adjaristsqali-river', 'Adjaristsqali River', 'Khulo area', 41.643, 42.315],
	['machakhela-river', 'Machakhela River', 'Machakhela gorge', 41.52, 41.65],
	['kintrishi-river', 'Kintrishi River', 'Kobuleti mountains', 41.72, 41.88],
	['choloki-river', 'Choloki River', 'Chakvi', 41.719, 41.732],
	['khanistskali-river', 'Khanistskali (Rioni tributary)', 'Baghdati area', 42.067, 42.816],
	['tskhenistskali-racha', 'Tskhenistskali River', 'Oni, Racha', 42.579, 43.442],
	['khevistskali-racha', 'Khevistskali River', 'Ambrolauri area', 42.521, 43.145],
	['jejora-svaneti', 'Jejora River', 'Mestia area', 43.048, 42.728],
	['nenskra-river', 'Nenskra River', 'Nakra', 43.145, 42.005],
	['mulkhura-river', 'Mulkhura River', 'Mestia', 43.042, 42.735],
	['chkheristskali-svaneti', 'Chkheristskali River', 'Latali', 43.008, 42.651],
	['kodori-river-valley', 'Kodori River valley', 'Upper Kodori access', 43.12, 41.25],
	['bzyb-river', 'Bzyb River', 'Gagra area (border region)', 43.28, 40.27],
	['gumista-river', 'Gumista River', 'Sukhumi area', 43.001, 41.015],
	['prone-river', 'Proni River', 'Sachkhere', 42.345, 43.419],
	['dzirula-kharagauli', 'Dzirula near Kharagauli', 'Kharagauli', 42.021, 43.211],
	['rioni-delta-poti', 'Rioni delta & wetlands', 'Poti', 42.139, 41.674],
	['mtkvari-confluence-borjomi', 'Mtkvari in Borjomi gorge', 'Borjomi', 41.84, 43.379],
	['khrami-tsalka-headwaters', 'Khrami headwaters (Tsalka area)', 'Tsalka', 41.595, 44.088],
	['algeti-river', 'Algeti River', 'Tbilisi outskirts', 41.62, 44.78],
	['lashistskali-adjara', 'Lashistskali River (Adjara)', 'Keda', 41.583, 41.91],
	['sharapkhana-river', 'Shareula / small Sharapkhana streams', 'Racha foothills', 42.45, 43.55],
	['stori-river-kakheti', 'Stori River', 'Lagodekhi area', 41.829, 46.276],
	['laliskhevi-river', 'Lalisghele stream network', 'Tusheti approach', 42.38, 45.62],
	['andaki-river', 'Andaki River', 'Akhmeta', 42.032, 45.208],
	['arghuni-river-pankisi', 'Arghuni River', 'Pankisi Gorge', 42.065, 45.008],
	['asani-river', 'Asani River', 'Martvili', 42.398, 42.381],
	['abashistskali-river', 'Abashistskali River', 'Senaki', 42.084, 42.067],
	['chechla-river', 'Chechla (Chanchakhi) River', 'Aspindza approach', 41.573, 43.243],
	['paravani-river-outflow', 'Paravani outflow / Kura link', 'Ninotsminda area', 41.265, 43.591],
];

function slugify(s) {
	return s
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 120);
}

function enBody(name, label) {
	return (
		`The **${name}** is one of **Georgia’s** significant waterways. The stretch near **${label}** is a practical base for short walks along the bank, photography, and understanding how river corridors shape local life.\r\n\r\n` +
		`**Safety:** currents can rise quickly after rain; keep children and pets away from steep banks. **Fishing and boating** may need local permits—ask in town. Leave no trace on gravel bars and picnic spots.`
	);
}

function kaTitle(nameEn, slugKey) {
	const MAP = {
		'mtkvari-river-valley': 'მტკვარი (მდინარე და ხეობა)',
		'aragvi-river-mtskheta': 'არაგვი (მცხეთა)',
		'tetri-aragvi-gudauri': 'თეთრი არაგვი',
		'shavi-aragvi': 'შავი არაგვი',
		'rioni-river-kutaisi': 'რიონი (ქუთაისი)',
		'enguri-river': 'ენგური',
		'tergi-river-stepantsminda': 'თერგი',
		'chorokhi-river-adjara': 'ჭოროხი',
		'alazani-valley-kakheti': 'ალაზნის ხეობა',
		'iori-river': 'იორი',
		'khrami-river': 'ხრამი',
		'ksani-river': 'ქსანი',
		'liakhvi-river': 'ლიახვი',
		'duruji-river': 'დურუჯი',
		'supsa-river': 'სუფსა',
		'natanebi-river': 'ნატანები',
		'tekhura-river': 'ტეხურა',
		'kvirila-river': 'ყვირილა',
		'dzirula-river': 'ძირულა',
		'vere-river-tbilisi': 'ვერე',
		'adjaristsqali-river': 'აჭარისწყალი',
		'machakhela-river': 'მაჩახელა',
		'kintrishi-river': 'კინტრიში',
		'choloki-river': 'ჩოლოკი',
		'khanistskali-river': 'ხანისწყალი',
		'tskhenistskali-racha': 'ცხენისწყალი',
		'khevistskali-racha': 'ხევისწყალი',
		'jejora-svaneti': 'ჯეჯორა',
		'nenskra-river': 'ნენსკრა',
		'mulkhura-river': 'მულხურა',
		'chkheristskali-svaneti': 'ჩხერისწყალი',
		'kodori-river-valley': 'კოდორი',
		'bzyb-river': 'ბზიფი',
		'gumista-river': 'გუმისთა',
		'prone-river': 'პრონე',
		'dzirula-kharagauli': 'ძირულა (ხარაგაული)',
		'rioni-delta-poti': 'რიონის დელტა (ფოთი)',
		'mtkvari-confluence-borjomi': 'მტკვარი (ბორჯომის ხეობა)',
		'khrami-tsalka-headwaters': 'ხრამი (წალკის ტბისპირა)',
		'algeti-river': 'ალგეთი',
		'lashistskali-adjara': 'ლაშისწყალი',
		'sharapkhana-river': 'შარაფხანას ნაკადები',
		'stori-river-kakheti': 'სტორი',
		'laliskhevi-river': 'ლალისხევი',
		'andaki-river': 'ანდაკი',
		'arghuni-river-pankisi': 'არღუნი',
		'asani-river': 'ასანი',
		'abashistskali-river': 'აბაშისწყალი',
		'chechla-river': 'ჭეჭლა',
		'paravani-river-outflow': 'ფარავნის ტბიდან გამომავალი ნაკადი',
	};
	return MAP[slugKey] || nameEn;
}

function ruTitle(nameEn, slugKey) {
	const MAP = {
		'mtkvari-river-valley': 'Река Кура (Мтквари) и долина',
		'aragvi-river-mtskheta': 'Река Арагви (Мцхета)',
		'tetri-aragvi-gudauri': 'Тетри-Арагви (Белый Арагви)',
		'shavi-aragvi': 'Шави-Арагви (Чёрный Арагви)',
		'rioni-river-kutaisi': 'Река Риони (Кутаиси)',
		'enguri-river': 'Река Ингури',
		'tergi-river-stepantsminda': 'Река Терек (Терги)',
		'chorokhi-river-adjara': 'Река Чорохи',
		'alazani-valley-kakheti': 'Долина реки Алазани',
		'iori-river': 'Река Иори',
		'khrami-river': 'Река Храми',
		'ksani-river': 'Река Ксани',
		'liakhvi-river': 'Река Лиахви',
		'duruji-river': 'Река Дуруджи',
		'supsa-river': 'Река Супса',
		'natanebi-river': 'Река Натанеби',
		'tekhura-river': 'Река Техура',
		'kvirila-river': 'Река Квирила',
		'dzirula-river': 'Река Дзирула',
		'vere-river-tbilisi': 'Река Вере',
		'adjaristsqali-river': 'Река Аджарисцкали',
		'machakhela-river': 'Река Мачахела',
		'kintrishi-river': 'Река Кинтриши',
		'choloki-river': 'Река Чолоки',
		'khanistskali-river': 'Река Ханистскали',
		'tskhenistskali-racha': 'Река Цхенистскали',
		'khevistskali-racha': 'Река Хевистскали',
		'jejora-svaneti': 'Река Джеджора',
		'nenskra-river': 'Река Ненскра',
		'mulkhura-river': 'Река Мулхура',
		'chkheristskali-svaneti': 'Река Чхеристскали',
		'kodori-river-valley': 'Река Кодори',
		'bzyb-river': 'Река Бзыбь',
		'gumista-river': 'Река Гумиста',
		'prone-river': 'Река Прони',
		'dzirula-kharagauli': 'Дзирула у Харагаули',
		'rioni-delta-poti': 'Дельта Риони (Поти)',
		'mtkvari-confluence-borjomi': 'Кура в Боржомском ущелье',
		'khrami-tsalka-headwaters': 'Верховья Храми (Цалка)',
		'algeti-river': 'Река Алгети',
		'lashistskali-adjara': 'Река Лашисцкали',
		'sharapkhana-river': 'Горные ручьи (Рача)',
		'stori-river-kakheti': 'Река Стори',
		'laliskhevi-river': 'Река Лалискхеви',
		'andaki-river': 'Река Андзаки',
		'arghuni-river-pankisi': 'Река Аргуни',
		'asani-river': 'Река Асани',
		'abashistskali-river': 'Река Абашисцкали',
		'chechla-river': 'Река Чечла',
		'paravani-river-outflow': 'Сток из озера Паравани',
	};
	return MAP[slugKey] || nameEn;
}

function kaBody(slugKey, label) {
	return (
		`ეს გვერდი **საქართველოს** მდინარისპირა ზონას აღწერს (**${kaTitle('', slugKey)}**) — ორიენტირი: **${label}**. შეგიძლიათ მოკლე სეირნობა ნაპირზე, ფოტო და ადგილობრივი ხედვის გაგება.\r\n\r\n` +
		`**უსაფრთხოება:** წვიმის შემდეგ დონე იცვლება; ბავშვები და ცხოველები დაცული იყოს სწორებთან. **თევზაობა/გემი** შეიძლება საჭიროებდეს ნებართვას — მიმართეთ ადგილობრივებს. ნაგავი ნუ დატოვოთ.`
	);
}

function ruBody(nameRu, label) {
	return (
		`**${nameRu}** — важная водная артерия **Грузии**. Участок у **${label}** удобен для коротких прогулок вдоль берега, фотографий и понимания того, как река влияет на жизнь региона.\r\n\r\n` +
		`**Безопасность:** после дождя уровень воды растёт; держитесь подальше от крутых обрывов. **Рыбалка и лодки** могут требовать разрешений — уточняйте на месте. Не оставляйте мусор на пляжах и косах.`
	);
}

const now = Date.now();
const posts = RIVERS.map(([slugKey, nameEn, label, lat, lng]) => {
	const slug = slugify(slugKey);
	const nameRu = ruTitle(nameEn, slugKey);
	const nameKa = kaTitle(nameEn, slugKey);
	const moderate = ['tergi-river-stepantsminda', 'kodori-river-valley', 'jejora-svaneti', 'nenskra-river', 'mulkhura-river', 'chkheristskali-svaneti', 'arghuni-river-pankisi'].includes(slugKey);
	return {
		id: randomUUID(),
		slug,
		image: null,
		gallery: [],
		location: { lat, lng, label },
		physical_rating: moderate ? 'moderate' : 'easy',
		driving_distance: moderate ? 'Varies; check local road conditions to the river access' : 'Often reachable by car to nearby towns; short walks to viewpoints',
		i18n: {
			en: {
				title: `${nameEn}: visit & riverside walks`,
				duration: '1–3 hours (flexible)',
				price: 'Free outdoors; guided tours optional',
				excerpt: `Scenic Georgian river corridor near ${label} — walks, photos, and nature.`,
				seo_title: null,
				seo_description: null,
				body: enBody(nameEn, label),
				contact_sidebar: '',
			},
			ka: {
				title: `${nameKa} — სეირნობა და ხედები`,
				duration: '1–3 საათი (მოქნილი)',
				price: 'უფასო ღია სივრცეში; ექსკურსია სურვილისამებრ',
				excerpt: `მდინარისპირა ხედები ${label}სთან ახლოს — სეირნობა და ფოტო.`,
				seo_title: null,
				seo_description: null,
				body: kaBody(slugKey, label),
				contact_sidebar: '',
			},
			ru: {
				title: `${nameRu}: прогулки у воды`,
				duration: '1–3 часа (гибко)',
				price: 'Бесплатно на открытом воздухе; экскурсии по желанию',
				excerpt: `Живописная река у **${label}** — прогулки и фото.`,
				seo_title: null,
				seo_description: null,
				body: ruBody(nameRu, label),
				contact_sidebar: '',
			},
		},
		updated_at: now,
		author_user_id: null,
		author_email: null,
		categories: ['river', 'hiking'],
		seasons: ['spring', 'summer', 'autumn'],
	};
});

const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const existingSlugs = new Set(raw.posts.map((p) => p.slug));
const toAdd = posts.filter((p) => !existingSlugs.has(p.slug));
if (toAdd.length < posts.length) {
	console.warn('Skipped slugs that already exist:', posts.filter((p) => existingSlugs.has(p.slug)).map((p) => p.slug));
}
raw.posts.push(...toAdd);
writeFileSync(dataPath, JSON.stringify(raw, null, 2) + '\n', 'utf8');
console.log('Added', toAdd.length, 'river posts. Total posts:', raw.posts.length);
