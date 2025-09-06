import type { Metadata } from "next";
import "./globals.css";
import { DrawingSettingsProvider } from "@/context/DrawingSettingsContext";

export const metadata: Metadata = {
  title: "Portrait.Coach",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = "https://portrait.coach/";
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap"
          rel="stylesheet"
        />
        <link rel="canonical" href={baseUrl} />
      </head>
      <body>
        <DrawingSettingsProvider>{children}</DrawingSettingsProvider>
      </body>
    </html>
  );
}
