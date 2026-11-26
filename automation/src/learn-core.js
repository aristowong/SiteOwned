export const LESSONS = [
  { id: "welcome", title: "Welcome & Setup", file: "01-welcome.md" },
  { id: "plan", title: "Plan Your Site & Gather Content", file: "02-plan.md" },
  { id: "export", title: "Export from Squarespace/Wix", file: "03-export.md" },
  { id: "generate", title: "Generate Your Site with AI", file: "04-generate.md" },
  { id: "seo", title: "Copy, Brand & Local SEO Basics", file: "05-seo.md" },
  { id: "deploy", title: "Deploy Free to Cloudflare Pages", file: "06-deploy.md" },
  { id: "domain", title: "Connect Your Domain & Cancel the Old Plan", file: "07-domain.md" },
  { id: "google", title: "Google Business Profile & Launch", file: "08-google.md" },
  { id: "edit", title: "Edit Forever with AI", file: "09-edit.md" },
  { id: "clinic", title: "Bonus: ClinicSite track", file: "10-clinic.md" },
];

export function emptyLearnDb() {
  return { students: [], magic: [], sessions: [] };
}

export function parseLesson(markdown) {
  const match = String(markdown || "").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: String(markdown || "") };
  const meta = {};
  let quiz = [];
  const lines = match[1].split("\n");
  let current = null;
  for (const line of lines) {
    if (line.startsWith("  - question:")) {
      current = { question: line.slice(13).trim(), choices: [], answer: 0 };
      quiz.push(current);
    } else if (line.startsWith("    - ") && current) {
      current.choices.push(line.slice(6).trim());
    } else if (line.startsWith("    answer:") && current) {
      current.answer = Number(line.slice(11).trim());
    } else {
      const pair = line.match(/^([a-z]+):\s*(.*)$/);
      if (pair) meta[pair[1]] = pair[2];
    }
  }
  meta.quiz = quiz;
  return { meta, body: match[2].trim() };
}

export function createStudent(db, { email, name, tier, testMode = true, now = new Date().toISOString() }) {
  const existing = db.students.find((student) => student.email === email);
  if (existing) {
    existing.tier = tier;
    existing.testMode = testMode;
    existing.lastActive = now;
    return existing;
  }
  const student = {
    id: `stu_${db.students.length + 1}`,
    email,
    name: name || email,
    tier,
    testMode,
    createdAt: now,
    lastActive: now,
    completed: {},
  };
  db.students.push(student);
  return student;
}

export function createMagicLink(db, email, now = Date.now()) {
  const token = `ml_${email.replace(/[^a-z0-9]/gi, "")}_${now}`;
  db.magic.push({ token, email, expiresAt: now + 1000 * 60 * 30 });
  return token;
}

export function consumeMagicLink(db, token, now = Date.now()) {
  const link = db.magic.find((item) => item.token === token && item.expiresAt > now);
  if (!link) return null;
  const student = db.students.find((item) => item.email === link.email);
  if (!student) return null;
  const session = `ses_${token}`;
  db.sessions.push({ token: session, studentId: student.id, expiresAt: now + 1000 * 60 * 60 * 24 * 14 });
  student.lastActive = new Date(now).toISOString();
  return { session, student };
}

export function studentFromSession(db, session, now = Date.now()) {
  const row = db.sessions.find((item) => item.token === session && item.expiresAt > now);
  if (!row) return null;
  return db.students.find((item) => item.id === row.studentId) || null;
}

export function markComplete(student, lessonId, now = new Date().toISOString()) {
  student.completed[lessonId] = { ...(student.completed[lessonId] || {}), completed: true, at: now };
  student.lastActive = now;
}

export function recordQuiz(student, lessonId, choice, answer, now = new Date().toISOString()) {
  const score = Number(choice) === Number(answer) ? 1 : 0;
  student.completed[lessonId] = { ...(student.completed[lessonId] || {}), quizScore: score, quizAt: now };
  student.lastActive = now;
  return score;
}

export function progressOf(student, lessons = LESSONS) {
  const done = lessons.filter((lesson) => student.completed[lesson.id]?.completed).length;
  return { done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}

export function tierAllows(tier, feature) {
  if (feature === "templates") return tier === "templates";
  if (feature === "call") return tier === "call";
  return true;
}

export function studentsToCsv(students, lessons = LESSONS) {
  const header = ["email", "name", "tier", "test_mode", "progress_percent", "last_active"];
  const lines = [header.join(",")];
  for (const student of students) {
    const progress = progressOf(student, lessons);
    lines.push([
      student.email,
      JSON.stringify(student.name || ""),
      student.tier,
      student.testMode ? "1" : "0",
      String(progress.percent),
      student.lastActive || "",
    ].join(","));
  }
  return lines.join("\n");
}

const STORE_KEY = "siteowned.learn";

export function loadBrowserDb() {
  if (typeof localStorage === "undefined") return emptyLearnDb();
  try {
    return { ...emptyLearnDb(), ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch {
    return emptyLearnDb();
  }
}

export function saveBrowserDb(db) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}
