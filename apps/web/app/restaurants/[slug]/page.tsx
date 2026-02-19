import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRestaurant } from '@/lib/data';
import { MenuFilter } from './MenuFilter';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getRestaurant(slug);
  if (!result) {
    return { title: 'Restaurant not found — Mealing About' };
  }
  return {
    title: `${result.restaurant.name} — Mealing About`,
    description: result.restaurant.editorial_summary ?? undefined,
  };
}

export default async function RestaurantPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getRestaurant(slug);

  if (!result) {
    notFound();
  }

  const { restaurant: r, menuItems } = result;

  const priceLabel = r.price_level != null ? '$'.repeat(Math.max(1, r.price_level)) : null;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* Back link */}
      <a
        href="/restaurants"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: '#6b7280',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 500,
          marginBottom: '24px',
        }}
      >
        <span>&#8592;</span> All restaurants
      </a>

      {/* Restaurant header */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {r.photo_url && (
          <div
            style={{
              height: '240px',
              background: `url(${r.photo_url}) center/cover no-repeat`,
            }}
          />
        )}
        <div style={{ padding: '28px' }}>
          {r.neighborhood && (
            <span
              style={{
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#6b7280',
                background: '#f3f4f6',
                borderRadius: '6px',
                padding: '3px 8px',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {r.neighborhood}
            </span>
          )}

          <h1
            style={{
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 800,
              margin: '0 0 10px',
              color: '#111827',
              lineHeight: 1.2,
            }}
          >
            {r.name}
          </h1>

          <p
            style={{
              margin: '0 0 14px',
              fontSize: '15px',
              color: '#6b7280',
            }}
          >
            {r.address}
          </p>

          {/* Rating, price, website row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: r.editorial_summary ? '16px' : 0,
            }}
          >
            {r.rating != null && (
              <span style={{ fontSize: '15px', color: '#374151' }}>
                ⭐ <strong>{r.rating.toFixed(1)}</strong>
                {r.user_rating_count != null && (
                  <span style={{ color: '#9ca3af' }}>
                    {' '}({r.user_rating_count.toLocaleString()} reviews)
                  </span>
                )}
              </span>
            )}
            {priceLabel && (
              <span style={{ fontSize: '15px', color: '#6b7280', fontWeight: 600 }}>
                {priceLabel}
              </span>
            )}
            {r.website_uri && (
              <a
                href={r.website_uri}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '14px',
                  color: '#22c55e',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Website ↗
              </a>
            )}
          </div>

          {r.editorial_summary && (
            <p
              style={{
                margin: 0,
                fontSize: '15px',
                color: '#4b5563',
                lineHeight: 1.6,
              }}
            >
              {r.editorial_summary}
            </p>
          )}
        </div>
      </div>

      {/* Dietary summary bar */}
      <div
        style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>
          Dietary options:
        </span>
        <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '15px' }}>
          🌱 {r.vegan_count} vegan
        </span>
        <span style={{ color: '#0369a1', fontWeight: 600, fontSize: '15px' }}>
          🥚 {r.vegetarian_count} vegetarian
        </span>
        <span style={{ color: '#b45309', fontWeight: 600, fontSize: '15px' }}>
          🌾 {r.gluten_free_count} gluten-free
        </span>
      </div>

      {/* Menu section with client-side filter */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 700,
            margin: '0 0 20px',
            color: '#111827',
          }}
        >
          Menu items
        </h2>
        <MenuFilter menuItems={menuItems} />
      </div>
    </div>
  );
}
