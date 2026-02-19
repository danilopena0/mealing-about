export interface Neighborhood {
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
}

export const NEIGHBORHOODS: Neighborhood[] = [
  { name: 'Humboldt Park', latitude: 41.9003, longitude: -87.7233, radius: 1200 },
  { name: 'West Town', latitude: 41.8919, longitude: -87.6691, radius: 1200 },
  { name: 'Lincoln Park', latitude: 41.9214, longitude: -87.6357, radius: 1400 },
];
