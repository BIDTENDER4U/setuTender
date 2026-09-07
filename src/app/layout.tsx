import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Setu — Bid Tender 4 U",
  description: "Tender summary, eligibility checking and submission checklists for GeM and non-GeM tenders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
