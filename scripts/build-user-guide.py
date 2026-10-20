#!/usr/bin/env python3
"""Build user-guide.pdf from cropped feature shots. Run from repo root."""
import re
from pathlib import Path
from fpdf import FPDF
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "user-guide.pdf"
SHOTS = ROOT / "docs" / "guide-shots"


def app_version():
    text = (ROOT / "js" / "data.js").read_text()
    match = re.search(r'const VERSION="([^"]+)"', text)
    if not match:
        raise SystemExit("VERSION missing in js/data.js")
    return match.group(1)

ITEMS = [
    {"section": "Home", "title": "Start Workout", "line": "Logs today.", "shot": "home-start.png"},
    {"section": "Home", "title": "Today's Status", "line": "Done or not yet.", "shot": "home-status.png"},
    {"section": "Home", "title": "Weekly Activity", "line": "Green is a workout. Rest is days before today.", "shot": "home-week.png"},
    {"section": "Home", "title": "Quick Progress", "line": "This week's sets and volume.", "shot": "home-progress.png"},
    {"section": "Home", "title": "Tabs", "line": "Home, Workouts, Exercises, History, More.", "shot": "nav.png"},
    {"section": "Log a workout", "title": "Date and muscles", "line": "One session per day.", "shot": "log-basics.png"},
    {"section": "Log a workout", "title": "Exercises", "line": "Pick what you trained.", "shot": "log-exercises.png"},
    {"section": "Log a workout", "title": "Sets", "line": "Weight and reps. 0 kg is 0 kg.", "shot": "log-sets.png"},
    {"section": "Workouts", "title": "Monthly Activity", "line": "Green days have a session.", "shot": "workouts-month.png"},
    {"section": "Workouts", "title": "Rest day", "line": "No session on that date.", "shot": "workouts-rest.png"},
    {"section": "Workouts", "title": "Workout card", "line": "Tap to view, edit, or delete.", "shot": "workouts-card.png"},
    {"section": "Workouts", "title": "View workout", "line": "Sets, Edit, Delete, Excel export.", "shot": "view-workout.png"},
    {"section": "Exercises", "title": "Search and filter", "line": "Muscle chips after All, A to Z.", "shot": "exercises-search.png"},
    {"section": "Exercises", "title": "A lift", "line": "Latest load. Tap for history.", "shot": "exercises-row.png"},
    {"section": "Exercises", "title": "History", "line": "Every session of that lift.", "shot": "exercise-history.png"},
    {"section": "Exercises", "title": "Graph", "line": "Day / Week / Month / Year.", "shot": "exercise-graph.png"},
    {"section": "History", "title": "Export", "line": "Share icon saves Excel.", "shot": "history-head.png"},
    {"section": "History", "title": "Month", "line": "Workouts, volume, muscle groups.", "shot": "history-month.png"},
    {"section": "History", "title": "Log", "line": "Every session, newest first.", "shot": "history-card.png"},
    {"section": "Library", "title": "Search", "line": "Find a group or lift.", "shot": "library-search.png"},
    {"section": "Library", "title": "A group", "line": "Edit or delete a muscle or lift.", "shot": "library-group.png"},
    {"section": "Library", "title": "Add", "line": "New muscle group or exercise.", "shot": "library-add.png"},
    {"section": "Recycle Bin", "title": "Restore", "line": "Kept 30 days, then gone.", "shot": "recycle-card.png"},
    {"section": "More", "title": "Exercise Library", "line": "Manage groups and lifts.", "shot": "setting-library.png"},
    {"section": "More", "title": "Theme", "line": "Light or dark. Stays on this phone.", "shot": "setting-theme.png"},
    {"section": "More", "title": "Weight unit", "line": "kg or lb. Stays on this phone.", "shot": "setting-unit.png"},
    {"section": "More", "title": "Google Drive", "line": "A copy off this phone. Sync is this phone to Drive.", "shot": "setting-drive.png"},
    {"section": "More", "title": "Backup & Restore", "line": "JSON file on this phone.", "shot": "setting-backup.png"},
    {"section": "More", "title": "Backup sheet", "line": "Export, choose a file, or Restore from Drive.", "shot": "backup-sheet.png"},
    {"section": "More", "title": "Clear All Data", "line": "Wipes this phone. Drive is unchanged.", "shot": "setting-clear.png"},
    {"section": "More", "title": "Recycle Bin", "line": "Deleted workouts and exercises.", "shot": "setting-recycle.png"},
    {"section": "More", "title": "About", "line": "Version and this guide.", "shot": "setting-about.png"},
    {"section": "More", "title": "User guide", "line": "More > About > User guide > Open.", "shot": "about-card.png"},
]


class Guide(FPDF):
    def __init__(self, version, **kwargs):
        super().__init__(**kwargs)
        self.app_version = version

    def footer(self):
        self.set_y(-12)
        self.set_x(14)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(140, 142, 150)
        self.cell(80, 6, self.app_version, align="L")
        self.cell(self.w - 108, 6, str(self.page_no()), align="R")


def image_size(path, max_w, max_h):
    with Image.open(path) as im:
        iw, ih = im.size
    w = max_w
    h = w * ih / iw
    if h > max_h:
        h = max_h
        w = h * iw / ih
    return w, h


def place_image(pdf, path, max_w, max_h):
    w, h = image_size(path, max_w, max_h)
    x = 14 + (max_w - w) / 2
    pdf.image(str(path), x=x, y=pdf.get_y(), w=w, h=h)
    pdf.set_y(pdf.get_y() + h)


def main():
    version = app_version()
    pdf = Guide(version, format="A4")
    pdf.set_auto_page_break(auto=False, margin=14)
    pw = pdf.w - 28
    pdf.add_page()
    pdf.set_xy(14, 14)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(20, 22, 35)
    pdf.cell(pw, 8, "Workout Tracker", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(14)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(90, 94, 104)
    pdf.cell(pw, 6, f"User guide  {version}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    section = None
    for item in ITEMS:
        img = SHOTS / item["shot"]
        if not img.exists():
            raise SystemExit(f"missing {img}")
        new_section = item["section"] != section
        head = (10 if new_section else 0) + 13
        remain_now = pdf.h - 16 - pdf.get_y()
        _, img_h = image_size(img, pw, min(118, max(40, remain_now - head)))
        need = head + img_h + 6
        if pdf.get_y() + need > pdf.h - 16:
            pdf.add_page()
            pdf.set_xy(14, 14)
            section = None
            new_section = True
        if new_section:
            section = item["section"]
            pdf.set_x(14)
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(91, 67, 243)
            pdf.cell(pw, 8, section, new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
        pdf.set_x(14)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(20, 22, 35)
        pdf.cell(pw, 6, item["title"], new_x="LMARGIN", new_y="NEXT")
        pdf.set_x(14)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(70, 74, 84)
        pdf.cell(pw, 5, item["line"], new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)
        remain = pdf.h - 16 - pdf.get_y()
        place_image(pdf, img, pw, remain)
        pdf.ln(6)

    pdf.output(OUT)
    print(f"wrote {OUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
    main()
