import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CivicNavigator AI — Your Location-Aware Election Assistant",
  description:
    "Find polling places, learn about candidates, and navigate your civic duties with AI-powered guidance. Nonpartisan. Powered by Google Cloud and Gemini.",
  keywords: [
    "election assistant",
    "voting",
    "polling places",
    "voter registration",
    "AI",
    "civic",
  ],
  openGraph: {
    title: "CivicNavigator AI",
    description: "Location-aware election assistant powered by Gemini AI.",
    type: "website",
  },
  robots: "index, follow",
};

export const viewport: Viewport = {
  themeColor: "#0b0f1a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.variable} ${notoSans.variable}`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}

