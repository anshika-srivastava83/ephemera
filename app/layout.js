import './globals.css';

export const metadata = {
  title: 'Ephemera',
  description: 'A live, guest-contributed polaroid wall for events.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}