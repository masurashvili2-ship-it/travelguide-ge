import type { PageLocaleBlock, PagePost } from './pages-db';
import type { Locale } from './strings';
import type { TourLocaleBlock, TourPost } from './tours-db';
import type { PageSubmissionPayload, TourLikeSubmissionPayload } from './submissions-db';

/** Map a live tour / activity post into the shape stored on a submission (for edit forms). */
export function tourPostToContributionPayload(
	post: TourPost,
	kind: 'tours' | 'what-to-do',
): TourLikeSubmissionPayload {
	return {
		slug: post.slug,
		image: post.image,
		gallery: [...post.gallery],
		location: post.location,
		category: kind === 'tours' ? post.category : null,
		whatDoCategories: kind === 'what-to-do' ? [...post.whatDoCategories] : [],
		whatDoSeasons: kind === 'what-to-do' ? [...post.whatDoSeasons] : [],
		physical_rating: post.physical_rating,
		driving_distance: post.driving_distance,
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
