import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mealing About — Find vegan, vegetarian & gluten-free options',
  description:
    'Browse pre-analyzed menus from independent restaurants. Find vegan, vegetarian, and gluten-free dishes instantly.',
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
          <Link
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
          </Link>
          <nav style={{ marginLeft: 'auto', display: 'flex', gap: '24px' }}>
            <Link href="/restaurants" style={{ textDecoration: 'none', color: '#374151', fontWeight: 500, fontSize: '15px' }}>
              Browse
            </Link>
            <Link href="/analyze" style={{ textDecoration: 'none', color: '#374151', fontWeight: 500, fontSize: '15px' }}>
              Analyze
            </Link>
          </nav>
        </header>
        <main style={{ minHeight: 'calc(100vh - 60px)' }}>{children}</main>
      </body>
    </html>
  );
}
