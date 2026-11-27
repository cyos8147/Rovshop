import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Kanit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OSCAR Gaming images — ทำป้ายสกิน RoV",
    template: "%s | OSCAR Gaming images",
  },
  description:
    "เว็บทำป้ายสกินเกม RoV เลือกสกิน เลือกพื้นหลัง ใส่ข้อมูลไอดี แล้วได้ภาพเดียวพร้อมโพสต์ จัดฟรี จ่ายเมื่อดาวน์โหลด",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className={kanit.variable}>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
