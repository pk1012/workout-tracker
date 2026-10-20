#!/usr/bin/env python3
"""Build user-guide.pdf with screenshots. Run from repo root."""
from pathlib import Path
from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "user-guide.pdf"
SHOTS = ROOT / "docs" / "guide-shots"

PAGES = [
    {"title": "Home", "line": "Start a workout.", "shot": "home.png"},
    {"title": "Workouts", "line": "One session per day. Green is a workout.", "shot": "workouts.png"},
    {"title": "Exercises", "line": "Search, filter, tap a lift.", "shot": "exercises.png"},
    {"title": "History", "line": "Month totals. Share exports Excel.", "shot": "history.png"},
    {"title": "More", "line": "Library, theme, Drive, backup, Recycle.", "shot": "more.png"},
]


class Guide(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(140, 142, 150)
        self.cell(0, 6, str(self.page_no()), align="C")


def main():
    pdf = Guide(format="A4")
    pdf.set_auto_page_break(auto=False, margin=12)
    pw = pdf.w - 28
    for i, page in enumerate(PAGES):
        pdf.add_page()
        pdf.set_xy(14, 12)
        if i == 0:
            pdf.set_font("Helvetica", "B", 18)
            pdf.set_text_color(20, 22, 35)
            pdf.cell(pw, 8, "Workout Tracker", ln=1)
            pdf.set_x(14)
            pdf.set_font("Helvetica", "", 11)
            pdf.set_text_color(90, 94, 104)
            pdf.cell(pw, 6, "User guide", ln=1)
            pdf.ln(2)
        pdf.set_x(14)
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(20, 22, 35)
        pdf.cell(pw, 7, page["title"], ln=1)
        pdf.set_x(14)
        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(55, 58, 66)
        pdf.cell(pw, 6, page["line"], ln=1)
        img = SHOTS / page["shot"]
        top = pdf.get_y() + 4
        max_h = pdf.h - top - 16
        max_w = 92
        w = max_w
        h = w * (844 / 390)
        if h > max_h:
            h = max_h
            w = h * (390 / 844)
        x = (pdf.w - w) / 2
        pdf.image(str(img), x=x, y=top, w=w, h=h)
    pdf.output(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
