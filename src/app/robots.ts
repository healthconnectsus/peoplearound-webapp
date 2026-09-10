import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * The site had no robots.txt at all, which on this app is not a neutral
 * omission. Almost every route redirects a visitor with no session to /login,
 * so a crawler that wanders into the app burns its budget collecting hundreds
 * of redirects to the same page — and the handful of pages that genuinely
 * exist to be found (the city pages, written for council officers and press)
 * get lost in the noise.
 *
 * So this is an allowlist, not a blocklist: name the public pages, disallow
 * the rest. The private routes are already unreachable without a session —
 * this only stops crawlers wasting requests discovering that.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/$", // the landing page itself, not everything beneath it
          "/login",
          "/start",
          "/privacy",
          "/city",
          "/city/",
        ],
        disallow: [
          "/api/",
          "/people",
          "/ideas",
          "/projects",
          "/events",
          "/offers",
          "/asks",
          "/chats",
          "/groups",
          "/connections",
          "/faves",
          "/explore",
          "/profile",
          "/settings",
          "/analytics",
          "/admin",
          "/neighborhood",
          "/recap",
          "/invite",
          "/playbooks",
          "/help",
          "/auth/",
          "/dev/",
          "/offline",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
