// Single source of truth for the production identity of the public site.
//
// PRODUCT: The Bridge.  DOMAIN: mdmd.dev.
// The domain is the address; it is not a second brand. Every absolute URL that
// leaves the app (canonical, og:url, og:image, share links, README) is built
// from SITE.origin so no preview or localhost host can become canonical.

export const SITE = {
  name: "The Bridge",
  domain: "mdmd.dev",
  origin: "https://mdmd.dev",
  title: "The Bridge — See What Happened to the Money",
  description:
    "An independent economic record for physician groups. Trace work to claim, adjudication, payment and bank cash — with every figure tied back to its source.",
  ogImage: "https://mdmd.dev/og/the-bridge.png",
} as const;

/** Absolute production URL for an in-app path (`/`, `/record`, …). */
export function siteUrl(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p === "/" ? `${SITE.origin}/` : `${SITE.origin}${p}`;
}

/**
 * Canonical + og:url pair for a route, plus the shared social card.
 * Canonical lives on leaf routes only; the root supplies the rest.
 */
export function routeMeta(path: string) {
  const url = siteUrl(path);
  return {
    meta: [
      { property: "og:url", content: url },
      { property: "og:image", content: SITE.ogImage },
      { name: "twitter:image", content: SITE.ogImage },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
