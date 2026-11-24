import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { designMaintenanceTypeOptions } from "@/lib/preventive/catalog";
import {
  computeOccurrences,
  detectOccurrenceCollisions,
} from "@/lib/preventive";
import {
  PERSISTENCE_DISABLED_MESSAGE,
  PERSISTENCE_WRITE_BLOCKED_CODE,
} from "@/lib/preventive/persistence";
import {
  addDaysIso,
  defaultPreviewHorizon,
  formValuesToPlanScheduleInput,
  todayTunisApprox,
  type PreventivePlanFormValues,
} from "@/lib/preventive/preview-adapter";
import { preventivePlanCreateSchema } from "@/lib/validations/preventive-plan";
import {
  PreventiveFrequency,
  PreventivePlanStatus,
  PreventiveScheduleMode,
  SundayReschedulePolicy,
} from "@prisma/client";

function sampleForm(over: Partial<PreventivePlanFormValues> = {}): PreventivePlanFormValues {
  return {
    machineId: "m1",
    maintenanceTypeId: "design:CTRL_VISUEL",
    title: "Contrôle visuel P-001",
    frequency: "DAILY",
    occurrencesPerPeriod: 2,
    scheduleMode: "FIXED",
    includeSunday: false,
    sundayPolicy: "NEXT_MONDAY",
    startDate: "2026-11-16",
    endDate: null,
    status: "ACTIVE",
    defaultTimes: ["08:00", "14:00"],
    scheduleRules: [
      { sortOrder: 0, timeLocal: "08:00" },
      { sortOrder: 1, timeLocal: "14:00" },
    ],
    estimatedDurationMin: 15,
    ...over,
  };
}

