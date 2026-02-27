import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getRestaurant } from '@/lib/data';
import { MenuFilter } from './MenuFilter';

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatAnalyzedAt(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
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
      <Link
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
      </Link>

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
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
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
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {r.neighborhood}
              </span>
            )}
            {r.primary_type_display && (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#b45309',
                  background: '#fffbeb',
                  borderRadius: '6px',
                  padding: '3px 8px',
                }}
              >
                {r.primary_type_display}
              </span>
            )}
          </div>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#111827' }}>
            Menu items
          </h2>
          {r.last_analyzed_at && (
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
              Updated {formatAnalyzedAt(r.last_analyzed_at)}
            </span>
          )}
        </div>
        <MenuFilter menuItems={menuItems} />
      </div>
    </div>
  );
}
