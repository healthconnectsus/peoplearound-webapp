/**
 * Structured data, for the readers that are not people.
 *
 * Search engines and assistants parse schema.org JSON-LD to work out what a
 * page *is* rather than guessing from prose. This site published none, which
 * on a product with a generic name — "peoplearound" sits in a crowd of
 * similarly named apps — means nothing tells a search engine that the brand
 * and the site are one thing.
 *
 * Rendered as a plain `<script>` per the Next.js guidance
 * (`node_modules/next/dist/docs/01-app/02-guides/json-ld.md`). `<` is escaped
 * to its unicode form, because `JSON.stringify` will happily emit `</script>`
 * from a string field and end the block early — a real injection route on any
 * page whose data comes from the database.
 *
 * It is a data block, not executable script, so the Content Security Policy's
 * `script-src` does not apply — browsers never run "prepare the script" for a
 * non-JavaScript type. The policy is report-only today in any case.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

const SITE = "https://www.peoplearound.com";

/**
 * The organization and the site, stated once.
 *
 * Kept deliberately thin: a name, a logo, the tagline, and the fact that the
 * two are the same entity. Everything else search engines allow here —
 * founders, addresses, ratings, social profiles — would either be untrue
 * today or would name a private person.
 */
export const organizationLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Peoplearound",
      url: SITE,
      logo: `${SITE}/logo.svg`,
      description:
        "A hyperlocal network where neighbors start projects and join each other to build them, with every contribution credited.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "Peoplearound",
      publisher: { "@id": `${SITE}/#organization` },
      inLanguage: "en-US",
    },
  ],
};

/** The trail back up from a city page, so a search result can show it. */
export function breadcrumbLd(
  trail: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: `${SITE}${step.path}`,
    })),
  };
}
