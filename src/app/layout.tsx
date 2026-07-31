import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { LanguageProvider } from "@/components/LanguageProvider";
import type { Lang } from "@/lib/i18n";
import { auth } from "@/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LocalServices - Marketplace de services locaux",
  description: "Mettez en relation les clients et les professionnels de services locaux",
  icons: { icon: "/icon-192.svg" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value as Lang) || "fr";
  const dir = lang === "ar-tn" ? "rtl" : "ltr";
  const rawSession = await auth();
  const session = rawSession?.user ? rawSession : null;

  return (
    <html lang={lang === "ar-tn" ? "ar-TN" : "fr"} dir={dir} suppressHydrationWarning>
      <body className={inter.className}>
        <LanguageProvider initialLang={lang}>
          <ThemeProvider>
            <AuthProvider session={session}>
              <PwaRegister />
              <Navbar />
              <main>{children}</main>
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
