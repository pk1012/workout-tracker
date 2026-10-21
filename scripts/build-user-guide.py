#!/usr/bin/env python3
"""Build user-guide.pdf from cropped feature shots. Run from repo root."""
import re
from pathlib import Path
from fpdf import FPDF
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "user-guide.pdf"
SHOTS = ROOT / "docs" / "guide-shots"

CHAPTERS = [
    {
        "title": "1. Get around",
        "blurb": "Five tabs. More holds Library, Drive, Recycle, and this guide.",
        "steps": [
            {"title": "Tabs", "line": "Home, Workouts, Exercises, History, More.", "shot": "nav.png"},
        ],
    },
    {
        "title": "2. Log a workout",
        "blurb": "One session per day. Start Workout always opens a new draft. Swipe down to dismiss a sheet.",
        "steps": [
            {"title": "Start", "line": "Home > Start Workout.", "shot": "home-start.png"},
            {"title": "Date and muscles", "line": "Pick the day, times, and groups.", "shot": "log-basics.png"},
            {"title": "Exercises", "line": "Pick what you trained.", "shot": "log-exercises.png"},
            {"title": "Sets", "line": "Weight and reps. 0 kg is 0 kg.", "shot": "log-sets.png"},
        ],
    },
    {
        "title": "3. See this week",
        "blurb": "Home shows today, the week, and quick totals.",
        "steps": [
            {"title": "Today", "line": "Done, or not yet.", "shot": "home-status.png"},
            {"title": "Weekly Activity", "line": "Green is a workout. Rest is days before today.", "shot": "home-week.png"},
            {"title": "Quick Progress", "line": "This week's sets and volume.", "shot": "home-progress.png"},
        ],
    },
    {
        "title": "4. See the month",
        "blurb": "Workouts tab. Tap a day. Swipe the calendar to change month.",
        "steps": [
            {"title": "Monthly Activity", "line": "Green days have a session.", "shot": "workouts-month.png"},
            {"title": "Rest day", "line": "No session on that date.", "shot": "workouts-rest.png"},
            {"title": "Workout card", "line": "Tap to open the session.", "shot": "workouts-card.png"},
        ],
    },
    {
        "title": "5. Open a session",
        "blurb": "Edit, delete, or export Excel. Deleted sessions go to Recycle for 30 days.",
        "steps": [
            {"title": "View workout", "line": "Sets, Edit, Delete, Excel.", "shot": "view-workout.png"},
        ],
    },
    {
        "title": "6. Track a lift",
        "blurb": "Exercises tab. Muscle chips after All, A to Z.",
        "steps": [
            {"title": "Find a lift", "line": "Search or filter.", "shot": "exercises-search.png"},
            {"title": "Latest load", "line": "Tap the row for history.", "shot": "exercises-row.png"},
            {"title": "List", "line": "Every session of that lift.", "shot": "exercise-history.png"},
            {"title": "Graph", "line": "Day, Week, Month, or Year.", "shot": "exercise-graph.png"},
        ],
    },
    {
        "title": "7. History and export",
        "blurb": "Full log. Share icon saves Excel.",
        "steps": [
            {"title": "Export", "line": "History > share icon.", "shot": "history-head.png"},
            {"title": "Month", "line": "Workouts, volume, muscle groups.", "shot": "history-month.png"},
            {"title": "Log", "line": "Every session, newest first.", "shot": "history-card.png"},
        ],
    },
    {
        "title": "8. Exercise library",
        "blurb": "More > Exercise Library. Edit a name to rename, move, or delete.",
        "steps": [
            {"title": "Find", "line": "Search or filter groups.", "shot": "library-search.png"},
            {"title": "A group", "line": "Pencil opens edit.", "shot": "library-group.png"},
            {"title": "Edit or delete", "line": "Delete lives in the edit sheet.", "shot": "library-edit.png"},
            {"title": "Add", "line": "New muscle group or exercise.", "shot": "library-add.png"},
        ],
    },
    {
        "title": "9. Recycle Bin",
        "blurb": "More > Recycle Bin. Kept 30 days, then gone.",
        "steps": [
            {"title": "Restore or delete forever", "line": "Restore puts it back.", "shot": "recycle-card.png"},
        ],
    },
    {
        "title": "10. Keep a copy",
        "blurb": "JSON backup is a file on this phone. Drive is this phone to Drive. Restore replaces current data.",
        "steps": [
            {"title": "Google Drive", "line": "Connect to keep a copy off this phone.", "shot": "setting-drive.png"},
            {"title": "Backup & Restore", "line": "More > Backup & Restore.", "shot": "setting-backup.png"},
            {"title": "Export or restore", "line": "Export, choose a file, or Restore from Drive.", "shot": "backup-sheet.png"},
        ],
    },
    {
        "title": "11. Phone settings",
        "blurb": "Theme and kg/lb stay on this phone. They are not in the Drive snapshot.",
        "steps": [
            {"title": "Theme", "line": "Light or dark.", "shot": "setting-theme.png"},
            {"title": "Weight unit", "line": "kg or lb.", "shot": "setting-unit.png"},
            {"title": "Clear All Data", "line": "Wipes this phone. Drive is unchanged.", "shot": "setting-clear.png"},
            {"title": "This guide", "line": "More > About > User guide > Open.", "shot": "about-card.png"},
        ],
    },
]


