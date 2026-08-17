import type { Metadata, Viewport } from "next";
import { Roboto, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";
import { InstallPrompt } from "@/components/InstallPrompt";

// No `weight` array on purpose: that pins three static faces, and a browser
// cannot interpolate between separate faces. Omitting it loads Roboto's
// variable version, which makes "wght" a real animatable axis — that's what
// lets the rail's labels ease between normal and bold instead of snapping.
const roboto = Roboto({
  variable: "--font-roboto",
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
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
        <ServiceWorker />
        <InstallPrompt />
      </body>
    </html>
  );
}
