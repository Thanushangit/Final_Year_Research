import type { Metadata, Viewport } from "next";
import { Anek_Tamil, Hind_Madurai } from "next/font/google";
import "./globals.css";

// Anek Tamil: headings and every piece of Tamil text. Hind Madurai: body text.
const anekTamil = Anek_Tamil({
  subsets: ["tamil", "latin"],
  variable: "--font-anek-tamil",
  display: "swap",
});

const hindMadurai = Hind_Madurai({
  subsets: ["tamil", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hind-madurai",
  display: "swap",
});

const TITLE = "Reading Room · Emotion-aware Tamil speech";
const DESCRIPTION =
  "Demo of an emotion-aware Sri Lankan Tamil text-to-speech pipeline: IndicBERT predicts the feeling, VITS speaks with it.";

// The share image comes from app/opengraph-image.png and app/twitter-image.png; metadataBase makes its link absolute.
export const metadata: Metadata = {
  metadataBase: new URL("https://www.fot-research.tech"),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Reading Room",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1c33",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anekTamil.variable} ${hindMadurai.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
