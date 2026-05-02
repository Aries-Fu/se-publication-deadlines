import { differenceInCalendarDays, format, parseISO, startOfToday } from "date-fns";
import type { DeadlineLabel, DeadlineRecordType } from "../types/deadline";

export type DeadlineTone = "normal" | "upcoming" | "soon" | "urgent" | "closed";

export const deadlineLabelText: Record<DeadlineLabel, string> = {
  abstract: "Abstract",
  full_paper: "Full paper",
  submission: "Submission",
  submission_open: "Submissions open",
  author_response: "Author response",
  notification: "Notification",
  revision: "Revision",
  camera_ready: "Camera-ready",
  final_decision: "Final decision",
  registration: "Registration",
  proposal: "Proposal",
};

export const recordTypeText: Record<string, string> = {
  conference: "Conference",
  workshop: "Workshop",
  journal: "Journal",
  special_issue: "Special issue",
};

export function getDaysLeft(date: string, today = startOfToday()): number {
  return differenceInCalendarDays(parseISO(date), today);
}

export function getDeadlineTone(daysLeft: number): DeadlineTone {
  if (daysLeft < 0) {
    return "closed";
  }

  if (daysLeft <= 7) {
    return "urgent";
  }

  if (daysLeft <= 30) {
    return "soon";
  }

  if (daysLeft <= 60) {
    return "upcoming";
  }

  return "normal";
}

export function formatDeadlineDate(date: string): string {
  return format(parseISO(date), "MMM d, yyyy");
}

export function formatMonth(date: string): string {
  return format(parseISO(date), "MMMM yyyy");
}

export function formatDaysLeft(daysLeft: number): string {
  if (daysLeft < 0) {
    return "Closed";
  }

  if (daysLeft === 0) {
    return "Due today";
  }

  if (daysLeft === 1) {
    return "1 day left";
  }

  return `${daysLeft} days left`;
}

export function labelDeadline(label: DeadlineLabel | string): string {
  return deadlineLabelText[label as DeadlineLabel] ?? label.split("_").join(" ");
}

export function labelRecordType(type: DeadlineRecordType | string): string {
  return recordTypeText[type as DeadlineRecordType] ?? type.split("_").join(" ");
}
