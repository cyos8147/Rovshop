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
    default: "RoVShop — ซื้อขายไอดีเกม RoV ปลอดภัย ส่งไว",
    template: "%s | RoVShop",
  },
  description:
    "ร้านขายไอดีเกม RoV (Arena of Valor) แรงค์สูง สกินหายาก ราคาคุ้มค่า ตรวจสอบสเปกได้ก่อนซื้อ",
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
