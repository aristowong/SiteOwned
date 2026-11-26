import {
  LESSONS, parseLesson, loadBrowserDb, saveBrowserDb, createMagicLink, consumeMagicLink,
  studentFromSession, markComplete, recordQuiz, progressOf, tierAllows, studentsToCsv,
} from "../automation/src/learn-core.js";

const db = () => {
  const stored = loadBrowserDb();
  stored.students ||= [];
  stored.magic ||= [];
  stored.sessions ||= [];
  stored.completed ||= undefined;
  return stored;
};

function sessionStudent() {
  const data = db();
  const token = localStorage.getItem("siteowned.session");
  return studentFromSession(data, token);
}

function paintHome() {
  const mount = document.querySelector("[data-learn]");
  if (!mount) return;
  const student = sessionStudent();
  if (!student) {
    mount.innerHTML = `<form data-login class="form-grid">
      <label>Email <input name="email" type="email" required></label>
      <button class="button" type="submit">Email me a sign-in link</button>
    </form>
    <p data-magic class="lede"></p>`;
    mount.querySelector("[data-login]").addEventListener("submit", (event) => {
      event.preventDefault();
      const email = new FormData(event.target).get("email");
      const data = db();
      if (!data.students.some((item) => item.email === email)) {
        mount.querySelector("[data-magic]").textContent = "No course purchase is stored for that email yet. Use test checkout first.";
        return;
      }
      const token = createMagicLink(data, email);
      saveBrowserDb(data);
      const link = `lesson.html?magic=${encodeURIComponent(token)}`;
      mount.querySelector("[data-magic]").innerHTML = `Test mode shows the link here instead of sending mail: <a href="${link}">Sign in</a>`;
    });
    return;
  }
  const progress = progressOf(student);
  const extras = [
    tierAllows(student.tier, "templates") ? "<p>Templates tier: the download link is still a TODO in payments-config.json.</p>" : "",
    tierAllows(student.tier, "call") ? "<p>Call tier: the booking link is still a TODO in payments-config.json.</p>" : "",
  ].join("");
  mount.innerHTML = `<p class="lede">${student.email} · ${student.tier}${student.testMode ? " · test student" : ""}</p>
    <div class="progress-track" aria-hidden="true"><div class="progress-bar" style="width:${progress.percent}%"></div></div>
    <p>${progress.percent}% complete (${progress.done} of ${progress.total})</p>
    ${extras}
    <ul class="plain-list">${LESSONS.map((lesson) => `<li><a href="lesson.html?id=${lesson.id}">${lesson.title}</a>${student.completed[lesson.id]?.completed ? " · done" : ""}</li>`).join("")}</ul>
    <p><a href="certificate.html">Certificate</a> · <a href="admin.html">Admin</a></p>`;
}

async function paintLesson() {
  const mount = document.querySelector("[data-lesson]");
  if (!mount) return;
  const params = new URLSearchParams(location.search);
  if (params.get("magic")) {
    const data = db();
    const result = consumeMagicLink(data, params.get("magic"));
    if (result) {
      saveBrowserDb(data);
      localStorage.setItem("siteowned.session", result.session);
      location.href = "index.html";
      return;
    }
  }
  const student = sessionStudent();
  const lesson = LESSONS.find((item) => item.id === params.get("id")) || LESSONS[0];
  if (!student) {
    mount.innerHTML = `<p><a href="index.html">Sign in</a> to read lessons.</p>`;
    return;
  }
  const response = await fetch(`../automation/content/lessons/${lesson.file}`);
  const parsed = parseLesson(await response.text());
  const quiz = parsed.meta.quiz?.[0];
  mount.innerHTML = `<h1>${lesson.title}</h1>
    <div class="lesson-body">${parsed.body.split(/\n\n+/).map((part) => `<p>${part.replace(/^# .+\n/, "")}</p>`).join("")}</div>
    <button class="button" type="button" data-done>Mark complete</button>
    ${quiz ? `<form data-quiz><p>${quiz.question}</p>${quiz.choices.map((choice, index) => `<label><input type="radio" name="choice" value="${index}"> ${choice}</label>`).join("")}<button class="button" type="submit">Submit quiz</button></form><p data-score></p>` : ""}`;
  mount.querySelector("[data-done]").addEventListener("click", () => {
    const data = db();
    const current = studentFromSession(data, localStorage.getItem("siteowned.session"));
    markComplete(current, lesson.id);
    saveBrowserDb(data);
    location.reload();
  });
  const form = mount.querySelector("[data-quiz]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const choice = new FormData(form).get("choice");
    const data = db();
    const current = studentFromSession(data, localStorage.getItem("siteowned.session"));
    const score = recordQuiz(current, lesson.id, choice, quiz.answer);
    saveBrowserDb(data);
    mount.querySelector("[data-score]").textContent = score ? "Correct." : "Not quite. The lesson is still there to reread.";
  });
}

function paintAdmin() {
  const mount = document.querySelector("[data-admin]");
  if (!mount) return;
  const students = db().students;
  mount.innerHTML = `<table><thead><tr><th>Email</th><th>Tier</th><th>Progress</th><th>Last active</th></tr></thead><tbody>
    ${students.map((student) => {
      const progress = progressOf(student);
      return `<tr><td>${student.email}</td><td>${student.tier}${student.testMode ? " (test)" : ""}</td><td>${progress.percent}%</td><td>${student.lastActive || ""}</td></tr>`;
    }).join("") || "<tr><td colspan='4'>No students yet.</td></tr>"}
  </tbody></table>
  <button class="button" type="button" data-csv>Download CSV</button>`;
  mount.querySelector("[data-csv]").addEventListener("click", () => {
    const blob = new Blob([studentsToCsv(students)], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "students.csv";
    link.click();
  });
}

function paintCertificate() {
  const mount = document.querySelector("[data-certificate]");
  if (!mount) return;
  const student = sessionStudent();
  if (!student) {
    mount.textContent = "Sign in first.";
    return;
  }
  const progress = progressOf(student);
  mount.innerHTML = progress.percent === 100
    ? `<h1>Course complete</h1><p>${student.name} finished Own Your Site: The SiteOwned DIY Course.</p>`
    : `<h1>Not finished yet</h1><p>${progress.percent}% complete. Finish every lesson to use this page.</p>`;
}

paintHome();
paintLesson();
paintAdmin();
paintCertificate();
