import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LiffProvider } from "@/features/liff/liff-context";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";

export const metadata: Metadata = {
  title: "MoneyFamily - จัดการเงินครอบครัวบน LINE + PWA",
  description: "แอปบันทึกรายรับ-รายจ่าย หารบิล และสรุปหนี้สินในครอบครัว",
  applicationName: "MoneyFamily",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MoneyFamily",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F2038", // กรมท่า Navy CI
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased font-sans">
        <LiffProvider>
          {children}
          <RegisterServiceWorker />
        </LiffProvider>
      </body>
    </html>
  );
}

