import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YGIA Call Assistant",
  description:
    "Standalone voice call assistant for YGIA Natural Health — products, shipping, and returns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
