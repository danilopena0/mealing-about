import { getDietaryCounts, getNeighborhoods } from '@/lib/data';

export default async function HomePage() {
  const [counts, neighborhoods] = await Promise.all([
    getDietaryCounts(),
    getNeighborhoods(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          padding: '80px 24px',
          textAlign: 'center',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1.15,
              marginBottom: '20px',
              marginTop: 0,
            }}
          >
            Find your next vegan meal in Chicago
          </h1>
          <p
            style={{
              fontSize: '20px',
              color: '#4b5563',
              marginBottom: '40px',
              lineHeight: 1.6,
              marginTop: 0,
            }}
          >
            We&apos;ve analyzed menus from 200+ independent Chicago restaurants so you don&apos;t
            have to.
          </p>
          <a
            href="/restaurants"
            style={{
              display: 'inline-block',
              background: '#22c55e',
              color: '#ffffff',
              padding: '16px 40px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '18px',
              boxShadow: '0 4px 12px rgba(34,197,94,0.35)',
              transition: 'background 0.15s',
            }}
          >
            Browse restaurants
          </a>
        </div>
      </section>

      {/* Feature cards */}
      <section
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '60px 24px 0',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}
        >
          <FeatureCard
            emoji="🌱"
            label="Vegan"
            count={counts.vegan}
            color="#16a34a"
            bg="#f0fdf4"
            border="#bbf7d0"
          />
          <FeatureCard
            emoji="🥚"
            label="Vegetarian"
            count={counts.vegetarian}
            color="#0369a1"
            bg="#f0f9ff"
            border="#bae6fd"
          />
          <FeatureCard
            emoji="🌾"
            label="Gluten-Free"
            count={counts.glutenFree}
            color="#b45309"
            bg="#fffbeb"
            border="#fde68a"
          />
        </div>
      </section>

      {/* Quick filters */}
      <section
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '48px 24px 0',
        }}
      >
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '16px',
            marginTop: 0,
            color: '#111827',
          }}
        >
          Quick filters
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <PillLink href="/restaurants?diet=vegan" label="🌱 Vegan options" />
          <PillLink href="/restaurants?diet=vegetarian" label="🥚 Vegetarian" />
          <PillLink href="/restaurants?diet=gluten-free" label="🌾 Gluten-free" />
        </div>
      </section>

      {/* Neighborhoods */}
      {neighborhoods.length > 0 && (
        <section
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            padding: '48px 24px 80px',
          }}
        >
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '20px',
              marginTop: 0,
              color: '#111827',
            }}
          >
            Browse by neighborhood
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {neighborhoods.map((n) => (
              <a
                key={n}
                href={`/restaurants?neighborhood=${encodeURIComponent(n)}`}
                style={{
                  display: 'block',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  textDecoration: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '15px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {n}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FeatureCard({
  emoji,
  label,
  count,
  color,
  bg,
  border,
}: {
  emoji: string;
  label: string;
  count: number;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '12px',
        padding: '28px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{emoji}</div>
      <div
        style={{
          fontSize: '36px',
          fontWeight: 800,
          color,
          marginBottom: '4px',
          lineHeight: 1,
        }}
      >
        {count}
      </div>
      <div style={{ fontSize: '15px', color: '#6b7280', fontWeight: 500 }}>
        restaurants with {label} options
      </div>
    </div>
  );
}

function PillLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        padding: '10px 20px',
        borderRadius: '20px',
        border: '2px solid #22c55e',
        color: '#16a34a',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '15px',
        background: '#ffffff',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </a>
  );
}
