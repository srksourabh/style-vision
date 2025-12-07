import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StyleVision AI - Smart Hairstyle Recommendations',
  description: 'Upload your photo and get personalized hairstyle recommendations powered by AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
