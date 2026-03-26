/**
 * Appends 11 regions (after Tbilisi) + all municipalities to `posts`.
 * Imported by seed-georgia-regions.mjs
 */
export function appendGeorgiaDivisions(posts, R, post, muni) {
	// —— 11 regions ——
	posts.push(
		post({
			id: R.abkhazia,
			slug: 'abkhazia',
			level: 'region',
			parent_id: null,
			iso: 'GE-AB',
			admin: 'Sukhumi (disputed)',
			wiki: 'https://en.wikipedia.org/wiki/Abkhazia',
			i18n: {
				en: {
					title: 'Abkhazia (Autonomous Republic)',
					subtitle: 'Northwestern Georgia — context',
					excerpt:
						'Legally an autonomous republic within Georgia, Abkhazia is known for subtropical Black Sea nature and a long political story. Factual overview for readers who want geography and context.',
					seo_title: 'Abkhazia autonomous republic — geographic context | Georgia',
					seo_description:
						'Neutral overview of Abkhazia on Georgia’s map: geography, stable political summary, and travel-planning context.',
					body: `## Geography\n\nAbkhazia lies along Georgia’s **northwestern Black Sea** coast — humid subtropical climate and dense green summers.\n\n## Political situation (slow-changing)\n\nGeorgia considers Abkhazia its **Autonomous Republic**; effective control has been separate since the 1990s and 2008. This guide avoids news-cycle wording on purpose.\n\n## For travellers\n\nMost open itineraries focus on regions with straightforward access. Check your government’s travel advice; rules can differ from the rest of Georgia.\n\n## Why it appears here\n\nGeorgia’s **administrative map** has twelve top-level units — understanding the full picture helps even when you do not visit every part.`,
				},
				ka: {
					title: 'აფხაზეთის ავტონომიური რესპუბლიკა',
					subtitle: 'კონტექსტი',
					excerpt:
						'საქართველოს სამართლებრივად აფხაზეთი ავტონომიური რესპუბლიკაა — შავი ზღვის ნოტიო სანაპირო და რთული პოლიტიკური ისტორია.',
					seo_title: 'აფხაზეთის ავტონომიური რესპუბლიკა — გეოგრაფია',
					seo_description:
						'მოკლე, უცვლელი ტექსტი: სად არის რუკაზე და რატომ არის საჭირო ადმინისტრაციულ მიმოხილვაში.',
					body: `## გეოგრაფია\n\nაფხაზეთი **შავი ზღვის** ჩრდილო-დასავლეთ სანაპიროზეა.\n\n## პოლიტიკური ჩარჩო\n\nსაქართველოს კონსტიტუციით — **ავტონომიური რესპუბლიკა**; ფაქტობრივი კონტროლის საკითხი გრძელვადიანია.\n\n## მოგზაურობა\n\nგადაამოწმეთ თქვენი ქვეყნის ოფიციალური რეკომენდაციები.\n\n## რატომაა სიაში\n\nსაქართველოს **სრული ადმინისტრაციული სურათი** მთლიანად რომ გაიგოთ.`,
				},
				ru: {
					title: 'Абхазская Автономная Республика',
					subtitle: 'Контекст',
					excerpt:
						'По конституции Грузии — автономная республика на северо-западном побережье Чёрного моря. Нейтральный обзор.',
					seo_title: 'Абхазская автономная республика — география',
					seo_description:
						'Краткое описание для справки: где на карте и почему статус особый.',
					body: `## География\n\nАбхазия — **северо-западное** побережье Чёрного моря.\n\n## Политический контекст\n\nДля Грузии это **автономная республика**; фактический контроль — отдельная долгая тема.\n\n## Путешествия\n\nСверяйтесь с рекомендациями МИД.\n\n## Зачем в списке\n\nЧтобы **карта Грузии** читалась целиком.`,
				},
			},
		}),
	);

	posts.push(
		post({
			id: R.adjara,
			slug: 'adjara',
			level: 'region',
			parent_id: null,
			iso: 'GE-AJ',
			admin: 'Batumi',
			wiki: 'https://en.wikipedia.org/wiki/Adjara',
			i18n: {
				en: {
					title: 'Adjara',
					subtitle: 'Autonomous republic — sea & mountains',
					excerpt:
						'Batumi’s boulevards and the green hills behind: seaside energy, tea terraces, and mountain villages where fog and sun trade places.',
					seo_title: 'Adjara Georgia — Batumi, municipalities | Travel Guide',
					seo_description:
						'Adjara: Batumi, Black Sea coast, inland Adjara, and municipalities from Kobuleti to Khulo.',
					body: `## Sea and slope\n\nAdjara faces the **Black Sea**, but half its character is **mountain** — pack layers, not only swimwear.\n\n## Batumi\n\n**Batumi** mixes seafront walks, old streets, and the famous **Adjarian khachapuri**.\n\n## Inland\n\nTea, forests, and villages where rain makes everything lush.\n\n## Below\n\nMunicipalities link coast to highland.`,
				},
				ka: {
					title: 'აჭარის ავტონომიური რესპუბლიკა',
					subtitle: 'ზღვა და მთა',
					excerpt:
						'ბათუმის ბულვარი და უკანა მთები — აჭარა ზღვის ენერგიასა და მთის სოფლებს აერთიანებს.',
					seo_title: 'აჭარა — ბათუმი, მუნიციპალიტეტები',
					seo_description:
						'აჭარა: ბათუმი, სანაპირო, მთიანი აჭარა და მუნიციპალიტეტების სია.',
					body: `## ზღვა და კლდე\n\nაჭარა **შავ ზღვას** ეკრება, მაგრამ ნახევარი ხასიათი **მთაა**.\n\n## ბათუმი\n\n**ბათუმი** — სასეირნო ზოლები და **აჭარული ხაჭაპური**.\n\n## მთიანი აჭარა\n\nჩაი, ტყეები, სოფლები.\n\n## ქვემოთ\n\nმუნიციპალიტეტები სანაპიროდან მაღალ მხარემდე.`,
				},
				ru: {
					title: 'Аджарская Автономная Республика',
					subtitle: 'Море и горы',
					excerpt:
						'Батуми, побережье и зелёные хребты — Аджария сочетает курорт и горные деревни.',
					seo_title: 'Аджария — Батуми, муниципалитеты',
					seo_description:
						'Аджария: Батуми, побережье, горная часть и список муниципалитетов.',
					body: `## Море и склон\n\nАджария смотрит на **Чёрное море**, но характер наполовину **горный**.\n\n## Батуми\n\n**Батуми** — бульвары и **аджарский хачапури**.\n\n## В глубь\n\nЧай, леса, сёла.\n\n## Ниже\n\nМуниципалитеты от побережья к высокогорью.`,
				},
			},
		}),
	);

	posts.push(
		post({
			id: R.guria,
			slug: 'guria',
			level: 'region',
			parent_id: null,
			iso: 'GE-GU',
			admin: 'Ozurgeti',
			wiki: 'https://en.wikipedia.org/wiki/Guria',
			i18n: {
				en: {
					title: 'Guria',
					subtitle: 'Western Georgia',
					excerpt:
						'Between sea humidity and Imereti’s bustle, Guria is green, musical, and local — polyphony, walnuts, and unhurried roads.',
					seo_title: 'Guria region Georgia — Ozurgeti, municipalities',
					seo_description:
						'Guria: Ozurgeti, Lanchkhuti, Chokhatauri — hills, polyphony, and Gurian character.',
					body: `## Place on the map\n\nGuria is a **compact western** region — easy hops to the coast or **Imereti**, but many stay for songs and suppers.\n\n## Culture\n\n**Polyphonic singing** is everyday, not staged.\n\n## Municipalities\n\n**Ozurgeti**, **Lanchkhuti**, **Chokhatauri** — three rhythms.`,
				},
				ka: {
					title: 'გურია',
					subtitle: 'დასავლეთი',
					excerpt:
						'გურია — მწვანე მხარე ზღვასა და იმერეთს შორის; პოლიფონია და სტუმართმოყვარე სუფრა.',
					seo_title: 'გურია — ოზურგეთი, მუნიციპალიტეტები',
					seo_description: 'გურია: ოზურგეთი, ლანჩხუთი, ჩოხატაური.',
					body: `## სად არის\n\nგურია **დასავლეთის** პატარა ზოლია — მშვიდი გზები.\n\n## კულტურა\n\n**გურული ხმები** ცოცხალია.\n\n## მუნიციპალიტეტები\n\n**ოზურგეთი**, **ლანჩხუთი**, **ჩოხატაური**.`,
				},
				ru: {
					title: 'Гурия',
					subtitle: 'Западная Грузия',
					excerpt:
						'Гурия — зелёный регион: полифония, орехи, неспешные дороги.',
					seo_title: 'Гурия — Озургети, муниципалитеты',
					seo_description: 'Гурия: Озургети, Ланчхути, Чохатаури.',
					body: `## На карте\n\nГурия — **компактный** западный край.\n\n## Культура\n\n**Полифония** здесь живая.\n\n## Муниципалитеты\n\n**Озургети**, **Ланчхути**, **Чохатаури**.`,
				},
			},
		}),
	);

	posts.push(
		post({
			id: R.imereti,
			slug: 'imereti',
			level: 'region',
			parent_id: null,
			iso: 'GE-IM',
			admin: 'Kutaisi',
			wiki: 'https://en.wikipedia.org/wiki/Imereti',
			i18n: {
				en: {
					title: 'Imereti',
					subtitle: 'Historic west — Kutaisi and beyond',
					excerpt:
						'Imereti is Georgia’s busy western heartland: Kutaisi’s architecture, limestone canyons, old monasteries, and a food culture that loves walnuts and herbs.',
					seo_title: 'Imereti region Georgia — Kutaisi, travel & municipalities',
					seo_description:
						'Imereti: Kutaisi, canyons, monasteries, and municipalities across western Georgia.',
					body: `## Why travellers linger\n\n**Imereti** stitches together city life in **Kutaisi**, cave-and-canyon country, and villages where lunch runs long.\n\n## Landscape\n\nRivers have carved **gorges**; monasteries sit on green shelves above valleys.\n\n## Food\n\nWalnuts, pkhali, and home-style soups — less “show”, more habit.\n\n## Municipalities\n\nThe list below spans industrial towns, wine-adjacent hills, and quieter highland edges.`,
				},
				ka: {
					title: 'იმერეთი',
					subtitle: 'ისტორიული დასავლეთი',
					excerpt:
						'იმერეთი — დასავლეთის ცენტრალური მხარე: ქუთაისი, კანიონები, მონასტრები და საუცხო სუფრა.',
					seo_title: 'იმერეთი — ქუთაისი, მუნიციპალიტეტები',
					seo_description: 'იმერეთი: ქუთაისი და მუნიციპალიტეტები მთელი მხარის მასშტაბით.',
					body: `## რატომ რჩებიან\n\n**იმერეთი** აერთიანებს **ქუთაისს**, კლდეებსა და სოფლებს სადაც ლანჩი გრძელია.\n\n## ბუნება\n\nმდინარეები და **ხეობები**; მონასტრები მწვანე ფერდობებზე.\n\n## სუფრა\n\nკაკალი, ხილი, სახლის სტილი.\n\n## მუნიციპალიტეტები\n\nქვემოთ — სრული სია.`,
				},
				ru: {
					title: 'Имеретия',
					subtitle: 'Западное сердце страны',
					excerpt:
						'Имеретия — Кутаиси, каньоны, монастыри и домашняя кухня с грецким орехом и зеленью.',
					seo_title: 'Имеретия — Кутаиси, муниципалитеты',
					seo_description: 'Имеретия: Кутаиси и муниципалитеты западной Грузии.',
					body: `## Почему задерживаются\n\n**Имеретия** соединяет **Кутаиси**, ущелья и деревни с длинными обедами.\n\n## Пейзаж\n\nРеки, **каньоны**, монастыри над долинами.\n\n## Еда\n\nОрехи, пхали, домашние супы.\n\n## Муниципалитеты\n\nСписок ниже.`,
				},
			},
		}),
	);

	posts.push(
		post({
			id: R.kakheti,
			slug: 'kakheti',
			level: 'region',
			parent_id: null,
			iso: 'GE-KA',
			admin: 'Telavi',
			wiki: 'https://en.wikipedia.org/wiki/Kakheti',
			i18n: {
				en: {
					title: 'Kakheti',
					subtitle: 'Georgia’s eastern wine country',
					excerpt:
						'East of the mountains, Kakheti rolls into sunlit valleys — vineyards, fortress towns, and a pace that matches long tables and late toasts.',
					seo_title: 'Kakheti Georgia — Telavi, wine region municipalities',
					seo_description:
						'Kakheti: Telavi, Sighnaghi, vineyards and municipalities across eastern Georgia.',
					body: `## Wine, without the cliché\n\n**Kakheti** is Georgia’s best-known **wine** region for a reason — but it is also borderland scenery, sheep roads, and families who treat harvest like a season, not a slogan.\n\n## Towns with texture\n\n**Telavi** and **Sighnaghi** get the postcards; smaller centres hide excellent markets and older courtyards.\n\n## Practical rhythm\n\nCome hungry, plan flexible driving, and say yes to a tasting that turns into dinner.\n\n## Municipalities\n\nEach unit below adds a different Kakheti angle — hills, plains, or border air.`,
				},
				ka: {
					title: 'კახეთი',
					subtitle: 'აღმოსავლეთი, ღვინის მხარე',
					excerpt:
						'კახეთი — მზიანი ვენახები, ციხე-ქალაქები და ნელი სუფრა; თელავი და სიღნაღი უბნების გემოვნებით.',
					seo_title: 'კახეთი — თელავი, მუნიციპალიტეტები',
					seo_description: 'კახეთი: თელავი, სიღნაღი და სხვა მუნიციპალიტეტები.',
					body: `## ღვინე და ცხოვრება\n\n**კახეთი** ღვინის რეგიონია — მაგრამ ასევე საზღვარი, გზები და ოჯახური მოსავალი.\n\n## ქალაქები\n\n**თელავი** და **სიღნაღი** ცნობილია — პატარა ცენტრებშიც კარგი ბაზრებია.\n\n## მუნიციპალიტეტები\n\nქვემოთ სრული სია.`,
				},
				ru: {
					title: 'Кахетия',
					subtitle: 'Восток и винные долины',
					excerpt:
						'Кахетия — солнечные долины, виноградники, крепостные городки и долгие ужины.',
					seo_title: 'Кахетия — Телави, муниципалитеты',
					seo_description: 'Кахетия: Телави, Сигнахи и муниципалитеты восточной Грузии.',
					body: `## Вино и быт\n\n**Кахетия** — винный край, но ещё и пограничные пейзажи и семейные урожаи.\n\n## Города\n\n**Телави** и **Сигнахи** — известные точки; мелкие центры тоже стоят внимания.\n\n## Муниципалитеты\n\nСписок ниже.`,
				},
			},
		}),
	);

	posts.push(
		post({
			id: R.mtskhetaMtianeti,
			slug: 'mtskheta-mtianeti',
			level: 'region',
			parent_id: null,
			iso: 'GE-MM',
			admin: 'Mtskheta',
			wiki: 'https://en.wikipedia.org/wiki/Mtskheta-Mtianeti',
			i18n: {
				en: {
					title: 'Mtskheta-Mtianeti',
					subtitle: 'Old capital & high Caucasus',
					excerpt:
						'Georgia’s spiritual heart in Mtskheta meets the dramatic Military Road — Kazbegi’s peaks, stone towers, and weather that writes the schedule.',
					seo_title: 'Mtskheta-Mtianeti — Mtskheta, Kazbegi, municipalities',
					seo_description:
						'Mtskheta-Mtianeti: UNESCO sites, Stepantsminda area, mountain municipalities.',
					body: `## Two worlds, one region\n\n**Mtskheta** carries millennia of Christian heritage; farther north, valleys climb toward **Kazbegi**-country peaks and seasonal roads.\n\n## Travel reality\n\nMountain weather shifts fast — build slack into the day.\n\n## Municipalities\n\nFrom ancient town to highland communities below.`,
				},
				ka: {
					title: 'მცხეთა-მთიანეთი',
					subtitle: 'ძველი დედაქალაქი და კავკასიონი',
					excerpt:
						'მცხეთის ისტორია და ყაზბეგის მთები ერთ რეგიონში — გზა, ამინდი და ქვის კოშკები.',
					seo_title: 'მცხეთა-მთიანეთი — მცხეთა, ყაზბეგი',
					seo_description: 'მცხეთა-მთიანეთის მუნიციპალიტეტები და მთის მარშრუტები.',
					body: `## ორი სამყარო\n\n**მცხეთა** — სულიერი ცენტრი; ჩრდილოეთით — **ყაზბეგის** მიმდებარე მთები.\n\n## მოგზაურობა\n\nამინდი სწრაფად იცვლება.\n\n## მუნიციპალიტეტები\n\nქვემოთ.`,
				},
				ru: {
					title: 'Мцхета-Мтианети',
					subtitle: 'Древняя столица и Кавказ',
					excerpt:
						'Мцхета и горные долины к Казбеги — наследие и высокогорье в одном регионе.',
					seo_title: 'Мцхета-Мтианети — Мцхета, Казбеги',
					seo_description: 'Мцхета-Мтианети: муниципалитеты и горные маршруты.',
					body: `## Два лика\n\n**Мцхета** — духовный центр; на север — **Казбеги** и высокогорье.\n\n## В дороге\n\nПогода меняется быстро.\n\n## Муниципалитеты\n\nНиже.`,
				},
			},
		}),
	);

	posts.push(
		post({
			id: R.rachaLechkhumi,
			slug: 'racha-lechkhumi-lower-svaneti',
			level: 'region',
			parent_id: null,
			iso: 'GE-RL',
			admin: 'Ambrolauri',
			wiki: 'https://en.wikipedia.org/wiki/Racha-Lechkhumi_and_Lower_Svaneti',
			i18n: {
				en: {
					title: 'Racha-Lechkhumi and Lower Svaneti',
					subtitle: 'High ridges & quiet valleys',
					excerpt:
						'Less crowded than the main trunk roads, this region rewards slow driving: forests, Racha-style hospitality, and views that feel borrowed from a taller map.',
					seo_title: 'Racha-Lechkhumi & Lower Svaneti — municipalities Georgia',
					seo_description:
						'Racha-Lechkhumi and Lower Svaneti: Ambrolauri, Oni, Tsageri and linked municipalities.',
					body: `## Pace\n\nThis is **slow-travel** country — fewer lanes, more curves, excellent cheese stories.\n\n## Identity\n\n**Racha** and **Svan** names signal different highland histories meeting in one administrative frame.\n\n## Municipalities\n\nFour municipalities below — each a different altitude mix.`,
				},
				ka: {
					title: 'რაჭა-ლეჩხუმი და ქვემო სვანეთი',
					subtitle: 'მაღალი ქედები',
					excerpt:
						'ნაკლებად ხმაურიანი გზები, ტყეები და რაჭული სტუმართმოყვარეობა — მოგზაურობა ნელა უნდა.',
					seo_title: 'რაჭა-ლეჩხუმი და ქვემო სვანეთი',
					seo_description: 'ამბროლაური, ონი, ცაგერი, ლენტეხი — მუნიციპალიტეტები.',
					body: `## ტემპი\n\n**ნელი** მარშრუტის რეგიონია.\n\n## მუნიციპალიტეტები\n\nქვემოთ სია.`,
				},
				ru: {
					title: 'Рача-Лечхуми и Нижняя Сванетия',
					subtitle: 'Горы и долины',
					excerpt:
						'Менее многолюдные дороги, леса и гостеприимство — планируйте время с запасом.',
					seo_title: 'Рача-Лечхуми и Нижняя Сванетия',
					seo_description: 'Амбролаури, Они, Цагери, Лентехи — муниципалитеты.',
					body: `## Темп\n\nРегион для **неспешных** поездок.\n\n## Муниципалитеты\n\nНиже.`,
				},
			},
		}),
	);

	posts.push(
		post({
			id: R.samegrelo,
			slug: 'samegrelo-upper-svaneti',
			level: 'region',
			parent_id: null,
			iso: 'GE-SZ',
			admin: 'Zugdidi',
			wiki: 'https://en.wikipedia.org/wiki/Samegrelo-Zemo_Svaneti',
			i18n: {
				en: {
					title: 'Samegrelo-Zemo Svaneti',
					subtitle: 'Black Sea ports to Svan towers',
					excerpt:
						'From Poti’s port air to Mestia’s stone towers, this region spans lowland Megrelian warmth and some of the Caucasus’ most vertical scenery.',
					seo_title: 'Samegrelo-Upper Svaneti — Zugdidi, Mestia, municipalities',
					seo_description:
						'Samegrelo-Zemo Svaneti: coastal and inland municipalities from Poti to Mestia.',
					body: `## Range\n\n**Samegrelo** lowlands and **Upper Svaneti** high peaks sit in one region — plan for long drives if you combine both.\n\n## Culture\n\nMegrelian cuisine is famously rich; Svaneti’s towers need no filter.\n\n## Municipalities\n\nNine municipalities — coast, plain, and highland.`,
				},
				ka: {
					title: 'სამეგრელო-ზემო სვანეთი',
					subtitle: 'ზღვიდან კოშკებამდე',
					excerpt:
						'ფოთიდან მესტიამდე — დაბლობის მეგრული სტუმართმოყვარეობა და სვანეთის ქვის კოშკები.',
					seo_title: 'სამეგრელო-ზემო სვანეთი — მუნიციპალიტეტები',
					seo_description: 'ზუგდიდი, ფოთი, მესტია და სხვა მუნიციპალიტეტები.',
					body: `## სპექტრი\n\n**სამეგრელოს** დაბლობი და **ზემო სვანეთის** მწვერვალები ერთ ადმინისტრაციულ ერთეულშია.\n\n## მუნიციპალიტეტები\n\nცხრა ერთეული ქვემოთ.`,
				},
				ru: {
					title: 'Самегрело-Земо Сванети',
					subtitle: 'От моря к башням',
					excerpt:
						'От Поти до Местии — мегрельская кухня и сванские башни в одном регионе.',
					seo_title: 'Самегрело-Верхняя Сванетия — муниципалитеты',
					seo_description: 'Зугдиди, Поти, Местия и другие муниципалитеты.',
					body: `## Диапазон\n\nНизменности и **верхняя** Сванетия — закладывайте время на дорогу.\n\n## Муниципалитеты\n\nДевять единиц ниже.`,
				},
			},
		}),
	);

	posts.push(
		post({
			id: R.samtskhe,
			slug: 'samtskhe-javakheti',
			level: 'region',
			parent_id: null,
			iso: 'GE-SJ',
			admin: 'Akhaltsikhe',
			wiki: 'https://en.wikipedia.org/wiki/Samtskhe%E2%80%93Javakheti',
			i18n: {
				en: {
					title: 'Samtskhe-Javakheti',
					subtitle: 'High plateaus & spa forests',
					excerpt:
						'Southwestern plateaus, multi-faith villages, and Borjomi’s forests — a region of wide skies, slow trains of thought, and borderland horizons.',
					seo_title: 'Samtskhe-Javakheti — Akhaltsikhe, Borjomi, municipalities',
					seo_description:
						'Samtskhe-Javakheti: Akhaltsikhe, Borjomi, Javakheti lakes area, municipalities.',
					body: `## Character\n\n**Samtskhe-Javakheti** mixes **fortress towns**, **spa** forests, and high **plateau** light.\n\n## Travel\n\nDistances feel longer than the map suggests — savour stops.\n\n## Municipalities\n\nSix municipalities — from Rabati’s walls to highland lakesides.`,
				},
				ka: {
					title: 'სამცხე-ჯავახეთი',
					subtitle: 'პლატო და ტყეები',
					excerpt:
						'ახალციხის ციხეები, ბორჯომის ტყეები და ჯავახეთის პლატო — ფართო ცა და საზღვრის ჰორიზონტი.',
					seo_title: 'სამცხე-ჯავახეთი — მუნიციპალიტეტები',
					seo_description: 'ახალციხე, ბორჯომი და სხვა მუნიციპალიტეტები.',
					body: `## ხასიათი\n\n**ციხეები**, **ბორჯომი**, **პლატო** — ერთი რეგიონი.\n\n## მუნიციპალიტეტები\n\nქვემოთ ექვსი ერთეული.`,
				},
				ru: {
					title: 'Самцхе-Джавахети',
					subtitle: 'Плато и курорты',
					excerpt:
						'Ахалцихе, Боржоми, озёра Джавахети — юго-запад с широким небом.',
					seo_title: 'Самцхе-Джавахети — муниципалитеты',
					seo_description: 'Ахалцихе, Боржоми и муниципалитеты региона.',
					body: `## Облик\n\n**Крепости**, **Боржоми**, **плато**.\n\n## Муниципалитеты\n\nШесть единиц ниже.`,
				},
			},
		}),
	);

	posts.push(
		post({
			id: R.kvemoKartli,
			slug: 'kvemo-kartli',
			level: 'region',
			parent_id: null,
			iso: 'GE-KK',
			admin: 'Rustavi',
			wiki: 'https://en.wikipedia.org/wiki/Kvemo_Kartli',
			i18n: {
				en: {
					title: 'Kvemo Kartli',
					subtitle: 'Southeastern gateway',
					excerpt:
						'Rustavi’s industry, open steppe light, and multicultural towns — Kvemo Kartli is where Tbilisi’s gravity thins into wide horizons.',
					seo_title: 'Kvemo Kartli — Rustavi, municipalities Georgia',
					seo_description:
						'Kvemo Kartli: Rustavi, Marneuli, and municipalities in southeastern Georgia.',
					body: `## Feel\n\n**Kvemo Kartli** is **open** land — big sky, roads that run straight longer than in the hills.\n\n## Towns\n\n**Rustavi** anchors the region; smaller centres mix rural trade and diverse communities.\n\n## Municipalities\n\nSeven municipalities — from industrial hubs to steppe-edged villages.`,
				},
				ka: {
					title: 'ქვემო ქართლი',
					subtitle: 'აღმოსავლეთ-სამხრეთი',
					excerpt:
						'რუსთავი, ვრცელი ჰორიზონტი და მრავალფეროვანი ქალაქები — თბილისის ჩრდილიდან გასვლა.',
					seo_title: 'ქვემო ქართლი — მუნიციპალიტეტები',
					seo_description: 'რუსთავი, მარნეული და სხვა მუნიციპალიტეტები.',
					body: `## განცდა\n\n**ქვემო ქართლი** ღია ცის მხარეა.\n\n## მუნიციპალიტეტები\n\nშვიდი ერთეული ქვემოთ.`,
				},
				ru: {
					title: 'Квемо-Картли',
					subtitle: 'Юго-восток',
					excerpt:
						'Рустави, степной горизонт и многонациональные города.',
					seo_title: 'Квемо-Картли — муниципалитеты',
					seo_description: 'Рустави, Марнеули и другие муниципалитеты.',
					body: `## Настроение\n\n**Квемо-Картли** — открытый юго-восток.\n\n## Муниципалитеты\n\nСемь единиц ниже.`,
				},
			},
		}),
	);

	posts.push(
		post({
			id: R.shidaKartli,
			slug: 'shida-kartli',
			level: 'region',
			parent_id: null,
			iso: 'GE-SK',
			admin: 'Gori',
			wiki: 'https://en.wikipedia.org/wiki/Shida_Kartli',
			i18n: {
				en: {
					title: 'Shida Kartli',
					subtitle: 'Central Kartli & contested lines',
					excerpt:
						'Gori’s broad avenues and the ancient heartland between mountains — a region where recent history sits on ancient roads. Part of the territory remains outside Tbilisi’s full administrative reach.',
					seo_title: 'Shida Kartli — Gori, municipalities Georgia',
					seo_description:
						'Shida Kartli: Gori, Kaspi, Kareli, Khashuri and context for central Georgia.',
					body: `## Landscape\n\n**Shida Kartli** is **central** Georgia — valleys that carried armies and merchants long before modern borders.\n\n## Context\n\nSome areas near **South Ossetia** are not under government control — plan with reliable sources and official advice.\n\n## Municipalities\n\nFour municipalities listed — each with its own daily rhythm.`,
				},
				ka: {
					title: 'შიდა ქართლი',
					subtitle: 'ცენტრალური ქართლი',
					excerpt:
						'გორი, ხეობები და რთული თანამედროვე ისტორია — ნაწილი ტერიტორიისთვის ადმინისტრაციული სრული კონტროლი არ ვრცელდება.',
					seo_title: 'შიდა ქართლი — გორი, მუნიციპალიტეტები',
					seo_description: 'გორი, კასპი, ქარელი, ხაშური — მუნიციპალიტეტები.',
					body: `## ლანდშაფტი\n\n**შიდა ქართლი** ცენტრალური ხეობების რეგიონია.\n\n## კონტექსტი\n\nოკუპირებული ტერიტორიების სიახლოვე — გეგმავდეთ ოფიციალური წყაროებით.\n\n## მუნიციპალიტეტები\n\nოთხი ერთეული ქვემოთ.`,
				},
				ru: {
					title: 'Шида-Картли',
					subtitle: 'Центральная Картли',
					excerpt:
						'Гори и центральные долины — регион со сложной современной историей; часть территории с особым статусом.',
					seo_title: 'Шида-Картли — Гори, муниципалитеты',
					seo_description: 'Гори, Каспи, Карели, Хашури — муниципалитеты.',
					body: `## Пейзаж\n\n**Шида-Картли** — центральные долины.\n\n## Контекст\n\nУчитывайте официальные предупреждения у линий соприкосновения.\n\n## Муниципалитеты\n\nЧетыре единицы ниже.`,
				},
			},
		}),
	);

	// —— Municipalities: [parent R key, slug, en, ka, ru, wiki, variant] ——
	const M = [
		[R.adjara, 'batumi', 'Batumi', 'ბათუმი', 'Батуми', 'https://en.wikipedia.org/wiki/Batumi', 0],
		[R.adjara, 'kobuleti', 'Kobuleti', 'ქობულეთი', 'Кобулети', 'https://en.wikipedia.org/wiki/Kobuleti', 1],
		[R.adjara, 'khelvachauri', 'Khelvachauri', 'ხელვაჩაური', 'Хелвачаури', 'https://en.wikipedia.org/wiki/Khelvachauri', 0],
		[R.adjara, 'keda', 'Keda', 'ქედა', 'Кеда', 'https://en.wikipedia.org/wiki/Keda_Municipality', 1],
		[R.adjara, 'shuakhevi', 'Shuakhevi', 'შუახევი', 'Шуахеви', 'https://en.wikipedia.org/wiki/Shuakhevi_Municipality', 0],
		[R.adjara, 'khulo', 'Khulo', 'ხულო', 'Хуло', 'https://en.wikipedia.org/wiki/Khulo_Municipality', 1],
		[R.guria, 'ozurgeti', 'Ozurgeti', 'ოზურგეთი', 'Озургети', 'https://en.wikipedia.org/wiki/Ozurgeti', 0],
		[R.guria, 'lanchkhuti', 'Lanchkhuti', 'ლანჩხუთი', 'Ланчхути', 'https://en.wikipedia.org/wiki/Lanchkhuti', 1],
		[R.guria, 'chokhatauri', 'Chokhatauri', 'ჩოხატაური', 'Чохатаури', 'https://en.wikipedia.org/wiki/Chokhatauri', 0],
		[R.imereti, 'kutaisi', 'Kutaisi', 'ქუთაისი', 'Кутаиси', 'https://en.wikipedia.org/wiki/Kutaisi', 1],
		[R.imereti, 'baghdati', 'Baghdati', 'ბაღდათი', 'Багдати', 'https://en.wikipedia.org/wiki/Baghdati', 0],
		[R.imereti, 'vani', 'Vani', 'ვანი', 'Вани', 'https://en.wikipedia.org/wiki/Vani', 1],
		[R.imereti, 'zestafoni', 'Zestafoni', 'ზესტაფონი', 'Зестафони', 'https://en.wikipedia.org/wiki/Zestafoni', 0],
		[R.imereti, 'terjola', 'Terjola', 'თერჯოლა', 'Терджола', 'https://en.wikipedia.org/wiki/Terjola', 1],
		[R.imereti, 'samtredia', 'Samtredia', 'სამტრედია', 'Самтредиа', 'https://en.wikipedia.org/wiki/Samtredia', 0],
		[R.imereti, 'sachkhere', 'Sachkhere', 'საჩხერე', 'Сачхере', 'https://en.wikipedia.org/wiki/Sachkhere', 1],
		[R.imereti, 'tkibuli', 'Tkibuli', 'ტყიბული', 'Ткибули', 'https://en.wikipedia.org/wiki/Tkibuli', 0],
		[R.imereti, 'tskaltubo', 'Tskaltubo', 'წყალტუბო', 'Цхалтубо', 'https://en.wikipedia.org/wiki/Tskaltubo', 1],
		[R.imereti, 'chiatura', 'Chiatura', 'ჭიათურა', 'Чиатура', 'https://en.wikipedia.org/wiki/Chiatura', 0],
		[R.imereti, 'kharagauli', 'Kharagauli', 'ხარაგაული', 'Харагаули', 'https://en.wikipedia.org/wiki/Kharagauli', 1],
		[R.imereti, 'khoni', 'Khoni', 'ხონი', 'Хони', 'https://en.wikipedia.org/wiki/Khoni', 0],
		[R.kakheti, 'telavi', 'Telavi', 'თელავი', 'Телави', 'https://en.wikipedia.org/wiki/Telavi', 1],
		[R.kakheti, 'akhmeta', 'Akhmeta', 'ახმეტა', 'Ахмета', 'https://en.wikipedia.org/wiki/Akhmeta', 0],
		[R.kakheti, 'gurjaani', 'Gurjaani', 'გურჯაანი', 'Гурджаани', 'https://en.wikipedia.org/wiki/Gurjaani', 1],
		[R.kakheti, 'dedoplistsqaro', 'Dedoplistsqaro', 'დედოფლისწყარო', 'Дедоплисцкаро', 'https://en.wikipedia.org/wiki/Dedoplistsqaro', 0],
		[R.kakheti, 'lagodekhi', 'Lagodekhi', 'ლაგოდეხი', 'Лагодехи', 'https://en.wikipedia.org/wiki/Lagodekhi', 1],
		[R.kakheti, 'sagarejo', 'Sagarejo', 'საგარეჯო', 'Сагареджо', 'https://en.wikipedia.org/wiki/Sagarejo', 0],
		[R.kakheti, 'signagi', 'Sighnaghi', 'სიღნაღი', 'Сигнахи', 'https://en.wikipedia.org/wiki/Sighnaghi', 1],
		[R.kakheti, 'kvareli', 'Kvareli', 'ყვარელი', 'Кварели', 'https://en.wikipedia.org/wiki/Kvareli', 0],
		[R.mtskhetaMtianeti, 'mtskheta', 'Mtskheta', 'მცხეთა', 'Мцхета', 'https://en.wikipedia.org/wiki/Mtskheta', 1],
		[R.mtskhetaMtianeti, 'dusheti', 'Dusheti', 'დუშეთი', 'Душети', 'https://en.wikipedia.org/wiki/Dusheti', 0],
		[R.mtskhetaMtianeti, 'tianeti', 'Tianeti', 'თიანეთი', 'Тианети', 'https://en.wikipedia.org/wiki/Tianeti', 1],
		[R.mtskhetaMtianeti, 'kazbegi', 'Kazbegi', 'ყაზბეგი', 'Казбеги', 'https://en.wikipedia.org/wiki/Stepantsminda', 0],
		[R.rachaLechkhumi, 'ambrolauri', 'Ambrolauri', 'ამბროლაური', 'Амбролаури', 'https://en.wikipedia.org/wiki/Ambrolauri', 1],
		[R.rachaLechkhumi, 'lentekhi', 'Lentekhi', 'ლენტეხი', 'Лентехи', 'https://en.wikipedia.org/wiki/Lentekhi', 0],
		[R.rachaLechkhumi, 'oni', 'Oni', 'ონი', 'Они', 'https://en.wikipedia.org/wiki/Oni,_Georgia', 1],
		[R.rachaLechkhumi, 'tsageri', 'Tsageri', 'ცაგერი', 'Цагери', 'https://en.wikipedia.org/wiki/Tsageri', 0],
		[R.samegrelo, 'poti', 'Poti', 'ფოთი', 'Поти', 'https://en.wikipedia.org/wiki/Poti', 1],
		[R.samegrelo, 'zugdidi', 'Zugdidi', 'ზუგდიდი', 'Зугдиди', 'https://en.wikipedia.org/wiki/Zugdidi', 0],
		[R.samegrelo, 'abasha', 'Abasha', 'აბაშა', 'Абаша', 'https://en.wikipedia.org/wiki/Abasha', 1],
		[R.samegrelo, 'martvili', 'Martvili', 'მარტვილი', 'Мартвили', 'https://en.wikipedia.org/wiki/Martvili', 0],
		[R.samegrelo, 'mestia', 'Mestia', 'მესტია', 'Местия', 'https://en.wikipedia.org/wiki/Mestia', 1],
		[R.samegrelo, 'senaki', 'Senaki', 'სენაკი', 'Сенаки', 'https://en.wikipedia.org/wiki/Senaki', 0],
		[R.samegrelo, 'chkhorotsku', 'Chkhorotsku', 'ჩხოროწყუ', 'Чхороцку', 'https://en.wikipedia.org/wiki/Chkhorotsku', 1],
		[R.samegrelo, 'tsalenjikha', 'Tsalenjikha', 'წალენჯიხა', 'Цаленджиха', 'https://en.wikipedia.org/wiki/Tsalenjikha', 0],
		[R.samegrelo, 'khobi', 'Khobi', 'ხობი', 'Хоби', 'https://en.wikipedia.org/wiki/Khobi', 1],
		[R.samtskhe, 'akhaltsikhe', 'Akhaltsikhe', 'ახალციხე', 'Ахалцихе', 'https://en.wikipedia.org/wiki/Akhaltsikhe', 0],
		[R.samtskhe, 'adigeni', 'Adigeni', 'ადიგენი', 'Адигени', 'https://en.wikipedia.org/wiki/Adigeni', 1],
		[R.samtskhe, 'aspindza', 'Aspindza', 'ასპინძა', 'Аспиндза', 'https://en.wikipedia.org/wiki/Aspindza', 0],
		[R.samtskhe, 'akhalkalaki', 'Akhalkalaki', 'ახალქალაქი', 'Ахалкалаки', 'https://en.wikipedia.org/wiki/Akhalkalaki', 1],
		[R.samtskhe, 'borjomi', 'Borjomi', 'ბორჯომი', 'Боржоми', 'https://en.wikipedia.org/wiki/Borjomi', 0],
		[R.samtskhe, 'ninotsminda', 'Ninotsminda', 'ნინოწმინდა', 'Ниноцминда', 'https://en.wikipedia.org/wiki/Ninotsminda', 1],
		[R.kvemoKartli, 'rustavi', 'Rustavi', 'რუსთავი', 'Рустави', 'https://en.wikipedia.org/wiki/Rustavi', 0],
		[R.kvemoKartli, 'bolnisi', 'Bolnisi', 'ბოლნისი', 'Болниси', 'https://en.wikipedia.org/wiki/Bolnisi', 1],
		[R.kvemoKartli, 'gardabani', 'Gardabani', 'გარდაბანი', 'Гардабани', 'https://en.wikipedia.org/wiki/Gardabani', 0],
		[R.kvemoKartli, 'dmanisi', 'Dmanisi', 'დმანისი', 'Дманиси', 'https://en.wikipedia.org/wiki/Dmanisi', 1],
		[R.kvemoKartli, 'tetritskaro', 'Tetritskaro', 'თეთრიწყარო', 'Тетрицкаро', 'https://en.wikipedia.org/wiki/Tetritskaro', 0],
		[R.kvemoKartli, 'marneuli', 'Marneuli', 'მარნეული', 'Марнеули', 'https://en.wikipedia.org/wiki/Marneuli', 1],
		[R.kvemoKartli, 'tsalka', 'Tsalka', 'წალკა', 'Цалка', 'https://en.wikipedia.org/wiki/Tsalka', 0],
		[R.shidaKartli, 'gori', 'Gori', 'გორი', 'Гори', 'https://en.wikipedia.org/wiki/Gori,_Georgia', 1],
		[R.shidaKartli, 'kaspi', 'Kaspi', 'კასპი', 'Каспи', 'https://en.wikipedia.org/wiki/Kaspi', 0],
		[R.shidaKartli, 'kareli', 'Kareli', 'ქარელი', 'Карели', 'https://en.wikipedia.org/wiki/Kareli,_Georgia', 1],
		[R.shidaKartli, 'khashuri', 'Khashuri', 'ხაშური', 'Хашури', 'https://en.wikipedia.org/wiki/Khashuri', 0],
	];

	for (const row of M) {
		const [parent, slug, en, ka, ru, wiki, variant] = row;
		posts.push(muni(parent, slug, { en, ka, ru }, wiki, variant));
	}
}
