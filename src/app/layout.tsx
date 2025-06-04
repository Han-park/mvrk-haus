import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MVRK HAUS",
  description: "The plaza where various life, visions are interconnected.",
  keywords: ["digital", "technology", "creative", "web development", "design"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
        {children}
        {isProduction && <SpeedInsights />}
        {isProduction && <Analytics />}
      </body>
    </html>
  );
}
