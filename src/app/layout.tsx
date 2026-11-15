import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import "../components/planning.css";
import "../components/dashboard.css";
export const metadata: Metadata = {
  title: "FuelLock | Family fuel workspace",
  description: "Plan your household fuel budget and protect eligible fill-ups.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US">
      <body>{children}</body>
    </html>
  );
}
