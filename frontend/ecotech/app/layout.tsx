import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import Navbar from "@/components/shared/Navbar";
import { GoogleOAuthProvider } from "@react-oauth/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EcoTech | Ecosystem Services Valuation",
  description: "Quantify the economic value of nature and make evidence-based land use decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-slate-50`}>
        <GoogleOAuthProvider clientId="576477282695-rb7l8snqg69pds7glusd3bmep371b1g0.apps.googleusercontent.com">
          <Navbar />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
