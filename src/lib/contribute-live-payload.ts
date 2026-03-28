import { trimSocialLinks } from './contact-social-links';
import type { PageLocaleBlock, PagePost } from './pages-db';
import type { Locale } from './strings';
import type { TourLocaleBlock, TourPost } from './tours-db';
import type { PageSubmissionPayload, TourLikeSubmissionPayload } from './submissions-db';

/** Map a live “what to do” post into the shape stored on a submission (for edit forms). */
export function tourPostToContributionPayload(post: TourPost): TourLikeSubmissionPayload {
	return {
		slug: post.slug,
		image: post.image,
		gallery: [...post.gallery],
		location: post.location,
		category: null,
		whatDoCategories: [...post.whatDoCategories],
		whatDoSeasons: [...post.whatDoSeasons],
		place_ids: [...post.place_ids],
		physical_rating: post.physical_rating,
		driving_distance: post.driving_distance,
		google_directions_url: post.google_directions_url ?? null,
		social_links: trimSocialLinks(post.social_links ?? {}),
		i18n: JSON.parse(JSON.stringify(post.i18n)) as Partial<Record<Locale, TourLocaleBlock>>,
	};
}

export function pagePostToContributionPayload(post: PagePost): PageSubmissionPayload {
	return {
		slug: post.slug,
		sort_order: post.sort_order,
		i18n: JSON.parse(JSON.stringify(post.i18n)) as Partial<Record<Locale, PageLocaleBlock>>,
	};
}
