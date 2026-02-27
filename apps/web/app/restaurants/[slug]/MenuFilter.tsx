'use client';

import { useState } from 'react';
import type { MenuItem, DietFilter } from '@/lib/types';

const DIET_TABS: { value: DietFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vegan', label: '🌱 Vegan' },
  { value: 'vegetarian', label: '🥚 Vegetarian' },
  { value: 'gluten-free', label: '🌾 Gluten-Free' },
];

export function MenuFilter({ menuItems }: { menuItems: MenuItem[] }) {
  const [activeFilter, setActiveFilter] = useState<DietFilter>('all');
  const [certainOnly, setCertainOnly] = useState(false);
  const [hideBeverages, setHideBeverages] = useState(true);

  const hasBeverages = menuItems.some((item) => item.category === 'beverage');

  const filtered = menuItems.filter((item) => {
    if (hideBeverages && item.category === 'beverage') return false;
    if (activeFilter === 'all') return true;
    const matchesDiet =
      activeFilter === 'vegan' ? item.is_vegan :
      activeFilter === 'vegetarian' ? item.is_vegetarian :
      activeFilter === 'gluten-free' ? item.is_gluten_free :
      true;
    if (!matchesDiet) return false;
    if (certainOnly && item.confidence !== 'certain') return false;
    return true;
  });

  return (
    <div>
      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '24px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '16px',
        }}
      >
        {DIET_TABS.map((tab) => {
          const active = activeFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                border: '2px solid #22c55e',
                background: active ? '#22c55e' : '#ffffff',
                color: active ? '#ffffff' : '#16a34a',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
        <span
          style={{
            marginLeft: 'auto',
            alignSelf: 'center',
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Toggles row */}
      {(activeFilter !== 'all' || hasBeverages) && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {activeFilter !== 'all' && (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={certainOnly}
                onChange={(e) => setCertainOnly(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#22c55e', cursor: 'pointer' }}
              />
              Confirmed items only
            </label>
          )}
          {hasBeverages && (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={hideBeverages}
                onChange={(e) => setHideBeverages(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#22c55e', cursor: 'pointer' }}
              />
              Hide beverages
            </label>
          )}
        </div>
      )}

      {/* Menu items list */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#6b7280',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
          <p style={{ margin: 0, fontSize: '16px' }}>
            No items match this filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '6px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 700,
                color: '#111827',
              }}
            >
              {item.name}
            </h3>
            {item.confidence === 'uncertain' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#b45309',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  padding: '2px 8px',
                }}
              >
                ⚠️ Uncertain
              </span>
            )}
          </div>

          {item.description && (
            <p
              style={{
                margin: '0 0 10px',
                fontSize: '14px',
                color: '#6b7280',
                lineHeight: 1.5,
              }}
            >
              {item.description}
            </p>
          )}

          {/* Dietary badges */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: item.ask_server || item.modifications?.length ? '12px' : 0 }}>
            {item.is_vegan && (
              <DietBadge label="🌱 Vegan" color="#16a34a" bg="#f0fdf4" />
            )}
            {item.is_vegetarian && (
              <DietBadge label="🥚 Vegetarian" color="#0369a1" bg="#f0f9ff" />
            )}
            {item.is_gluten_free && (
              <DietBadge label="🌾 GF" color="#b45309" bg="#fffbeb" />
            )}
          </div>

          {/* Modifications */}
          {item.modifications && item.modifications.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p
                style={{
                  margin: '0 0 4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Modifications
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '13px',
                  color: '#6b7280',
                  lineHeight: 1.6,
                }}
              >
                {item.modifications.map((mod, i) => (
                  <li key={i}>{mod}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Ask server tip */}
          {item.ask_server && (
            <div
              style={{
                marginTop: '10px',
                padding: '10px 14px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#0369a1',
              }}
            >
              <strong>Ask your server:</strong> {item.ask_server}
            </div>
          )}
        </div>
      </div>
    </div>
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
