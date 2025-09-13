import Brands from "@/components/sections/BrandsSection/Brands";
import HeroSection from "@/components/sections/HeroSection/HeroSection";
import HowItWorks from "@/components/sections/HowItWorks/HowItWorks";

import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sephyra - Advanced DeFi Trading Platform on Solana",
    description: "Experience next-generation DeFi trading with Sephyra. Advanced liquidity management, delta-neutral strategies, and automated trading on the Solana blockchain.",
    keywords: [
      "DeFi",
      "Solana",
      "Trading",
      "Liquidity",
      "Delta Neutral",
      "Blockchain",
      "Cryptocurrency",
      "Automated Trading",
      "Sephyra"
    ],
    authors: [{ name: "Sephyra Team" }],
    creator: "Sephyra",
    publisher: "Sephyra",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL('https://sephyra.com'),
    openGraph: {
      title: "Sephyra - Advanced DeFi Trading Platform",
      description: "Experience next-generation DeFi trading with advanced liquidity management and automated strategies on Solana.",
      url: "https://sephyra.com",
      siteName: "Sephyra",
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "Sephyra - DeFi Trading Platform",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Sephyra - Advanced DeFi Trading Platform",
      description: "Experience next-generation DeFi trading with advanced liquidity management and automated strategies on Solana.",
      images: ["/og-image.jpg"],
      creator: "@sephyra",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: "google-site-verification=olm9ApxRz5jn606UpRTPtkXTMItBW_ekSWC7h8dPLsU",
    },
    category: "technology",
    classification: "DeFi Trading Platform",
  };
};

export default function page() {
  return (
    <main>
      <HeroSection />
      <HowItWorks />
      <Brands />
    </main>
  );
}
