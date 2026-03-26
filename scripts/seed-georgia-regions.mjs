/**
 * One-off / repeatable seed: writes data/regions.json with Georgia’s 12 top-level units
 * and listed municipalities. Run: node scripts/seed-georgia-regions.mjs
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { appendGeorgiaDivisions } from './append-georgia-divisions.mjs';

const IDS = [
	'0f67094f-ca5d-437e-aebe-4a888838e80a',
	'2bc861b4-b3ef-4c01-881c-21ec22f6b938',
	'29bf4056-c12c-40f7-b925-c48488653989',
	'437dff74-0618-433c-8b73-eb1612659e1c',
	'1aac6d69-366f-463f-a3f7-f13c81efb0ca',
	'da354090-1faf-402d-83ce-7f6d1459e520',
	'cd48c62d-be7f-4734-a1b7-4a3450584742',
	'd4e774c1-f801-4840-9695-2d9bf9e897ff',
	'9e5f1663-5f92-4eed-a411-721ca999e842',
	'db166256-79c8-4888-9d77-484a4e5851fd',
	'c17e89f2-45cf-445d-9b57-d461293a9a8b',
	'51fadf28-7eef-4aeb-91d8-07f2bf6fbed6',
	'bf328fdc-c08d-4675-b062-c27a988ae69e',
	'ad0058b3-65ab-4383-8cfd-a8ef1e6ef71c',
	'1bd35995-96ec-4079-a7fc-48020331efea',
	'dad895e2-befd-45ea-8049-f38bc60e65cf',
	'4f120d42-2be8-4096-84b9-585970b14f1e',
	'19a97fae-bf5c-48c2-ae61-249d4481aaf8',
	'b4b0647b-8929-4ebb-95a2-df4295163550',
	'f6f97975-5587-492e-be42-0e887f192a53',
	'febc2d90-3427-4dd3-8292-bf30e1334e9d',
	'68171092-eac4-4b45-bedc-7273adf4cb7d',
	'c07d9553-837e-40be-9a4e-0b0f5c036d63',
	'e37f586e-9c0a-47ea-bbde-b852f98b6a2e',
	'9276913d-0ecf-4041-a0b8-5920ee234074',
	'71be82d9-7d74-4eda-b34c-310b2572142d',
	'c3b7ebcb-b5a8-4aa1-8ca7-9be96098e8cd',
	'27692540-9a88-49ab-a742-9ae5248ea9fc',
	'79a54a95-94fc-41ec-b4fc-9db2578ecf5d',
	'd1c5c4b7-e392-4ad9-a842-61fd34e2ca20',
	'226825b9-1b97-4982-a63d-803347942b0b',
	'78126a98-c00c-4f1e-9130-29b194c2d088',
	'fa97a3f2-e357-4842-bc09-7549cf4f4fc1',
	'c3906afb-4d4f-48ec-a7a0-618fb85458e0',
	'b1468c39-5cda-4903-a77e-1a2574275a71',
	'01e433e6-e93b-4abc-96ef-b6f16d787c56',
	'68155976-13ee-4709-aa6f-666d2f5d8ca9',
	'7fd47d9c-b4ae-4d90-8414-4139f5bc5e45',
	'463fce60-8d74-46b9-948c-de07b6ce02e2',
	'a6ed5265-1f07-4b8f-a421-e6d5f0342e08',
	'4e24c4af-2e5e-4131-b57d-5dcdc6babccc',
	'aaab3790-fd0b-4e06-b2ed-b48f1e122314',
	'b7f80b19-39ca-4722-a177-4d2357d639f9',
	'5777cfa0-83a4-4fbb-aff3-fe39bdaa1fa5',
	'9e4eb6c6-864f-4036-af37-277af36f3f5f',
	'2ef0aefb-f9cc-40a2-9ed1-bcd3f7e9f254',
	'7a2e80e0-be44-4c1a-a424-a283cc12e14f',
	'10cd0e18-68b6-4400-b89f-7d224ce15504',
	'b20e5d4c-56fb-4ab7-8016-d48ab9ee8352',
	'a7b59110-19d6-46c4-aa0f-2ed266540598',
	'4ed3a3e5-40e7-4a3a-bf24-9d678dc3952c',
	'9c1f753f-1342-4eb4-ad30-2d939791d2fc',
	'3c16cd8d-f4e7-486b-b449-6d24023a9f5e',
	'9e10237f-5d04-4fb7-b668-b21ccc6bdfa2',
	'8d8488f8-2dd7-4b17-809e-54111fa73a0e',
	'1c28cfbd-f426-4a85-9994-9f67229d80ca',
	'e06e1fa5-a6bf-45f9-85ef-c4b94fdca75f',
	'344890b5-5eac-4942-a6ad-c92078ffd00c',
	'78c8064c-6477-4e06-87bd-658442898326',
	'8e247afa-0fb5-4c60-8099-b41f5ac3ce0e',
	'e7b8b94f-ae60-4113-9fa4-75e394d42daa',
	'408c734e-3636-480f-bd5a-93c857f28646',
	'0b5483a9-7616-4aa6-bf64-a02aa446cf75',
	'aca3d94a-4331-499a-bcdb-0fddef0b374d',
	'8838e85f-3144-4b3b-bd67-9117b66ae090',
	'9228413c-d8bf-4095-9014-9426b0e08514',
	'65acea6c-294d-43f4-8953-07722c0a15fd',
	'e9ffc81d-a748-41a0-804b-effe86e75e8a',
	'5fa6121a-a814-446b-801f-e78fa5a327e9',
	'f3d6838f-612d-41e2-819b-26bda7048ced',
	'b8fd238b-fdc9-4d3f-9154-6bc4024dc8e9',
	'4f2155cd-4723-47b5-bbbc-ad240609d4c0',
	'b1cde9e5-f236-414c-89c5-711e9a01021d',
	'7262c2cf-df46-4c61-89a6-909d39429800',
	'6cec5104-47af-47d9-a27b-78fd47cfdd50',
	'2240e368-9487-4f50-ad63-aaa96f4e0900',
	'9fa98044-d80d-48fe-a9ce-caf14255e7d2',
	'e43f14c3-94ab-4181-86ec-422ec15d747e',
	'ca0f2dfd-2d23-4f99-a3fb-c4228878327a',
	'94242ea0-47f2-4db7-b3b3-7bfc59ca0e56',
];
let idIx = 0;
function nextId() {
	if (idIx >= IDS.length) throw new Error('Out of UUIDs');
	return IDS[idIx++];
}

const now = Date.now();

function post({
	id,
	slug,
	level,
	parent_id,
	iso,
	admin,
	wiki,
	i18n,
}) {
	return {
		id,
		slug,
		level,
		parent_id,
		image: null,
		gallery: [],
		location: null,
		population: null,
		area_km2: null,
		elevation_m: null,
		admin_center_name: admin,
		iso_3166_2: iso,
		official_code: null,
		official_website: null,
		wikipedia_url: wiki,
		wikidata_id: null,
		geonames_id: null,
		settlement_type: null,
		i18n,
		updated_at: now,
	};
}

/** Short municipality copy — timeless, no census numbers */
function muniTri({ slug, enT, kaT, ruT, enE, kaE, ruE, enB, kaB, ruB, wiki, admin }) {
	const seoEn = `${enT}, Georgia — municipalities & travel context | Travel Guide Georgia`;
	const seoKa = `${kaT} — მუნიციპალიტეტი საქართველოში`;
	const seoRu = `${ruT} — муниципалитет Грузии`;
	return {
		en: {
			title: enT,
			subtitle: 'Municipality in Georgia',
			excerpt: enE,
			seo_title: seoEn.slice(0, 120),
			seo_description: enE.slice(0, 158),
			body: enB,
		},
		ka: {
			title: kaT,
			subtitle: 'საქართველოს მუნიციპალიტეტი',
			excerpt: kaE,
			seo_title: seoKa.slice(0, 120),
			seo_description: kaE.slice(0, 158),
			body: kaB,
		},
		ru: {
			title: ruT,
			subtitle: 'Муниципалитет Грузии',
			excerpt: ruE,
			seo_title: seoRu.slice(0, 120),
			seo_description: ruE.slice(0, 158),
			body: ruB,
		},
	};
}

