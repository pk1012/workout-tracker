#!/usr/bin/env python3
"""Build user-guide.pdf. Run from the repo root: python3 scripts/build-user-guide.py"""
from pathlib import Path
from fpdf import FPDF

OUT = Path(__file__).resolve().parents[1] / "user-guide.pdf"

SECTIONS = [
 (
  "Workout Tracker User Guide",
  [
   "This guide is for using Workout Tracker on your phone. Open it any time from More, then About Workout Tracker, then User guide.",
   "Your version number is on that same About screen. If something in the app has changed, use the in-app screens as the source of truth and update this guide when you next ship.",
  ],
 ),
 (
  "Add the app to your iPhone",
  [
   "Open Workout Tracker in Safari. Use Share, then Add to Home Screen. Use the home-screen icon after that so it behaves like an app.",
   "After an update, fully close the app and reopen it so the new version loads. Check About if you are unsure.",
  ],
 ),
 (
  "Home",
  [
   "Home is where you start the day. Today's Status is either no workout yet or workout completed. An unfinished start is not shown as a third status.",
   "Weekly Activity is Monday to Sunday. You can pick another week. Workout count is how many sessions you logged that week. Rest days are only days before today with no workout. Remaining is today (if still open) plus later days in that week. Empty days after today can still show a rest mark on the row; the rest number does not count them yet.",
   "Quick Progress is for the week you picked: sets, volume, PRs this calendar month, and your streak. It does not have its own week or month picker.",
  ],
 ),
 (
  "Log a workout",
  [
   "Use Start Workout from Home, or log from Workouts. You get one workout per calendar day. If that date is taken, pick another day or edit the existing session.",
   "Choose date, start and end time, and one or more muscle groups, then the exercises you did, then weight and reps for every set. 0 is a valid weight (for example an empty machine stack). Start and end time cannot be the same.",
   "You can edit a logged workout later from the workout card. Deleted library items can still appear on old sessions so history keeps the names you lifted under.",
  ],
 ),
 (
  "Workouts",
  [
   "Workouts shows Monthly Activity. Pick any month the same way you pick a week on Home. Workout count is sessions in that month. Rest days are days before today in that month with no workout. Remaining is today (if still open) plus later days in that month.",
   "Tap a day to see that day's workout or an empty day. Today with no workout still uses the Rest Day card on this screen; Home still says no workout yet.",
  ],
 ),
 (
  "Exercises",
  [
   "Exercises lists movements you have used, with the latest load. Search and filter by muscle group. Tap a row for that exercise's history.",
   "List view is each session. Graph view is load over time, including 0 kg. Switch with the list and chart icons. A set logged as 0 shows 0 kg, not Bodyweight.",
  ],
 ),
 (
  "History",
  [
   "History is your full workout log, newest first. The card at the top is how much you did in the selected month: workouts, volume, and muscle groups trained. It opens on this month. Change month with the same month list as Workouts. Changing that month does not filter the list below and does not move the Workouts calendar.",
   "An empty month shows zeros. The share icon on the History title exports every current workout to Excel (Workout-History-YYYY-MM-DD.xlsx), oldest first, not only the selected month. Open a workout to export that session alone.",
  ],
 ),
 (
  "Exercise Library",
  [
   "More, then Exercise Library. Add, rename, or delete muscle groups and exercises. If a name was used in past workouts, you will be asked before rename or delete. History keeps the old names on those sessions when you delete from the library.",
  ],
 ),
 (
  "Recycle Bin",
  [
   "Deleted workouts, exercises, and muscle groups go to Recycle Bin for 30 days, then they are removed for good. Restore puts them back. Restored workouts keep their titles even if those muscle groups are no longer in the library.",
  ],
 ),
 (
  "Theme and weight unit",
  [
   "Light or dark, and kg or lb, live on this phone only. They are not stored in the Google Drive backup. A JSON backup can include theme and unit. Switching unit converts weights you see and save.",
  ],
 ),
 (
  "Google Drive",
  [
   "Connect Google Drive from More to keep a copy off this phone. Sync means this phone updates Drive, not the other way around, unless you choose Restore.",
   "Library and workout changes auto-save when this phone last wrote Drive. The bell can say waiting to save, or that phone and Drive differ. Differ means tap Sync to update Drive.",
   "If this phone has no workouts and Drive still has a backup, restoring from Drive replaces data on this phone. Drive is not changed until you confirm an upload. If you change the library while History is empty and Drive still has workouts, you will be asked: This phone has no workouts. Replace the Drive backup with this phone's library? That can erase workouts still on Drive.",
  ],
 ),
 (
  "Backup file",
  [
   "More, then Backup & Restore. Export Backup saves a JSON file of your data. Restore from a file replaces what is on this phone. That is separate from Google Drive.",
  ],
 ),
 (
  "Clear all data",
  [
   "Clear All Data deletes data on this phone only. The file on Google Drive is not changed.",
  ],
 ),
 (
  "Notifications",
  [
   "The bell on Home lists wait-to-save, phone and Drive differ, and restore Drive backup when those apply. Empty means no notifications.",
  ],
 ),
 (
  "Support",
  [
   "Questions: support@workouttracker.app",
  ],
 ),
]


class Guide(FPDF):
 def footer(self):
  self.set_y(-14)
  self.set_font("Helvetica", "", 9)
  self.set_text_color(110, 110, 120)
  self.cell(0, 8, f"{self.page_no()}", align="C")


def main():
 pdf = Guide(format="A4")
 pdf.set_auto_page_break(auto=True, margin=18)
 pdf.set_margins(18, 18, 18)
 pdf.add_page()
 first = True
 for title, paras in SECTIONS:
  if first:
   pdf.set_font("Helvetica", "B", 20)
   pdf.set_text_color(20, 22, 35)
   pdf.multi_cell(0, 9, title)
   pdf.ln(4)
   first = False
  else:
   pdf.ln(3)
   pdf.set_font("Helvetica", "B", 13)
   pdf.set_text_color(20, 22, 35)
   pdf.multi_cell(0, 7, title)
   pdf.ln(1)
  pdf.set_font("Helvetica", "", 11)
  pdf.set_text_color(50, 54, 64)
  for i, para in enumerate(paras):
   pdf.multi_cell(0, 6, para)
   if i != len(paras) - 1:
    pdf.ln(2)
 pdf.output(OUT)
 print(f"wrote {OUT}")


if __name__ == "__main__":
 main()
