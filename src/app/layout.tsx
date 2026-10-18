import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Site Assistant",
  description:
    "Embeddable voice chat assistant for product questions and site navigation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
