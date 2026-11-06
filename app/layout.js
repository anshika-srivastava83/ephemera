import { ClerkProvider } from '@clerk/nextjs';
import { MotionRoot } from '../components/MotionRoot';
import './globals.css';

export const metadata = {
  title: 'Mehfil: One Photo Wall for Every Shaadi & Celebration',
  description:
    'Guests scan a QR on the table, click photos, and watch them appear live on the big screen. For shaadis, sangeets, birthdays and every get-together. No app needed.',
  keywords: ['mehfil', 'polaroid wall', 'wedding photography', 'shaadi photos', 'live photo wall', 'celebration'],
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Mehfil: Saari yaadein, ek deewar par',
    description: 'Scan the table QR. Click a photo. See it live on the big screen.',
    type: 'website',
  },
};

export const viewport = {
  colorScheme: 'light',
  themeColor: '#F5F0E7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const content = (
    <html lang="en">
      <body className="bg-paper text-ink selection:bg-sepia selection:text-white">
        <MotionRoot>{children}</MotionRoot>
      </body>
    </html>
  );

  if (hasClerk) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}