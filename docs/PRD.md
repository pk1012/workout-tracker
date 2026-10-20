# Workout Tracker — Product Requirements Document (PRD)

| Field | Value |
|--------|--------|
| **Product** | Workout Tracker |
| **Type** | Personal progressive web app (PWA) |
| **Current version** | 1.7.337 (build `2026.10.20`) |
| **Primary platform** | Mobile Safari / Chrome (iPhone Home Screen first); desktop secondary |
| **Hosting** | GitHub Pages (`pk1012.github.io/workout-tracker/`) |
| **Audience** | Single personal user (owner); not a multi-tenant product |
| **Document status** | Living PRD derived from shipped code + development chats |
| **Companion** | `user-guide.pdf` (screenshot-led end-user guide) |

This document describes **what the product is**, **every shipped feature and behaviour**, and **why** those behaviours exist (from implementation history and product decisions). It is the source of truth for product intent. Where chat intent and code once diverged, **shipped `main` behaviour wins**, with rationale called out.

---

## 1. Vision and goals

### 1.1 Vision

A personal, offline-first workout logger that feels consistent and polished on a phone Home Screen install: log today’s session quickly, see weekly/monthly activity at a glance, track lift progress per exercise, keep history recoverable, and keep a single Google Drive backup that does not silently wipe another device.

### 1.2 Goals

1. **Log workouts reliably on phone** — including offline; never lose a completed session because the network is down.
2. **Visual consistency** — shared sheet chrome, type scale, gutters, list language, and card rhythm; Home is the visual reference, not a redesign target.
3. **History integrity** — deleting or renaming library items must not erase names from past workouts without clear confirmation; soft-delete via Recycle Bin.
4. **Safe multi-device backup** — one Drive JSON file; ownership-aware sync; never auto-overwrite another device’s history with emptiness.
5. **Progressive disclosure** — long set lists and history rows start collapsed; light sheets dismiss with swipe; forms require explicit actions.

### 1.3 Non-goals (explicitly deferred or rejected)

| Item | Decision |
|------|----------|
| Native iOS / Android rewrite | Deferred; stay PWA |
| Multi-user accounts / social | Out of scope |
| Multiple workouts per calendar day | Rejected; one workout per date |
| Three Drive files (workouts / library / bin) | Rejected |
| Timestamped Drive file per change | Rejected; rely on Drive “Manage versions” + local Export Backup |
| Merge restored name collisions | Deferred (`Name (Restored)` uniqueness instead) |
| Crash-resumable in-progress drafts | Not shipped; drafts are session-only |
| Multi-tab live sync | Out of scope |
| Backdrop tap to dismiss sheets | Rejected (accidental dismiss on phone) |

---

## 2. Personas and devices

| Role | Behaviour |
|------|-----------|
| **Primary phone (iPhone)** | Day-to-day logging; Home Screen PWA; Escape key behaviour is laptop polish only |
| **Secondary phone (Android)** | May hold different local data; uses Restore / Sync confirm rather than silent overwrite |
| **Owner** | Single personal dataset; greeting copy is personal (“Make today count, Prajwal.”) |

---

## 3. Information architecture

### 3.1 Bottom navigation (five tabs)

| Tab | Screen id | Purpose |
|-----|-----------|---------|
| **Home** | `home` | Start workout, today’s status, weekly activity, quick progress |
| **Workouts** | `workouts` | Monthly activity calendar + selected-day detail |
| **Exercises** | `exercises` | Progress tracker: search/filter lifts, open history/graph |
| **History** | `progress` | Month overview + workout list + Excel export (IA rename from “Progress”) |
| **More** | `more` | Settings |

Secondary screens (reached from More, not own nav items; More stays highlighted):

| Screen | id | Entry |
|--------|-----|--------|
| Exercise Library | `library-management` | Settings → Exercise Library |
| Recycle Bin | `recycle` | Settings → Recycle Bin |

### 3.2 Why History ≠ Exercises

- **Exercises** = progress on lifts (latest load, graphs).
- **History** = chronological workout log (cards matching Workouts language).
- Renamed from Progress so the clock icon and “past sessions” mental model match how the tabs are actually used.

---

## 4. Cross-cutting product rules

### 4.1 One workout per calendar day

