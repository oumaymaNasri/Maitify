import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canManage } from "@/lib/auth/session";
import { preventivePlanCreateSchema } from "@/lib/validations/preventive-plan";
import {
  PERSISTENCE_DISABLED_MESSAGE,
  PERSISTENCE_WRITE_BLOCKED_CODE,
} from "@/lib/preventive/persistence";

describe("Lot 3C — sécurité / validation serveur", () => {
  it("S01 — technicien ne peut pas gérer", () => {
    assert.equal(
      canManage({
        name: "Tech",
        email: "t@example.tn",
        role: "TECHNICIEN",
        permissions: ["INTERVENIR"],
      }),
      false,
    );
  });

  it("S02 — responsable peut gérer", () => {
    assert.equal(
      canManage({
        name: "Dir",
        email: "d@example.tn",
        role: "RESPONSABLE",
        permissions: ["ALL"],
      }),
      true,
    );
  });

  it("S03 — admin peut gérer", () => {
    assert.equal(
      canManage({
        name: "Admin",
        email: "a@example.tn",
        role: "ADMIN",
        permissions: ["ALL"],
      }),
      true,
    );
  });

  it("S04 — configuration invalide rejetée par Zod", () => {
    const r = preventivePlanCreateSchema.safeParse({
      machineId: "m1",
      maintenanceTypeId: "t1",
      title: "x",
      frequency: "WEEKLY",
      occurrencesPerPeriod: 2,
      scheduleMode: "FIXED",
      includeSunday: false,
      sundayPolicy: "NEXT_MONDAY",
      startDate: new Date("2026-11-23"),
      scheduleRules: [{ sortOrder: 0, weekday: 1, timeLocal: "08:00" }],
      defaultTimes: [],
    });
    assert.equal(r.success, false);
  });

  it("S05 — messages persistance / code blocage définis", () => {
    assert.ok(PERSISTENCE_DISABLED_MESSAGE.length > 20);
    assert.equal(PERSISTENCE_WRITE_BLOCKED_CODE, "PERSISTENCE_UNAVAILABLE");
  });

  it("S06 — scripts build sans accept-data-loss exécutable", async () => {
    const fs = await import("node:fs/promises");
    const pkg = JSON.parse(await fs.readFile("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    assert.equal(pkg.scripts.build.includes("accept-data-loss"), false);
    assert.equal(pkg.scripts["build:vercel"].includes("accept-data-loss"), false);
    assert.equal(pkg.scripts.build.includes("db push"), false);
    assert.equal(pkg.scripts["build:vercel"].includes("db push"), false);
    assert.ok(pkg.scripts["db:push:force"].includes("REFUS") || pkg.scripts["db:push:force"].includes("désactivé"));
  });
});
