import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Handshake | Sybil-Resistant Fair Launch Hook",
  description: "Protecting new liquidity pools from sniper bots on X Layer Testnet using Uniswap V4 and on-chain verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-black text-white selection:bg-lime-400 selection:text-black">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
