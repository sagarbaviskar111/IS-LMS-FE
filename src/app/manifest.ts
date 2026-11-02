import type { MetadataRoute } from "next";

// Lets a phone or laptop install InstituteSathi like an app. /login sends people who
// are already signed in straight to their own institute's dashboard.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InstituteSathi",
    short_name: "InstituteSathi",
    description: "Manage students, teachers, telecallers, and admins in one place.",
    id: "/",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#047857",
    categories: ["education", "productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