def app_version():
    text = (ROOT / "js" / "data.js").read_text()
    match = re.search(r'const VERSION="([^"]+)"', text)
    if not match:
        raise SystemExit("VERSION missing in js/data.js")
    return match.group(1)


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


# Every grab is a phone crop. Draw them at one width so a row and a sheet
# do not jump between a thin strip and a full-page poster.
FIG_W = 90
FIG_H_MAX = 148


def image_size(path):
    with Image.open(path) as im:
        iw, ih = im.size
    w = FIG_W
    h = w * ih / iw
    if h > FIG_H_MAX:
        h = FIG_H_MAX
        w = h * iw / ih
    return w, h


def place_image(pdf, path):
    w, h = image_size(path)
    x = (pdf.w - w) / 2
    pdf.image(str(path), x=x, y=pdf.get_y(), w=w, h=h)
    pdf.set_y(pdf.get_y() + h)


def ensure_space(pdf, need):
    if pdf.get_y() + need > pdf.h - 16:
        pdf.add_page()
        pdf.set_xy(14, 14)


def write_line(pdf, pw, text, size, bold=False, color=(20, 22, 35), h=6):
    pdf.set_x(14)
    pdf.set_font("Helvetica", "B" if bold else "", size)
    pdf.set_text_color(*color)
    pdf.multi_cell(pw, h, text)
    pdf.set_x(14)


def main():
    version = app_version()
    pdf = Guide(version, format="A4")
    pdf.set_auto_page_break(auto=False, margin=14)
    pw = pdf.w - 28

    pdf.add_page()
    pdf.set_xy(14, 18)
    write_line(pdf, pw, "Workout Tracker", 22, bold=True, h=10)
    write_line(pdf, pw, "User guide", 14, color=(90, 94, 104), h=8)
    write_line(pdf, pw, f"Version {version}", 12, bold=True, color=(91, 67, 243), h=8)
    pdf.ln(4)
    write_line(
        pdf,
        pw,
        "How to log sessions, read history, and keep a copy.",
        11,
        color=(55, 58, 66),
        h=6,
    )
    write_line(
        pdf,
        pw,
        "If this version does not match About > Version, this guide is stale.",
        11,
        color=(55, 58, 66),
        h=6,
    )
    pdf.ln(8)
    write_line(pdf, pw, "Contents", 13, bold=True, color=(91, 67, 243), h=8)
    pdf.ln(2)
    for chapter in CHAPTERS:
        write_line(pdf, pw, chapter["title"], 11, color=(20, 22, 35), h=7)

    for chapter in CHAPTERS:
        pdf.add_page()
        pdf.set_xy(14, 14)
        write_line(pdf, pw, chapter["title"], 14, bold=True, color=(91, 67, 243), h=8)
        write_line(pdf, pw, chapter["blurb"], 10, color=(70, 74, 84), h=5)
        pdf.ln(4)
        for i, step in enumerate(chapter["steps"], start=1):
            img = SHOTS / step["shot"]
            if not img.exists():
                raise SystemExit(f"missing {img}")
            _, img_h = image_size(img)
            need = 16 + img_h
            if i > 1:
                ensure_space(pdf, need)
            write_line(pdf, pw, f"{i}. {step['title']}", 12, bold=True, h=6)
            write_line(pdf, pw, step["line"], 10, color=(70, 74, 84), h=5)
            pdf.ln(2)
            place_image(pdf, img)
            pdf.ln(6)

    pdf.output(OUT)
    print(f"wrote {OUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
    main()
