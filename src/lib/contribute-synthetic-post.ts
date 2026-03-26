import { trimSocialLinks } from './contact-social-links';
import type { PagePost } from './pages-db';
import type { PageSubmissionPayload, TourLikeSubmissionPayload } from './submissions-db';
import type { TourPost } from './tours-db';

/** Fills `AdminTourLocalesFields` / edit forms from a queued submission payload. */
export function tourLikePayloadToSyntheticTourPost(
	submissionId: string,
	kind: 'tours' | 'what-to-do',
	p: TourLikeSubmissionPayload,
): TourPost {
	return {
		id: submissionId,
		slug: p.slug,
		image: p.image,
		gallery: p.gallery,
		location: p.location,
		category: kind === 'tours' ? p.category : null,
		whatDoCategories: kind === 'what-to-do' ? p.whatDoCategories : [],
		whatDoSeasons: kind === 'what-to-do' ? p.whatDoSeasons : [],
		physical_rating: p.physical_rating,
		driving_distance: p.driving_distance,
		google_directions_url: p.google_directions_url ?? null,
		social_links: trimSocialLinks(p.social_links ?? {}),
		i18n: p.i18n,
		updated_at: Date.now(),
		author_user_id: null,
		author_email: null,
	};
}

export function pagePayloadToSyntheticPagePost(submissionId: string, p: PageSubmissionPayload): PagePost {
	return {
		id: submissionId,
		slug: p.slug.trim().toLowerCase(),
		sort_order: p.sort_order,
		updated_at: Date.now(),
		i18n: p.i18n,
		author_user_id: null,
		author_email: null,
	};
}
