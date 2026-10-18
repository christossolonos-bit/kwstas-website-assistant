export type NavTarget = {
  url: string;
  hash?: string;
  label?: string;
};

function sameOriginPath(url: string): string {
  if (url.startsWith("http")) {
    try {
      const u = new URL(url);
      if (u.origin === window.location.origin) {
        return `${u.pathname}${u.search}${u.hash}`;
      }
      return url;
    } catch {
      return url;
    }
  }
  return url;
}

/** Navigate the host page without destroying the widget when possible. */
export function navigateHost(target: NavTarget): void {
  const hash = target.hash
    ? target.hash.startsWith("#")
      ? target.hash
      : `#${target.hash}`
    : "";

  let path = sameOriginPath(target.url);
  if (path.startsWith("http")) {
    window.location.href = hash ? `${path.split("#")[0]}${hash}` : path;
    return;
  }

  const [pathnameAndQuery] = path.split("#");
  const nextUrl = `${pathnameAndQuery}${hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (current.split("#")[0] === pathnameAndQuery) {
    if (hash) {
      const id = hash.slice(1);
      const el =
        document.getElementById(id) ||
        document.querySelector(`[name="${CSS.escape(id)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      history.replaceState(null, "", `${pathnameAndQuery}${hash}`);
    }
    return;
  }

  // Full navigation keeps SPA hosts (e.g. Next.js) in sync; embed.js re-injects after load.
  window.location.assign(nextUrl);
}
