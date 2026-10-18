export type NavTarget = {
  url: string;
  hash?: string;
  label?: string;
};

function normalizeHash(hash?: string): string {
  if (!hash) return "";
  return hash.startsWith("#") ? hash : `#${hash}`;
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Always prefer the live shop URL for catalog paths so we never 404
 * on the assistant host (localhost).
 */
export function resolveNavUrl(
  target: NavTarget,
  siteBaseUrl?: string,
): string {
  const hash = normalizeHash(target.hash);
  const raw = (target.url || "").trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    const base = raw.split("#")[0]!;
    return `${base}${hash}`;
  }

  const path = raw.startsWith("/")
    ? raw.split("#")[0]!
    : `/${raw.split("#")[0]!}`;
  const shop = (siteBaseUrl || "").replace(/\/$/, "");
  const shopOrigin = shop ? originOf(shop) : null;
  const here = window.location.origin;

  // Already on the shop → relative path is fine
  if (shopOrigin && shopOrigin === here) {
    return `${path}${hash}`;
  }

  // Anywhere else → absolute live product/page URL
  if (shop) return `${shop}${path}${hash}`;
  return `${path}${hash}`;
}

export function isOnShopSite(siteBaseUrl?: string): boolean {
  const shop = (siteBaseUrl || "").replace(/\/$/, "");
  const shopOrigin = shop ? originOf(shop) : null;
  return Boolean(shopOrigin && shopOrigin === window.location.origin);
}

/**
 * Open the real shop page.
 * - On the live shop: navigate in the same tab
 * - On the assistant host: open YGIA in a new browser tab (keeps the chat)
 */
export function navigateHost(
  target: NavTarget,
  siteBaseUrl?: string,
): void {
  const nextUrl = resolveNavUrl(target, siteBaseUrl);
  if (!nextUrl) return;

  const absolute =
    /^https?:\/\//i.test(nextUrl)
      ? nextUrl
      : siteBaseUrl
        ? `${siteBaseUrl.replace(/\/$/, "")}${nextUrl.startsWith("/") ? nextUrl : `/${nextUrl}`}`
        : new URL(nextUrl, window.location.origin).href;

  const nextOrigin = originOf(absolute);
  const onShop = isOnShopSite(siteBaseUrl);

  if (!onShop && nextOrigin && nextOrigin !== window.location.origin) {
    // Real product page on ygianaturalhealth.com — new tab
    const opened = window.open(absolute, "_blank", "noopener,noreferrer");
    if (!opened) {
      // Popup blocked → same-tab fallback
      window.location.href = absolute;
    }
    return;
  }

  const hash = normalizeHash(target.hash);
  const pathOnly = (onShop ? nextUrl : absolute).split("#")[0]!;
  const current = `${window.location.pathname}${window.location.search}`;

  if (onShop && current === pathOnly) {
    if (hash) {
      const id = hash.slice(1);
      const el =
        document.getElementById(id) ||
        document.querySelector(`[name="${CSS.escape(id)}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `${pathOnly}${hash}`);
    }
    return;
  }

  window.location.assign(onShop ? `${pathOnly}${hash}` : absolute);
}
