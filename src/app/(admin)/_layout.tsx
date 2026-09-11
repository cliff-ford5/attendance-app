import { Redirect, Tabs } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { AppTabBarIcon } from '@/components/AppTabBarIcon';
import { LoadingState } from '@/components/ScreenState';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AdminLayout() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) return <LoadingState />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (profile && profile.role === 'employee') return <Redirect href="/(employee)" />;

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
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Staff',
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <AppTabBarIcon name={focused ? 'account-group' : 'account-group-outline'} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ focused, color, size }) => (
            <AppTabBarIcon name={focused ? 'calendar-check' : 'calendar-check-outline'} focused={focused} color={color} size={size} />
          ),
          header: () => <AppHeader title="Attendance" mode="large" actions={logoutAction} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused, color, size }) => (
            <AppTabBarIcon name={focused ? 'clipboard-list' : 'clipboard-list-outline'} focused={focused} color={color} size={size} />
          ),
          header: () => <AppHeader title="Tasks" mode="large" actions={logoutAction} />,
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
          title: 'KPI Overview',
          // "KPI Overview" (12 chars) is the longest of 5 tab labels sharing
          // an even tighter equal-width split than the 3-way one that
          // actually truncated — a separate, shorter tabBarLabel just for
          // the tab bar; the on-screen header keeps the fuller "KPI
          // Overview" title since it isn't squeezed against siblings there.
          tabBarLabel: 'KPI',
          tabBarIcon: ({ focused, color, size }) => <AppTabBarIcon name="chart-line" focused={focused} color={color} size={size} />,
          header: () => <AppHeader title="KPI Overview" mode="large" actions={logoutAction} />,
        }}
      />
    </Tabs>
  );
}
