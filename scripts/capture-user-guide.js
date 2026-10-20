const { chromium } = require("playwright-core");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "guide-shots");
const PORT = 8765;

function mime(file) {
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".webp")) return "image/webp";
  if (file.endsWith(".pdf")) return "application/pdf";
  if (file.endsWith(".webmanifest")) return "application/manifest+json";
  return "application/octet-stream";
}

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/index.html";
  const file = path.join(ROOT, url.replace(/^\//, ""));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { "Content-Type": mime(file) });
  fs.createReadStream(file).pipe(res);
});

async function seed(page) {
  await page.waitForFunction(() => typeof storageReady !== "undefined");
  await page.evaluate(() => storageReady);
  await page.evaluate(() => {
    const byName = (list, name) => list.find((x) => x.name === name);
    const chest = byName(state.muscles, "Chest");
    const legs = byName(state.muscles, "Legs");
    const back = byName(state.muscles, "Back");
    const bench = byName(state.exercises, "Flat Bench Press");
    const squat = byName(state.exercises, "Squat");
    const row = byName(state.exercises, "Seated Cable Row");
    const mk = (id, date, muscles, entries, start, end) => ({
      id,
      date,
      muscles: muscles.map((m) => m.id),
      muscleNames: muscles.map((m) => m.name),
      startTime: start,
      endTime: end,
      unit: "kg",
      createdAt: Date.parse(date + "T08:00:00"),
      exercises: entries.map((e) => ({
        exerciseId: e.ex.id,
        name: e.ex.name,
        muscleId: e.ex.muscleId,
        unit: "kg",
        sets: e.sets,
      })),
    });
    state.workouts = [
      mk("w1", "2026-10-06", [chest, legs], [
        { ex: bench, sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }] },
        { ex: squat, sets: [{ weight: 80, reps: 6 }, { weight: 80, reps: 6 }] },
      ], "07:00", "08:10"),
      mk("w2", "2026-10-08", [back], [
        { ex: row, sets: [{ weight: 40, reps: 10 }, { weight: 42.5, reps: 8 }] },
      ], "18:00", "18:40"),
      mk("w3", "2026-10-13", [chest, legs], [
        { ex: bench, sets: [{ weight: 62.5, reps: 8 }] },
        { ex: squat, sets: [{ weight: 85, reps: 5 }] },
      ], "07:05", "08:00"),
      mk("w4", "2026-10-17", [back], [
        { ex: row, sets: [{ weight: 45, reps: 8 }] },
      ], "18:10", "18:50"),
      mk("w5", "2026-10-19", [chest, legs], [
        { ex: bench, sets: [{ weight: 65, reps: 6 }] },
        { ex: squat, sets: [{ weight: 87.5, reps: 5 }] },
      ], "07:00", "08:05"),
    ];
    const d = new Date(2026, 9, 20);
    selected = d;
    selectedWeekStart = weekStart(d);
    selectedMonth = monthStart(d);
    save();
    refreshAppViews();
    go("home");
  });
  await page.waitForTimeout(600);
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name + ".png");
  await page.screenshot({ path: file, type: "png" });
  console.log("wrote", file);
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: "networkidle" });
  await seed(page);
  await shot(page, "home");
  await page.evaluate(() => go("workouts"));
  await page.waitForTimeout(300);
  await shot(page, "workouts");
  await page.evaluate(() => go("exercises"));
  await page.waitForTimeout(300);
  await shot(page, "exercises");
  await page.evaluate(() => go("progress"));
  await page.waitForTimeout(300);
  await shot(page, "history");
  await page.evaluate(() => go("more"));
  await page.waitForTimeout(300);
  await shot(page, "more");
  await browser.close();
  server.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
