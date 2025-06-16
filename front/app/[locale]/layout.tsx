import { AltSidebar } from "@/components/layout/AltSidebar";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppWalletProvider from "@/components/wallet/AppWalletProvider";
import { ProgramProvider } from "@/context/ProgramContext";
import "@/utils/logger";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import "../globals.css";
import { routing } from "../i18n/routing";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const nacelle = localFont({
  src: [
    {
      path: "../../public/fonts/nacelle-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/nacelle-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/nacelle-semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/nacelle-semibolditalic.woff2",
      weight: "600",
      style: "italic",
    },
  ],
  variable: "--font-nacelle",
  display: "swap",
});
export const metadata: Metadata = {
  title: "NoRug.fun",
  description:
    "NoRug.fun is a curated token launcher on Solana designed to reduce rug pulls and pump & dump schemes seen on platforms like pump.fun. Security, transparency, and quality first.",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: (typeof routing.locales)[number] }>;
};
export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;

  // Check if the locale is valid
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Fetch the translation messages for the specified locale
  const messages = await getMessages({ locale });

  // Cookie to store the state of the vertical navbar
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${nacelle.variable} bg-background font-inter text-base text-foreground antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <AppWalletProvider>
              <ProgramProvider>
                <SidebarProvider defaultOpen={defaultOpen}>
                  <div className="flex w-full max-w-screen overflow-hidden">
                    <AltSidebar />
                    <div className="flex-1 overflow-hidden">
                      <Header />
                      <main className="overflow-x-hidden">{children}</main>
                      <Footer />
                    </div>
                  </div>
                </SidebarProvider>
              </ProgramProvider>
            </AppWalletProvider>
            <Toaster richColors position="top-right" />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
