import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addDays,
  applySundayPolicy,
  assertUniqueOccurrenceKeys,
  buildOccurrenceKey,
  clampCivilDay,
  computeOccurrences,
  detectOccurrenceCollisions,
  formatCivilDate,
  isDeterministic,
  isLeapYear,
  parseCivilDate,
  plannedAtUtcIso,
  previewOccurrences,
  selectUniformIndices,
  weekdayMon1,
  weekdayOf,
} from "@/lib/preventive/index";
import type { PlanScheduleInput } from "@/lib/preventive/types";

function basePlan(over: Partial<PlanScheduleInput> = {}): PlanScheduleInput {
  return {
    planId: "plan_test",
    planVersion: 1,
    machineId: "machine_1",
    frequency: "DAILY",
    occurrencesPerPeriod: 1,
    scheduleMode: "FIXED",
    includeSunday: false,
    sundayPolicy: "NEXT_MONDAY",
    startDate: "2026-11-01",
    endDate: null,
    status: "ACTIVE",
    timezone: "Africa/Tunis",
    defaultTimes: ["08:00"],
    scheduleRules: [{ sortOrder: 0, timeLocal: "08:00" }],
    estimatedDurationMin: 30,
    ...over,
  };
}

describe("Lot 2 — Moteur planning préventif (30+ scénarios)", () => {
  // 1
  it("S01 — 1× quotidien fixe", () => {
    const r = computeOccurrences(basePlan(), { from: "2026-11-16", to: "2026-11-16" });
    assert.equal(r.occurrences.length, 1);
    assert.equal(r.occurrences[0]!.theoreticalTime, "08:00");
    assert.equal(r.occurrences[0]!.plannedDate, "2026-11-16");
  });

  // 2
  it("S02 — N× / jour (2 horaires)", () => {
    const r = computeOccurrences(
      basePlan({
        occurrencesPerPeriod: 2,
        scheduleRules: [
          { sortOrder: 0, timeLocal: "08:00" },
          { sortOrder: 1, timeLocal: "14:00" },
        ],
      }),
      { from: "2026-11-16", to: "2026-11-16" },
    );
    assert.equal(r.occurrences.length, 2);
    assert.deepEqual(
      r.occurrences.map((o) => o.theoreticalTime),
      ["08:00", "14:00"],
    );
  });

  // 3
  it("S03 — 1× hebdomadaire fixe (mercredi)", () => {
    const r = computeOccurrences(
      basePlan({
        frequency: "WEEKLY",
        scheduleRules: [{ sortOrder: 0, weekday: 3, timeLocal: "09:00" }],
      }),
      { from: "2026-11-16", to: "2026-11-22" },
    );
    assert.equal(r.occurrences.length, 1);
    assert.equal(r.occurrences[0]!.theoreticalDate, "2026-11-18");
    assert.equal(weekdayOf("2026-11-18"), 3);
  });

  // 4
  it("S04 — N× / semaine fixe (lun + ven)", () => {
    const r = computeOccurrences(
      basePlan({
        frequency: "WEEKLY",
        occurrencesPerPeriod: 2,
        scheduleRules: [
          { sortOrder: 0, weekday: 1, timeLocal: "08:00" },
          { sortOrder: 1, weekday: 5, timeLocal: "08:00" },
        ],
      }),
      { from: "2026-11-16", to: "2026-11-22" },
    );
    assert.equal(r.occurrences.length, 2);
    assert.deepEqual(
      r.occurrences.map((o) => o.theoreticalDate),
      ["2026-11-16", "2026-11-20"],
    );
  });

  // 5
  it("S05 — 1× mensuel fixe (jour 15)", () => {
    const r = computeOccurrences(
      basePlan({
        frequency: "MONTHLY",
        scheduleRules: [{ sortOrder: 0, monthDay: 15, timeLocal: "10:00" }],
      }),
      { from: "2026-11-01", to: "2026-11-30" },
    );
    assert.equal(r.occurrences.length, 1);
    assert.equal(r.occurrences[0]!.theoreticalDate, "2026-11-15");
  });

  // 6
  it("S06 — N× / an (4 inspections)", () => {
    const r = computeOccurrences(
      basePlan({
        frequency: "YEARLY",
        occurrencesPerPeriod: 4,
        startDate: "2026-01-01",
        scheduleRules: [
          { sortOrder: 0, month: 3, monthDay: 1, timeLocal: "08:00" },
          { sortOrder: 1, month: 6, monthDay: 1, timeLocal: "08:00" },
          { sortOrder: 2, month: 9, monthDay: 1, timeLocal: "08:00" },
          { sortOrder: 3, month: 12, monthDay: 1, timeLocal: "08:00" },
        ],
      }),
      { from: "2026-01-01", to: "2026-12-31" },
    );
    assert.equal(r.occurrences.length, 4);
    assert.deepEqual(
      r.occurrences.map((o) => o.theoreticalDate),
      ["2026-03-01", "2026-06-01", "2026-09-01", "2026-12-01"],
    );
  });

  // 7
  it("S07 — Dimanche inclus (pas de report)", () => {
    // 22 nov 2026 = dimanche
    assert.equal(weekdayOf("2026-11-22"), 7);
    const r = applySundayPolicy({
      theoreticalDate: "2026-11-22",
      theoreticalTime: "08:00",
      includeSunday: true,
      sundayPolicy: "SKIP",
    });
    assert.equal(r.plannedDate, "2026-11-22");
    assert.equal(r.sundayAdjustment, "NONE");
  });

  // 8
  it("S08 — Dimanche exclu du calendrier auto (jour non candidat)", () => {
    const r = computeOccurrences(
      basePlan({
        scheduleMode: "AUTOMATIC",
        includeSunday: false,
        defaultTimes: ["08:00"],
        scheduleRules: [],
      }),
      { from: "2026-11-22", to: "2026-11-22" },
    );
    assert.equal(r.occurrences.length, 0);
  });

  // 9
  it("S09 — Report au samedi précédent", () => {
    const r = applySundayPolicy({
      theoreticalDate: "2026-11-22",
      theoreticalTime: "08:00",
      includeSunday: false,
      sundayPolicy: "PREV_SATURDAY",
    });
    assert.equal(r.plannedDate, "2026-11-21");
    assert.equal(r.sundayAdjustment, "PREV_SATURDAY");
  });

  // 10
  it("S10 — Report au lundi suivant", () => {
    const r = applySundayPolicy({
      theoreticalDate: "2026-11-22",
      theoreticalTime: "08:00",
      includeSunday: false,
      sundayPolicy: "NEXT_MONDAY",
    });
    assert.equal(r.plannedDate, "2026-11-23");
    assert.equal(r.sundayAdjustment, "NEXT_MONDAY");
  });

  // 11
  it("S11 — Occurrence ignorée (SKIP)", () => {
    const r = computeOccurrences(
      basePlan({
        frequency: "YEARLY",
        startDate: "2026-01-01",
        includeSunday: false,
        sundayPolicy: "SKIP",
        // 22 nov 2026 dimanche
        scheduleRules: [{ sortOrder: 0, month: 11, monthDay: 22, timeLocal: "08:00" }],
      }),
      { from: "2026-01-01", to: "2026-12-31" },
    );
    assert.equal(r.occurrences.length, 1);
    assert.equal(r.occurrences[0]!.status, "SKIPPED");
    assert.equal(r.occurrences[0]!.plannedDate, null);
    assert.equal(r.occurrences[0]!.theoreticalDate, "2026-11-22");
    assert.equal(r.stats.skipped, 1);
    assert.equal(r.stats.generatable, 0);
  });

  // 12
  it("S12 — Changement de mois (PREV_SATURDAY depuis 1er dimanche)", () => {
    // 1 nov 2026 = dimanche
    assert.equal(weekdayOf("2026-11-01"), 7);
    const r = applySundayPolicy({
      theoreticalDate: "2026-11-01",
      theoreticalTime: "08:00",
      includeSunday: false,
      sundayPolicy: "PREV_SATURDAY",
    });
    assert.equal(r.plannedDate, "2026-10-31");
  });

  // 13
  it("S13 — Changement d'année (NEXT_MONDAY 27 déc 2026 dim → 28 déc)", () => {
    // Vérifier un dimanche en fin d'année : 27 déc 2026 = dimanche
    assert.equal(weekdayOf("2026-12-27"), 7);
    const r = applySundayPolicy({
      theoreticalDate: "2026-12-27",
      theoreticalTime: "08:00",
      includeSunday: false,
      sundayPolicy: "NEXT_MONDAY",
    });
    assert.equal(r.plannedDate, "2026-12-28");
  });

  // 14
  it("S14 — Année bissextile 29/02", () => {
    assert.equal(isLeapYear(2024), true);
    assert.equal(isLeapYear(2026), false);
    const leap = clampCivilDay(2024, 2, 29);
    assert.equal(formatCivilDate(leap), "2024-02-29");
    const nonLeap = clampCivilDay(2026, 2, 29);
    assert.equal(formatCivilDate(nonLeap), "2026-02-28");

    const r = computeOccurrences(
      basePlan({
        frequency: "YEARLY",
        startDate: "2024-01-01",
        scheduleRules: [{ sortOrder: 0, month: 2, monthDay: 29, timeLocal: "08:00" }],
      }),
      { from: "2024-01-01", to: "2024-12-31" },
    );
    assert.equal(r.occurrences[0]!.theoreticalDate, "2024-02-29");
  });

  // 15
  it("S15 — Modification de plan change les clés futures", () => {
    const a = computeOccurrences(
      basePlan({
        occurrencesPerPeriod: 1,
        scheduleRules: [{ sortOrder: 0, timeLocal: "08:00" }],
      }),
      { from: "2026-11-16", to: "2026-11-16" },
    );
    const b = computeOccurrences(
      basePlan({
        occurrencesPerPeriod: 1,
        scheduleRules: [{ sortOrder: 0, timeLocal: "10:00" }],
      }),
      { from: "2026-11-16", to: "2026-11-16" },
    );
    assert.notEqual(a.occurrences[0]!.occurrenceKey, b.occurrences[0]!.occurrenceKey);
  });

  // 16
  it("S16 — Plan suspendu → aucune occurrence ; réactivation → calcul", () => {
    const suspended = computeOccurrences(basePlan({ status: "SUSPENDED" }), {
      from: "2026-11-16",
      to: "2026-11-16",
    });
    assert.equal(suspended.occurrences.length, 0);
    const active = computeOccurrences(basePlan({ status: "ACTIVE" }), {
      from: "2026-11-16",
      to: "2026-11-16",
    });
    assert.equal(active.occurrences.length, 1);
  });

  // 17
  it("S17 — Absence de doublons (clés uniques)", () => {
    const r = computeOccurrences(
      basePlan({
        occurrencesPerPeriod: 2,
        scheduleRules: [
          { sortOrder: 0, timeLocal: "08:00" },
          { sortOrder: 1, timeLocal: "14:00" },
        ],
      }),
      { from: "2026-11-16", to: "2026-11-21" },
    );
    const u = assertUniqueOccurrenceKeys(r.occurrences);
    assert.equal(u.ok, true);
  });

  // 18
  it("S18 — Idempotence / concurrence logique (2 runs identiques)", () => {
    const plan = basePlan({
      frequency: "WEEKLY",
      occurrencesPerPeriod: 2,
      scheduleMode: "AUTOMATIC",
      scheduleRules: [],
      defaultTimes: ["08:00", "14:00"],
    });
    assert.equal(isDeterministic(plan, { from: "2026-11-16", to: "2026-11-30" }), true);
  });

  // 19 — Lot 2 : conservation théorique vs planifiée (proxy OM exécutés)
  it("S19 — Conservation date théorique après report (prépare conservation exécutés)", () => {
    const r = computeOccurrences(
      basePlan({
        frequency: "YEARLY",
        startDate: "2026-01-01",
        sundayPolicy: "PREV_SATURDAY",
        scheduleRules: [{ sortOrder: 0, month: 11, monthDay: 22, timeLocal: "08:00" }],
      }),
      { from: "2026-01-01", to: "2026-12-31" },
    );
    assert.equal(r.occurrences[0]!.theoreticalDate, "2026-11-22");
    assert.equal(r.occurrences[0]!.plannedDate, "2026-11-21");
  });

  // 20 — hors auth ; vérifie que preview === compute (contrat UI)
  it("S20 — previewOccurrences identique à computeOccurrences", () => {
    const plan = basePlan();
    const horizon = { from: "2026-11-16", to: "2026-11-18" };
    const a = computeOccurrences(plan, horizon);
    const b = previewOccurrences(plan, horizon);
    assert.deepEqual(
      a.occurrences.map((o) => o.occurrenceKey),
      b.occurrences.map((o) => o.occurrenceKey),
    );
  });

  // 21 — compat OM : periodKey journalier aligné dayKey potentiel
  it("S21 — periodKey DAILY = YYYY-MM-DD (alignement dayKey OM)", () => {
    const r = computeOccurrences(basePlan(), { from: "2026-11-16", to: "2026-11-16" });
    assert.equal(r.occurrences[0]!.periodKey, "2026-11-16");
  });

  // 22
  it("S22 — Fuseau Africa/Tunis → plannedAtUtc (UTC+1)", () => {
    const iso = plannedAtUtcIso("2026-11-16", "08:00", "Africa/Tunis");
    assert.equal(iso, "2026-11-16T07:00:00.000Z");
  });

  // 23
  it("S23 — Clamp 31 avril → 30", () => {
    assert.equal(formatCivilDate(clampCivilDay(2026, 4, 31)), "2026-04-30");
  });

  // 24
  it("S24 — Mode automatique hebdo N=3 déterministe", () => {
    const r = computeOccurrences(
      basePlan({
        frequency: "WEEKLY",
        occurrencesPerPeriod: 3,
        scheduleMode: "AUTOMATIC",
        scheduleRules: [],
        defaultTimes: ["08:00"],
        includeSunday: false,
      }),
      { from: "2026-11-16", to: "2026-11-22" },
    );
    assert.equal(r.occurrences.length, 3);
    // lun-sam = 6 candidats → indices uniformes
    const dates = r.occurrences.map((o) => o.theoreticalDate);
    assert.equal(new Set(dates).size, 3);
  });

  // 25
  it("S25 — selectUniformIndices N=1 → médian", () => {
    assert.deepEqual(selectUniformIndices(6, 1), [2]);
    assert.deepEqual(selectUniformIndices(5, 1), [2]);
  });

  // 26
  it("S26 — selectUniformIndices N >= length → tous", () => {
    assert.deepEqual(selectUniformIndices(3, 5), [0, 1, 2]);
  });

  // 27
  it("S27 — Collisions multi-plans même créneau autorisées et détectées", () => {
    const a = computeOccurrences(
      basePlan({ planId: "p1", machineId: "m1", scheduleRules: [{ sortOrder: 0, timeLocal: "08:00" }] }),
      { from: "2026-11-16", to: "2026-11-16" },
    );
    const b = computeOccurrences(
      basePlan({ planId: "p2", machineId: "m1", scheduleRules: [{ sortOrder: 0, timeLocal: "08:00" }] }),
      { from: "2026-11-16", to: "2026-11-16" },
    );
    const collisions = detectOccurrenceCollisions([...a.occurrences, ...b.occurrences]);
    assert.equal(collisions.length, 1);
    assert.equal(collisions[0]!.occurrenceKeys.length, 2);
  });

  // 28
  it("S28 — Stats théoriques vs générables avec SKIP", () => {
    const r = computeOccurrences(
      basePlan({
        frequency: "YEARLY",
        startDate: "2026-01-01",
        sundayPolicy: "SKIP",
        scheduleRules: [{ sortOrder: 0, month: 11, monthDay: 22, timeLocal: "08:00" }],
      }),
      { from: "2026-01-01", to: "2026-12-31" },
    );
    assert.equal(r.stats.theoretical, 1);
    assert.equal(r.stats.skipped, 1);
    assert.equal(r.stats.generatable, 0);
  });

  // 29
  it("S29 — startDate en cours de période exclut les jours antérieurs", () => {
    const r = computeOccurrences(
      basePlan({
        startDate: "2026-11-18",
        scheduleRules: [{ sortOrder: 0, timeLocal: "08:00" }],
      }),
      { from: "2026-11-16", to: "2026-11-20" },
    );
    assert.ok(r.occurrences.every((o) => o.theoreticalDate >= "2026-11-18"));
    assert.equal(r.occurrences.length, 3); // 18,19,20
  });

  // 30
  it("S30 — endDate exclut les jours postérieurs", () => {
    const r = computeOccurrences(
      basePlan({
        startDate: "2026-11-16",
        endDate: "2026-11-18",
        scheduleRules: [{ sortOrder: 0, timeLocal: "08:00" }],
      }),
      { from: "2026-11-16", to: "2026-11-22" },
    );
    assert.equal(r.occurrences.length, 3);
    assert.equal(r.occurrences.at(-1)!.theoreticalDate, "2026-11-18");
  });

  // 31
  it("S31 — buildOccurrenceKey format stable", () => {
    const key = buildOccurrenceKey({
      planId: "p",
      periodKey: "2026-W47",
      occurrenceIndex: 0,
      theoreticalDate: "2026-11-16",
      theoreticalTime: "08:00",
    });
    assert.equal(key, "p|2026-W47|0|2026-11-16|08:00");
  });

  // 32
  it("S32 — Mode auto mensuel 2× / mois", () => {
    const r = computeOccurrences(
      basePlan({
        frequency: "MONTHLY",
        occurrencesPerPeriod: 2,
        scheduleMode: "AUTOMATIC",
        scheduleRules: [],
        defaultTimes: ["08:00", "14:00"],
        startDate: "2026-11-01",
      }),
      { from: "2026-11-01", to: "2026-11-30" },
    );
    assert.equal(r.occurrences.length, 2);
    assert.equal(assertUniqueOccurrenceKeys(r.occurrences).ok, true);
  });

  // 33
  it("S33 — Mode auto annuel 4× déterministe", () => {
    const r = computeOccurrences(
      basePlan({
        frequency: "YEARLY",
        occurrencesPerPeriod: 4,
        scheduleMode: "AUTOMATIC",
        scheduleRules: [],
        defaultTimes: ["08:00"],
        startDate: "2026-01-01",
        includeSunday: false,
      }),
      { from: "2026-01-01", to: "2026-12-31" },
    );
    assert.equal(r.occurrences.length, 4);
    assert.equal(isDeterministic(
      basePlan({
        frequency: "YEARLY",
        occurrencesPerPeriod: 4,
        scheduleMode: "AUTOMATIC",
        scheduleRules: [],
        defaultTimes: ["08:00"],
        startDate: "2026-01-01",
      }),
      { from: "2026-01-01", to: "2026-12-31" },
    ), true);
  });

  // 34
  it("S34 — addDays / weekdayMon1 cohérence", () => {
    const d = parseCivilDate("2026-11-16"); // lundi
    assert.equal(weekdayMon1(d), 1);
    assert.equal(weekdayMon1(addDays(d, 6)), 7);
  });

  // 35
  it("S35 — Plan ARCHIVED → vide", () => {
    const r = computeOccurrences(basePlan({ status: "ARCHIVED" }), {
      from: "2026-11-16",
      to: "2026-11-20",
    });
    assert.equal(r.occurrences.length, 0);
  });
});
