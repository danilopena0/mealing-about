import { getRestaurants, getNeighborhoods } from '@/lib/data';
import type { DietFilter, RestaurantSummary } from '@/lib/types';

const DIET_OPTIONS: { value: DietFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vegan', label: '🌱 Vegan' },
  { value: 'vegetarian', label: '🥚 Vegetarian' },
  { value: 'gluten-free', label: '🌾 Gluten-Free' },
];

const ITEMS_PER_PAGE = 20;

interface PageProps {
  searchParams: Promise<{ neighborhood?: string; diet?: string; page?: string }>;
}

export default async function RestaurantsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const neighborhood = params.neighborhood;
  const diet = (params.diet as DietFilter) || 'all';
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const [{ restaurants, total }, neighborhoods] = await Promise.all([
    getRestaurants({
      neighborhood,
      diet: diet === 'all' ? undefined : diet,
      page,
      limit: ITEMS_PER_PAGE,
    }),
    getNeighborhoods(),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  function buildUrl(overrides: Record<string, string | undefined>): string {
    const merged = {
      neighborhood,
      diet: diet === 'all' ? undefined : diet,
      page: page > 1 ? String(page) : undefined,
      ...overrides,
    };
    const qs = Object.entries(merged)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join('&');
    return qs ? `/restaurants?${qs}` : '/restaurants';
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <h1
        style={{
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '24px',
          marginTop: 0,
          color: '#111827',
        }}
      >
        Chicago restaurants
        {neighborhood ? ` in ${neighborhood}` : ''}
        {total > 0 && (
          <span style={{ fontSize: '16px', fontWeight: 400, color: '#6b7280', marginLeft: '12px' }}>
            {total} found
          </span>
        )}
      </h1>

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '32px',
          alignItems: 'center',
        }}
      >
        {/* Diet pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {DIET_OPTIONS.map((opt) => {
            const active = diet === opt.value;
            return (
              <a
                key={opt.value}
                href={buildUrl({ diet: opt.value === 'all' ? undefined : opt.value, page: undefined })}
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '2px solid #22c55e',
                  background: active ? '#22c55e' : '#ffffff',
                  color: active ? '#ffffff' : '#16a34a',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </a>
            );
          })}
        </div>

        {neighborhoods.length > 0 && (
          <>
            <div style={{ width: '1px', height: '32px', background: '#e5e7eb', margin: '0 4px' }} />
            {/* Neighborhood pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href={buildUrl({ neighborhood: undefined, page: undefined })}
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '2px solid #6b7280',
                  background: !neighborhood ? '#6b7280' : '#ffffff',
                  color: !neighborhood ? '#ffffff' : '#6b7280',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                }}
              >
                All areas
              </a>
              {neighborhoods.map((n) => {
                const active = neighborhood === n;
                return (
                  <a
                    key={n}
                    href={buildUrl({ neighborhood: n, page: undefined })}
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: '2px solid #6b7280',
                      background: active ? '#6b7280' : '#ffffff',
                      color: active ? '#ffffff' : '#6b7280',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n}
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Grid */}
      {restaurants.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 24px',
            color: '#6b7280',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', marginTop: 0, color: '#374151' }}>
            No restaurants found
          </h2>
          <p style={{ marginTop: 0, marginBottom: '24px' }}>
            Try adjusting your filters or browse all restaurants.
          </p>
          <a
            href="/restaurants"
            style={{
              display: 'inline-block',
              background: '#22c55e',
              color: '#ffffff',
              padding: '12px 28px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Clear filters
          </a>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
              marginBottom: '40px',
            }}
          >
            {restaurants.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                paddingBottom: '40px',
              }}
            >
              {page > 1 ? (
                <a
                  href={buildUrl({ page: page > 2 ? String(page - 1) : undefined })}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    textDecoration: 'none',
                    color: '#374151',
                    fontWeight: 500,
                    background: '#ffffff',
                  }}
                >
                  Previous
                </a>
              ) : (
                <span
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    color: '#9ca3af',
                    fontWeight: 500,
                    background: '#f9fafb',
                  }}
                >
                  Previous
                </span>
              )}
              <span style={{ color: '#6b7280', fontSize: '15px' }}>
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <a
                  href={buildUrl({ page: String(page + 1) })}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    textDecoration: 'none',
                    color: '#374151',
                    fontWeight: 500,
                    background: '#ffffff',
                  }}
                >
                  Next
                </a>
              ) : (
                <span
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    color: '#9ca3af',
                    fontWeight: 500,
                    background: '#f9fafb',
                  }}
                >
                  Next
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RestaurantCard({ restaurant: r }: { restaurant: RestaurantSummary }) {
  const priceLabel = r.price_level != null ? '$'.repeat(Math.max(1, r.price_level)) : null;

  return (
    <a
      href={`/restaurants/${r.slug}`}
      style={{
        display: 'block',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        textDecoration: 'none',
        color: '#111827',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
    >
      {r.photo_url && (
        <div
          style={{
            height: '160px',
            background: `url(${r.photo_url}) center/cover no-repeat`,
          }}
        />
      )}
      <div style={{ padding: '20px' }}>
        {/* Neighborhood tag */}
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
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {r.neighborhood}
          </span>
        )}

        <h3
          style={{
            fontSize: '17px',
            fontWeight: 700,
            margin: '0 0 6px',
            lineHeight: 1.3,
          }}
        >
          {r.name}
        </h3>

        {/* Rating & price */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px',
          }}
        >
          {r.rating != null && (
            <span style={{ fontSize: '14px', color: '#374151' }}>
              ⭐ {r.rating.toFixed(1)}
              {r.user_rating_count != null && (
                <span style={{ color: '#9ca3af' }}> ({r.user_rating_count.toLocaleString()})</span>
              )}
            </span>
          )}
          {priceLabel && (
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>
              {priceLabel}
            </span>
          )}
        </div>

        {/* Editorial summary */}
        {r.editorial_summary && (
          <p
            style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 12px',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {r.editorial_summary}
          </p>
        )}

        {/* Dietary badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {r.vegan_count > 0 && (
            <DietBadge label={`${r.vegan_count} vegan`} color="#16a34a" bg="#f0fdf4" />
          )}
          {r.vegetarian_count > 0 && (
            <DietBadge label={`${r.vegetarian_count} veggie`} color="#0369a1" bg="#f0f9ff" />
          )}
          {r.gluten_free_count > 0 && (
            <DietBadge label={`${r.gluten_free_count} GF`} color="#b45309" bg="#fffbeb" />
          )}
        </div>
      </div>
    </a>
  );
}

function DietBadge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '12px',
        fontWeight: 700,
        color,
        background: bg,
        borderRadius: '6px',
        padding: '3px 8px',
      }}
    >
      {label}
    </span>
  );
}
