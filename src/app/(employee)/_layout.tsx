import { Redirect, router, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { AppTabBarIcon } from '@/components/AppTabBarIcon';
import { LoadingState } from '@/components/ScreenState';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function EmployeeLayout() {
  const { session, profile, loading } = useAuth();
  // React Navigation's bottom-tabs auto-adds the device's safe-area bottom
  // inset (Android's gesture pill / 3-button nav bar, iOS's home indicator)
  // to the tab bar's own height/padding *only* when tabBarStyle doesn't
  // specify its own — the moment a custom height/paddingBottom is given
  // (below, for the shadow/spacing polish), that automatic behavior is
  // gone and the bar reverts to whatever fixed size was written, which on
  // an edge-to-edge Android device sits the tab icons right behind the
  // system nav bar instead of above it. Add the real inset back in
  // explicitly, same fix AppHeader already makes for the status bar.
  const insets = useSafeAreaInsets();

  if (loading) return <LoadingState />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (profile && profile.role !== 'employee') return <Redirect href="/(admin)/staff" />;

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
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
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
          header: () => <AppHeader title="My Tasks" mode="medium" accountMenu />,
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Leave',
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => <AppTabBarIcon name="airplane-takeoff" focused={focused} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="kpi"
        options={{
          title: 'My KPI',
          tabBarIcon: ({ focused, color, size }) => <AppTabBarIcon name="chart-line" focused={focused} color={color} size={size} />,
          header: () => <AppHeader title="My KPI" mode="medium" accountMenu />,
        }}
      />
      {/* Reachable from the Attendance tab's "My schedule" row, not a bottom
          tab itself — a 6th tab was more than the bar needed. A drill-in
          screen, so small header + back, not the bigger tab-root mode. */}
      <Tabs.Screen
        name="schedule"
        options={{
          href: null,
          title: 'My Schedule',
          header: () => <AppHeader title="My Schedule" onBack={() => router.back()} />,
        }}
      />
      {/* Reachable from the Check-In screen's avatar and from AppHeader's
          account menu ("View profile") — not a bottom tab. */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: 'My Profile',
          header: () => <AppHeader title="My Profile" onBack={() => router.back()} />,
        }}
      />
    </Tabs>
  );
}
