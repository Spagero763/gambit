import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { MusicPlayer } from "@/components/audio/MusicPlayer";
import { ProfileSync } from "@/components/ProfileSync";
import "./globals.css";

// One restrained typeface family. Inter for UI + display (tracked tighter in
// components), JetBrains Mono for money, scores and addresses.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const DESCRIPTION =
  "Classic skill games on Celo. Chess, Naija Whot, tic-tac-toe, snakes & ladders and Block Blitz. Free to play, or stake cUSD head to head — winner takes the pot.";

export const metadata: Metadata = {
  metadataBase: new URL("https://gambit-rose.vercel.app"),
  title: "Gambit — play classic games, stake cUSD",
  description: DESCRIPTION,
  openGraph: {
    title: "Gambit — play classic games, stake cUSD",
    description: DESCRIPTION,
    url: "/",
    siteName: "Gambit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gambit — play classic games, stake cUSD",
    description: DESCRIPTION,
  },
  other: {
    "talentapp:project_verification":
      "060e9ad6da16fa013747b61aff42762a8e4d4b686ac1a3cd9f97c7f7c6ba636c637d44c302176dc808f47c858da1fdfe740265c2bef7505452c634ab94320b40",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          {children}
          <MusicPlayer />
          <ProfileSync />
        </Providers>
      </body>
    </html>
  );
}
