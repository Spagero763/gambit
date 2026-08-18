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
  "The games you grew up playing, now with real opponents and a real pot on Celo. Open it and you are already in, nothing to sign up for. Warm up free, then stake USDT, USDC or USDm and the winner takes 95%, paid in seconds.";

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
  // Required for env(safe-area-inset-*) to report real values on notched iPhones.
  // Without it iOS resolves those insets to 0 and the bottom nav sits under the
  // home indicator.
  viewportFit: "cover",
  // zoom stays enabled — locking it (maximumScale: 1) is hostile to low-vision
  // users and a MiniPay accessibility flag
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <head>
        {/* Warm up the TLS handshake to the origins the app hard-depends on, so
            wallet auth, on-chain reads and data don't each pay full connection
            latency on first use — a real first-paint win on mobile data. */}
        <link rel="preconnect" href="https://auth.privy.io" crossOrigin="anonymous" />
        {/* No WalletConnect preconnect: nothing here uses it, so warming that
            handshake cost a connection on every load and put a third-party origin
            on the network manifest for a service we never call. */}
        <link rel="preconnect" href="https://forno.celo.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://dyupcxcfsbmlvaalofad.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://auth.privy.io" />
        <link rel="dns-prefetch" href="https://forno.celo.org" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          {children}
          <LayoutExtras />
        </Providers>
      </body>
    </html>
  );
}
