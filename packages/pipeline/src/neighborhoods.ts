export interface Neighborhood {
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
}

export const NEIGHBORHOODS: Neighborhood[] = [
  // Original
  { name: 'Humboldt Park',     latitude: 41.9003, longitude: -87.7233, radius: 1200 },
  { name: 'West Town',         latitude: 41.8919, longitude: -87.6691, radius: 1200 },
  { name: 'Lincoln Park',      latitude: 41.9214, longitude: -87.6357, radius: 1400 },
  // Expanded
  { name: 'Wicker Park',       latitude: 41.9084, longitude: -87.6791, radius: 1200 },
  { name: 'Logan Square',      latitude: 41.9217, longitude: -87.7070, radius: 1400 },
  { name: 'Pilsen',            latitude: 41.8555, longitude: -87.6629, radius: 1200 },
  { name: 'Andersonville',     latitude: 41.9788, longitude: -87.6692, radius: 1200 },
  { name: 'Lakeview',          latitude: 41.9432, longitude: -87.6520, radius: 1300 },
  { name: 'Bucktown',          latitude: 41.9172, longitude: -87.6874, radius: 1000 },
  { name: 'Hyde Park',         latitude: 41.7943, longitude: -87.5907, radius: 1200 },
  { name: 'Rogers Park',       latitude: 42.0085, longitude: -87.6670, radius: 1400 },
  { name: 'River North',       latitude: 41.8926, longitude: -87.6340, radius: 1000 },
  { name: 'Ukrainian Village', latitude: 41.8937, longitude: -87.6869, radius: 1000 },
  { name: 'Avondale',          latitude: 41.9364, longitude: -87.7072, radius: 1200 },
];
