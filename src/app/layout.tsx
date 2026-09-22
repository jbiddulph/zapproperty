import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZapProperty — property search on ZapTask",
  description:
    "Search, filter and map the property sites your team manages in ZapTask. Built on the ZapTask Platform API and Mapbox.",
  applicationName: "ZapProperty",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b56f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
