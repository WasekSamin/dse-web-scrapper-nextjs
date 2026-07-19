import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Providers from "@/components/providers";
import MainNav from "@/components/MainNav";
import MobileNav from "@/components/MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "DSE Web Scrapper",
  description: "Live Dhaka Stock Exchange share prices — view and export.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-muted/30 antialiased">
        <Providers>
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
              <div className="flex items-center gap-1">
                <MobileNav />
                <Link href="/" className="flex items-center">
                  <Image
                    src="/logo.png"
                    alt="DSE Scrapper"
                    width={572}
                    height={117}
                    priority
                    className="h-8 w-auto"
                  />
                </Link>
              </div>
              <MainNav />
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
            {children}
          </main>
          <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} · Made by{" "}
              <a
                href="https://github.com/WasekSamin"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Wasek Samin
              </a>
            </p>
            <p className="mt-1">
              Data scraped live from dsebd.org. For personal / educational use.
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