- Enforced when advancing the Start/Edit wizard (`Next`) and on final save.
- Enforced in `isValidState` for backups / Drive restore.
- Toast copy: **“A workout already exists for this day.”**
- **Start Workout always opens a new draft** dated **today** (not the calendar selection). If today is taken, the user must change the date or cancel; they are **not** auto-routed into Edit.
- **Edit** is only via View Workout → Edit, or Home → View Workout → Edit, or hero is *not* an edit shortcut when logged.

### 4.2 Local-first storage

| Store | Key / name | Role |
|-------|------------|------|
| localStorage | `wt_state`, `wt_state_backup`, `wt_state_at` | Primary + mirror + timestamp |
| IndexedDB | `workout-tracker` / `kv` / `state` | Durable copy; boot picks newer vs localStorage |
| Preferences | `wt_theme`, `wt_unit`, `wt_device_id` | Device-local (theme/unit **not** in Drive snapshot) |

- Persist is queued (`persistAll` / `persistLock`); failure notifies: **“Could not save on this phone.”**
- Requests persistent storage when available.
- Clearing website data / new install wipes local state and local-only prefs; Drive file remains until Sync policy says otherwise.

### 4.3 Default seed library

On first launch with no valid state, seed muscle groups and exercises:

Abs, Back, Biceps, Calves, Cardio, Chest, Legs, Shoulders, Triceps — each with a fixed starter exercise list (see `defaults` in `js/data.js`).

### 4.4 Units (kg / lb)

- Preference in Settings; display converts live across the app.
- Historical workouts keep the unit they were saved with; editing with a different preferred unit **converts weights and confirms** before save: workout was logged in X, save in Y?
- Volume / PR math normalizes through kg internally.

### 4.5 Theme

- Light (default) or dark; applied before paint via inline script on `wt_theme`.
- Updates `theme-color` meta (`#5b43f3` light / `#111216` dark).
- Device-local; not restored from Drive (file backup JSON *can* restore theme if present).

### 4.6 Locale / formatting

- Dates and times use `en-IN` locale patterns (weekday/month names, 12-hour times with AM/PM).
- Weeks are **Monday-start**; week numbers are **ISO-8601**.

### 4.7 Sheet / modal system (canonical UX)

All overlays use the shared `#modal` host and floating **workout-entry-sheet** chrome:

| Kind | Dismiss | Handle | Typical examples |
|------|---------|--------|------------------|
| **Form** (`kind:"form"`) | Buttons + Escape only (no swipe, no backdrop) | Visible | Start/Edit wizard steps, library add/edit |
| **Confirm** (`kind:"confirm"`) | Continue / Cancel (+ Escape → Cancel path) | Visible | Deletes, overnight save, unit convert |
| **Swipe sheet** (`swipeDismiss:true`) | Swipe down from handle/header (≥72px), Escape | Visible | View Workout, About, pickers, filters Done sheets, Notifications, exercise history |
| **Locked** (`lockDismiss:true`) | Explicit buttons only; Escape blocked | Visible | Drive restore offer |

**Hard rules**

1. **No backdrop dismiss** — grey area is visual only (`tryDismissModal` is a no-op). Reason: accidental closes on phone.
2. **Navigation island stays undimmed** — dim everything else; nav remains usable chrome.
3. **Page scroll locked** while modal open; wheel/touch outside scrollable sheet regions prevented.
4. **Focus trap** + restore focus on close; Escape behaviour per kind above.
5. **Service worker reload deferred** while `workout-form-open` so an update does not wipe an open form.
6. Filter sheets: selection applies on **Done**, and also on **swipe / Escape** (must re-render list).
7. Wizard Escape on step 1 = Cancel; later steps use Back-equivalent paths where wired.
8. Escape ignored while native date/time inputs are focused (so closing the picker does not abandon the form).
9. Confirm Cancel often returns to the previous sheet (e.g. delete cancel → View Workout; backup restore cancel → Backup).

### 4.8 Collapsible rows

Shared `collapsibleCard` pattern:

- Used in **View Workout**, **Enter Workout Details** (set editor), **Exercise History** list.
- Default **collapsed**; chevron rotates; no lavender chevron pill.
- Independent per card.

### 4.9 Toasts

Transient messages (`notify`) for validation, success, and errors (≈2.8s). Not a substitute for Notifications bell.

### 4.10 Confirmations

Destructive and ambiguous actions use **“Are you sure?”** sheet with Continue / Cancel. Library rename/delete that would affect history uses `confirmHistoryUse` listing up to 8 workouts (+ “and N more”).

---

## 5. Feature catalogue

### 5.1 Home

