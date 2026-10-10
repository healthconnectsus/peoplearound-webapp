import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HOSTED_SLUGS } from "../_hosted/slugs";
import { hostedPage } from "../_hosted/pages";
import { Fundraiser } from "../_hosted/Fundraiser";

/**
 * /qr/<code> — the page a printed code shows when it is a destination in
 * itself (`../_hosted`). Elle's /qr/1 is the first.
 *
 * Every scan has already been through the proxy (src/lib/qr.ts), which
 * counted it and sent it elsewhere if the row in `qr_codes` said so; what
 * reaches this page is a code whose own page should show. So the page reads
 * nothing: it is built once, served from the CDN, and shows the same thing
 * to everyone — which is what a stranger holding a piece of paper should
 * get, instantly. Being static, it carries no CSP nonce; the policy is
 * report-only (src/lib/csp.ts), and the page needs no script to work — the
 * one button is a link.
 *
 * Reached from the paper, never from a search: not indexed.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return [...HOSTED_SLUGS].map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = hostedPage(slug);
  const robots = { index: false, follow: false };
  if (!page) return { robots };

  const title = `${page.name} · ${page.headline}`;
  return {
    title: { absolute: title },
    description: page.paragraphs[0],
    openGraph: { title, description: page.paragraphs[0] },
    robots,
  };
}

export default async function QrPage({ params }: Props) {
  const { slug } = await params;
  const page = hostedPage(slug);
  if (!page) notFound();
  return <Fundraiser page={page} />;
}
