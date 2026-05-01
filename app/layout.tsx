import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { LoadingProvider } from "@/components/loading-provider"
import { BadgeNotificationProvider } from "@/components/badge-notification-provider"
import type { Metadata, Viewport } from "next"
import { PerformanceMonitor } from "./performance-monitor"
import { RegisterServiceWorker as RegisterSW } from "./register-sw"
import { cn } from "@/lib/utils"

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Optimizare pentru font loading
  preload: true,
})

export const metadata: Metadata = {
  title: {
    default: "NeuroLearn",
    template: "%s | NeuroLearn",
  },
  description: "Învață în stilul tău preferat cu o aplicație adaptată nevoilor tale de învățare",
  keywords: ["învățare", "educație", "adaptiv", "personalizat", "lecții", "studiu", "open source", "impreuna"],
  authors: [{ name: "Postelnicu Daniel" }, { name: "Postelnicu Ioachim-Florian-Daniel" }],
  creator: "Postelnicu Ioachim-Florian-Daniel",
  publisher: "Postelnicu Daniel",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",

  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: "https://neuro-learn.vercel.app/",
    title: "NeuroLearn",
    description: "Platformă educațională care te ajută să descoperi și să valorifici stilul tău unic de învățare",
    siteName: "NeuroLearn",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Aplicație de învățare interactivă",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroLearn",
    description: "Platformă educațională care te ajută să descoperi și să valorifici stilul tău unic de învățare",
    images: ["/images/og-image.jpg"],
  },
  alternates: {
    canonical: "https://neuro-learn.vercel.app/",
    languages: {
      "ro-RO": "https://neuro-learn.vercel.app/",
    },
  },
  verification: {
    google: "verificare-google",
  },
  category: "education",
  appleWebApp: {
    capable: true,
    title: "NeuroLearn",
    statusBarStyle: "black-translucent",
  },
  applicationName: "NeuroLearn",

  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
    generator: 'v0.dev'
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#161d1d" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#161d1d" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NeuroLearn" />

        {/* Preconnect pentru resurse externe */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Icons for PWA */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* PWA splash screens for iOS */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-2048-2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1668-2388.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1536-2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1125-2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1242-2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-828-1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1242-2208.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-750-1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-640-1136.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LoadingProvider>
            <BadgeNotificationProvider>
              <RegisterSW />
              <PerformanceMonitor />
              <Toaster />
              {children}
            </BadgeNotificationProvider>
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