**Purpose:** Daily launch pad. Visual reference for the rest of the app.

#### 5.1.1 Header

- Personalized greeting and subtitle.
- Bell opens **Notifications** sheet; unread styling when restore note, pending Drive save, or diverge notice exists.

#### 5.1.2 Hero card

- Always **Start Workout** (copy + CTA), whether or not today is logged.
- **Why:** Same-day hero Edit was a regression; Start must always open a **new draft**. Edit remains available from status / view flows.
- Hero art: `assets/workout-hero.png`.

#### 5.1.3 Today’s Status

Exactly **two** states (no “draft in progress” state — drafts are not persisted):

| State | Copy | Action |
|-------|------|--------|
| No workout yet | “Ready when you are.” | Start Workout |
| Workout completed | “Great job! You crushed it.” | View Workout |

**Why simplified:** After logging, duration/target were removed so completed and empty cards share the same structure.

#### 5.1.4 Weekly Activity

- Week chip (`#NN`) + date range; opens week picker sheet.
- Seven day buttons: workout check / rest minus / today empty mark.
- Legend: Workout / Rest / Today.
- Stats: workouts count, rest days (past days without workout), days remaining (0 outside current week semantics).
- **Horizontal swipe** on the week card (not on week-select / View full week): slides **only the day row**; header/stats stay fixed; ~250–300ms overlap motion; respects `prefers-reduced-motion`.
- Bounded by week picker range (≈±52 weeks from now, extended to earliest logged workout).
- “View full week” → Workouts tab (month calendar IA; naming kept intentionally).

Tap a day → Workouts tab with that day selected.

#### 5.1.5 Quick Progress

For the **selected week** (label “This Week” or range):

- Sets count  
- Volume in preferred unit  
- PRs this **calendar month** (first time a heavier kg-equivalent set is logged for an exercise)  
- Day Progress = consecutive workout streak ending today or yesterday  

Link to History.

---

### 5.2 Workouts (Monthly Activity)

**Purpose:** Calendar truth for what was logged when.

#### 5.2.1 Monthly Activity card

- Month chip `#MM` + month date range; month picker sheet.
- 6×7 grid from Monday of first week containing the 1st; out-of-month days faded.
- Same legend + stats pattern as weekly (rest = past days without workout in that month).
- **Horizontal swipe** changes month; **only the date grid animates**; shell/stats fixed; picker choice is instant (no swipe animation).
- Month range: ≈±12 months from now, extended to earliest logged month.

#### 5.2.2 Selected day section

| Case | UI |
|------|-----|
| No workout | Rest Day card (recovery copy); **no** Log CTA |
| Has workout(s) | Workout card(s): muscle title, full date, exercises / sets / duration → opens View Workout |

Selecting a day also syncs `selectedWeekStart` / Home week.

**Why Rest Day has no Log:** Logging other days is done via Start Workout + date field, not from Rest Day (product choice after audit debate).

#### 5.2.3 Workout card language

Shared across Workouts and History:

1. Muscle group title (`A + B` in **selection / entry order**)
2. Date line with calendar icon  
3. Metrics: exercises, sets, duration  

---

### 5.3 Start / Edit Workout wizard

Three sheets, same chrome for create and edit.

#### Step 1 — Basics (`renderWorkoutBasicsSheet`)

- Title: Start Workout / Edit Workout  
- Date (defaults to **today** on Start)  
- Start time (defaults to now on Start)  
- End time (optional until save; required to complete)  
- Multi-select muscle groups (live + grayed “gone” groups when editing historical data)  
- Hint: multiple muscle groups allowed  
- Actions: **Next: Select Exercises** / Cancel  

Validations on Next: ≥1 muscle; valid date; date not taken (except self when editing); start required; end ≠ start if both set.

Muscle / exercise pick order: **tap order** preserved (`idsInTapOrder`) so titles like “Chest + Legs” vs “Legs + Chest” stay meaningful.

#### Step 2 — Select Exercises

- Grouped by selected muscles; live exercises + grayed deleted-but-still-on-draft rows when editing.
- Next: Enter Weight & Reps / Back  

#### Step 3 — Enter Workout Details

- Collapsible per exercise; set rows: weight, reps; Add Set; remove set if >1 set.
- Complete Workout / Save Changes / Back  

**Save rules**

