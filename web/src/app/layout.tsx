import Providers from "@/components/Providers";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Some App",
  description: "This app does something",
  icons: ["/logo.gif"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} dark:bg-black`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
