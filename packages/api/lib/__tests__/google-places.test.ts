import { describe, it, expect } from 'vitest';
import { calculateDistance, getPhotoUrl } from '../google-places.js';

describe('calculateDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(calculateDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it('calculates short distance correctly', () => {
    // ~1.1 km between two points in Manhattan
    const distance = calculateDistance(40.7128, -74.006, 40.7218, -74.006);
    expect(distance).toBeGreaterThan(900);
    expect(distance).toBeLessThan(1100);
  });

  it('calculates long distance correctly', () => {
    // New York to London: ~5,570 km
    const distance = calculateDistance(40.7128, -74.006, 51.5074, -0.1278);
    expect(distance).toBeGreaterThan(5_500_000);
    expect(distance).toBeLessThan(5_600_000);
  });
});

describe('getPhotoUrl', () => {
  it('returns a URL with the photo name and size param', () => {
    const url = getPhotoUrl('places/abc123/photos/def456');
    expect(url).toContain('places/abc123/photos/def456');
    expect(url).toContain('maxWidthPx=400');
    expect(url).toContain('places.googleapis.com');
    expect(url).toContain('/media');
  });
});