function muni(parentId, slug, names, wiki, variant = 0) {
	const { en, ka, ru } = names;
	const templates = [
		{
			enE: `${en} sits in a corner of Georgia where everyday life still feels closely tied to the land — valleys, scattered villages, and small hubs that punch above their weight for food and hospitality.`,
			kaE: `${ka} საქართველოს იმ ნაწილს ეკუთვნის, სადაც ცხოვრება ხშირად მიწასთან, სოფლებსა და ურთიერთობას უკავშირდება — პატარა ცენტრებიც კი სტუმართმოყვარეობით გამოირჩევა.`,
			ruE: `${ru} — типичный грузинский муниципалитет: сочетание небольших городов и деревень, где гостеприимство и местная кухня часто важнее «туристических трендов».`,
			enB: `## ${en} at a glance\n\nThis municipality is a useful pin on the map when you are stitching together a route across Georgia: think local markets, family-run guesthouses, and scenery that changes with the seasons rather than with headlines.\n\n## Travel notes\n\nRoads and weather still shape how easy it feels to move around — plan a little buffer, ask locals about the best crossing times in the mountains, and you will usually be rewarded with quieter viewpoints and better stories.\n\n## Staying respectful\n\nChurches, village etiquette, and private land matter here as everywhere in Georgia; a calm hello and a clear question go a long way.`,
			kaB: `## ${ka} მოკლედ\n\nეს მუნიციპალიტეტი კარგი „წერტილია“ მარშრუტზე — ადგილობრივი ბაზრები, ოჯახური საოჯახო სახლები და სეზონის მიხედვით ცვალებადი ხედები.\n\n## მოგზაურობისთვის\n\nგზები და ამინდი ხშირად განსაზღვრავს რიტმს — მთაში დროის უკეთესი „ფანჯრის“ გაგება ადგილობრივებთან ურთიერთობით ხდება.\n\n## პატივისცემა\n\nეკლესიები, სოფლის წესები და პირადი მიწა მნიშვნელოვანია — მშვიდი მისალმება და ნათელი კითხვა ყოველთვის ეხმარება.`,
			ruB: `## ${ru} кратко\n\nМуниципалитет удобно держать в маршруте как «местный якорь»: рынки, домашние кухни, пейзажи, которые сильнее зависят от сезона, чем от моды на достопримечательности.\n\n## На дороге\n\nВ горах погода и состояние дорог часто задают темп — лучше заложить запас времени и уточнять детали у местных.\n\n## Уважение к месту\n\nХрамы, частная территория и деревенские правила важны; спокойное приветствие и ясный вопрос обычно открывают двери лучше любого гида.`,
		},
		{
			enE: `Around ${en}, Georgia’s mix of old Soviet-era industry, small-scale farming, and renewed tourism creates a layered story — worth slowing down for a meal and a walk.`,
			kaE: `${ka} იმავე საქართველოს ისტორიას აერთიანებს — პატარა ფერმერობა, ქალაქური ცხოვრება და მოგზაურობის ახალი ტალღა ერთმანეთს ერწყმის.`,
			ruE: `В округе ${ru} переплетаются сельское хозяйство, городская жизнь и туризм — хорошее место, чтобы остановиться поесть и просто осмотреться.`,
			enB: `## Why ${en} shows up on itineraries\n\nTravelers often pass through on the way to something famous — but the municipality itself can be the reason to stay: slower mornings, regional dishes you will not find in Tbilisi, and roads that teach you Georgia’s scale.\n\n## Landscape & seasons\n\nExpect greens in late spring, deep colours in autumn, and winter quiet in higher pockets. None of that needs updating every year to stay true.\n\n## Plan lightly\n\nGuesthouses and small hotels shift with demand; carrying cash in smaller settlements still saves headaches.`,
			kaB: `## რატომ ჩნდება ${ka} მარშრუტებში\n\nხშირად „გზაში“ გადიან — მაგრამ თავად მუნიციპალიტეტიც შეიძლება იყოს მიზეზი დარჩენისა: რეგიონული კერძები და სხვა რიტმი.\n\n## სეზონები\n\nგაზაფხული და შემოდგომა განსაკუთრებული ფერებით; ზამთარი მთის უბნებში უფრო მშვიდია.\n\n## პრაქტიკა\n\nპატარა სოფლებში ნაღდი ფული ხშირად უფრო საიმედოა.`,
			ruB: `## Почему стоит отметить ${ru}\n\nЧасто едут «транзитом», но сам район может стать поводом задержаться: региональная кухня и другой ритм жизни.\n\n## Сезоны\n\nВесна и осень особенно выразительны; зима в горах тише и суровее.\n\n## Практика\n\nВ мелких населённых пунктах наличные всё ещё часто удобнее карты.`,
		},
	];
	const t = templates[variant % templates.length];
	return post({
		id: nextId(),
		slug,
		level: 'municipality',
		parent_id: parentId,
		iso: null,
		admin: en,
		wiki,
		i18n: muniTri({
			slug,
			enT: `${en} Municipality`,
			kaT: `${ka} — მუნიციპალიტეტი`,
			ruT: `${ru} (муниципалитет)`,
			enE: t.enE,
			kaE: t.kaE,
			ruE: t.ruE,
			enB: t.enB,
			kaB: t.kaB,
			ruB: t.ruB,
			wiki,
			admin: en,
		}),
	});
}

