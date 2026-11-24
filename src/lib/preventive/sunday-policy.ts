import { addDays, formatCivilDate, parseCivilDate, weekdayMon1 } from "@/lib/preventive/calendar";
import type { SundayAdjustment, SundayReschedulePolicy } from "@/lib/preventive/types";

export type SundayPolicyResult = {
  plannedDate: string | null;
  plannedTime: string | null;
  sundayAdjustment: SundayAdjustment;
  status: "PLANNED" | "SKIPPED";
};

/**
 * Applique la politique dimanche une seule fois (pas de report en chaîne).
 * Conserve theoreticalDate côté appelant ; ne mute que la date planifiée.
 */
export function applySundayPolicy(input: {
  theoreticalDate: string;
  theoreticalTime: string;
  includeSunday: boolean;
  sundayPolicy: SundayReschedulePolicy;
}): SundayPolicyResult {
  const civil = parseCivilDate(input.theoreticalDate);
  const wd = weekdayMon1(civil);

  if (input.includeSunday || wd !== 7) {
    return {
      plannedDate: input.theoreticalDate,
      plannedTime: input.theoreticalTime,
      sundayAdjustment: "NONE",
      status: "PLANNED",
    };
  }

  switch (input.sundayPolicy) {
    case "PREV_SATURDAY": {
      const sat = addDays(civil, -1);
      return {
        plannedDate: formatCivilDate(sat),
        plannedTime: input.theoreticalTime,
        sundayAdjustment: "PREV_SATURDAY",
        status: "PLANNED",
      };
    }
    case "NEXT_MONDAY": {
      const mon = addDays(civil, 1);
      return {
        plannedDate: formatCivilDate(mon),
        plannedTime: input.theoreticalTime,
        sundayAdjustment: "NEXT_MONDAY",
        status: "PLANNED",
      };
    }
    case "SKIP":
      return {
        plannedDate: null,
        plannedTime: null,
        sundayAdjustment: "SKIP",
        status: "SKIPPED",
      };
    default:
      return {
        plannedDate: null,
        plannedTime: null,
        sundayAdjustment: "SKIP",
        status: "SKIPPED",
      };
  }
}
