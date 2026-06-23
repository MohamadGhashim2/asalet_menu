import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Qr Menu",
  description: "Digital QR Menu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fbf9f7] text-gray-900">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
