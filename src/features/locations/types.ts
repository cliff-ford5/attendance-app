import type { Location } from '@/types/database';

export type { Location };

export type LocationInput = {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  expectedStart: string;
  expectedEnd: string;
};
