import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import { statusColors } from '@/constants/theme';
import type { LeaveRequest, LeaveStatus, LeaveType } from '@/types/database';

const TYPE_LABEL: Record<LeaveType, string> = {
  vacation: 'Vacation',
  sick: 'Sick leave',
  emergency: 'Emergency',
  other: 'Other',
};

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
  onCancel,
  onApprove,
  onReject,
}: {
  request: LeaveRequest;
  employeeName?: string;
  busy?: boolean;
  onCancel?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const isPending = request.status === 'pending';

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.title}>
            {TYPE_LABEL[request.leave_type]}
          </Text>
          <Chip compact style={{ backgroundColor: STATUS_COLOR[request.status] }} textStyle={styles.chipText}>
            {STATUS_LABEL[request.status]}
          </Chip>
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
