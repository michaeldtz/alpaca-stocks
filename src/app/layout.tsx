import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/nav";

export const metadata: Metadata = {
  title: "Alpaca Stocks",
  description: "Portfolio tracker with technical analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem 1rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
