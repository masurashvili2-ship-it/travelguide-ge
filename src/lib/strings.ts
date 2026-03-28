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
		/** Regions, municipalities, and villages (administrative geography) */
		regions: string;
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
		regionsMetaDescription: string;
		regionsIntro: string;
		regionsLevelRegion: string;
		regionsLevelMunicipality: string;
		regionsLevelVillage: string;
		regionsFilterAllTypes: string;
		regionsChildrenMunicipalities: string;
		regionsChildrenVillages: string;
		/** What-to-do detail sidebar: linked region/municipality/village row label */
		tourSidebarPlaceLinks: string;
		/** Region/municipality/village detail: grid of related activities */
		regionsWhatToDoInPlace: string;
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
		/** Interactive map: kind tabs */
		mapFilterAll: string;
		mapFilterWhatToDo: string;
		mapFilterRegions: string;
		mapFilterActivityTypes: string;
		mapFilterClear: string;
		/** Map filter count: use {visible} and {total} */
		mapFilterShowing: string;
		mapFilterHint: string;
		featuredTours: string;
		viewTour: string;
		viewWhatToDo: string;
		viewRegion: string;
		duration: string;
		email: string;
		password: string;
		submitLogin: string;
		submitRegister: string;
		/** Login form: wrong email/password */
		loginErrorInvalidCredentials: string;
		/** Toast after successful sign-in */
		authSignedInToast: string;
		/** Toast after successful registration */
		authRegisteredToast: string;
		registerErrorInvalidEmail: string;
		registerErrorEmailTaken: string;
		registerErrorPasswordShort: string;
		registerErrorGeneric: string;
		registerErrorPasswordMismatch: string;
		registerErrorTermsRequired: string;
		displayName: string;
		passwordConfirm: string;
		authOrContinueWith: string;
		continueWithGoogle: string;
		registerPolicyAgree: string;
		registerPolicyEnd: string;
		policyPageTitle: string;
		policyMetaDescription: string;
		footerPolicy: string;
		loginErrorGoogleFailed: string;
		loginErrorGoogleDenied: string;
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
		/** Footer column headings */
		footerColExplore: string;
		footerColCompany: string;
		/** Short “about” blurb next to the logo */
		footerAboutText: string;
		/** Contact page */
		contactPageTitle: string;
		contactMetaDescription: string;
		contactFormName: string;
		contactFormEmail: string;
		contactFormSubject: string;
		contactFormMessage: string;
		contactFormSend: string;
		contactFormSuccess: string;
		contactFormError: string;
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
		/** Tour / what-to-do detail hero: mobile pill to open the photo lightbox */
		postHeroOpenGallery: string;
		/** Tour detail page: sidebar card heading */
		tourSidebarCategory: string;
		/** What-to-do detail: best season row */
		tourSidebarSeason: string;
		/** Main heading for the tour detail right sidebar */
		tourSidebarSectionTitle: string;
		tourSidebarPriceLabel: string;
		tourSidebarLocationLabel: string;
		tourSidebarViewOnMap: string;
		/** What-to-do (and previews): sidebar row label for Google directions */
		tourSidebarDirections: string;
		tourSidebarGetDirections: string;
		/** Tour / what-to-do detail: embedded map above reviews */
		detailOnMapHeading: string;
		/** Map marker popup link text */
		mapPopupViewDetails: string;
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
		/** Shown instead of the review form when the user already has a top-level review */
		tourReviewsAlreadyReviewedTitle: string;
		tourReviewsAlreadyReviewedHint: string;
		tourReviewsDelete: string;
		tourReviewsDeleting: string;
		tourReviewsDeleteConfirm: string;
		/** Account menu: recent sign-ins and reviews */
		navActivityLog: string;
		navDashboard: string;
		navMessages: string;
		accountDashboardTitle: string;
		accountDashboardIntro: string;
		accountProfileTitle: string;
		accountDisplayNameHelp: string;
		accountSave: string;
		accountSaved: string;
		accountBookingsTitle: string;
		accountBookingAsCustomer: string;
		accountBookingAsGuide: string;
		accountBookingsNone: string;
		accountView: string;
		accountSubmissionsTitle: string;
		accountEdit: string;
		accountSubmissionsNone: string;
		accountContributeCta: string;
		accountGuideTitle: string;
		accountGuideNone: string;
		accountCreateGuide: string;
		accountPackagesTitle: string;
		accountPackagesCta: string;
		accountMessagesTitle: string;
		accountMessagesIntro: string;
		accountMsgOpen: string;
		accountMsgNew: string;
		accountBookingMessage: string;
		accountMsgEmpty: string;
		accountThreadWith: string;
		accountBack: string;
		accountSend: string;
		accountMessagePlaceholder: string;
		accountPeerLabel: string;
		accountBookingRefShort: string;
		accountSubmissionKindTour: string;
		accountSubmissionKindWhatToDo: string;
		accountSubmissionKindPage: string;
		accountSubmissionKindGuide: string;
		accountStatusPrefix: string;
		activityLogTitle: string;
		activityLogIntro: string;
		activityLogEmpty: string;
		activityKindLogin: string;
		activityKindReviewPosted: string;
		activityKindReplyPosted: string;
		activityViewPost: string;
		activityLogLoginDetail: string;
		activityLogPostLabel: string;
		activityLogTypeLabel: string;
		activityLogTypeTour: string;
		activityLogTypeWhatToDo: string;
		activityLogSlugLabel: string;
		activityLogRatingLabel: string;
		activityLogPreviewLabel: string;
		activityLogPostRemoved: string;
		/** Header + /search */
		search: string;
		searchPlaceholder: string;
		searchTitle: string;
		searchMetaDescription: string;
		searchButton: string;
		searchAriaLabel: string;
		searchIntro: string;
		searchEmptyQuery: string;
		searchNoResults: string;
		/** "{n}" = number of hits */
		searchResultsCount: string;
		/** Result badge */
		searchKindTour: string;
		searchKindWhatToDo: string;
		searchKindRegion: string;
		searchKindPage: string;
		searchKindGuide: string;
		/** Tour guides section */
		guides: string;
		guidesMetaDescription: string;
		guidesIntro: string;
		/** Guide detail badge (like tourBadge) */
		guideBadge: string;
		viewGuide: string;
		/** Guide detail sidebar */
		guideLanguages: string;
		guideExperience: string;
		guideBaseLocation: string;
		guideSpecialties: string;
		guidePriceFrom: string;
		guideContactTitle: string;
		guideVerified: string;
	}
