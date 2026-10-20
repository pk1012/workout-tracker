const { chromium } = require("playwright-core");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "guide-shots");
const PORT = 8765;
const PAD = 12;

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
    ensureBin(state);
    const dumped = JSON.parse(JSON.stringify(state.workouts[0]));
    dumped.id = "bin-w1";
    dumped.deletedAt = Date.now() - 2 * 86400000;
    state.bin.workouts = [dumped];
    const d = new Date(2026, 9, 20);
    selected = d;
    selectedWeekStart = weekStart(d);
    selectedMonth = monthStart(d);
    if (typeof historyMonth !== "undefined") historyMonth = monthStart(d);
    save();
    refreshAppViews();
    go("home");
  });
  await page.waitForTimeout(400);
}

function clipFromBoxes(boxes, view) {
  let x0 = Infinity, y0 = Infinity, x1 = 0, y1 = 0;
  for (const b of boxes) {
    if (!b) continue;
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.width);
    y1 = Math.max(y1, b.y + b.height);
  }
  const x = Math.max(0, x0 - PAD);
  const y = Math.max(0, y0 - PAD);
  return {
    x,
    y,
    width: Math.min(view.width - x, x1 - x0 + PAD * 2),
    height: Math.min(view.height - y, y1 - y0 + PAD * 2),
  };
}

function stitchPngs(parts, dest) {
  const py = `
from PIL import Image
from pathlib import Path
parts = ${JSON.stringify(parts)}
imgs = [Image.open(p).convert("RGBA") for p in parts]
w = max(im.width for im in imgs)
gap = 24
h = sum(im.height for im in imgs) + gap * (len(imgs) - 1)
out = Image.new("RGBA", (w, h), (248, 249, 252, 255))
y = 0
for im in imgs:
    x = (w - im.width) // 2
    out.paste(im, (x, y), im)
    y += im.height + gap
out.convert("RGB").save(${JSON.stringify(dest)}, "PNG")
for p in parts:
    Path(p).unlink(missing_ok=True)
`;
  const r = spawnSync("python3", ["-c", py], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || "stitch failed");
}

async function shotBoxes(page, name, locators) {
  const boxes = [];
  for (const loc of locators) {
    await loc.waitFor({ state: "visible", timeout: 8000 });
    boxes.push(await loc.boundingBox());
  }
  const view = page.viewportSize();
  const sorted = boxes.filter(Boolean).sort((a, b) => a.y - b.y);
  let split = false;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    if (sorted[i].y > prev.y + prev.height + 48) split = true;
  }
  const file = path.join(OUT, name + ".png");
  if (!split) {
    const clip = clipFromBoxes(sorted, view);
    if (clip.width < 2 || clip.height < 2) throw new Error("empty clip " + name);
    await page.screenshot({ path: file, type: "png", clip });
  } else {
    const parts = [];
    for (let i = 0; i < sorted.length; i++) {
      const clip = clipFromBoxes([sorted[i]], view);
      const part = path.join(OUT, `${name}-part-${i}.png`);
      await page.screenshot({ path: part, type: "png", clip });
      parts.push(part);
    }
    stitchPngs(parts, file);
  }
  const { size } = fs.statSync(file);
  console.log("wrote", file, Math.round(size / 1024) + "kb");
}

function L(page, sel, opts = {}) {
  let loc = page.locator(sel);
  if (opts.hasText) loc = loc.filter({ hasText: opts.hasText });
  if (opts.nth != null) loc = loc.nth(opts.nth);
  return loc.first();
}

