import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { LayoutExtras } from "@/components/LayoutExtras";
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
  "The games you grew up playing, now with real opponents and a real pot on Celo. Sign in with just an email and a wallet is made for you. Warm up free, then stake USDm or GoodDollar and the winner takes 95%, paid in seconds. Claim a little G$ every day.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bestgambit.live"),
  title: "Gambit | Think you'd win? Prove it.",
  description: DESCRIPTION,
  applicationName: "Gambit",
  appleWebApp: {
    capable: true,
    title: "Gambit",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Gambit | Think you'd win? Prove it.",
    description: DESCRIPTION,
    url: "/",
    siteName: "Gambit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gambit | Think you'd win? Prove it.",
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
          <LayoutExtras />
        </Providers>
      </body>
    </html>
  );
}
