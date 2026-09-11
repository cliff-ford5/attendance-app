import { supabase } from '@/services/supabase';

// The `avatars` bucket is public (see supabase/0015) — this is a pure,
// synchronous URL construction, no network call and no auth needed to read.
export function getAvatarPublicUrl(avatarPath: string): string {
  return supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl;
}
