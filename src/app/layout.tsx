import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { auth } from "@/auth";
import { Providers } from "@/components/providers";
import { AppHeader } from "@/components/layout/app-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCAD-INTESS",
  description: "Sistema de Control Académico y Disciplinario del INTESS",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, session] = await Promise.all([getLocale(), auth()]);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <Providers>
            <AppHeader
              locale={locale}
              isAuthenticated={Boolean(session)}
              userName={session?.user.name ?? null}
              userEmail={session?.user.email ?? null}
            />
            <main className="flex flex-1 flex-col">{children}</main>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
