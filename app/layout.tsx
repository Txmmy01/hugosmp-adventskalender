import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HugoSMP · Weihnachtszauber",
  description: "Der HugoSMP Adventskalender",
  robots: {
    index: false,
    follow: false
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}