- End time required.  
- If end &lt; start → confirm overnight workout with computed duration.  
- Every set: weight ≥ 0 finite, reps integer ≥ 1.  
- Unit conversion confirm when editing across preferred unit change.  
- New workout → refresh + go Home; edit → refresh in place.  
- Triggers Drive auto-save path (`driveAfterWorkoutChange`).

**Cancel / Escape:** discards draft; drafts are **not** written to `activeWorkout` (legacy field stripped on migrate / Drive).

**Edit integrity:** Deleted library muscles/exercises remain selectable and grayed until unchecked; saving keeps stamped names/sets if left checked.

---

### 5.4 View Workout sheet

- Title = muscle label; subtitle = date · start–end · duration.  
- Export Excel control (top right).  
- Collapsible exercises with set lines (`W unit · N reps` in preferred unit).  
- Actions: Edit Workout / Delete Workout.  
- Swipe-dismissable; **no Done button** (swipe / Escape).  

**Delete:** moves to Recycle Bin (soft); confirms; Drive workout-change path.

**Export:** XLSX via in-app builder; share sheet when available, else download; AbortError on share = silent cancel (not failure toast). Filename from title + date.

---

### 5.5 Exercises (progress)

**Purpose:** Track lifts — separate from Library management.

#### List

- Search (name or muscle); iOS search inputs at 16px to avoid focus zoom.  
- Muscle chips (All + groups, alphabetical by group name).  
- Filter sheet: All / Logged / Never logged (Done + swipe/Escape apply).  
- Rows: name · latest heaviest-set weight (or —) · date / “No history”.  
- Includes **gone** exercises that still appear in workout history (grayed).  
- Sort: most recently logged first, then name.

#### Exercise history sheet

- List ↔ Graph toggle (icons).  
- List: progress ladder (`10 → 15 → 20 kg`) + collapsible sessions by date.  
- Graph: Day / Week / Month / Year buckets of **heaviest load per bucket**; horizontal scroll; dots labeled with weight; **0 plots as 0**, not “Bodyweight”.  
- Empty states when never logged / no sets.

---

### 5.6 Exercise Library (Settings)

**Purpose:** CRUD for muscle groups and exercises without changing Exercises progress UI.

- Search + muscle chips + filter (All groups / Hide empty groups).  
- Group cards: pencil only on group and exercise rows (**no row trash**).  
- Footer: Add Muscle Group / Add Exercise (sheet-style primary buttons above nav).  

#### Add / Edit Exercise

- Name + muscle select (placeholder option when blank).  
- Save; when editing: **Delete Exercise** between Save and Cancel.  
- Duplicate name in same group blocked.  
- Rename / move with history: confirm listing affected workouts; historical `name` / `muscleId` stamped so past sessions keep old group where intended.

#### Add / Edit Muscle Group

- Name field; Delete when editing.  
- Rename stamps `muscleNames` on workouts.  
- Delete moves group **and its exercises** into bin as one muscle package.

**Why delete in edit sheet:** Accidental deletes from list trash; delete belongs with edit (safer).

---

### 5.7 History

**Purpose:** Month-scoped training log + export.

- Month picker (shared month item generator).  
- Overview stats for selected month: workouts, volume (preferred unit · reps), distinct muscle groups.  
- Workout History list = **same month’s** cards (empty copy when none).  
- Header export → Excel for **that month** (`Workout-History-YYYY-MM.xlsx`).  

**Restore / Clear** resets selection month to current month where applicable.

---

### 5.8 Recycle Bin

**Purpose:** Soft-delete undo for 30 days because Drive overwrite is not “delete history,” and wiping site data would otherwise lose recovery.

| Item type | Stored as | Restore notes |
|-----------|-----------|---------------|
| Workout | Full copy + `deletedAt` + stamped `muscleNames` | Blocked if date already taken or id still live |
| Exercise | Copy + `muscleName` + `deletedAt` | Requires muscle group still live; name collision → `Name (Restored)` / `Restored N` |
| Muscle group | Group + nested exercise copies | Name collision → unique restored name; restores nested exercises |

- Search; chips All / Exercises / Muscle groups / Workouts (alpha chip order).  
- Filter sheet = sort: Newest / Oldest / Expiring soon.  
- Card: title, meta, age · days left; Restore / Delete forever.  
- Empty Recycle Bin (confirm).  
- Auto-purge entries older than 30 days on ensure/persist.  
- Bin contents are included in the **same Drive snapshot** (not a separate file).  

