/**
 * Centralized Design Tokens for FabricOS
 * Houses standard scales for colors, typography, spacing, shadows, border radius, and transitions.
 */

export const COLORS = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
};

export const TYPOGRAPHY = {
  pageTitle: {
    fontSize: '28px',
    fontWeight: '600',
    letterSpacing: '-0.5px',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
  },
  tableHeader: {
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#6B7280',
    fontWeight: '600',
  },
  tableCell: {
    fontSize: '14px',
  },
  cardMetricValue: {
    fontSize: '28px',
    fontWeight: '700',
  },
  helperText: {
    fontSize: '12px',
    color: '#6B7280',
  },
};

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
};

export const RADIUS = {
  sm: '6px',
  md: '10px',
  lg: '18px',
  xl: '22px',
  full: '9999px',
};

export const SHADOWS = {
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
};

export const ANIMATIONS = {
  transitionFast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  transitionBase: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  transitionSmooth: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
};
