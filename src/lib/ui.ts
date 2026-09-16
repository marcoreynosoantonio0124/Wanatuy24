/** Presentational helpers shared by the timeline / dashboard (spec §6). */

export type OccStatus =
  | "UPCOMING"
  | "DUE"
  | "SUBMITTED"
  | "CONFIRMED"
  | "REJECTED"
  | "OVERDUE"
  | "OVERDUE_ESCALATED"
  | "WAIVED";

export function statusChip(status: OccStatus): { cls: string; label: string } {
  switch (status) {
    case "CONFIRMED":
      return { cls: "green", label: "Confirmed" };
    case "WAIVED":
      return { cls: "grey", label: "Waived" };
    case "UPCOMING":
      return { cls: "grey", label: "Upcoming" };
    case "DUE":
      return { cls: "amber", label: "Due" };
    case "SUBMITTED":
      return { cls: "blue", label: "Awaiting review" };
    case "REJECTED":
      return { cls: "red", label: "Rejected" };
    case "OVERDUE":
      return { cls: "red", label: "Overdue" };
    case "OVERDUE_ESCALATED":
      return { cls: "red", label: "Escalated" };
  }
}

/** Worst status across an asset's occurrences → map pin colour (spec §6.1). */
export function worstStatusColor(statuses: OccStatus[]): "green" | "amber" | "red" {
  if (statuses.some((s) => s === "OVERDUE" || s === "OVERDUE_ESCALATED" || s === "REJECTED"))
    return "red";
  if (statuses.some((s) => s === "DUE" || s === "SUBMITTED")) return "amber";
  return "green";
}
