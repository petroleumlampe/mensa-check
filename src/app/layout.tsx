import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mensa-Check Jena',
  description: 'Vegane & glutenfreie Gerichte in den Jenaer Mensen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
