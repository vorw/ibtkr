import type { Metadata } from "next";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ابتكر | لجنة الابتكار — FTC",
  description: "تحدّي أسبوعي في نادي تقنية المستقبل. مشكلة واحدة، ثلاث زوايا، ومبتكر الأسبوع باختيار المجتمع.",
  icons: {
    icon: "/favicon.svg?v=bulb1",
    shortcut: "/favicon.svg?v=bulb1",
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

