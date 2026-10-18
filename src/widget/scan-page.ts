export type ScanSection = {
  id: string;
  title: string;
  text: string;
};

export type PageScan = {
  url: string;
  title: string;
  description: string;
  content: string;
  keywords: string[];
  sections: ScanSection[];
  links: Array<{ url: string; title: string; description?: string }>;
};

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "SVG",
  "IFRAME",
  "CANVAS",
  "VOICE-SITE-ASSISTANT",
]);

function visibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  }
  if (!(node instanceof HTMLElement)) return "";
  if (SKIP_TAGS.has(node.tagName)) return "";
  if (node.id === "voice-site-assistant") return "";
  if (node.getAttribute("aria-hidden") === "true") return "";
  const style = window.getComputedStyle(node);
  if (style.display === "none" || style.visibility === "hidden") return "";

  let out = "";
  for (const child of Array.from(node.childNodes)) {
    const t = visibleText(child);
    if (t) out += (out ? " " : "") + t;
  }
  return out.trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\u0370-\u03ff]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function pathOf(href: string): string | null {
  try {
    const u = new URL(href, window.location.href);
    if (u.origin !== window.location.origin) return null;
    return `${u.pathname}${u.search}`.replace(/\/$/, "") || "/";
  } catch {
    return null;
  }
}

/** Read the host page in detail for the assistant knowledge base. */
export function scanCurrentPage(): PageScan {
  const title =
    document.title?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    window.location.pathname;

  const description =
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute("content")
      ?.trim() ||
    document
      .querySelector('meta[property="og:description"]')
      ?.getAttribute("content")
      ?.trim() ||
    "";

  const keywords =
    document
      .querySelector('meta[name="keywords"]')
      ?.getAttribute("content")
      ?.split(",")
      .map((k) => k.trim())
      .filter(Boolean) || [];

  const root =
    document.querySelector("main") ||
    document.querySelector("article") ||
    document.body;

  const sections: ScanSection[] = [];
  const headingNodes = root.querySelectorAll("h1, h2, h3");
  headingNodes.forEach((heading, index) => {
    const el = heading as HTMLElement;
    const headingTitle = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!headingTitle) return;
    const id = el.id || slugify(headingTitle) || `section-${index}`;
    if (!el.id) el.id = id;

    const parts: string[] = [];
    let sib = el.nextElementSibling;
    while (sib && !/^H[1-3]$/.test(sib.tagName)) {
      const t = visibleText(sib);
      if (t) parts.push(t);
      sib = sib.nextElementSibling;
    }
    sections.push({
      id,
      title: headingTitle,
      text: parts.join(" ").slice(0, 2500),
    });
  });

  const content = visibleText(root).slice(0, 35000);

  const linkMap = new Map<string, { url: string; title: string }>();
  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:"))
      return;
    const path = pathOf(href);
    if (!path) return;
    const label = (a.textContent || "").replace(/\s+/g, " ").trim();
    if (!linkMap.has(path)) {
      linkMap.set(path, {
        url: path,
        title: label || path,
      });
    }
  });

  return {
    url: `${window.location.pathname}${window.location.search}` || "/",
    title,
    description,
    content,
    keywords: keywords.slice(0, 30),
    sections: sections.slice(0, 40),
    links: [...linkMap.values()].slice(0, 25),
  };
}

/** Fetch a few same-origin pages so the assistant learns the wider site. */
export async function enrichLinkedPages(
  links: Array<{ url: string; title: string }>,
  limit = 5,
): Promise<Array<{ url: string; title: string; description?: string }>> {
  const out: Array<{ url: string; title: string; description?: string }> = [];
  const current = `${window.location.pathname}${window.location.search}`.replace(/\/$/, "") || "/";

  for (const link of links) {
    if (out.length >= limit) break;
    if (link.url === current) continue;
    try {
      const res = await fetch(link.url, {
        credentials: "same-origin",
        headers: { Accept: "text/html" },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const title =
        doc.title?.trim() ||
        doc.querySelector("h1")?.textContent?.trim() ||
        link.title;
      const desc =
        doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
        "";
      const main =
        doc.querySelector("main") ||
        doc.querySelector("article") ||
        doc.body;
      const text = (main?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 6000);
      out.push({
        url: link.url,
        title,
        description: desc || text.slice(0, 500),
      });
      // Also stash a bit of body into description field for indexing (scan API uses description/content on links)
      if (text) {
        out[out.length - 1]!.description = `${desc} ${text}`.trim().slice(0, 7000);
      }
    } catch {
      /* skip blocked/missing pages */
    }
  }
  return out;
}
