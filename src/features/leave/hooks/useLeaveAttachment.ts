import { useState } from 'react';
import * as leaveService from '../services/leaveService';

// Manages the optional photo + location a leave request can carry —
// separate from useCreateLeaveRequest since these are picked/fetched
// *before* submission (the photo uploads immediately on pick, same as
// avatarService's flow) while the create call itself stays a single
// request-shaped submit.
export function useLeaveAttachment(employeeId: string | undefined) {
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string | null } | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPhoto() {
    if (!employeeId) return;
    setError(null);
    setUploadingPhoto(true);
    try {
      const path = await leaveService.pickAndUploadLeaveAttachment(employeeId);
      if (path) setAttachmentPath(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not attach a photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto() {
    setAttachmentPath(null);
  }

  async function addLocation() {
    setError(null);
    setFetchingLocation(true);
    try {
      const result = await leaveService.getCurrentLeaveLocation();
      if (result) {
        setLocation(result);
      } else {
        setError('Could not get your current location.');
      }
    } finally {
      setFetchingLocation(false);
    }
  }

  function removeLocation() {
    setLocation(null);
  }

  function reset() {
    setAttachmentPath(null);
    setLocation(null);
    setError(null);
  }

  // Pre-fills this hook's state from an already-existing request being
  // edited — this hook otherwise only ever starts empty (a *new* request
  // has no attachment yet), so editing needs an explicit way to seed it
  // with what the request already has, rather than the edit accidentally
  // wiping a real attachment/location back to null on save.
  function seed(existing: { attachmentPath: string | null; location: { lat: number; lng: number; address: string | null } | null }) {
    setAttachmentPath(existing.attachmentPath);
    setLocation(existing.location);
  }

  return {
    attachmentPath,
    uploadingPhoto,
    addPhoto,
    removePhoto,
    location,
    fetchingLocation,
    addLocation,
    removeLocation,
    error,
    reset,
    seed,
  };
}
