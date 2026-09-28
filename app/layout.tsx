import type { Metadata } from 'next';
import { Amiri_Quran, Fraunces, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const amiriQuran = Amiri_Quran({ variable: '--font-amiri-quran', weight: '400', subsets: ['arabic', 'latin'] });
const fraunces = Fraunces({ variable: '--font-fraunces', weight: ['500', '600'], subsets: ['latin'] });
const plex = IBM_Plex_Sans({ variable: '--font-plex', weight: ['400', '500', '600'], subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Mutashabihat', template: '%s · Mutashabihat' },
  description: 'Track and compare similar ayahs of the Quran.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${amiriQuran.variable} ${fraunces.variable} ${plex.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
