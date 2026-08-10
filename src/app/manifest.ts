import type { MetadataRoute } from "next";

/**
 * Installable app metadata. Peoplearound is used standing in a doorway or
 * walking past the lot in question, so a home-screen icon that opens without
 * browser chrome matters more here than it would for a desktop tool.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Peoplearound",
    short_name: "Peoplearound",
    description:
      "Share an idea with your neighbors — and find the people who'll build it with you.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#059669",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Start something with people", url: "/projects/new" },
      { name: "Around me", url: "/" },
      { name: "Messages", url: "/chats" },
    ],
  };
}
