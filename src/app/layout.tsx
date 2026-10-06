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

export const metadata: Metadata = {
  title: "Reading Room · Emotion-aware Tamil speech",
  description:
    "Demo of an emotion-aware Sri Lankan Tamil text-to-speech pipeline: IndicBERT predicts the feeling, VITS speaks with it.",
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
