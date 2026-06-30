import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-arabic",
});

export const metadata: Metadata = {
  title: "TBHF Scholars Network",
  description:
    "A global digital community connecting TBHF scholarship recipients worldwide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoSansArabic.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
