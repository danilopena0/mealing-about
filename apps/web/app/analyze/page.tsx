'use client';

import { useState } from 'react';

type InputMode = 'url' | 'text';

interface AnalyzedLabel {
  type: 'vegan' | 'vegetarian' | 'gluten-free';
  confidence: 'confirmed' | 'uncertain';
  askServer?: string;
}

interface AnalyzedItem {
  name: string;
  description?: string;
  labels: AnalyzedLabel[];
  modifications?: string[];
}

const EMOJI: Record<string, string> = { vegan: '🌱', vegetarian: '🥚', 'gluten-free': '🌾' };
const DIET_LABEL: Record<string, string> = { vegan: 'Vegan', vegetarian: 'Vegetarian', 'gluten-free': 'Gluten-Free' };

type DietFilter = 'all' | 'vegan' | 'vegetarian' | 'gluten-free';

const FILTER_OPTIONS: { value: DietFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vegan', label: '🌱 Vegan' },
  { value: 'vegetarian', label: '🥚 Vegetarian' },
  { value: 'gluten-free', label: '🌾 Gluten-Free' },
];

export default function AnalyzePage() {
  const [mode, setMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AnalyzedItem[] | null>(null);
  const [filter, setFilter] = useState<DietFilter>('all');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setItems(null);

    const data = mode === 'url' ? url.trim() : text.trim();
    if (!data) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mode, data }),
      });
      const json = await res.json() as { items?: AnalyzedItem[]; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? 'Analysis failed');
      setItems(json.items ?? []);
      setFilter('all');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = items?.filter((item) => {
    if (filter === 'all') return true;
    return item.labels.some((l) => l.type === filter);
  }) ?? [];

  const pillStyle = (active: boolean, color = '#22c55e') => ({
    display: 'inline-block' as const,
    padding: '8px 16px',
    borderRadius: '20px',
    border: `2px solid ${color}`,
    background: active ? color : '#ffffff',
    color: active ? '#ffffff' : color,
    fontWeight: 600 as const,
    fontSize: '14px',
    cursor: 'pointer' as const,
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 80px' }}>
      <h1 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, margin: '0 0 8px', color: '#111827' }}>
        Analyze any menu
      </h1>
      <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 32px', lineHeight: 1.6 }}>
        Paste a menu URL or text to instantly find vegan, vegetarian, and gluten-free options.
      </p>

      {/* Input mode tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['url', 'text'] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              ...pillStyle(mode === m),
              border: `2px solid ${mode === m ? '#22c55e' : '#d1d5db'}`,
              color: mode === m ? '#fff' : '#374151',
              background: mode === m ? '#22c55e' : '#fff',
            }}
          >
            {m === 'url' ? '🔗 Menu URL' : '📋 Paste text'}
          </button>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit}>
        {mode === 'url' ? (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://restaurant.com/menu"
            required
            style={{
              width: '100%',
              height: '48px',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              paddingInline: '16px',
              fontSize: '15px',
              color: '#111827',
              background: '#fff',
              boxSizing: 'border-box',
              marginBottom: '12px',
            }}
          />
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the menu text here — item names, descriptions, ingredients..."
            required
            rows={8}
            style={{
              width: '100%',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              padding: '14px 16px',
              fontSize: '15px',
              color: '#111827',
              background: '#fff',
              boxSizing: 'border-box',
              resize: 'vertical',
              marginBottom: '12px',
              lineHeight: 1.5,
            }}
          />
        )}

        <button
          type="submit"
          disabled={isLoading || !(mode === 'url' ? url.trim() : text.trim())}
          style={{
            width: '100%',
            height: '48px',
            background: isLoading ? '#86efac' : '#22c55e',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {isLoading ? 'Analyzing…' : 'Analyze menu'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '16px 20px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          color: '#dc2626',
          fontSize: '15px',
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {items !== null && (
        <div style={{ marginTop: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#111827' }}>
              Results
              <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>
                {filtered.length} item{filtered.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <button
              onClick={() => { setItems(null); setUrl(''); setText(''); }}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕ Clear
            </button>
          </div>

          {/* Diet filter pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                style={pillStyle(filter === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
              <p style={{ margin: 0 }}>No items match this filter.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map((item, i) => (
                <ResultItem key={i} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultItem({ item }: { item: AnalyzedItem }) {
  const hasLabels = item.labels.length > 0;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '18px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: item.description ? '6px' : '0' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827', flex: 1 }}>
          {item.name}
        </h3>
        {hasLabels && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
            {item.labels.map((label, j) => (
              <span
                key={j}
                title={label.confidence === 'uncertain' ? 'Ask your server to confirm' : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: label.confidence === 'uncertain' ? '#fffbeb' : '#f0fdf4',
                  color: label.confidence === 'uncertain' ? '#b45309' : '#16a34a',
                  border: `1px solid ${label.confidence === 'uncertain' ? '#fde68a' : '#bbf7d0'}`,
                }}
              >
                {EMOJI[label.type]} {DIET_LABEL[label.type]}
                {label.confidence === 'uncertain' && ' ⚠️'}
              </span>
            ))}
          </div>
        )}
      </div>

      {item.description && (
        <p style={{ margin: '4px 0 10px', fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
          {item.description}
        </p>
      )}

      {item.labels.some((l) => l.askServer) && (
        <div style={{
          marginTop: '10px',
          padding: '10px 14px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#0369a1',
        }}>
          <strong>Ask your server:</strong>{' '}
          {item.labels.find((l) => l.askServer)?.askServer}
        </div>
      )}

      {item.modifications && item.modifications.length > 0 && (
        <div style={{
          marginTop: '10px',
          padding: '10px 14px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Modifications
          </p>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
            {item.modifications.map((mod, j) => <li key={j}>{mod}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
