export const ORDER_STATUSES = {
  DRAFT: 'draft',               // Recurring draft
  CREATED: 'created',           // Just placed, awaiting approval
  APPROVED: 'approved',         // Approved, ready to send to embroidery
  EMBROIDERY: 'embroidery',     // Fabric sent to embroidery vendor
  PRINTING: 'printing',         // Embroidery done, printing in progress
  DYEING: 'dyeing',             // Printing done, sent to dyeing vendor
  READY: 'ready',               // Dyeing done, ready for dispatch
  DISPATCHED: 'dispatched',     // Dispatched to customer
  DELIVERED: 'delivered',       // Customer received
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUSES.DRAFT]: 'Draft',
  [ORDER_STATUSES.CREATED]: 'Order Placed',
  [ORDER_STATUSES.APPROVED]: 'Approved',
  [ORDER_STATUSES.EMBROIDERY]: 'At Embroidery',
  [ORDER_STATUSES.PRINTING]: 'Printing',
  [ORDER_STATUSES.DYEING]: 'At Dyeing',
  [ORDER_STATUSES.READY]: 'Ready',
  [ORDER_STATUSES.DISPATCHED]: 'Dispatched',
  [ORDER_STATUSES.DELIVERED]: 'Delivered',
};
