'use client';

import { useState } from 'react';

interface RefinePanelProps {
  children: React.ReactNode;
  defaultOpen: boolean;
  activeCount: number;
}

export function RefinePanel({ children, defaultOpen, activeCount }: RefinePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: '32px' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 14px',
          background: activeCount > 0 ? '#f0fdf4' : '#f9fafb',
          border: `1px solid ${activeCount > 0 ? '#bbf7d0' : '#e5e7eb'}`,
          borderRadius: '8px',
          color: activeCount > 0 ? '#16a34a' : '#6b7280',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          marginBottom: open ? '16px' : 0,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <span>⚙</span>
        Refine
        {activeCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#22c55e',
              color: '#fff',
              borderRadius: '10px',
              padding: '0 7px',
              height: '18px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {activeCount}
          </span>
        )}
        <span style={{ fontSize: '11px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {children}
        </div>
      )}
    </div>
  );
}