describe("Lot 3 — UI / validation / prévisualisation", () => {
  it("U01 — référentiel types conception non vide et marqué non-DB", () => {
    const opts = designMaintenanceTypeOptions();
    assert.ok(opts.length >= 6);
    assert.equal(opts.every((o) => o.fromDatabase === false), true);
  });

  it("U02 — adapter formulaire → PlanScheduleInput", () => {
    const input = formValuesToPlanScheduleInput(sampleForm());
    assert.equal(input.frequency, "DAILY");
    assert.equal(input.occurrencesPerPeriod, 2);
    assert.equal(input.scheduleRules.length, 2);
  });

  it("U03 — prévisualisation 30 jours utilise le vrai moteur", () => {
    const plan = formValuesToPlanScheduleInput(sampleForm({ status: "ACTIVE" }));
    const horizon = { from: "2026-11-16", to: addDaysIso("2026-11-16", 29) };
    const r = computeOccurrences(plan, horizon);
    assert.ok(r.occurrences.length > 0);
    assert.equal(r.occurrences[0]!.theoreticalTime, "08:00");
  });

  it("U04 — changement de fréquence hebdo fixe", () => {
    const plan = formValuesToPlanScheduleInput(
      sampleForm({
        frequency: "WEEKLY",
        occurrencesPerPeriod: 1,
        scheduleRules: [{ sortOrder: 0, weekday: 3, timeLocal: "09:00" }],
      }),
    );
    const r = computeOccurrences(plan, { from: "2026-11-16", to: "2026-11-22" });
    assert.equal(r.occurrences.length, 1);
    assert.equal(r.occurrences[0]!.theoreticalDate, "2026-11-18");
  });

  it("U05 — mode automatique", () => {
    const plan = formValuesToPlanScheduleInput(
      sampleForm({
        scheduleMode: "AUTOMATIC",
        frequency: "WEEKLY",
        occurrencesPerPeriod: 2,
        scheduleRules: [],
        defaultTimes: ["08:00"],
      }),
    );
    const r = computeOccurrences(plan, { from: "2026-11-16", to: "2026-11-22" });
    assert.equal(r.occurrences.length, 2);
  });

  it("U06 — inclusion dimanche", () => {
    const plan = formValuesToPlanScheduleInput(
      sampleForm({
        includeSunday: true,
        frequency: "YEARLY",
        occurrencesPerPeriod: 1,
        startDate: "2026-01-01",
        scheduleRules: [{ sortOrder: 0, month: 11, monthDay: 22, timeLocal: "08:00" }],
      }),
    );
    const r = computeOccurrences(plan, { from: "2026-01-01", to: "2026-12-31" });
    assert.equal(r.occurrences[0]!.plannedDate, "2026-11-22");
    assert.equal(r.occurrences[0]!.sundayAdjustment, "NONE");
  });

  it("U07 — politique report lundi", () => {
    const plan = formValuesToPlanScheduleInput(
      sampleForm({
        includeSunday: false,
        sundayPolicy: "NEXT_MONDAY",
        frequency: "YEARLY",
        occurrencesPerPeriod: 1,
        startDate: "2026-01-01",
        scheduleRules: [{ sortOrder: 0, month: 11, monthDay: 22, timeLocal: "08:00" }],
      }),
    );
    const r = computeOccurrences(plan, { from: "2026-01-01", to: "2026-12-31" });
    assert.equal(r.occurrences[0]!.plannedDate, "2026-11-23");
  });

  it("U08 — collisions détectées en prévisualisation multi-plans", () => {
    const a = computeOccurrences(formValuesToPlanScheduleInput(sampleForm({ planId: "a" })), {
      from: "2026-11-16",
      to: "2026-11-16",
    });
    const b = computeOccurrences(formValuesToPlanScheduleInput(sampleForm({ planId: "b" })), {
      from: "2026-11-16",
      to: "2026-11-16",
    });
    const collisions = detectOccurrenceCollisions([...a.occurrences, ...b.occurrences]);
    assert.ok(collisions.length >= 1);
  });

  it("U09 — configuration invalide mode fixe (Zod)", () => {
    const parsed = preventivePlanCreateSchema.safeParse({
      machineId: "m1",
      maintenanceTypeId: "t1",
      title: "Test",
      frequency: PreventiveFrequency.DAILY,
      occurrencesPerPeriod: 2,
      scheduleMode: PreventiveScheduleMode.FIXED,
      includeSunday: false,
      sundayPolicy: SundayReschedulePolicy.NEXT_MONDAY,
      startDate: new Date("2026-11-16"),
      status: PreventivePlanStatus.ACTIVE,
      defaultTimes: [],
      scheduleRules: [{ sortOrder: 0, timeLocal: "08:00" }],
    });
    assert.equal(parsed.success, false);
  });

  it("U10 — message persistance désactivée non vide", () => {
    assert.ok(PERSISTENCE_DISABLED_MESSAGE.includes("migration"));
    assert.equal(PERSISTENCE_WRITE_BLOCKED_CODE, "PERSISTENCE_UNAVAILABLE");
  });

  it("U11 — horizon défaut 30 jours", () => {
    const h = defaultPreviewHorizon(30);
    assert.equal(h.from, todayTunisApprox());
    assert.equal(h.to, addDaysIso(h.from, 29));
  });

  it("U12 — plan suspendu dans adapter reste suspendu pour compute (vide)", () => {
    const input = formValuesToPlanScheduleInput(sampleForm({ status: "SUSPENDED" }));
    const r = computeOccurrences(input, { from: "2026-11-16", to: "2026-11-20" });
    assert.equal(r.occurrences.length, 0);
  });

  it("U13 — SKIP affiché comme non générable", () => {
    const plan = formValuesToPlanScheduleInput(
      sampleForm({
        frequency: "YEARLY",
        occurrencesPerPeriod: 1,
        startDate: "2026-01-01",
        sundayPolicy: "SKIP",
        scheduleRules: [{ sortOrder: 0, month: 11, monthDay: 22, timeLocal: "08:00" }],
      }),
    );
    const r = computeOccurrences(plan, { from: "2026-01-01", to: "2026-12-31" });
    assert.equal(r.stats.skipped, 1);
    assert.equal(r.stats.generatable, 0);
  });
});
