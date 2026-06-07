import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soul Imaging | Admin Dashboard",
  description: "Production-Grade Voice Agent Dashboard for Soul Imaging",
  authors: [{ name: "Soul Imaging" }],
  openGraph: {
    title: "Soul Imaging Dashboard",
    description: "Manage your premium radiology voice agent settings.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/admin/logo/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
