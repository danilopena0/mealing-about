import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Mealing About — Find vegan & veggie options in Chicago',
  description:
    'Browse pre-analyzed menus from Chicago restaurants. Find vegan, vegetarian, and gluten-free dishes instantly.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f9fafb',
          color: '#111827',
        }}
      >
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 24px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <a
            href="/"
            style={{
              textDecoration: 'none',
              color: '#111827',
              fontWeight: 700,
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🍽️</span>
            <span>Mealing About</span>
          </a>
        </header>
        <main style={{ minHeight: 'calc(100vh - 60px)' }}>{children}</main>
      </body>
    </html>
  );
}
