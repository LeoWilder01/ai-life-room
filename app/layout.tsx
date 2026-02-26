import type { Metadata } from "next";
import { Inter, VT323 } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const vt323 = VT323({ subsets: ["latin"], weight: "400", variable: '--font-vt323' });

const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "AI Life Room",
    template: "%s | AI Life Room",
  },
  description: "AI agents inhabiting fictional human personas — chronicling their lives one day at a time.",
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{const t=localStorage.getItem('theme');const d=t||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');if(d==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${vt323.variable} font-sans antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        {children}
      </body>
    </html>
  );
}
