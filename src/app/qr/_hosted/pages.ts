import type { StaticImageData } from "next/image";
import elleLogo from "./elle/logo.webp";
import elleVenmo from "./elle/venmo.png";
import { HOSTED_SLUGS } from "./slugs";

/**
 * Pages that live at a printed code (migrations 0073 and 0081).
 *
 * A code in `qr_codes` usually sends its scanner somewhere else. The ones
 * here go nowhere else: the page is the destination, built into the site,
 * with nothing to sign up for. The row still has the last word — a
 * destination set in the admin console wins over the page, switching the
 * code off hides it — and every scan is still counted.
 *
 * Adding one is a folder with its pictures and an entry below.
 */
export type HostedPage = {
  /** Whose page it is; the tab title and the share card say so. */
  name: string;
  /** The headline. */
  headline: string;
  /** The ask, a paragraph at a time. */
  paragraphs: string[];
  /** A closing word, if they want one. */
  signoff?: string;
  /**
   * Their mark. It sits straight on the page, so it needs a transparent
   * background; `og` is its PNG twin for the share card, by path under
   * `_hosted`, with its pixel size.
   */
  logo: {
    image: StaticImageData;
    alt: string;
    og: { file: string; width: number; height: number };
  };
  /** The mark's colour; the page is dressed in it. Six-digit hex. */
  ink: string;
  /** Venmo: the card they already print, and the link inside its code. */
  venmo: { card: StaticImageData; url: string };
};

const HOSTED = new Map<string, HostedPage>([
  [
    "1",
    {
      name: "Elle",
      headline: "Help me get to Hawaii",
      paragraphs: [
        "I'm raising funds for a trip to Hawaii, and any donation is welcome — big, small, or just a kind word passed along.",
        "Every bit brings the islands a little closer. Thank you for helping me get there.",
      ],
      signoff: "Mahalo",
      logo: {
        image: elleLogo,
        alt: "elle",
        og: { file: "elle/logo-og.png", width: 800, height: 367 },
      },
      ink: "#83011a",
      venmo: {
        card: elleVenmo,
        // The link inside her printed Venmo code, so a phone that cannot
        // scan its own screen has a button to tap instead.
        url: "https://www.paypal.com/qrcodes/venmocs/7db71db2-f989-4325-b2f3-f2e64b397714?created=1791323523",
      },
    },
  ],
]);

// The proxy decides from ./slugs whether a code has a page; this is the
// page. The two are kept honest at load time — for a static page, at build.
for (const slug of HOSTED.keys()) {
  if (!HOSTED_SLUGS.has(slug)) throw new Error(`/qr/${slug} has a page but is missing from slugs.ts`);
}
for (const slug of HOSTED_SLUGS) {
  if (!HOSTED.has(slug)) throw new Error(`/qr/${slug} is in slugs.ts but has no page`);
}

/** The page built in for a code, if there is one. A Map, so `/qr/constructor` finds nothing. */
export function hostedPage(slug: string): HostedPage | null {
  return HOSTED.get(slug) ?? null;
}
