"use client";

import { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import Navbar from "@/components/shared/Navbar";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial engine initialization
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <LoadingScreen isVisible={loading} />
        <GoogleOAuthProvider clientId="576477282695-rb7l8snqg69pds7glusd3bmep371b1g0.apps.googleusercontent.com">
          {!loading && <Navbar />}
          <main className="pt-16 min-h-screen">
            {!loading && children}
          </main>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
