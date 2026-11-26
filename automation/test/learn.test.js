import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LESSONS, emptyLearnDb, parseLesson, createStudent, createMagicLink, consumeMagicLink,
  markComplete, recordQuiz, progressOf, tierAllows, studentsToCsv,
} from "../src/learn-core.js";

const here = dirname(fileURLToPath(import.meta.url));

test("purchase, magic link, lessons, and admin csv", () => {
  const db = emptyLearnDb();
  createStudent(db, { email: "student@example.com", name: "Test Student", tier: "templates", testMode: true, now: "2026-11-26T00:00:00.000Z" });
  const token = createMagicLink(db, "student@example.com", 1_700_000_000_000);
  const session = consumeMagicLink(db, token, 1_700_000_000_000);
  assert.ok(session.student);
  markComplete(session.student, "welcome");
  const lesson = parseLesson(readFileSync(join(here, "../content/lessons/01-welcome.md"), "utf8"));
  const score = recordQuiz(session.student, "welcome", 1, lesson.meta.quiz[0].answer);
  assert.equal(score, 1);
  assert.equal(progressOf(session.student).percent, 10);
  assert.equal(tierAllows("templates", "templates"), true);
  assert.equal(tierAllows("course", "templates"), false);
  assert.equal(tierAllows("call", "call"), true);
  const csv = studentsToCsv(db.students);
  assert.match(csv, /student@example.com/);
  assert.match(csv, /10/);
  assert.equal(LESSONS.length, readdirSync(join(here, "../content/lessons")).filter((name) => name.endsWith(".md")).length);
});
