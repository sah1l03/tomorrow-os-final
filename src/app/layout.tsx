import type { Metadata } from "next";
import "./globals.css";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/breezy/theme.css";
import "@fullcalendar/react/themes/breezy/palettes/emerald.css";
import "./scenes.css";
import "./daybreak.css";

export const metadata: Metadata = {
  title: { default: "TomorrowOS", template: "%s · TomorrowOS" },
  description: "A calmer place to see your classes, deadlines, shifts and personal plans.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
