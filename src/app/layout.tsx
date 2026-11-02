import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import PwaRegister from "@/components/pwa/PwaRegister";
import InstallPrompt from "@/components/pwa/InstallPrompt";

// Runs before React hydrates so the very first paint already has the right
// theme — otherwise a dark-mode visitor sees a flash of the light page.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('theme');var t=s||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InstituteSathi",
  description: "Manage students, teachers, telecallers, and admins in one place.",
  applicationName: "InstituteSathi",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "InstituteSathi", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

// viewportFit "cover" lets the app use the full screen on notched phones; the layouts add
// safe-area padding where needed.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#047857" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <InstallPrompt />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