const posts = [];

// ——— 12 regions (fixed IDs from IDS[0..11]) ———
const R = {
	tbilisi: nextId(),
	abkhazia: nextId(),
	adjara: nextId(),
	guria: nextId(),
	imereti: nextId(),
	kakheti: nextId(),
	mtskhetaMtianeti: nextId(),
	rachaLechkhumi: nextId(),
	samegrelo: nextId(),
	samtskhe: nextId(),
	kvemoKartli: nextId(),
	shidaKartli: nextId(),
};

posts.push(
	post({
		id: R.tbilisi,
		slug: 'tbilisi',
		level: 'region',
		parent_id: null,
		iso: 'GE-TB',
		admin: 'Tbilisi',
		wiki: 'https://en.wikipedia.org/wiki/Tbilisi',
		i18n: {
			en: {
				title: 'Tbilisi',
				subtitle: 'Georgia’s capital',
				excerpt:
					'Spread along the Mtkvari river, Tbilisi is Georgia’s political, creative, and culinary engine — old balconies, new wine bars, and mountain day trips within reach.',
				seo_title: 'Tbilisi, Georgia — capital city travel guide | Travel Guide Georgia',
				seo_description:
					'Explore Tbilisi: Old Town lanes, sulfur baths, food scene, and easy escapes toward the Caucasus. Practical, human-written context for visitors.',
				body: `## The city in one breath\n\nTbilisi does not ask you to choose between “old” and “new”. You can start the morning under carved wooden balconies in the historic core, slip into a **sulfur bath** by midday, and end in a courtyard bar talking natural wine with strangers who became friends.\n\n## Why it anchors Georgia\n\nAs the capital, Tbilisi concentrates embassies, universities, startups, and artists — but it also keeps a village habit: neighbours who know your dog’s name, corner bakeries that open before dawn, and taxi drivers who double as informal historians.\n\n## Easy side quests\n\nThe ridges around the city are a reminder that the **Caucasus** is never far. You do not need a perfect forecast — you need curiosity and comfortable shoes.\n\n## For your itinerary\n\nThink of Tbilisi as both destination and hub: nights here, days in Kakheti’s vineyards, Kazbegi’s peaks, or the Black Sea coast, without constant replanning.`,
			},
			ka: {
				title: 'თბილისი',
				subtitle: 'საქართველოს დედაქალაქი',
				excerpt:
					'მტკვრის ხეობაში გაწელილი თბილისი — ქვეყნის პოლიტიკური, კულტურული და საკვების „ძრავა“, სადაც ისტორია და თანამედროვე ცხოვრება ერთმანეთს ერწყმის.',
				seo_title: 'თბილისი — დედაქალაქი, მოგზაურობის გიდი',
				seo_description:
					'ძველი უბნები, გოგირდის აბანოები, კულინარია და მთის ექსკურსიები — პრაქტიკული კონტექსტი მოგზაურისთვის.',
				body: `## ქალაქი ერთ სუნთქვაში\n\nთბილისი არ ამბობს: აირჩიე „ძველი“ ან „ახალი“. დილას შეგიძლია ისტორიულ უბნებში დაიკლო, შუადღეს **გოგირდის აბანოში** გათბე, საღამოს კი ეზოს ბარში ბუნებრივ ღვინოზე ესაუბრო.\n\n## რატომ არის ცენტრი\n\nაქ ჯდება სახელმწიფო ცხოვრება, უნივერსიტეტები, ხელოვნება და ტექნოლოგიები — მაგრამ რჩება სოფლის ჩვევებიც: საცხოვრებელი უბნის ბაკალეა, მეზობლის მისალმება, ტაქსისტი-მთხრობელი.\n\n## მოკლე გასვლები\n\nქალაქის გარშემო კეხები გახსენებს, რომ **კავკასიონი** ახლოა — მთავარია ფეხსაცმელი და ცოტა მოქნილობა გრაფიკში.\n\n## მარშრუტისთვის\n\nთბილისი იყოს „ბაზა“: საღამუნები აქ, დღიური გასვლები კახეთში, მთაში ან ზღვაზე — ნაკლები სტრესი, მეტი აღმოჩენა.`,
			},
			ru: {
				title: 'Тбилиси',
				subtitle: 'Столица Грузии',
				excerpt:
					'Тбилиси тянется вдоль Куры: столица, кухня, вино и творческая энергия — с историческими кварталами в шаге от современной жизни.',
				seo_title: 'Тбилиси — путеводитель по столице Грузии',
				seo_description:
					'Старый город, серные бани, гастрономия и близость к горам. Спокойный, практичный контекст для путешественника.',
				body: `## Город одним вдохом\n\nТбилиси не делит мир на «старое» и «новое». Утром — балконы и мостовые, днём — **серные бани**, вечером — дворик с естественными винами и разговорами с соседнего стола.\n\n## Почему это центр Грузии\n\nЗдесь сходятся политика, университеты, искусство и бизнес — но остаётся и быт квартала: пекарни, соседи, таксисты-рассказчики.\n\n## Короткие выезды\n\nСклоны вокруг города напоминают: **Кавказ** рядом. Погода меняется — зато маршруты остаются живыми круглый год, если не гнаться за «идеальным днём».\n\n## Как использовать в поездке\n\nДелайте Тбилиси базой: вечера в городе, дни — в Кахетии, в горах или на море, без лишних пересборок чемодана.`,
			},
		},
	}),
);

appendGeorgiaDivisions(posts, R, post, muni);

const out = path.join(process.cwd(), 'data', 'regions.json');
writeFileSync(out, JSON.stringify({ posts }, null, '\t'), 'utf8');
console.log(`Wrote ${posts.length} posts to ${out}`);
