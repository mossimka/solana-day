import type { Metadata } from "next";

import "@/styles/globals.css";


export const metadata: Metadata = {
  title: "Sephyra",
  description: "Sephyra - The Ultimate ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