**Drive after bin change:** If live or binned workouts remain → workout sync path; else library-bin leftovers → library path; fully empty → diverge / Sync confirm (never silent empty wipe). Emptying bin with empty history must not leave Sync permanently stuck.

Settings placement: **above About, below Clear All Data**.

---

### 5.9 Settings (More)

| Row | Behaviour |
|-----|-----------|
| Exercise Library | Navigate to library screen |
| Theme | Light / Dark segment |
| Weight unit | kg / lb segment; refreshes all views |
| Google Drive | Connect / connected card (see §6) |
| Backup & Restore | Sheet: Export JSON / Choose file / Restore from Drive (enabled when connected + sync needed) |
| Clear All Data | Phone wipe only; Drive unchanged; confirm copy states this |
| Recycle Bin | Navigate |
| About | Version, build, user guide PDF link, support email |

#### Backup file format

```json
{
  "format": "workout-tracker-backup",
  "version": "<app VERSION>",
  "exportedAt": "<ISO>",
  "theme": "light|dark",
  "unit": "kg|lb",
  "state": { "muscles", "exercises", "workouts", "bin" }
}
```

Restore requires `isValidState`; confirms replacement; may restore theme/unit from file; then Drive post-restore handshake.

---

### 5.10 Notifications

Bell sheet lists zero or more of:

1. **Waiting to save** — offline / folder / retry detail → jumps to More.  
2. **Phone and Drive differ** → More.  
3. **Restore Drive backup** — after “Not now” on empty phone → reopens locked restore sheet.  

Empty state: “Save and Drive alerts show up here.” Swipe-dismissable.

---

### 5.11 PWA / updates

- `manifest.webmanifest`: standalone, icons, theme colors.  
- Service worker caches app shell with versioned `?v=` assets; **network-first** for HTML/CSS/JS (iOS Home Screen empty `destination` used to stick on stale cache).  
- On update: `SKIP_WAITING`; `controllerchange` reloads unless a form sheet is open (then reloads after close).  
- Visibility: refresh SW; if calendar date rolled over while backgrounded, `refreshAppViews`.  
- GitHub Pages path helpers for `/workout-tracker/` subfolder + root redirects.

---

## 6. Google Drive sync (detailed)

### 6.1 Why Drive exists

Owner preference: keep a copy off-phone without building a custom backend. Scope: `drive.file` + email (only files this app creates).

### 6.2 File layout

- Folder: **Workout Tracker**  
- File: **workout-tracker.json**  
- Format: `workout-tracker-drive` with `version`, `savedAt`, `deviceId`, `state` (muscles, exercises, workouts, bin).  
- App properties mirror `deviceId` / `savedAt`.  
- Theme/unit preferences are **not** in the snapshot.

### 6.3 Device identity

Each install has a stable `wt_device_id`. The last writer’s id is stored on the file. Policy distinguishes **same writer** vs **other writer**.

### 6.4 Policy actions (`drivePolicy`)

| Action | Meaning |
|--------|---------|
| `upload` | Push phone state to Drive |
| `idle` | Nothing to do (e.g. content hash equal) |
| `offer-restore` | Empty phone + remote has workouts → Restore / Not now |
| `need-confirm` | Other writer, declined restore, empty flush over remote history, etc. → diverge UI / Sync confirm |

**Empty flush (A/C):**

- **C:** History empty but Recycle still has workouts → may upload (empty history + bin).  
- **A:** Nothing recoverable left + remote still has workouts → **never silent upload**; Sync + confirm.

Library autosave is required product behaviour (“I am not skipping library auto save”) but still blocked when it would wipe another device’s workout history without confirm.

### 6.5 Triggers

| Event | Reason |
|-------|--------|
| Connect / boot | Handshake |
| Complete / delete workout | `auto` or `empty` |
| Library change | `library` |
| Manual Sync | `sync` → confirm when needed, else upload |
| Online / visibility while pending | `retry` |
| Force after confirm | `overwrite` |

### 6.6 UI states

- Disconnected card → Connect (optional paste client id if not baked in).  
- Connected: email, status line (last saved / waiting / differ / no workouts), Sync (disabled when clean), Disconnect, optional Restore.  
- Disconnect keeps Drive file.  
- Token expiry → reconnect toast; pending preserved when appropriate.

### 6.7 Restore flows

1. Empty phone connects → locked sheet Restore / Not now.  
2. Not now → notification + declined flag; later Sync may confirm overwrite.  
3. Backup & Restore → Restore from Drive when dirty/needed.  
4. All Drive restore entry points require `isValidState` (same integrity as file backup).

