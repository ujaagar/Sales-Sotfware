import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["600", "700"] });
const urdu = Noto_Sans_Arabic({ variable: "--font-urdu-src", subsets: ["arabic"], weight: ["400", "600"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Ujaagar Sales", template: "%s · Ujaagar Sales" },
  description: "Sales and commission portal for Ujaagar Digital.",
  applicationName: "Ujaagar Sales",
  appleWebApp: { capable: true, title: "Ujaagar Sales", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0E1C33" },
    { media: "(prefers-color-scheme: dark)", color: "#08111F" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={`${inter.variable} ${poppins.variable} ${urdu.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