> = {
	en: {
		siteTitle: 'Travel Guide Georgia',
		home: 'Home',
		tours: 'Tours',
		whatToDo: 'What to do',
		regions: 'Regions',
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
		regionsMetaDescription:
			'Explore Georgia by region — autonomous republics, municipalities, and villages with maps and local context.',
		regionsIntro: 'Browse regions, municipalities, and villages. Each place can include facts, photos, and a detailed description.',
		regionsLevelRegion: 'Region',
		regionsLevelMunicipality: 'Municipality',
		regionsLevelVillage: 'Village',
		regionsFilterAllTypes: 'All types',
		regionsChildrenMunicipalities: 'Municipalities',
		regionsChildrenVillages: 'Villages & settlements',
		tourSidebarPlaceLinks: 'Places',
		regionsWhatToDoInPlace: 'What to do',
		whatToDoFiltersTitle: 'Filter',
		whatToDoFiltersApply: 'Apply filters',
		whatToDoFiltersClear: 'Clear all',
		whatToDoFiltersEmpty: 'No activities match these filters. Try clearing or changing your choices.',
		whatToDoFiltersShowing: 'Showing {n} of {total}',
		whatToDoFiltersAny: 'Any',
		whatToDoFiltersNSelected: '{n} selected',
		mapMetaDescription:
			'Interactive map of tours, things to do, and places in Georgia — click a marker for details, photo, and link.',
		mapIntro:
			'Pins link to tours, “What to do” entries, and region pages in your current language (only items with coordinates and a translation appear).',
		mapEmpty:
			'Nothing on the map yet. Add latitude and longitude in the admin editor for a tour, activity, or place.',
		mapFilterAll: 'All',
		mapFilterWhatToDo: 'What to do',
		mapFilterRegions: 'Regions',
		mapFilterActivityTypes: 'Activity categories',
		mapFilterClear: 'Clear filters',
		mapFilterShowing: 'Showing {visible} of {total} on the map',
		mapFilterHint:
			'Use “What to do” to show only activities, or “Regions” for administrative places. Activity checkboxes filter only activity pins; tours and regions stay visible when none are selected.',
		featuredTours: 'Featured tours',
		viewTour: 'View tour',
		viewWhatToDo: 'View',
		viewRegion: 'View place',
		duration: 'Duration',
		email: 'Email',
		password: 'Password',
		submitLogin: 'Sign in',
		submitRegister: 'Create account',
		loginErrorInvalidCredentials: 'That email or password is not correct. Try again.',
		authSignedInToast: 'You’re signed in.',
		authRegisteredToast: 'Account created — you’re signed in.',
		registerErrorInvalidEmail: 'Enter a valid email address.',
		registerErrorEmailTaken: 'That email is already registered. Log in instead.',
		registerErrorPasswordShort: 'Password must be at least 8 characters.',
		registerErrorGeneric: 'Could not create the account. Please try again.',
		registerErrorPasswordMismatch: 'Passwords do not match.',
		registerErrorTermsRequired: 'You must accept the privacy policy to register.',
		displayName: 'Display name',
		passwordConfirm: 'Confirm password',
		authOrContinueWith: 'or continue with',
		continueWithGoogle: 'Google',
		registerPolicyAgree: 'I have read and agree to the',
		registerPolicyEnd: '.',
		policyPageTitle: 'Privacy policy & terms',
		policyMetaDescription:
			'How Travel Guide Georgia handles your data, cookies, and the rules for using this site.',
		footerPolicy: 'Privacy policy',
		loginErrorGoogleFailed: 'Google sign-in did not complete. Please try again.',
		loginErrorGoogleDenied: 'Google sign-in was cancelled.',
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
		footerColExplore: 'Explore',
		footerColCompany: 'Company',
		footerAboutText:
			'Independent guide to Georgia — tours, regions, activities, and maps. Made for travelers exploring the Caucasus.',
		contactPageTitle: 'Contact us',
		contactMetaDescription: 'Get in touch with the Travel Guide Georgia team.',
		contactFormName: 'Your name',
		contactFormEmail: 'Your email',
		contactFormSubject: 'Subject',
		contactFormMessage: 'Message',
		contactFormSend: 'Send message',
		contactFormSuccess: 'Message sent! We\'ll get back to you soon.',
		contactFormError: 'Something went wrong. Please try again or email us directly.',
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
		postHeroOpenGallery: 'Open gallery',
		tourSidebarCategory: 'Category',
		tourSidebarSeason: 'Season',
		tourSidebarSectionTitle: 'At a glance',
		tourSidebarPriceLabel: 'Price',
		tourSidebarLocationLabel: 'Location',
		tourSidebarViewOnMap: 'View on map',
		tourSidebarDirections: 'Directions',
		tourSidebarGetDirections: 'Get directions',
		detailOnMapHeading: 'On the map',
		mapPopupViewDetails: 'View details',
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
		tourReviewsAlreadyReviewedTitle: "You've already left feedback here.",
		tourReviewsAlreadyReviewedHint:
			'To change it, use Edit or Delete on your review in the list below.',
		tourReviewsDelete: 'Delete',
		tourReviewsDeleting: 'Deleting…',
		tourReviewsDeleteConfirm: 'Delete this comment and all replies under it?',
		navActivityLog: 'Activity',
		navDashboard: 'Dashboard',
		navMessages: 'Messages',
		accountDashboardTitle: 'Your dashboard',
		accountDashboardIntro:
			'Update your profile, review bookings, continue editing your submissions, and exchange messages with guides or travelers you share a booking with.',
		accountProfileTitle: 'Profile',
		accountDisplayNameHelp: 'Optional name shown in a few places on the site. Your login email stays the same.',
		accountSave: 'Save',
		accountSaved: 'Profile updated.',
		accountBookingsTitle: 'Bookings',
		accountBookingAsCustomer: 'As a traveler',
		accountBookingAsGuide: 'As a guide',
		accountBookingsNone: 'No bookings here yet.',
		accountView: 'View',
		accountSubmissionsTitle: 'Content submissions',
		accountEdit: 'Edit',
		accountSubmissionsNone: 'You have not submitted any content for review yet.',
		accountContributeCta: 'Go to Contribute',
		accountGuideTitle: 'Guide profile',
		accountGuideNone: 'You have not created a guide profile yet.',
		accountCreateGuide: 'Create guide profile',
		accountPackagesTitle: 'Tour packages',
		accountPackagesCta: 'Manage packages',
		accountMessagesTitle: 'Messages',
		accountMessagesIntro:
			'Chat on the site with someone you share a booking with. Both people need an account; the traveler’s booking email must match their login email.',
		accountMsgOpen: 'Open inbox',
		accountMsgNew: 'New conversation',
		accountBookingMessage: 'Message about this booking',
		accountMsgEmpty: 'No conversations yet. Open a thread from a booking when you are logged in, or start one below.',
		accountThreadWith: 'With',
		accountBack: 'Back',
		accountSend: 'Send',
		accountMessagePlaceholder: 'Write your message…',
		accountPeerLabel: 'Contact',
		accountBookingRefShort: 'Booking',
		accountSubmissionKindTour: 'Tour',
		accountSubmissionKindWhatToDo: 'What to do',
		accountSubmissionKindPage: 'Page',
		accountSubmissionKindGuide: 'Guide',
		accountStatusPrefix: 'Status',
		activityLogTitle: 'Your activity',
		activityLogIntro: 'Recent sign-ins and reviews you posted on the site.',
		activityLogEmpty: 'No activity recorded yet. Sign in and post a review to see entries here.',
		activityKindLogin: 'Signed in',
		activityKindReviewPosted: 'Posted a review',
		activityKindReplyPosted: 'Posted a reply',
		activityViewPost: 'View post',
		activityLogLoginDetail: 'You signed in to your account.',
		activityLogPostLabel: 'Post',
		activityLogTypeLabel: 'Type',
		activityLogTypeTour: 'Tour',
		activityLogTypeWhatToDo: 'What to do',
		activityLogSlugLabel: 'Page slug',
		activityLogRatingLabel: 'Your rating',
		activityLogPreviewLabel: 'What you wrote',
		activityLogPostRemoved: 'This page is no longer on the site; details are from when the activity was saved.',
		search: 'Search',
		searchPlaceholder: 'Search tours, places, pages…',
		searchTitle: 'Search',
		searchMetaDescription: 'Search tours, activities, regions, and pages on Travel Guide Georgia.',
		searchButton: 'Search',
		searchAriaLabel: 'Search the site',
		searchIntro: 'Find tours, things to do, regions, and site pages in your language.',
		searchEmptyQuery: 'Type a word or phrase above and press Search.',
		searchNoResults: 'No pages matched. Try different words or browse the menu.',
		searchResultsCount: '{n} results',
		searchKindTour: 'Tour',
		searchKindWhatToDo: 'What to do',
		searchKindRegion: 'Place',
		searchKindPage: 'Page',
		searchKindGuide: 'Guide',
		guides: 'Guides',
		guidesMetaDescription: 'Find local tour guides in Georgia — experienced guides for hikes, cultural tours, wine routes, and more.',
		guidesIntro: 'Browse professional tour guides available in Georgia. Filter by specialty, language, or location.',
		guideBadge: 'Guide',
		viewGuide: 'View profile',
		guideLanguages: 'Languages',
		guideExperience: 'Experience',
		guideBaseLocation: 'Based in',
		guideSpecialties: 'Specialties',
		guidePriceFrom: 'Price from',
		guideContactTitle: 'Contact & booking',
		guideVerified: 'Verified guide',
	},
	ka: {
		siteTitle: 'საქართველოს სამოგზაურო გიდი',
		home: 'მთავარი',
		tours: 'ტურები',
		whatToDo: 'რა გავაკეთოთ',
		regions: 'რეგიონები',
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
		regionsMetaDescription:
			'საქართველოს რეგიონები, მუნიციპალიტეტები და სოფლები — რუკები და ადგილობრივი კონტექსტი.',
		regionsIntro: 'დაათვალიერეთ რეგიონები, მუნიციპალიტეტები და სოფლები — ფაქტები, ფოტოები და აღწერა.',
		regionsLevelRegion: 'რეგიონი',
		regionsLevelMunicipality: 'მუნიციპალიტეტი',
		regionsLevelVillage: 'სოფელი',
		regionsFilterAllTypes: 'ყველა ტიპი',
		regionsChildrenMunicipalities: 'მუნიციპალიტეტები',
		regionsChildrenVillages: 'სოფლები და დასახლებები',
		tourSidebarPlaceLinks: 'ადგილები',
		regionsWhatToDoInPlace: 'რა გავაკეთოთ',
		whatToDoFiltersTitle: 'ფილტრი',
		whatToDoFiltersApply: 'გამოყენება',
		whatToDoFiltersClear: 'გასუფთავება',
		whatToDoFiltersEmpty: 'ამ ფილტრებს არაფერი შეესაბამება. სცადეთ პარამეტრების შეცვლა.',
		whatToDoFiltersShowing: 'ნაჩვენებია {n} / {total}',
		whatToDoFiltersAny: 'ნებისმიერი',
		whatToDoFiltersNSelected: 'არჩეულია {n}',
		mapMetaDescription:
			'ინტერაქტიული რუკა — ტურები, აქტივობები და ადმინისტრაციული ადგილები საქართველოში.',
		mapIntro:
			'ბმულები გახსნის ტურს, „რა გავაკეთოთ“ ჩანაწერს ან რეგიონის გვერდს არჩეულ ენაზე (კოორდინატები და თარგმანი საჭიროა).',
		mapEmpty:
			'რუკაზე ჯერ არაფერია. დაამატეთ კოორდინატები ადმინის რედაქტორში ტურზე, აქტივობაზე ან ადგილზე.',
		mapFilterAll: 'ყველა',
		mapFilterWhatToDo: 'რა გავაკეთოთ',
		mapFilterRegions: 'რეგიონები',
		mapFilterActivityTypes: 'აქტივობის კატეგორიები',
		mapFilterClear: 'ფილტრის გასუფთავება',
		mapFilterShowing: 'რუკაზე ნაჩვენებია {visible} / {total}',
		mapFilterHint:
			'„რა გავაკეთოთ“ — მხოლოდ აქტივობები; „რეგიონები“ — ადმინისტრაციული ადგილები. აქტივობის კატეგორიები მხოლოდ ამ ნიშნებს ფილტრავს; ტურები და რეგიონები რჩება ხილული, თუ არაფერია არჩეული.',
		featuredTours: 'რჩეული ტურები',
		viewTour: 'ტურის ნახვა',
		viewWhatToDo: 'ნახვა',
		viewRegion: 'ადგილის ნახვა',
		duration: 'ხანგრძლივობა',
		email: 'ელფოსტა',
		password: 'პაროლი',
		submitLogin: 'შესვლა',
		submitRegister: 'ანგარიშის შექმნა',
		loginErrorInvalidCredentials: 'ელფოსტა ან პაროლი არასწორია. სცადეთ ხელახლა.',
		authSignedInToast: 'წარმატებით შეხვედით.',
		authRegisteredToast: 'ანგარიში შეიქმნა — ხართ შესული.',
		registerErrorInvalidEmail: 'მიუთითეთ სწორი ელფოსტა.',
		registerErrorEmailTaken: 'ეს ელფოსტა უკვე რეგისტრირებულია. შედით სისტემაში.',
		registerErrorPasswordShort: 'პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს.',
		registerErrorGeneric: 'ანგარიშის შექმნა ვერ მოხერხდა. სცადეთ ხელახლა.',
		registerErrorPasswordMismatch: 'პაროლები არ ემთხვევა.',
		registerErrorTermsRequired: 'რეგისტრაციისთვის უნდა დაეთანხმოთ კონფიდენციალურობის პოლიტიკას.',
		displayName: 'სახელი (სურვილისამებრ)',
		passwordConfirm: 'გაიმეორეთ პაროლი',
		authOrContinueWith: 'ან გააგრძელეთ',
		continueWithGoogle: 'Google-ით',
		registerPolicyAgree: 'გავიცანი და ვეთანხმები',
		registerPolicyEnd: '.',
		policyPageTitle: 'კონფიდენციალურობა და პირობები',
		policyMetaDescription: 'როგორ ვიყენებთ თქვენს მონაცემებს და საიტის გამოყენების წესები.',
		footerPolicy: 'კონფიდენციალურობა',
		loginErrorGoogleFailed: 'Google-ით შესვლა ვერ დასრულდა. სცადეთ ხელახლა.',
		loginErrorGoogleDenied: 'Google-ით შესვლა გაუქმდა.',
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
		footerColExplore: 'ნავიგაცია',
		footerColCompany: 'ჩვენ შესახებ',
		footerAboutText:
			'დამოუკიდებელი გიდი საქართველოში — ტურები, რეგიონები, აქტივობები და რუკა. კავკასიის მოგზაურებისთვის.',
		contactPageTitle: 'დაგვიკავშირდით',
		contactMetaDescription: 'დაუკავშირდით Travel Guide Georgia-ს გუნდს.',
		contactFormName: 'სახელი',
		contactFormEmail: 'ელ-ფოსტა',
		contactFormSubject: 'თემა',
		contactFormMessage: 'შეტყობინება',
		contactFormSend: 'გაგზავნა',
		contactFormSuccess: 'შეტყობინება გაიგზავნა! მალე დაგიკავშირდებით.',
		contactFormError: 'დაფიქსირდა შეცდომა. სცადეთ ხელახლა ან მოგვწერეთ პირდაპირ.',
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
		postHeroOpenGallery: 'გალერეის გახსნა',
		tourSidebarCategory: 'კატეგორია',
		tourSidebarSeason: 'სეზონი',
		tourSidebarSectionTitle: 'მოკლედ',
		tourSidebarPriceLabel: 'ფასი',
		tourSidebarLocationLabel: 'ლოკაცია',
		tourSidebarViewOnMap: 'რუკაზე ნახვა',
		tourSidebarDirections: 'მიმართულებები',
		tourSidebarGetDirections: 'მიმართულების მიღება',
		detailOnMapHeading: 'რუკაზე',
		mapPopupViewDetails: 'დეტალები',
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
		tourReviewsAlreadyReviewedTitle: 'თქვენ უკვე დატოვეთ გამოხმაურება ამ გვერდზე.',
		tourReviewsAlreadyReviewedHint:
			'შესაცვლელად გამოიყენეთ რედაქტირება ან წაშლა თქვენს შეფასებაზე ქვემოთ სიაში.',
		tourReviewsDelete: 'წაშლა',
		tourReviewsDeleting: 'იშლება…',
		tourReviewsDeleteConfirm: 'წავშალოთ ეს კომენტარი და ყველა ქვედა პასუხი?',
		navActivityLog: 'აქტივობა',
		navDashboard: 'პანელი',
		navMessages: 'შეტყობინებები',
		accountDashboardTitle: 'თქვენი პანელი',
		accountDashboardIntro:
			'განაახლეთ პროფილი, ნახეთ ჯავშნები, გააგრძელეთ კონტენტის რედაქტირება და დაუკავშირდით გიდებს ან მოგზაურებს, ვისთანაც გაქვთ საერთო ჯავშანი.',
		accountProfileTitle: 'პროფილი',
		accountDisplayNameHelp: 'არასავალდებულო სახელი. ელფოსტა რჩება შესვლისთვის.',
		accountSave: 'შენახვა',
		accountSaved: 'პროფილი განახლდა.',
		accountBookingsTitle: 'ჯავშნები',
		accountBookingAsCustomer: 'მოგზაურად',
		accountBookingAsGuide: 'გიდად',
		accountBookingsNone: 'ჯერ არაფერია.',
		accountView: 'ნახვა',
		accountSubmissionsTitle: 'კონტენტის გაგზავნები',
		accountEdit: 'რედაქტირება',
		accountSubmissionsNone: 'ჯერ არ გაგიგზავნიათ კონტენტი შესაბამისად.',
		accountContributeCta: 'წვლილის გვერდზე',
		accountGuideTitle: 'გიდის პროფილი',
		accountGuideNone: 'გიდის პროფილი ჯერ არ გაქვთ.',
		accountCreateGuide: 'პროფილის შექმნა',
		accountPackagesTitle: 'ტურის პაკეტები',
		accountPackagesCta: 'პაკეტების მართვა',
		accountMessagesTitle: 'შეტყობინებები',
		accountMessagesIntro:
			'საუბარი შესაძლებელია იმ პირთან, ვისთანაც გაქვთ საერთო ჯავშანი. ორივეს სჭირდება ანგარიში; მოგზაურის ელფოსტა უნდა ემთხვეოდეს შესვლის ელფოსტას.',
		accountMsgOpen: 'ფოსტის ყუთი',
		accountMsgNew: 'ახალი საუბარი',
		accountBookingMessage: 'შეტყობინება ამ ჯავშანზე',
		accountMsgEmpty: 'ჯერ არაფერია. დაიწყეთ ჯავშნის გვერდიდან ან ქვემოთ.',
		accountThreadWith: 'კონტაქტი',
		accountBack: 'უკან',
		accountSend: 'გაგზავნა',
		accountMessagePlaceholder: 'დაწერეთ შეტყობინება…',
		accountPeerLabel: 'ვისთან',
		accountBookingRefShort: 'ჯავშანი',
		accountSubmissionKindTour: 'ტური',
		accountSubmissionKindWhatToDo: 'რა გავაკეთოთ',
		accountSubmissionKindPage: 'გვერდი',
		accountSubmissionKindGuide: 'გიდი',
		accountStatusPrefix: 'სტატუსი',
		activityLogTitle: 'თქვენი აქტივობა',
		activityLogIntro: 'ბოლო შესვლები და გამოქვეყნებული შეფასებები.',
		activityLogEmpty: 'ჩანაწერები ჯერ არ არის. შედით და დატოვეთ შეფასება.',
		activityKindLogin: 'შესვლა',
		activityKindReviewPosted: 'შეფასების გამოქვეყნება',
		activityKindReplyPosted: 'პასუხის გამოქვეყნება',
		activityViewPost: 'პოსტის ნახვა',
		activityLogLoginDetail: 'წარმატებით შეხვედით ანგარიშში.',
		activityLogPostLabel: 'პოსტი',
		activityLogTypeLabel: 'ტიპი',
		activityLogTypeTour: 'ტური',
		activityLogTypeWhatToDo: 'რა გავაკეთოთ',
		activityLogSlugLabel: 'URL slug',
		activityLogRatingLabel: 'თქვენი ქულა',
		activityLogPreviewLabel: 'თქვენი ტექსტი',
		activityLogPostRemoved: 'გვერდი აღარ არის საიტზე; დეტალები შენახულია აქტივობის მომენტის მიხედვით.',
		search: 'ძიება',
		searchPlaceholder: 'ტურები, ადგილები, გვერდები…',
		searchTitle: 'ძიება',
		searchMetaDescription: 'იპოვეთ ტურები, აქტივობები, რეგიონები და გვერდები.',
		searchButton: 'ძიება',
		searchAriaLabel: 'საიტზე ძიება',
		searchIntro: 'იპოვეთ ტურები, რა გავაკეთოთ, რეგიონები და გვერდები თქვენს ენაზე.',
		searchEmptyQuery: 'ჩაწერეთ სიტყვა ან ფრაზა და დააჭირეთ ძიებას.',
		searchNoResults: 'შედეგები არ მოიძებნა. სცადეთ სხვა სიტყვები ან მენიუდ აირჩიეთ.',
		searchResultsCount: '{n} შედეგი',
		searchKindTour: 'ტური',
		searchKindWhatToDo: 'რა გავაკეთოთ',
		searchKindRegion: 'ადგილი',
		searchKindPage: 'გვერდი',
		searchKindGuide: 'გიდი',
		guides: 'გიდები',
		guidesMetaDescription: 'იპოვეთ ადგილობრივი ტურ-გიდები საქართველოში — გამოცდილი გიდები походakh, კულტურული ტურები, ღვინის მარშრუტები და სხვა.',
		guidesIntro: 'დაათვალიერეთ პროფესიონალი ტურ-გიდები საქართველოში. გაფილტრეთ სპეციალობის, ენის ან ადგილმდებარეობის მიხედვით.',
		guideBadge: 'გიდი',
		viewGuide: 'პროფილის ნახვა',
		guideLanguages: 'ენები',
		guideExperience: 'გამოცდილება',
		guideBaseLocation: 'ბაზირებულია',
		guideSpecialties: 'სპეციალიზაცია',
		guidePriceFrom: 'ფასი',
		guideContactTitle: 'კონტაქტი და დაჯავშნა',
		guideVerified: 'დადასტურებული გიდი',
	},
	ru: {
		siteTitle: 'Путеводитель по Грузии',
		home: 'Главная',
		tours: 'Туры',
		whatToDo: 'Чем заняться',
		regions: 'Регионы',
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
		regionsMetaDescription:
			'Регионы, муниципалитеты и сёла Грузии — карты и справочная информация.',
		regionsIntro: 'Регионы, муниципалитеты и сёла: факты, фотографии и подробное описание.',
		regionsLevelRegion: 'Регион',
		regionsLevelMunicipality: 'Муниципалитет',
		regionsLevelVillage: 'Село / населённый пункт',
		regionsFilterAllTypes: 'Все типы',
		regionsChildrenMunicipalities: 'Муниципалитеты',
		regionsChildrenVillages: 'Сёла и населённые пункты',
		tourSidebarPlaceLinks: 'Места',
		regionsWhatToDoInPlace: 'Чем заняться',
		whatToDoFiltersTitle: 'Фильтр',
		whatToDoFiltersApply: 'Применить',
		whatToDoFiltersClear: 'Сбросить всё',
		whatToDoFiltersEmpty: 'Ничего не подходит под выбранные фильтры. Измените или сбросьте их.',
		whatToDoFiltersShowing: 'Показано {n} из {total}',
		whatToDoFiltersAny: 'Любой',
		whatToDoFiltersNSelected: 'Выбрано: {n}',
		mapMetaDescription:
			'Интерактивная карта туров, идей «Чем заняться» и населённых пунктов Грузии.',
		mapIntro:
			'Ссылки ведут на тур, материал «Чем заняться» или страницу региона на текущем языке (нужны координаты и перевод).',
		mapEmpty:
			'На карте пока ничего нет. Укажите широту и долготу в админке для тура, активности или места.',
		mapFilterAll: 'Все',
		mapFilterWhatToDo: 'Чем заняться',
		mapFilterRegions: 'Регионы',
		mapFilterActivityTypes: 'Категории активностей',
		mapFilterClear: 'Сбросить фильтры',
		mapFilterShowing: 'На карте: {visible} из {total}',
		mapFilterHint:
			'«Чем заняться» — только активности; «Регионы» — административные места. Категории фильтруют только активности; туры и регионы остаются, если ничего не отмечено.',
		featuredTours: 'Избранные туры',
		viewTour: 'Подробнее',
		viewWhatToDo: 'Смотреть',
		viewRegion: 'Открыть место',
		duration: 'Длительность',
		email: 'Эл. почта',
		password: 'Пароль',
		submitLogin: 'Войти',
		submitRegister: 'Создать аккаунт',
		loginErrorInvalidCredentials: 'Неверная почта или пароль. Попробуйте снова.',
		authSignedInToast: 'Вы вошли в аккаунт.',
		authRegisteredToast: 'Аккаунт создан — вы вошли.',
		registerErrorInvalidEmail: 'Укажите корректный email.',
		registerErrorEmailTaken: 'Этот email уже зарегистрирован. Войдите.',
		registerErrorPasswordShort: 'Пароль должен быть не короче 8 символов.',
		registerErrorGeneric: 'Не удалось создать аккаунт. Попробуйте снова.',
		registerErrorPasswordMismatch: 'Пароли не совпадают.',
		registerErrorTermsRequired: 'Для регистрации нужно принять политику конфиденциальности.',
		displayName: 'Имя (необязательно)',
		passwordConfirm: 'Повторите пароль',
		authOrContinueWith: 'или войти через',
		continueWithGoogle: 'Google',
		registerPolicyAgree: 'Я прочитал(а) и принимаю',
		registerPolicyEnd: '.',
		policyPageTitle: 'Конфиденциальность и условия',
		policyMetaDescription: 'Как сайт обрабатывает данные и правила использования.',
		footerPolicy: 'Конфиденциальность',
		loginErrorGoogleFailed: 'Вход через Google не завершён. Попробуйте снова.',
		loginErrorGoogleDenied: 'Вход через Google отменён.',
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
		footerColExplore: 'Разделы',
		footerColCompany: 'О проекте',
		footerAboutText:
			'Независимый путеводитель по Грузии — туры, регионы, активности и карты. Для путешественников по Кавказу.',
		contactPageTitle: 'Связаться с нами',
		contactMetaDescription: 'Свяжитесь с командой Travel Guide Georgia.',
		contactFormName: 'Ваше имя',
		contactFormEmail: 'Ваш email',
		contactFormSubject: 'Тема',
		contactFormMessage: 'Сообщение',
		contactFormSend: 'Отправить',
		contactFormSuccess: 'Сообщение отправлено! Мы свяжемся с вами в ближайшее время.',
		contactFormError: 'Что-то пошло не так. Попробуйте ещё раз или напишите нам напрямую.',
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
		postHeroOpenGallery: 'Открыть галерею',
		tourSidebarCategory: 'Категория',
		tourSidebarSeason: 'Сезон',
		tourSidebarSectionTitle: 'Кратко',
		tourSidebarPriceLabel: 'Цена',
		tourSidebarLocationLabel: 'Локация',
		tourSidebarViewOnMap: 'На карте',
		tourSidebarDirections: 'Маршрут',
		tourSidebarGetDirections: 'Построить маршрут',
		detailOnMapHeading: 'На карте',
		mapPopupViewDetails: 'Подробнее',
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
		tourReviewsAlreadyReviewedTitle: 'Вы уже оставили отзыв на этой странице.',
		tourReviewsAlreadyReviewedHint:
			'Чтобы изменить его, воспользуйтесь «Правка» или «Удалить» у вашего отзыва в списке ниже.',
		tourReviewsDelete: 'Удалить',
		tourReviewsDeleting: 'Удаление…',
		tourReviewsDeleteConfirm: 'Удалить этот комментарий и все ответы под ним?',
		navActivityLog: 'Активность',
		navDashboard: 'Панель',
		navMessages: 'Сообщения',
		accountDashboardTitle: 'Ваша панель',
		accountDashboardIntro:
			'Обновите профиль, просмотрите бронирования, продолжите править материалы и переписывайтесь с гидами или путешественниками по общему бронированию.',
		accountProfileTitle: 'Профиль',
		accountDisplayNameHelp: 'Необязательное имя. Email для входа не меняется.',
		accountSave: 'Сохранить',
		accountSaved: 'Профиль обновлён.',
		accountBookingsTitle: 'Бронирования',
		accountBookingAsCustomer: 'Как путешественник',
		accountBookingAsGuide: 'Как гид',
		accountBookingsNone: 'Пока нет записей.',
		accountView: 'Открыть',
		accountSubmissionsTitle: 'Материалы на модерации',
		accountEdit: 'Править',
		accountSubmissionsNone: 'Вы ещё не отправляли материалы.',
		accountContributeCta: 'К разделу «Вклад»',
		accountGuideTitle: 'Профиль гида',
		accountGuideNone: 'Профиля гида пока нет.',
		accountCreateGuide: 'Создать профиль гида',
		accountPackagesTitle: 'Турпакеты',
		accountPackagesCta: 'Управлять пакетами',
		accountMessagesTitle: 'Сообщения',
		accountMessagesIntro:
			'Переписка доступна с тем, с кем у вас общее бронирование. Нужны аккаунты у обоих; email в брони должен совпадать с email входа путешественника.',
		accountMsgOpen: 'Открыть сообщения',
		accountMsgNew: 'Новый диалог',
		accountBookingMessage: 'Сообщение по бронированию',
		accountMsgEmpty: 'Пока нет диалогов. Начните со страницы брони или ниже.',
		accountThreadWith: 'С кем',
		accountBack: 'Назад',
		accountSend: 'Отправить',
		accountMessagePlaceholder: 'Текст сообщения…',
		accountPeerLabel: 'Контакт',
		accountBookingRefShort: 'Бронь',
		accountSubmissionKindTour: 'Тур',
		accountSubmissionKindWhatToDo: 'Что делать',
		accountSubmissionKindPage: 'Страница',
		accountSubmissionKindGuide: 'Гид',
		accountStatusPrefix: 'Статус',
		activityLogTitle: 'Ваша активность',
		activityLogIntro: 'Недавние входы и опубликованные отзывы.',
		activityLogEmpty: 'Пока нет записей. Войдите и оставьте отзыв.',
		activityKindLogin: 'Вход',
		activityKindReviewPosted: 'Опубликован отзыв',
		activityKindReplyPosted: 'Опубликован ответ',
		activityViewPost: 'К записи',
		activityLogLoginDetail: 'Вы вошли в аккаунт.',
		activityLogPostLabel: 'Запись',
		activityLogTypeLabel: 'Тип',
		activityLogTypeTour: 'Тур',
		activityLogTypeWhatToDo: 'Что делать',
		activityLogSlugLabel: 'Адрес страницы (slug)',
		activityLogRatingLabel: 'Ваша оценка',
		activityLogPreviewLabel: 'Ваш текст',
		activityLogPostRemoved: 'Страница больше не на сайте; данные — на момент сохранения активности.',
		search: 'Поиск',
		searchPlaceholder: 'Туры, места, страницы…',
		searchTitle: 'Поиск',
		searchMetaDescription: 'Поиск туров, активностей, регионов и страниц сайта.',
		searchButton: 'Найти',
		searchAriaLabel: 'Поиск по сайту',
		searchIntro: 'Ищите туры, идеи чем заняться, регионы и страницы на вашем языке.',
		searchEmptyQuery: 'Введите слово или фразу и нажмите «Найти».',
		searchNoResults: 'Ничего не найдено. Попробуйте другие слова или разделы меню.',
		searchResultsCount: 'Результатов: {n}',
		searchKindTour: 'Тур',
		searchKindWhatToDo: 'Чем заняться',
		searchKindRegion: 'Место',
		searchKindPage: 'Страница',
		searchKindGuide: 'Гид',
		guides: 'Гиды',
		guidesMetaDescription: 'Найдите местных гидов в Грузии — опытные специалисты для походов, культурных туров, винных маршрутов и многого другого.',
		guidesIntro: 'Просматривайте профессиональных тур-гидов в Грузии. Фильтруйте по специализации, языку или местонахождению.',
		guideBadge: 'Гид',
		viewGuide: 'Смотреть профиль',
		guideLanguages: 'Языки',
		guideExperience: 'Опыт',
		guideBaseLocation: 'Базируется в',
		guideSpecialties: 'Специализации',
		guidePriceFrom: 'Цена от',
		guideContactTitle: 'Контакты и бронирование',
		guideVerified: 'Проверенный гид',
	},
};
