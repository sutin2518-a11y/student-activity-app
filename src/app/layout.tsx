import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar"; // 1. เพิ่มการ Import Navbar

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบกิจกรรมพัฒนาผู้เรียน",
  description: "Student Activity Management System",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        {/* 2. แทรก Navbar ไว้ด้านบนสุด */}
        <Navbar />
        
        {/* 3. ครอบ children ด้วย main เพื่อจัดขอบเขต Layout */}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}