async function closeSheet(page) {
  await page.evaluate(() => {
    if (typeof closeModal === "function") closeModal();
  });
  await page.waitForTimeout(200);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(OUT, f));
  }
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

  await shotBoxes(page, "home-start", [L(page, ".hero-card")]);
  await shotBoxes(page, "home-status", [L(page, ".home-status")]);
  await shotBoxes(page, "home-week", [L(page, ".weekly-card")]);
  await shotBoxes(page, "home-progress", [L(page, ".quick")]);
  await shotBoxes(page, "nav", [L(page, ".bottom-nav")]);

  await page.evaluate(() => go("workouts"));
  await page.waitForTimeout(300);
  await shotBoxes(page, "workouts-month", [L(page, ".workout-month")]);
  await page.evaluate(() => selectWorkoutDay("2026-10-20"));
  await page.waitForTimeout(200);
  await shotBoxes(page, "workouts-rest", [L(page, ".rest-card")]);
  await page.evaluate(() => selectWorkoutDay("2026-10-19"));
  await page.waitForTimeout(200);
  await shotBoxes(page, "workouts-card", [L(page, ".workout-card:not(.rest-card)")]);

  await page.evaluate(() => viewWorkout("w5"));
  await page.waitForTimeout(400);
  await page.locator("#modal .collapsible-head").first().click();
  await page.waitForTimeout(200);
  await shotBoxes(page, "view-workout", [
    L(page, "#modal .workout-entry-header"),
    L(page, "#modal .workout-entry-scroll .card").first(),
    L(page, "#modal .workout-modal-actions"),
  ]);
  await closeSheet(page);

  await page.evaluate(() => go("exercises"));
  await page.waitForTimeout(300);
  await shotBoxes(page, "exercises-search", [
    L(page, "#exerciseList .exercise-screen-toolbar"),
    L(page, "#exerciseList .exercise-chip-scroller"),
  ]);
  await shotBoxes(page, "exercises-row", [L(page, ".exercise-screen-row")]);
  await page.evaluate(() => {
    const row = document.querySelector(".exercise-screen-row");
    row && row.click();
  });
  await page.waitForTimeout(400);
  await shotBoxes(page, "exercise-history", [
    L(page, "#modal .workout-entry-header"),
    L(page, "#modal .workout-entry-scroll"),
  ]);
  await page.evaluate(() => setExerciseHistoryView("graph"));
  await page.waitForTimeout(500);
  await shotBoxes(page, "exercise-graph", [
    L(page, "#modal .workout-entry-header"),
    L(page, "#modal .exercise-history-graph"),
  ]);
  await closeSheet(page);

  await page.evaluate(() => go("progress"));
  await page.waitForTimeout(300);
  await shotBoxes(page, "history-head", [L(page, ".history-head")]);
  await shotBoxes(page, "history-month", [L(page, ".progress-overview")]);
  await shotBoxes(page, "history-card", [L(page, "#progressView .workout-card")]);

  await page.evaluate(() => go("home"));
  await page.waitForTimeout(200);
  await page.evaluate(() => openWorkout());
  await page.waitForTimeout(400);
  await page.locator(".workout-muscle-chest").click();
  await page.waitForTimeout(150);
  await shotBoxes(page, "log-basics", [
    L(page, "#modal .workout-entry-header"),
    L(page, "#modal .workout-entry-scroll"),
    L(page, "#modal .workout-modal-actions"),
  ]);
  await page.evaluate(() => chooseExercises());
  await page.waitForTimeout(400);
  await page.locator(".exercise-pick").first().click();
  await page.waitForTimeout(150);
  await shotBoxes(page, "log-exercises", [
    L(page, "#modal .workout-entry-header"),
    L(page, "#modal .workout-entry-scroll"),
    L(page, "#modal .workout-modal-actions"),
  ]);
  await page.evaluate(() => continueToSetDetails());
  await page.waitForTimeout(400);
  await page.locator("#modal .set-editor-head").first().click();
  await page.waitForTimeout(200);
  await shotBoxes(page, "log-sets", [
    L(page, "#modal .workout-entry-header"),
    L(page, "#modal .set-editor").first(),
    L(page, "#modal .workout-modal-actions"),
  ]);
  await closeSheet(page);

  await page.evaluate(() => go("library-management"));
  await page.waitForTimeout(300);
  await shotBoxes(page, "library-search", [
    L(page, "#library .exercise-screen-toolbar"),
    L(page, "#library .exercise-chip-scroller"),
  ]);
  await shotBoxes(page, "library-group", [L(page, ".library-group")]);
  await shotBoxes(page, "library-add", [L(page, ".library-actions")]);

  await page.evaluate(() => go("recycle"));
  await page.waitForTimeout(300);
  await shotBoxes(page, "recycle-card", [L(page, ".recycle-card")]);

  await page.evaluate(() => go("more"));
  await page.waitForTimeout(300);
  await shotBoxes(page, "setting-library", [L(page, ".setting", { hasText: "Exercise Library" })]);
  await shotBoxes(page, "setting-theme", [L(page, ".setting", { hasText: "Theme" })]);
  await shotBoxes(page, "setting-unit", [L(page, ".setting", { hasText: "Weight unit" })]);
  await shotBoxes(page, "setting-drive", [L(page, "#driveCard .setting")]);
  await shotBoxes(page, "setting-backup", [L(page, ".setting", { hasText: "Backup & Restore" })]);
  await shotBoxes(page, "setting-clear", [L(page, ".setting", { hasText: "Clear All Data" })]);
  await shotBoxes(page, "setting-recycle", [L(page, ".setting", { hasText: "Recycle Bin" })]);
  await shotBoxes(page, "setting-about", [L(page, ".setting", { hasText: "About Workout Tracker" })]);

  await page.evaluate(() => restoreBackup());
  await page.waitForTimeout(400);
  await shotBoxes(page, "backup-sheet", [
    L(page, "#modal .workout-entry-header"),
    L(page, "#modal .workout-modal-actions"),
  ]);
  await closeSheet(page);

  await page.evaluate(() => about());
  await page.waitForTimeout(400);
  await shotBoxes(page, "about-card", [L(page, "#modal .workout-detail")]);
  await closeSheet(page);

  await browser.close();
  server.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
