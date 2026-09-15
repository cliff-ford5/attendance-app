import type { Holiday } from '@/types/database';

export type { Holiday };

export type HolidayInput = {
  name: string;
  date: string;
  blocksCheckIn: boolean;
};
