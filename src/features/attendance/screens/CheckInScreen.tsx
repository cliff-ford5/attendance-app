import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, HelperText, Icon, Text, useTheme } from 'react-native-paper';
import { AppAvatar } from '@/components/AppAvatar';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { statusColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAvatarUpload } from '@/features/auth/hooks/useAvatarUpload';
import type { DayType } from '@/types/database';
import { AttendanceStatCard } from '../components/AttendanceStatCard';
import { SwipeToConfirm } from '../components/SwipeToConfirm';
import { useAttendance } from '../hooks/useAttendance';
import { useDaysCheckedInThisMonth } from '../hooks/useDaysCheckedInThisMonth';
import { openInMaps } from '../services/locationService';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CheckInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const {
    openRecord,
    loading,
    error,
    busy,
    permission,
    grantPermission,
    backgroundPermission,
    hasLocation,
    grantBackgroundPermissionAndArm,
    checkIn,
    checkOut,
    reload,
  } = useAttendance(profile?.id, profile?.location_id);
  const { uploading: uploadingAvatar, error: avatarError, pickAndUpload } = useAvatarUpload();
  const daysThisMonth = useDaysCheckedInThisMonth(profile?.id);
  const [dayType, setDayType] = useState<DayType>('full');

  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => {
    const start = startOfWeek(today);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [today]);

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Checking your status…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const isCheckedIn = Boolean(openRecord);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={pickAndUpload} disabled={uploadingAvatar} accessibilityLabel="Change your profile picture">
          <AppAvatar name={profile?.name} avatarPath={profile?.avatar_path} size={52} />
          <View style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}>
            <Icon source="pencil" size={11} color="#FFFFFF" />
          </View>
        </Pressable>
        <View style={styles.headerText}>
          <Text variant="titleMedium" numberOfLines={1}>
            {profile?.name ?? 'there'}
          </Text>
          <Text variant="bodySmall" style={styles.subtleText} numberOfLines={1}>
            {profile?.position || 'Employee'}
          </Text>
        </View>
        <Pressable onPress={() => signOut()} accessibilityLabel="Sign out" hitSlop={8}>
          <Icon source="logout" size={22} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      </View>
      {avatarError && <HelperText type="error">{avatarError}</HelperText>}

      <View style={styles.weekRow}>
        {week.map((date, i) => {
          const isToday = isSameDate(date, today);
          return (
            <View
              key={i}
              style={[styles.dayCell, isToday && { backgroundColor: theme.colors.primary }]}
            >
              <Text variant="labelSmall" style={isToday ? styles.dayLetterActive : styles.dayLetter}>
                {DAY_LETTERS[i]}
              </Text>
              <Text variant="titleMedium" style={isToday ? styles.dayNumberActive : undefined}>
                {date.getDate()}
              </Text>
            </View>
          );
        })}
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Today Attendance
      </Text>
      <View style={styles.statsGrid}>
        <AttendanceStatCard
          label="Check In"
          icon="location-enter"
          color={statusColors.success}
          value={openRecord ? new Date(openRecord.check_in_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '–'}
          subtitle={openRecord ? (openRecord.is_late ? 'Late' : 'On time') : 'Not checked in yet'}
        />
        <AttendanceStatCard
          label="Check Out"
          icon="location-exit"
          color={statusColors.neutral}
          value={
            openRecord?.check_out_at
              ? new Date(openRecord.check_out_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              : '–'
          }
          subtitle={openRecord?.check_out_at ? (openRecord.left_early ? 'Left early' : 'On time') : isCheckedIn ? 'Still in' : undefined}
        />
        <AttendanceStatCard
          label="Total Days"
          icon="calendar-check-outline"
          color={theme.colors.primary}
          value={String(daysThisMonth)}
          subtitle="This month"
        />
      </View>

      {permission === 'explaining' && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.subtleText}>
              Confirm your location
            </Text>
            <Text variant="bodyMedium" style={styles.explainerText}>
              We use your location when you check in or out, to confirm you're at your assigned work
              location.
            </Text>
            <Button mode="text" onPress={grantPermission} style={styles.explainerButton}>
              Allow location access
            </Button>
          </Card.Content>
        </Card>
      )}

      {isCheckedIn && hasLocation && backgroundPermission === 'explaining' && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.subtleText}>
              Skip remembering to check out
            </Text>
            <Text variant="bodyMedium" style={styles.explainerText}>
              If you allow background location, the app can automatically check you out the moment you
              leave your assigned work location — you won't have to do it yourself. This only runs while
              you're checked in, and it's entirely optional: you can keep checking out manually instead.
            </Text>
            <Button mode="text" onPress={grantBackgroundPermissionAndArm} style={styles.explainerButton}>
              Allow background location
            </Button>
          </Card.Content>
        </Card>
      )}

      {isCheckedIn && openRecord?.check_in_address && (
        <Pressable
          onPress={() =>
            openRecord.check_in_lat != null &&
            openRecord.check_in_lng != null &&
            openInMaps({ latitude: openRecord.check_in_lat, longitude: openRecord.check_in_lng })
          }
          style={styles.addressRow}
        >
          <Icon source="map-marker-outline" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={styles.subtleText} numberOfLines={1}>
            {openRecord.check_in_address}
          </Text>
        </Pressable>
      )}

      {isCheckedIn && hasLocation && backgroundPermission === 'granted' && (
        <Text variant="bodySmall" style={styles.autoCheckoutNote}>
          Auto check-out is on for this location
        </Text>
      )}

      {isCheckedIn && openRecord?.day_type === 'half' && (
        <View style={styles.chipRow}>
          <Chip compact icon="clock-time-four-outline">
            Half day
          </Chip>
        </View>
      )}

      {!isCheckedIn && (
        <AppSegmentedButtons
          value={dayType}
          onValueChange={(v) => setDayType(v as DayType)}
          style={styles.dayTypeToggle}
          buttons={[
            { value: 'full', label: 'Full day' },
            { value: 'half', label: 'Half day' },
          ]}
        />
      )}

      <View style={styles.swipeWrap}>
        <SwipeToConfirm
          key={isCheckedIn ? 'checked-in' : 'checked-out'}
          label={isCheckedIn ? 'Swipe to Check Out' : 'Swipe to Check In'}
          icon={isCheckedIn ? 'logout' : 'arrow-right'}
          color={isCheckedIn ? statusColors.danger : theme.colors.primary}
          disabled={busy}
          onConfirm={isCheckedIn ? checkOut : () => checkIn(dayType)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.04)',
    gap: 2,
  },
  dayLetter: {
    opacity: 0.5,
  },
  dayLetterActive: {
    color: '#FFFFFF',
    opacity: 0.85,
  },
  dayNumberActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    marginTop: 0,
  },
  subtleText: {
    opacity: 0.7,
  },
  autoCheckoutNote: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  explainerText: {
    marginTop: 8,
    opacity: 0.8,
  },
  explainerButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  dayTypeToggle: {
    marginTop: 4,
  },
  swipeWrap: {
    marginTop: 8,
  },
});
