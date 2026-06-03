import type { Metadata, Viewport } from "next";
import { Sora, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const sans = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gambit · play your move",
  description:
    "A MiniPay-native arcade of classic skill games on Celo. Play chess, Naija Whot, tic-tac-toe and snakes & ladders for free, or stake cUSD head to head where the winner takes the pot.",
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
      <body className="grain min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
