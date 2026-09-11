import type { AttendanceRecord, Employee } from '@/types/database';

export type { AttendanceRecord };

export type AttendanceWithEmployee = AttendanceRecord & {
  employees: Pick<Employee, 'id' | 'name' | 'position' | 'avatar_path'>;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};
