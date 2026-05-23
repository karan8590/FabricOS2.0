/**
 * Centralized UI Component Configurations for FabricOS
 * Sets standard parameters for consistent component behaviors globally.
 */

export const UI_CONFIG = {
  // Input standard sizes
  inputHeight: '42px',
  inputBorderRadius: '10px',
  inputFocusRing: '0 0 0 2px rgba(37, 99, 235, 0.2)',

  // Modal animations
  modalDuration: 150, // ms
  modalEase: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Table styling
  tableRowHeight: '52px',
  tableRowTransition: '120ms cubic-bezier(0.4, 0, 0.2, 1)',

  // Skeleton shimmer animation
  shimmerDuration: '1.5s',

  // Toast automatic dismiss time
  toastDuration: 4000, // ms

  // Minimum touch target sizes for mobile accessibility
  minTouchTarget: '44px',
};
