import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import "../components/planning.css";
import "../components/dashboard.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://fuellock.vercel.app"),
  openGraph: {
    type: "website",
    siteName: "FuelLock",
    title: "FuelLock | Family fuel planning",
    description:
      "Compare a price cap, plan a fuel stop and see your actual net result.",
    images: [
      { url: "/images/fuel-stop.webp", alt: "Car at a FuelLock demo station" },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
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
