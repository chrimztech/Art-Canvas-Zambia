/** Human-readable commission statuses, shared by the customer and artist dashboards. */
export const COMMISSION_STATUS_LABEL: Record<string, string> = {
  requested: "Awaiting quote",
  quoted: "Quote sent",
  accepted: "Paid — ready to start",
  in_progress: "In progress",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Ordered happy-path steps, for progress bars. */
export const COMMISSION_STEPS = [
  "requested",
  "quoted",
  "accepted",
  "in_progress",
  "delivered",
  "completed",
];
