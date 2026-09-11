import type { Employee } from '@/types/database';

export type AuthProfile = Employee;

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
};
