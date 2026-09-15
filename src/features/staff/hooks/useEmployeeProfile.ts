import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as staffService from '../services/staffService';
import type { EmployeeProfileInput } from '../services/staffService';
import type { Employee } from '../types';

export function useEmployeeProfile(employeeId: string | undefined) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingRoaming, setSavingRoaming] = useState(false);
  const [savingActive, setSavingActive] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  // Separate from `error` on purpose: `error` drives the screen's
  // full-page ErrorState (a real load failure), so a save failure can't
  // also be routed through it — that would kick the admin out to a blank
  // error screen mid-edit instead of just showing an inline message on the
  // form they were already looking at.
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      setEmployee(await staffService.getEmployeeById(employeeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this profile.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useRefetchOnFocus(load);

  async function setLocation(locationId: string | null) {
    if (!employeeId) return;
    setSavingLocation(true);
    setSaveError(null);
    try {
      setEmployee(await staffService.updateEmployeeLocation(employeeId, locationId));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not update this employee's location.");
    } finally {
      setSavingLocation(false);
    }
  }

  async function setRoaming(isRoaming: boolean) {
    if (!employeeId) return;
    setSavingRoaming(true);
    setSaveError(null);
    try {
      setEmployee(await staffService.updateEmployeeRoaming(employeeId, isRoaming));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not update this employee's roaming setting.");
    } finally {
      setSavingRoaming(false);
    }
  }

  async function setActive(active: boolean) {
    if (!employeeId) return;
    setSavingActive(true);
    setSaveError(null);
    try {
      setEmployee(await staffService.updateEmployeeActive(employeeId, active));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not update this employee's active status.");
    } finally {
      setSavingActive(false);
    }
  }

  async function updateProfile(input: EmployeeProfileInput) {
    if (!employeeId) return false;
    setSavingProfile(true);
    setSaveError(null);
    try {
      setEmployee(await staffService.updateEmployee(employeeId, input));
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save this employee's profile.");
      return false;
    } finally {
      setSavingProfile(false);
    }
  }

  return {
    employee,
    loading,
    error,
    saveError,
    savingLocation,
    setLocation,
    savingRoaming,
    setRoaming,
    savingActive,
    setActive,
    savingProfile,
    updateProfile,
    reload: load,
  };
}
