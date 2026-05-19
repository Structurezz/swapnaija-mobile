const API_ORIGIN = 'https://swapnigeria-production.up.railway.app';

export function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
}

export function getListingPlaceholder(listing, w = 400, h = 300) {
  const seed = listing?.id || listing?._id || listing?.title || 'swapnaija';
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

export const COLORS = {
  primary: '#1D9E75',
  primaryLight: '#E8F8F2',
  primaryDark: '#157A5A',
  accent: '#F59E0B',
  accentLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  white: '#FFFFFF',
  black: '#000000',
  border: '#E5E7EB',
  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
};

export const formatCurrency = (amount) => {
  if (amount == null) return '₦0';
  return `₦${Number(amount).toLocaleString('en-NG')}`;
};

// 1 BC = ₦1 = 100 kobo — use for wallet/BC balances
export const formatBC = (kobo = 0) => {
  const bc = (kobo ?? 0) / 100;
  return `${bc.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} BC`;
};

export const formatCompact = (amount) => {
  if (amount == null) return '₦0';
  if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `₦${(amount / 1000).toFixed(1)}K`;
  return `₦${amount}`;
};

export const STATUS_COLORS = {
  active: { bg: '#D1FAE5', text: '#065F46' },
  proposed: { bg: '#FEF3C7', text: '#92400E' },
  accepted: { bg: '#DBEAFE', text: '#1E40AF' },
  in_escrow: { bg: '#EDE9FE', text: '#5B21B6' },
  shipped: { bg: '#FEF9C3', text: '#854D0E' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  disputed: { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
  new: { bg: '#DBEAFE', text: '#1E40AF' },
  credit: { bg: '#D1FAE5', text: '#065F46' },
  debit: { bg: '#FEE2E2', text: '#991B1B' },
  // Payment statuses
  pending:  { bg: '#FEF3C7', text: '#92400E' },
  success:  { bg: '#D1FAE5', text: '#065F46' },
  failed:   { bg: '#FEE2E2', text: '#991B1B' },
  refunded: { bg: '#DBEAFE', text: '#1E40AF' },
};

export const STATUS_LABELS = {
  active: 'Active',
  proposed: 'Proposed',
  accepted: 'Accepted',
  in_escrow: 'In Escrow',
  shipped: 'Shipped',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Furniture',
  'Books',
  'Sports',
  'Vehicles',
  'Property',
  'Services',
  'Food',
  'Art',
  'Toys',
  'Health',
  'Other',
];

export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
