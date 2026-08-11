import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";
import { InstallPrompt } from "@/components/InstallPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Peoplearound",
  description: "Build ideas with your communities — a hyperlocal network where neighbors join each other's projects.",
  applicationName: "Peoplearound",
  appleWebApp: { capable: true, title: "Peoplearound", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  // Installed as an app, the safe areas matter — let content reach the edges.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
        <ServiceWorker />
        <InstallPrompt />
      </body>
    </html>
  );
}
