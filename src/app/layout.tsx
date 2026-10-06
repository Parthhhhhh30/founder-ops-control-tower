import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BACKBONE · Founder Operations Control System",
  description:
    "An independent synthetic portfolio prototype for transparent operational judgment.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
