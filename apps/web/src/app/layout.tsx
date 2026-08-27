import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LENTERA BPOM Jember — Sistem Terintegrasi Balai POM di Jember",
  description:
    "Sistem Informasi Terintegrasi Balai Pengawas Obat dan Makanan (BPOM) di Jember — layanan internal & publik dalam satu platform.",
  manifest: "/manifest.webmanifest",
  applicationName: "LENTERA",
  // Ikon dibuat pada ukuran yang persis sesuai deklarasi manifest; ukuran yang
  // tidak cocok membuat Android menolak ikon dan memakai lambang bawaan.
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LENTERA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1f3a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} h-full antialiased`}>
      <head>
        {/* Terapkan tema tersimpan sebelum paint agar tidak berkedip (FOUC). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('lentera-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ServiceWorkerRegister />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
