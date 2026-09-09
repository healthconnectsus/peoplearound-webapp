/**
 * The site's own public origin.
 *
 * Needed wherever a link has to survive leaving the browser — a push
 * notification's click target, a sitemap entry, a robots directive. Inside the
 * app a relative href is always better; this is only for the places where
 * there is no page to be relative to.
 *
 * The default is the apex the DNS actually points at. Override with
 * NEXT_PUBLIC_SITE_URL on a preview deployment so its links stay inside that
 * preview instead of jumping to production.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.peoplearound.com"
).replace(/\/+$/, "");