### 6.8 Multi-device mental model

No iPhone/Android branching — one policy for all devices:

- Phone is live; offline always works.  
- Owner device auto-uploads when policy allows.  
- Other device with local workouts never silent-uploads over remote.  
- Empty phone is offered restore, not upload.

---

## 7. Data model (product view)

```
state = {
  muscles:   [{ id, name }],
  exercises: [{ id, name, muscleId }],
  workouts:  [{
    id, date,                          // unique date
    muscles: [muscleId…],              // order = title order
    muscleNames: [string…],            // stamped labels for history
    startTime, endTime,                // "HH:MM"
    unit: "kg"|"lb",
    exercises: [{
      exerciseId, name?, muscleId?,
      unit?, sets: [{ weight, reps }]
    }],
    createdAt, updatedAt?
  }],
  bin: {
    workouts:  [workout + deletedAt],
    exercises: [exercise + deletedAt + muscleName?],
    muscles:   [{ id, name, exercises[], deletedAt }]
  }
}
```

**Historical identity rules**

- Live library names preferred when present.  
- Otherwise stamped workout `name` / `muscleNames` / bin names.  
- Fallback display: “Deleted exercise” / “Unknown”.  
- `historicalWorkoutExerciseMuscleId` keeps edit grouping sensible when groups were deleted or moved.

---

## 8. Validation rules (product + engineering)

From `isValidState` / wizard:

- Muscles/exercises unique ids; exercises reference live muscle ids.  
- Workouts unique ids **and** unique dates.  
- Date strings `YYYY-MM-DD` must be real calendar dates.  
- Sets: finite weight ≥ 0; integer reps ≥ 1; no empty weight/reps.  
- Units only `kg` / `lb`.

Invalid backups cannot restore.

---

## 9. Design system requirements

### 9.1 Typography roles (target)

| Role | Approx size | Use |
|------|-------------|-----|
| Hero | ~22 | Home hero |
| Screen title | ~20 | Page heads |
| Card title | ~16–17 | Section / workout titles |
| Form body | ~16 | Inputs, primary actions in forms |
| Supporting | ~13 | Descriptions, metrics labels |
| Meta | ~11–12 | Chips, legends |

Home hero scale is **not** forced onto forms. Form Next/Cancel stay readable (~16), not shrunk to Home meta.

### 9.2 Layout

- ~16px side gutters; sheet inset from edges; gap above sheet so Home peeks.  
- Shared card radius tokens; chips ~16px radius.  
- Flat spacing rhythm (often 8–12px) copied from View Workout into editors/library.  
- Empty states share icon + strong + hint language.

### 9.3 Motion

- Month/week swipe: content-only, overlapping slide, reduced-motion → instant.  
- Sheet swipe dismiss with transform feedback.  
- Collapsible chevron rotate.  
- Toast enter/exit.

### 9.4 Process constraints (from owner)

- No redesign of Home beyond agreed spacing.  
- No edits unless asked; discuss first on risky changes.  
- Prefer small live increments; phone validation over unsolicited automation.  
- Bump About `VERSION` / `BUILD`, asset `?v=`, and SW shell together on ship.

---

## 10. Screen-by-screen behaviour matrix

| Surface | Primary actions | Sheets opened |
|---------|-----------------|---------------|
| Home | Start, View, week nav, History link, bell | Start wizard, View, Notifications, week picker |
| Workouts | Month nav, select day, open workout | Month picker, View/Edit/Delete |
| Exercises | Search, filter, open history | Filter, history list/graph |
| History | Month pick, open workout, export | Month picker, View… |
| More | Prefs, Drive, backup, clear, about, library, bin | Many settings sheets |
| Library | Search/filter, edit, add | Add/edit muscle/exercise, confirms |
| Recycle | Search/filter/sort, restore, purge | Filter, confirms |

---

## 11. Error handling and edge cases

| Case | Behaviour |
|------|-----------|
| Persist fail | Error toast |
| Drive offline during save | Pending + Waiting notification; retry on online |
| Drive folder missing | Pending why=`folder` |
| OAuth fail | Error toast; URL cleaned |
| Overnight workout | Confirm duration |
| Same start/end | Block |
| Restore name clash | Unique `(Restored)` name; no merge |
| Restore exercise without muscle | “Restore the muscle group first.” |
| Share Excel cancel | No error toast |
| Future dates | Allowed (intentional) |
| Zero weight on graph | Plot `0` |
| Midnight while backgrounded | Refresh views on foreground |
| SW update mid-form | Defer reload |

