import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Dialog, Icon, IconButton, Portal, Text } from 'react-native-paper';
import { openInMaps } from '@/features/attendance/services/locationService';
import { getLeaveAttachmentSignedUrl } from '@/features/leave/services/leaveService';
import { LEAVE_TYPE_LABELS } from '@/features/leave/types';
import { statusColors } from '@/constants/theme';
import type { LeaveRequest, LeaveStatus } from '@/types/database';

const STATUS_COLOR: Record<LeaveStatus, string> = {
  pending: statusColors.warning,
  approved: statusColors.success,
  rejected: statusColors.danger,
  cancelled: statusColors.neutral,
};

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (startDate === endDate) return start;
  const end = new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${start} – ${end}`;
}

export function LeaveRequestCard({
  request,
  employeeName,
  busy,
  deleting,
  onCancel,
  onApprove,
  onReject,
  onEdit,
  onDelete,
}: {
  request: LeaveRequest;
  employeeName?: string;
  busy?: boolean;
  deleting?: boolean;
  onCancel?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  // Employee-self actions — own row, request still pending (edit) or
  // pending/cancelled (delete). Separate from the review actions above,
  // which are admin-only and act on someone else's request.
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isPending = request.status === 'pending';
  const [photoVisible, setPhotoVisible] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  async function viewPhoto() {
    if (!request.attachment_path) return;
    setPhotoVisible(true);
    if (photoUrl) return;
    setLoadingPhoto(true);
    const url = await getLeaveAttachmentSignedUrl(request.attachment_path);
    setPhotoUrl(url);
    setLoadingPhoto(false);
  }

  function viewLocation() {
    if (request.location_lat == null || request.location_lng == null) return;
    openInMaps({ latitude: request.location_lat, longitude: request.location_lng });
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.title}>
            {LEAVE_TYPE_LABELS[request.leave_type]}
          </Text>
          <View style={styles.headerActions}>
            <Chip compact style={{ backgroundColor: STATUS_COLOR[request.status] }} textStyle={styles.chipText}>
              {STATUS_LABEL[request.status]}
            </Chip>
            {onEdit && (
              <IconButton icon="pencil-outline" size={16} style={styles.iconButton} onPress={onEdit} accessibilityLabel="Edit request" />
            )}
            {onDelete && (
              <IconButton
                icon="trash-can-outline"
                size={16}
                style={styles.iconButton}
                disabled={deleting}
                onPress={onDelete}
                accessibilityLabel="Delete request"
              />
            )}
          </View>
        </View>

        {employeeName && (
          <Text variant="bodySmall" style={styles.meta}>
            {employeeName}
          </Text>
        )}
        <Text variant="bodyMedium" style={styles.dateRange}>
          {formatDateRange(request.start_date, request.end_date)}
        </Text>
        {request.reason && (
          <Text variant="bodyMedium" style={styles.reason}>
            {request.reason}
          </Text>
        )}

        {(request.attachment_path || request.location_lat != null) && (
          <View style={styles.evidenceRow}>
            {request.attachment_path && (
              <Pressable onPress={viewPhoto} hitSlop={4} style={styles.evidenceItem}>
                <Icon source="camera-outline" size={16} color={statusColors.neutral} />
                <Text variant="bodySmall" style={styles.evidenceLink}>
                  View photo
                </Text>
              </Pressable>
            )}
            {request.location_lat != null && (
              <Pressable onPress={viewLocation} hitSlop={4} style={styles.evidenceItem}>
                <Icon source="map-marker-outline" size={16} color={statusColors.neutral} />
                <Text variant="bodySmall" style={styles.evidenceLink} numberOfLines={1}>
                  {request.location_address ?? 'View location'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <Portal>
          <Dialog visible={photoVisible} onDismiss={() => setPhotoVisible(false)}>
            <Dialog.Content>
              {loadingPhoto ? (
                <ActivityIndicator />
              ) : photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="contain" />
              ) : (
                <Text>Couldn't load this photo.</Text>
              )}
            </Dialog.Content>
          </Dialog>
        </Portal>

        {isPending && (onCancel || onApprove || onReject) && (
          <View style={styles.actionsRow}>
            {onCancel && (
              <Button mode="text" onPress={onCancel} loading={busy} disabled={busy}>
                Withdraw
              </Button>
            )}
            {onReject && (
              <Button mode="outlined" onPress={onReject} loading={busy} disabled={busy} style={styles.actionButton}>
                Reject
              </Button>
            )}
            {onApprove && (
              <Button mode="contained-tonal" onPress={onApprove} loading={busy} disabled={busy} style={styles.actionButton}>
                Approve
              </Button>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  iconButton: {
    margin: 0,
    marginLeft: -4,
  },
  meta: {
    marginTop: 6,
    opacity: 0.6,
  },
  dateRange: {
    marginTop: 6,
  },
  reason: {
    marginTop: 6,
    opacity: 0.8,
  },
  evidenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  evidenceLink: {
    color: statusColors.neutral,
    textDecorationLine: 'underline',
  },
  photo: {
    width: '100%',
    height: 320,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    minWidth: 0,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});
