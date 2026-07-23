import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

async function loadDateLogic() {
  const source = await readFile(new URL("../lib/date-logic.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  return import(moduleUrl);
}

const dateLogic = await loadDateLogic();

test("groups overdue, today, tomorrow, upcoming, completed, snoozed, and no-due tasks", () => {
  const now = new Date("2026-07-23T15:00:00-05:00");
  assert.equal(dateLogic.dueBucket({ due: "2026-07-22", status: "Open", now }), "Overdue");
  assert.equal(dateLogic.dueBucket({ due: "2026-07-23", status: "Open", now }), "Due Today");
  assert.equal(dateLogic.dueBucket({ due: "2026-07-24", status: "Open", now }), "Due Tomorrow");
  assert.equal(dateLogic.dueBucket({ due: "2026-07-28", status: "Open", now }), "Due This Week");
  assert.equal(dateLogic.dueBucket({ due: "2026-08-05", status: "Open", now }), "Upcoming");
  assert.equal(dateLogic.dueBucket({ status: "Open", now }), "No Due Date");
  assert.equal(dateLogic.dueBucket({ due: "2026-07-22", status: "Completed", now }), "Completed");
  assert.equal(dateLogic.dueBucket({ due: "2026-07-22", status: "Open", snoozedUntil: "2026-07-25", now }), "Snoozed");
});

test("uses America/Chicago dates across daylight-saving changes", () => {
  const springForward = new Date("2026-03-08T06:30:00Z");
  const fallBack = new Date("2026-11-01T06:30:00Z");
  assert.equal(dateLogic.chicagoDate(springForward), "2026-03-08");
  assert.equal(dateLogic.chicagoDate(fallBack), "2026-11-01");
  assert.equal(dateLogic.dueBucket({ due: "2026-03-07", status: "Open", now: springForward }), "Overdue");
  assert.equal(dateLogic.dueBucket({ due: "2026-11-01", status: "Open", now: fallBack }), "Due Today");
});
