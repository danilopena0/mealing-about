'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// baseParams: the current query string WITHOUT lat/lng/page, pre-computed
// by the server component so this button never needs useSearchParams.
export function NearMeButton({ active, baseParams }: { active: boolean; baseParams: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleClick() {
    if (active) {
      router.push(baseParams ? `/restaurants?${baseParams}` : '/restaurants');
      return;
    }

    if (!navigator.geolocation) {
      alert('Your browser does not support location access.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = new URLSearchParams(baseParams);
        params.set('lat', pos.coords.latitude.toFixed(6));
        params.set('lng', pos.coords.longitude.toFixed(6));
        router.push(`/restaurants?${params.toString()}`);
        setLoading(false);
      },
      () => {
        alert('Location access denied. Please allow location in your browser settings.');
        setLoading(false);
      },
      { timeout: 8000 },
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        height: '42px',
        paddingInline: '18px',
        background: active ? '#16a34a' : '#ffffff',
        color: active ? '#ffffff' : '#374151',
        border: `1px solid ${active ? '#16a34a' : '#d1d5db'}`,
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '15px',
        cursor: loading ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? 'Locating…' : active ? '📍 Near me ✕' : '📍 Near me'}
    </button>
  );
}
