import { Redirect, router, Tabs } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { AppTabBarIcon } from '@/components/AppTabBarIcon';
import { LoadingState } from '@/components/ScreenState';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function EmployeeLayout() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) return <LoadingState />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (profile && profile.role !== 'employee') return <Redirect href="/(admin)/staff" />;

  const logoutAction = [{ icon: 'logout', onPress: () => signOut(), accessibilityLabel: 'Sign out' }];

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
      }}
    >
      {/* Custom in-content header (avatar/name/sign-out) instead of the
          shared AppHeader — this is the one screen redesigned to match the
          reference the user sent, which has no native-style title bar at
          all on its home screen. */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Check In',
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <AppTabBarIcon name="map-marker-check" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <AppTabBarIcon name={focused ? 'calendar-clock' : 'calendar-clock-outline'} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'My Tasks',
          tabBarIcon: ({ focused, color, size }) => (
            <AppTabBarIcon name={focused ? 'clipboard-list' : 'clipboard-list-outline'} focused={focused} color={color} size={size} />
          ),
          header: () => <AppHeader title="My Tasks" mode="large" actions={logoutAction} />,
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Leave',
          tabBarIcon: ({ focused, color, size }) => <AppTabBarIcon name="airplane-takeoff" focused={focused} color={color} size={size} />,
          header: () => <AppHeader title="Leave" mode="large" actions={logoutAction} />,
        }}
      />
      <Tabs.Screen
        name="kpi"
        options={{
          title: 'My KPI',
          tabBarIcon: ({ focused, color, size }) => <AppTabBarIcon name="chart-line" focused={focused} color={color} size={size} />,
          header: () => <AppHeader title="My KPI" mode="large" actions={logoutAction} />,
        }}
      />
      {/* Reachable from the Attendance tab's "My schedule" row, not a bottom
          tab itself — a 6th tab was more than the bar needed. A drill-in
          screen, so small header + back, not large. */}
      <Tabs.Screen
        name="schedule"
        options={{
          href: null,
          title: 'My Schedule',
          header: () => <AppHeader title="My Schedule" onBack={() => router.back()} />,
        }}
      />
    </Tabs>
  );
}
