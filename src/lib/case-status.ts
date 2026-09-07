import type { DisciplinaryCaseStatus } from "@/lib/types";

// Disciplinary case statuses need their own tone map — "open" already
// means something different (and positive) for recruitment job postings,
// so this can't share the generic StatusBadge/STATUS_TONE lookup.
const CASE_STATUS_TONE: Record<DisciplinaryCaseStatus, "good" | "warn" | "bad" | "neutral"> = {
  open: "warn",
  under_review: "warn",
  resolved: "good",
  dismissed: "neutral",
};

export function caseStatusTone(status: DisciplinaryCaseStatus): "good" | "warn" | "bad" | "neutral" {
  return CASE_STATUS_TONE[status];
}
