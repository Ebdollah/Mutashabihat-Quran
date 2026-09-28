import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mutashabihat · متشابهات',
    short_name: 'Mutashabihat',
    description: 'Track and compare similar ayahs of the Quran.',
    start_url: '/sets',
    display: 'standalone',
    background_color: '#F5F2EA',
    theme_color: '#0E5C56',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
