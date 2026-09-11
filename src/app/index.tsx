import { Redirect } from 'expo-router';
import { LoadingState } from '@/components/ScreenState';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingState />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (profile && profile.role !== 'employee') return <Redirect href="/(admin)/staff" />;
  return <Redirect href="/(employee)" />;
}
