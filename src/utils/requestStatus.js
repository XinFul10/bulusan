export const STATUS_STYLES = {
  Pending: 'bg-gray-100 text-gray-600',
  'Under Review': 'bg-warning/10 text-warning',
  Approved: 'bg-success/10 text-success',
  Rejected: 'bg-danger/10 text-danger',
  Completed: 'bg-primary/10 text-primary',
}

export const getStatusClass = (status) =>
  STATUS_STYLES[status] ?? STATUS_STYLES.Pending
