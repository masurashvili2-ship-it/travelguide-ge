import type { TourCategoryId } from './tour-categories';
import type { WhatToDoCategoryId } from './what-to-do-categories';
import type { WhatToDoSeasonId } from './what-to-do-seasons';
import type { TourPhysicalRatingId } from './tour-physical-rating';

export type Locale = 'en' | 'ka' | 'ru';

export const localeNames: Record<Locale, string> = {
	en: 'English',
	ka: 'ქართული',
	ru: 'Русский',
};

export const ui: Record<
	Locale,
	{
		siteTitle: string;
		home: string;
		tours: string;
		/** Activities / ideas (parallel post type to tours) */
		whatToDo: string;
		map: string;
		login: string;
		register: string;
		admin: string;
		/** Account menu: submit content for review */
		contribute: string;
		logout: string;
		/** Site header: language dropdown trigger / region */
		navLanguage: string;
		/** Site header: account dropdown (login/register or profile) */
		navAccount: string;
		/** Mobile header: open/close main navigation drawer */
		navMainMenu: string;
		heroTitle: string;
		heroSubtitle: string;
		/** Meta description for /tours listing */
		toursMetaDescription: string;
		whatToDoMetaDescription: string;
		/** What-to-do listing: filter sidebar */
		whatToDoFiltersTitle: string;
		whatToDoFiltersApply: string;
		whatToDoFiltersClear: string;
		whatToDoFiltersEmpty: string;
		whatToDoFiltersShowing: string;
		/** Filter dropdown summary when nothing is selected */
		whatToDoFiltersAny: string;
		/** Filter dropdown when multiple values selected; use {n} for count */
		whatToDoFiltersNSelected: string;
		mapMetaDescription: string;
		mapIntro: string;
		/** Shown when no tour has coordinates for the current language */
		mapEmpty: string;
		featuredTours: string;
		viewTour: string;
		viewWhatToDo: string;
		duration: string;
		email: string;
		password: string;
		submitLogin: string;
		submitRegister: string;
		haveAccount: string;
		noAccount: string;
		adminDashboard: string;
		adminIntro: string;
		usersNote: string;
		toursInCms: string;
		role: string;
		backHome: string;
		/** Accessible name for footer links to CMS pages */
		footerSitePages: string;
		/** Small label on tour detail hero (like a category chip) */
		tourBadge: string;
		/** Section label for the photo gallery */
		gallerySection: string;
		/** Admin-only link next to post title → edit in panel */
		adminEditPostAria: string;
		/** Tour / what-to-do detail: share next to title */
		sharePage: string;
		sharePageAria: string;
		linkCopied: string;
		shareFailed: string;
		/** Accessible name for the full-screen image dialog */
		galleryLightboxLabel: string;
		galleryClose: string;
		galleryPrev: string;
		galleryNext: string;
		galleryZoomIn: string;
		galleryZoomOut: string;
		galleryZoomReset: string;
		/** aria-label for the zoom button group in the lightbox */
		galleryZoomToolbar: string;
		/** Photo count when n === 1 */
		galleryPhotoCountOne: string;
		/** Use {n} for the number when n > 1 */
		galleryPhotoCountMany: string;
		/** Shown on the 5th preview tile when more images exist only in the lightbox; {n} = extra count */
		galleryMorePhotos: string;
		/** Tour detail page: sidebar card heading */
		tourSidebarCategory: string;
		/** What-to-do detail: best season row */
		tourSidebarSeason: string;
		/** Main heading for the tour detail right sidebar */
		tourSidebarSectionTitle: string;
		tourSidebarPriceLabel: string;
		tourSidebarLocationLabel: string;
		tourSidebarViewOnMap: string;
		tourSidebarPhysicalRating: string;
		tourSidebarDrivingDistance: string;
		/** Localized display names for each tour category id */
		tourCategories: Record<TourCategoryId, string>;
		/** Localized names for “What to do” category ids */
		whatToDoCategories: Record<WhatToDoCategoryId, string>;
		whatToDoSeasons: Record<WhatToDoSeasonId, string>;
		tourPhysicalRatings: Record<TourPhysicalRatingId, string>;
		/** Tour detail: related tours below the article */
		similarTours: string;
		similarWhatToDo: string;
		/** What-to-do detail: right column contact / booking box heading */
		whatToDoContactAsideTitle: string;
		/** Reviews & comments (same thread for all locales, keyed by tour id) */
		tourReviewsTitle: string;
		tourReviewsOutOf: string;
		tourReviewsCount: string;
		tourReviewsLoginPrompt: string;
		tourReviewsRatingLabel: string;
		tourReviewsCommentLabel: string;
		tourReviewsSubmit: string;
		tourReviewsEmpty: string;
		tourReviewsSignedInAs: string;
		tourReviewsErrorGeneric: string;
		tourReviewsPosting: string;
		tourReviewsEdit: string;
		tourReviewsReply: string;
		tourReviewsSave: string;
		tourReviewsEdited: string;
		tourReviewsReplySubmit: string;
	}
