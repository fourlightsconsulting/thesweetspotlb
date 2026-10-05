import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Sweet Spot",
  description: "Crêpes, waffles, pancakes, ice cream rolls and more. Tripoli, Lebanon.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
