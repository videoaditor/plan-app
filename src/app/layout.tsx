import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Plan — Infinite Canvas",
  description: "A premium infinite canvas for creative planning",
  icons: {
    icon: "/favicon.ico",
  },
};

const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('plan-theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {}
})();
`.trim();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
