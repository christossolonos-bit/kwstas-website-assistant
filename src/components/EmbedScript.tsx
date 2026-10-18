"use client";

import Script from "next/script";

export function EmbedScript() {
  const apiBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  return (
    <Script
      src="/embed.js"
      strategy="afterInteractive"
      data-assistant-id="ygia"
      data-api-base={apiBase || undefined}
      data-auto-scan="false"
    />
  );
}
