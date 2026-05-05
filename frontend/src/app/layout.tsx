import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";

import "./globals.css";

const comfortaa = Comfortaa({
  subsets: ["latin", "cyrillic"],
  variable: "--font-comfortaa",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Приглашение к Амалии",
  description: "Крестины и день рождения Амалии — 24 мая 2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={comfortaa.variable}>
      <body className="font-sans antialiased text-mocha-900 min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-white">
        {children}
      </body>
    </html>
  );
}
