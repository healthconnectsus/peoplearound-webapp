/**
 * The printed codes that have a page of their own (see ./pages.ts), as a
 * plain set the proxy can import on every request without dragging the
 * pages' pictures along. pages.ts checks at load that the two agree.
 */
export const HOSTED_SLUGS: ReadonlySet<string> = new Set(["1"]);

export const isHostedCode = (slug: string): boolean => HOSTED_SLUGS.has(slug);