> = {
	en: {
		siteTitle: 'Travel Guide Georgia',
		home: 'Home',
		tours: 'Tours',
		whatToDo: 'What to do',
		map: 'Map',
		login: 'Log in',
		register: 'Register',
		admin: 'Admin',
		contribute: 'Contribute',
		logout: 'Log out',
		navLanguage: 'Language',
		navAccount: 'Account',
		navMainMenu: 'Main menu',
		heroTitle: 'Discover Georgia',
		heroSubtitle: 'Curated tours, local insight, and routes across the Caucasus — from Tbilisi to the mountains.',
		toursMetaDescription:
			'Browse guided tours across Georgia — Tbilisi, mountains, wine routes, and day trips. Book your next experience.',
		whatToDoMetaDescription:
			'Things to do in Georgia — activities, sights, and local experiences beyond classic tours.',
		whatToDoFiltersTitle: 'Filter',
		whatToDoFiltersApply: 'Apply filters',
		whatToDoFiltersClear: 'Clear all',
		whatToDoFiltersEmpty: 'No activities match these filters. Try clearing or changing your choices.',
		whatToDoFiltersShowing: 'Showing {n} of {total}',
		whatToDoFiltersAny: 'Any',
		whatToDoFiltersNSelected: '{n} selected',
		mapMetaDescription:
			'Interactive map of our tours across Georgia — click a marker to open the tour page.',
		mapIntro: 'Pins link to each tour in your current language (only tours with coordinates and a translation appear).',
		mapEmpty: 'No tours on the map yet. Add latitude and longitude in the admin tour editor.',
		featuredTours: 'Featured tours',
		viewTour: 'View tour',
		viewWhatToDo: 'View',
		duration: 'Duration',
		email: 'Email',
		password: 'Password',
		submitLogin: 'Sign in',
		submitRegister: 'Create account',
		haveAccount: 'Already have an account?',
		noAccount: 'New here?',
		adminDashboard: 'Admin dashboard',
		adminIntro:
			'Manage tours in the admin panel (Add / Edit, pick language per tour). All tours live in data/tours.json; refresh after saving.',
		usersNote: 'Registered users are stored locally in data/users.json (demo only — use a real database in production).',
		toursInCms: 'Published tours',
		role: 'Role',
		backHome: 'Back to home',
		footerSitePages: 'Site pages',
		tourBadge: 'Tour',
		gallerySection: 'Photo gallery',
		adminEditPostAria: 'Edit in admin panel',
		sharePage: 'Share',
		sharePageAria: 'Share this page',
		linkCopied: 'Link copied',
		shareFailed: 'Could not share',
		galleryLightboxLabel: 'Gallery',
		galleryClose: 'Close',
		galleryPrev: 'Previous image',
		galleryNext: 'Next image',
		galleryZoomIn: 'Zoom in',
		galleryZoomOut: 'Zoom out',
		galleryZoomReset: 'Actual size',
		galleryZoomToolbar: 'Zoom',
		galleryPhotoCountOne: '1 photo',
		galleryPhotoCountMany: '{n} photos',
		galleryMorePhotos: '+{n} more',
		tourSidebarCategory: 'Category',
		tourSidebarSeason: 'Season',
		tourSidebarSectionTitle: 'At a glance',
		tourSidebarPriceLabel: 'Price',
		tourSidebarLocationLabel: 'Location',
		tourSidebarViewOnMap: 'View on map',
		tourSidebarPhysicalRating: 'Physical rating',
		tourSidebarDrivingDistance: 'Driving distance',
		tourCategories: {
			'cultural-historical': 'Cultural & Historical',
			'wine-food': 'Wine & Food',
			'adventure-nature': 'Adventure & Nature',
			'mountain-ski': 'Mountain & Ski',
			'religious-pilgrimage': 'Religious & Pilgrimage',
			'off-road': 'Off-road',
			'self-driving': 'Self Driving',
			'self-guided': 'Self Guided',
		},
		whatToDoCategories: {
			'hot-spring': 'Hot Spring',
			lake: 'Lake',
			river: 'River',
			'state-nature-reserve': 'State Nature Reserve',
			park: 'Park',
			'mountain-peaks': 'Mountain Peaks',
			'national-park': 'National Park',
			'natural-monument': 'Natural Monument',
			reservoir: 'Reservoir',
			hiking: 'Hiking',
			street: 'Street',
			'history-culture': 'History & Culture',
			'archaeological-site': 'Archaeological Site',
			cathedral: 'Cathedral',
			monastery: 'Monastery',
			'pilgrimage-site': 'Pilgrimage Site',
			church: 'Church',
			fortress: 'Fortress',
			museum: 'Museum',
			landmark: 'Landmark',
			statue: 'Statue',
		},
		whatToDoSeasons: {
			winter: 'Winter',
			spring: 'Spring',
			summer: 'Summer',
			autumn: 'Autumn',
		},
		tourPhysicalRatings: {
			easy: 'Easy',
			moderate: 'Moderate',
			hard: 'Hard',
		},
		similarTours: 'Similar tours',
		similarWhatToDo: 'More ideas',
		whatToDoContactAsideTitle: 'Contact & hours',
		tourReviewsTitle: 'Reviews',
		tourReviewsOutOf: 'out of 5',
		tourReviewsCount: '{n} reviews',
		tourReviewsLoginPrompt: 'Log in to leave a review and rating.',
		tourReviewsRatingLabel: 'Your rating',
		tourReviewsCommentLabel: 'Your comment',
		tourReviewsSubmit: 'Post review',
		tourReviewsEmpty: 'No reviews yet. Be the first to share your experience.',
		tourReviewsSignedInAs: 'Signed in as',
		tourReviewsErrorGeneric: 'Something went wrong. Please try again.',
		tourReviewsPosting: 'Posting…',
		tourReviewsEdit: 'Edit',
		tourReviewsReply: 'Reply',
		tourReviewsSave: 'Save',
		tourReviewsEdited: 'edited',
		tourReviewsReplySubmit: 'Post reply',
	},
	ka: {
		siteTitle: 'საქართველოს სამოგზაურო გიდი',
		home: 'მთავარი',
		tours: 'ტურები',
		whatToDo: 'რა გავაკეთოთ',
		map: 'რუკა',
		login: 'შესვლა',
		register: 'რეგისტრაცია',
		admin: 'ადმინი',
		contribute: 'წვლილი',
		logout: 'გასვლა',
		navLanguage: 'ენა',
		navAccount: 'ანგარიში',
		navMainMenu: 'მთავარი მენიუ',
		heroTitle: 'აღმოაჩინე საქართველო',
		heroSubtitle: 'შერჩეული ტურები და მარშრუტები — თბილისიდან მთებამდე.',
		toursMetaDescription: 'საქართველოს სამოგზაურო ტურები — თბილისი, მთები, ღვინის მარშრუტები და ერთდღიანი ტურები.',
		whatToDoMetaDescription: 'საქართველოში საქმიანობები, ადგილები და გამოცდილებები — ტურების გარდა.',
		whatToDoFiltersTitle: 'ფილტრი',
		whatToDoFiltersApply: 'გამოყენება',
		whatToDoFiltersClear: 'გასუფთავება',
		whatToDoFiltersEmpty: 'ამ ფილტრებს არაფერი შეესაბამება. სცადეთ პარამეტრების შეცვლა.',
		whatToDoFiltersShowing: 'ნაჩვენებია {n} / {total}',
		whatToDoFiltersAny: 'ნებისმიერი',
		whatToDoFiltersNSelected: 'არჩეულია {n}',
		mapMetaDescription: 'ინტერაქტიული რუკა — დააწკაპუნეთ მარკერზე ტურის გვერდის სანახავად.',
		mapIntro: 'ბმულები გახსნის ტურს არჩეულ ენაზე (ჩანს მხოლოდ კოორდინატებითა და თარგმანით).',
		mapEmpty: 'რუკაზე ჯერ არაფერია. დაამატეთ გრძედი და განედი ადმინის ტურის რედაქტორში.',
		featuredTours: 'რჩეული ტურები',
		viewTour: 'ტურის ნახვა',
		viewWhatToDo: 'ნახვა',
		duration: 'ხანგრძლივობა',
		email: 'ელფოსტა',
		password: 'პაროლი',
		submitLogin: 'შესვლა',
		submitRegister: 'ანგარიშის შექმნა',
		haveAccount: 'უკვე გაქვთ ანგარიში?',
		noAccount: 'ახალი ხართ?',
		adminDashboard: 'ადმინ პანელი',
		adminIntro:
			'ტურები ინახება data/tours.json-ში; ადმინიდან დაამატეთ/შეცვალეთ და აირჩიეთ ენა. შენახვის შემდეგ განაახლეთ გვერდი.',
		usersNote: 'დემო რეჟიმში მომხმარებლები ინახება data/users.json ფაილში.',
		toursInCms: 'გამოქვეყნებული ტურები',
		role: 'როლი',
		backHome: 'მთავარზე დაბრუნება',
		footerSitePages: 'გვერდები',
		tourBadge: 'ტური',
		gallerySection: 'ფოტო გალერეა',
		adminEditPostAria: 'რედაქტირება ადმინ პანელში',
		sharePage: 'გაზიარება',
		sharePageAria: 'გვერდის გაზიარება',
		linkCopied: 'ბმული დაკოპირდა',
		shareFailed: 'გაზიარება ვერ მოხერხდა',
		galleryLightboxLabel: 'გალერეა',
		galleryClose: 'დახურვა',
		galleryPrev: 'წინა ფოტო',
		galleryNext: 'შემდეგი ფოტო',
		galleryZoomIn: 'გადიდება',
		galleryZoomOut: 'დაპატარავება',
		galleryZoomReset: 'ნორმალური ზომა',
		galleryZoomToolbar: 'ზომა',
		galleryPhotoCountOne: '1 ფოტო',
		galleryPhotoCountMany: '{n} ფოტო',
		galleryMorePhotos: '+{n} სურათი',
		tourSidebarCategory: 'კატეგორია',
		tourSidebarSeason: 'სეზონი',
		tourSidebarSectionTitle: 'მოკლედ',
		tourSidebarPriceLabel: 'ფასი',
		tourSidebarLocationLabel: 'ლოკაცია',
		tourSidebarViewOnMap: 'რუკაზე ნახვა',
		tourSidebarPhysicalRating: 'ფიზიკური სირთულე',
		tourSidebarDrivingDistance: 'სავალის სიგრძე',
		tourCategories: {
			'cultural-historical': 'კულტურული და ისტორიული',
			'wine-food': 'ღვინო და სამზარეულო',
			'adventure-nature': 'თავგადასავალი და ბუნება',
			'mountain-ski': 'მთა და თხილამური',
			'religious-pilgrimage': 'რელიგიური და სალოცავი',
			'off-road': 'ოფროუდი',
			'self-driving': 'თვითმართვადი მარშრუტი',
			'self-guided': 'დამოუკიდებელი ტური',
		},
		whatToDoCategories: {
			'hot-spring': 'თერმული წყარო',
			lake: 'ტბა',
			river: 'მდინარე',
			'state-nature-reserve': 'სახელმწიფო ნაკრძალი',
			park: 'პარკი',
			'mountain-peaks': 'მთის წვეროები',
			'national-park': 'ეროვნული პარკი',
			'natural-monument': 'ბუნების ძეგლი',
			reservoir: 'წყალსაცავი',
			hiking: 'ფეხით სიარული',
			street: 'ქუჩა',
			'history-culture': 'ისტორია და კულტურა',
			'archaeological-site': 'არქეოლოგიური ძეგლი',
			cathedral: 'საკათედრო ტაძარი',
			monastery: 'მონასტერი',
			'pilgrimage-site': 'სალოცავი',
			church: 'ეკლესია',
			fortress: 'ციხე',
			museum: 'მუზეუმი',
			landmark: 'ღირსშესანიშნაობა',
			statue: 'ქანდაკება',
		},
		whatToDoSeasons: {
			winter: 'ზამთარი',
			spring: 'გაზაფხული',
			summer: 'ზაფხული',
			autumn: 'შემოდგომა',
		},
		tourPhysicalRatings: {
			easy: 'ადვილი',
			moderate: 'საშუალო',
			hard: 'რთული',
		},
		similarTours: 'მსგავსი ტურები',
		similarWhatToDo: 'მეტი იდეა',
		whatToDoContactAsideTitle: 'კონტაქტი და საათები',
		tourReviewsTitle: 'შეფასებები',
		tourReviewsOutOf: '5-დან',
		tourReviewsCount: '{n} შეფასება',
		tourReviewsLoginPrompt: 'შეფასებისა და კომენტარის დასატოვებლად შედით სისტემაში.',
		tourReviewsRatingLabel: 'თქვენი ქულა',
		tourReviewsCommentLabel: 'კომენტარი',
		tourReviewsSubmit: 'გამოქვეყნება',
		tourReviewsEmpty: 'ჯერ არავის დაუტოვებია შეფასება. იყავით პირველი.',
		tourReviewsSignedInAs: 'შესული ხართ როგორც',
		tourReviewsErrorGeneric: 'შეცდომა მოხდა. სცადეთ ხელახლა.',
		tourReviewsPosting: 'იგზავნება…',
		tourReviewsEdit: 'რედაქტირება',
		tourReviewsReply: 'პასუხი',
		tourReviewsSave: 'შენახვა',
		tourReviewsEdited: 'რედაქტირებული',
		tourReviewsReplySubmit: 'პასუხის გაგზავნა',
	},
	ru: {
		siteTitle: 'Путеводитель по Грузии',
		home: 'Главная',
		tours: 'Туры',
		whatToDo: 'Чем заняться',
		map: 'Карта',
		login: 'Вход',
		register: 'Регистрация',
		admin: 'Админ',
		contribute: 'Предложить материал',
		logout: 'Выход',
		navLanguage: 'Язык',
		navAccount: 'Аккаунт',
		navMainMenu: 'Главное меню',
		heroTitle: 'Откройте Грузию',
		heroSubtitle: 'Подборка туров и маршрутов — от Тбилиси до гор Кавказа.',
		toursMetaDescription:
			'Экскурсии и туры по Грузии — Тбилиси, Кавказ, винные маршруты и однодневные поездки.',
		whatToDoMetaDescription:
			'Чем заняться в Грузии — активности, места и впечатления помимо классических туров.',
		whatToDoFiltersTitle: 'Фильтр',
		whatToDoFiltersApply: 'Применить',
		whatToDoFiltersClear: 'Сбросить всё',
		whatToDoFiltersEmpty: 'Ничего не подходит под выбранные фильтры. Измените или сбросьте их.',
		whatToDoFiltersShowing: 'Показано {n} из {total}',
		whatToDoFiltersAny: 'Любой',
		whatToDoFiltersNSelected: 'Выбрано: {n}',
		mapMetaDescription:
			'Интерактивная карта туров по Грузии — нажмите на маркер, чтобы открыть страницу тура.',
		mapIntro: 'Ссылки ведут на тур на текущем языке (показываются туры с координатами и переводом).',
		mapEmpty: 'На карте пока нет туров. Укажите широту и долготу в админке при редактировании тура.',
		featuredTours: 'Избранные туры',
		viewTour: 'Подробнее',
		viewWhatToDo: 'Смотреть',
		duration: 'Длительность',
		email: 'Эл. почта',
		password: 'Пароль',
		submitLogin: 'Войти',
		submitRegister: 'Создать аккаунт',
		haveAccount: 'Уже есть аккаунт?',
		noAccount: 'Впервые здесь?',
		adminDashboard: 'Панель администратора',
		adminIntro:
			'Все туры в одном файле data/tours.json; в админке добавляйте/редактируйте и выбирайте язык. После сохранения обновите страницу.',
		usersNote: 'В демо пользователи хранятся в data/users.json; в продакшене нужна БД.',
		toursInCms: 'Опубликованные туры',
		role: 'Роль',
		backHome: 'На главную',
		footerSitePages: 'Страницы',
		tourBadge: 'Тур',
		gallerySection: 'Фотогалерея',
		adminEditPostAria: 'Редактировать в админ-панели',
		sharePage: 'Поделиться',
		sharePageAria: 'Поделиться страницей',
		linkCopied: 'Ссылка скопирована',
		shareFailed: 'Не удалось поделиться',
		galleryLightboxLabel: 'Галерея',
		galleryClose: 'Закрыть',
		galleryPrev: 'Предыдущее фото',
		galleryNext: 'Следующее фото',
		galleryZoomIn: 'Увеличить',
		galleryZoomOut: 'Уменьшить',
		galleryZoomReset: 'Исходный размер',
		galleryZoomToolbar: 'Масштаб',
		galleryPhotoCountOne: '1 фото',
		galleryPhotoCountMany: '{n} фото',
		galleryMorePhotos: 'ещё {n}',
		tourSidebarCategory: 'Категория',
		tourSidebarSeason: 'Сезон',
		tourSidebarSectionTitle: 'Кратко',
		tourSidebarPriceLabel: 'Цена',
		tourSidebarLocationLabel: 'Локация',
		tourSidebarViewOnMap: 'На карте',
		tourSidebarPhysicalRating: 'Физическая нагрузка',
		tourSidebarDrivingDistance: 'Пробег',
		tourCategories: {
			'cultural-historical': 'Культура и история',
			'wine-food': 'Вино и гастрономия',
			'adventure-nature': 'Приключения и природа',
			'mountain-ski': 'Горы и лыжи',
			'religious-pilgrimage': 'Религия и паломничество',
			'off-road': 'Офроуд',
			'self-driving': 'Самостоятельное вождение',
			'self-guided': 'Самостоятельный тур',
		},
		whatToDoCategories: {
			'hot-spring': 'Горячий источник',
			lake: 'Озеро',
			river: 'Река',
			'state-nature-reserve': 'Государственный заповедник',
			park: 'Парк',
			'mountain-peaks': 'Горные вершины',
			'national-park': 'Национальный парк',
			'natural-monument': 'Памятник природы',
			reservoir: 'Водохранилище',
			hiking: 'Пеший туризм',
			street: 'Улица',
			'history-culture': 'История и культура',
			'archaeological-site': 'Археологический памятник',
			cathedral: 'Собор',
			monastery: 'Монастырь',
			'pilgrimage-site': 'Паломническое место',
			church: 'Церковь',
			fortress: 'Крепость',
			museum: 'Музей',
			landmark: 'Достопримечательность',
			statue: 'Памятник / статуя',
		},
		whatToDoSeasons: {
			winter: 'Зима',
			spring: 'Весна',
			summer: 'Лето',
			autumn: 'Осень',
		},
		tourPhysicalRatings: {
			easy: 'Лёгкий',
			moderate: 'Средний',
			hard: 'Сложный',
		},
		similarTours: 'Похожие туры',
		similarWhatToDo: 'Ещё идеи',
		whatToDoContactAsideTitle: 'Контакты и часы',
		tourReviewsTitle: 'Отзывы',
		tourReviewsOutOf: 'из 5',
		tourReviewsCount: '{n} отзывов',
		tourReviewsLoginPrompt: 'Войдите, чтобы оставить отзыв и оценку.',
		tourReviewsRatingLabel: 'Ваша оценка',
		tourReviewsCommentLabel: 'Комментарий',
		tourReviewsSubmit: 'Опубликовать',
		tourReviewsEmpty: 'Пока нет отзывов. Оставьте первый.',
		tourReviewsSignedInAs: 'Вы вошли как',
		tourReviewsErrorGeneric: 'Не получилось. Попробуйте ещё раз.',
		tourReviewsPosting: 'Публикация…',
		tourReviewsEdit: 'Правка',
		tourReviewsReply: 'Ответить',
		tourReviewsSave: 'Сохранить',
		tourReviewsEdited: 'изменено',
		tourReviewsReplySubmit: 'Отправить ответ',
	},
};
