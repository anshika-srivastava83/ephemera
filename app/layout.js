import './globals.css';

export const metadata = {
  title: 'Ephemera',
  description: 'A live, guest-contributed polaroid wall for events.',
  other: {
    'color-scheme': 'light',
    'supported-color-schemes': 'light',
  },
};

export const viewport = {
  colorScheme: 'light',
  themeColor: '#f3effa',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <body>{children}</body>
    </html>
  );
}