---

## 12. Analytics / accounts / privacy

- No analytics SDK.  
- No product login; Google OAuth only for Drive.  
- Personal data stays on device + user’s Drive file.  
- Support contact in About: `support@workouttracker.app`.

---

## 13. Success metrics (personal product)

Not a SaaS funnel. Practical success:

1. Can log a full workout offline and see it after reload.  
2. Secondary phone can Restore without wiping primary Drive by accident.  
3. Deleted workout recoverable from Recycle within 30 days (including after Drive sync of bin).  
4. Type/spacing remain consistent after UI changes (Home as reference).  
5. PWA on iPhone receives updates without stuck stale cache.

---

## 14. Open / deferred work

| Item | Notes |
|------|-------|
| Merge restored duplicates | Future |
| Capacitor / native shells | Not now |
| Optional weekly named Drive snapshot | Offered; never approved |
| Further User Guide completeness | Iterate; version stamp for staleness |
| Quieter Drive follow-ups / save queue UX | Optional polish |
| Bodyweight semantics beyond `0` | Watch edge cases |

---

## 15. Appendix A — Why key decisions happened (chat-sourced)

| Decision | Rationale (paraphrased from owner/chats) |
|----------|------------------------------------------|
| Sheet not full-screen overlay | Feel like swipe-down panel with Home peeking; “like Cursor chat” |
| No backdrop dismiss | Accidental closes on phone |
| Swipe for light sheets; buttons for forms | Protect multi-step logging |
| Always Start Workout hero | Edit-on-logged was a regression; conflict on date is clearer |
| One workout per day | Simplifies calendar and status |
| Start date = today | Calendar selection must not hijack logging |
| Recycle Bin 30 days in Drive snapshot | Site data wipe would lose phone-only undo |
| Single Drive JSON | Simpler than 3 files; versions via Google |
| Library autosave to Drive | Explicitly required |
| Never silent empty upload | Protect last good cloud history |
| Delete in edit sheet | Safer than list trash |
| Collapsed exercise rows | Long sets dominate otherwise |
| Month/week content-only swipe | Whole-card swipe looked wrong |
| Progress → History rename | Matches usage |
| en-IN formatting | Owner locale |
| Discuss before large edits | Personal app; intentional micro-iteration |

---

## 16. Appendix B — Module map

| File | Responsibility |
|------|----------------|
| `index.html` | Shell, screens, nav, icons, SW bootstrap |
| `js/app.js` | Navigation, modal system, confirms, toasts, SW reload |
| `js/data.js` / `data-rules.js` | State, persistence, validation helpers |
| `js/home.js` | Home screen |
| `js/workouts.js` | Calendar, wizard, view/delete, week/month helpers |
| `js/exercises.js` | Exercises + Library |
| `js/progress.js` | History month + export |
| `js/recycle.js` | Soft delete / restore |
| `js/settings.js` | Theme, unit, backup, about, clear |
| `js/drive.js` / `drive-policy.js` / `drive-config.js` | OAuth + sync policy |
| `js/xlsx-export.js` | Excel builder + share/download |
| `sw.js` | App shell cache |
| `css/*` | Per-screen + shared styles |

---

## 17. Appendix C — Acceptance checklist (regression)

Use this when shipping behavioural changes:

- [ ] Start Workout always opens new draft dated today  
- [ ] Second workout same day blocked with clear toast  
- [ ] Forms not dismissible by backdrop or swipe  
- [ ] View / About / pickers / notifications swipe-dismiss without Done  
- [ ] Overnight end&lt;start confirms  
- [ ] Library delete only from edit sheet  
- [ ] History rename/delete confirms with workout list  
- [ ] Recycle restore collisions get unique names  
- [ ] Empty history does not silent-wipe Drive  
- [ ] Library edits attempt Drive save when connected  
- [ ] Theme/unit survive reload; Drive restore does not overwrite them  
- [ ] Month/week swipe animates grid/days only  
- [ ] Collapsibles default closed  
- [ ] Excel share cancel is silent  
- [ ] SW update does not reload mid-form  
- [ ] Version / asset query / SW shell bumped together  

---

*End of PRD. Keep this document updated when product decisions change; pair with `user-guide.pdf` for end-user visuals.*
