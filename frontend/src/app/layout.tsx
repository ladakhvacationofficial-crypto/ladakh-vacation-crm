import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

/**
 * The Ladakh Vacation brand pairing. Cormorant Garamond only on display
 * headings (dashboard greeting, hero numbers); Plus Jakarta Sans for body copy,
 * tables and forms. Geist Mono stays for figures and codes.
 */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'Ladakh Vacation',
  description: 'Lead, quotation and booking desk',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${GeistMono.variable} ${cormorant.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
