import { supabase } from '@/services/supabase';
import type { Location } from '@/types/database';
import type { LocationInput } from '../types';

export async function getAllLocations(): Promise<Location[]> {
  const { data, error } = await supabase.from('locations').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Location[];
}

export async function getLocationById(id: string): Promise<Location> {
  const { data, error } = await supabase.from('locations').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Location;
}

export async function createLocation(input: LocationInput): Promise<Location> {
  const { data, error } = await supabase
    .from('locations')
    .insert({
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radius_meters: input.radiusMeters,
      expected_start: input.expectedStart,
      expected_end: input.expectedEnd,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Location;
}

// No `on delete` clause on employees.location_id (0001) — deleting a
// location still assigned to any employee fails with a real foreign-key
// violation rather than silently unassigning them or cascading. Deliberate:
// the admin should reassign those employees first, not have it happen by
// accident.
export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
}

export async function updateLocation(id: string, input: LocationInput): Promise<Location> {
  const { data, error } = await supabase
    .from('locations')
    .update({
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radius_meters: input.radiusMeters,
      expected_start: input.expectedStart,
      expected_end: input.expectedEnd,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Location;
}
