import type { Metadata } from "next";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ابتكر | لجنة الابتكار — FTC",
  description: "مساحة لجنة الابتكار في نادي تقنية المستقبل. تحديات، أفكار، وبدايات جديدة.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/plex-arabic-regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/plex-arabic-medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="antialiased"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
