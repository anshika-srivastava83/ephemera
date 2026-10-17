import { ClerkProvider } from '@clerk/nextjs';
import { MotionRoot } from '../components/MotionRoot';
import './globals.css';

export const metadata = {
  title: 'Ephemera — A Living Tapestry of Celebrated Moments',
  description:
    'An interactive, communal photography experience for weddings, gatherings, and celebrations. Guests scan a table QR, snap candid Polaroid moments, and build a live projection wall in real time.',
  keywords: ['polaroid wall', 'wedding photography', 'communal memories', 'live photo wall', 'ephemeral events'],
  openGraph: {
    title: 'Ephemera — Some nights deserve to stay together',
    description: 'Every guest brings a memory. Every memory finds its place.',
    type: 'website',
  },
};

export const viewport = {
  colorScheme: 'light',
  themeColor: '#F5F0E7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// Build-time dummy placeholder so static page prerendering succeeds before env vars are added in Vercel.
const clerkPubKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  'pk_test_cGxhY2Vob2xkZXIuY2xlcmsuYWNjb3VudHMuZGV2JA';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <html lang="en">
        <body className="bg-paper text-ink selection:bg-sepia selection:text-white">
          <MotionRoot>{children}</MotionRoot>
        </body>
      </html>
    </ClerkProvider>
  );
}