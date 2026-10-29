# Product Requirements Document (PRD) — gymbro

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Product Name:** gymbro  
**Product Type:** Responsive, Local-First Web Application  
**Primary Tech Stack Target:** React / Vue / Svelte, Tailwind CSS, Dexie.js (IndexedDB wrapper)

---

## 1. Product Summary & Vision

### 1.1 Summary
**gymbro** is a minimalist, modern, local-first web application designed for lifters who already know their workout routines and want an efficient, distraction-free tool to record workouts, review historical performance, and observe progressive overload over time.

### 1.2 Vision Statement
Gym-goers do not need another AI bot prescribing generic workout plans or tracking calories. They need a fast, reliable, privacy-focused digital logbook that respects their established training habits, loads in milliseconds, works offline, and keeps their historical data safe in their browser.

### 1.3 Core Questions Answered
1. What exercises did I perform in my previous session?
2. How much weight and how many repetitions did I complete?
3. Am I improving my performance over time?
4. How consistent have my workouts been?
5. Can I quickly access my workout records from weeks or months ago?

---

## 2. Problem Statement & Target Users

### 2.1 Problem Statement
Existing workout applications often suffer from:
- Excessive setup friction and forced onboarding quizzes.
- AI features or algorithmically generated plans that override user preferences.
- Heavy cloud dependencies causing slowness or data loss in poor gym cellular conditions.
- Cluttered interfaces prioritizing social feeds, calorie counters, and ad upsells over quick set logging.
- Destructive updates where editing a routine template retroactively corrupts past workout logs.

### 2.2 Target Audience
- **Primary Persona: Experienced Lifter ("The Veteran")**  
  Follows a structured workout split (e.g., Push/Pull/Legs, Upper/Lower). Needs to track working weights, sets, and reps quickly between rest periods without typing exercise names from scratch every session.
- **Secondary Persona: Intermediate Gym-Goer ("The Consistent Lifter")**  
  Has established exercises and wants to ensure progressive overload (increasing load/reps over time).
- **Tertiary Persona: Beginner with a Trainer/Program ("The Student")**  
  Has a paper or PDF routine provided by a coach and needs a clean digital logbook to follow and record their actual sets.

---

## 3. Product Goals & Non-Goals

### 3.1 Product Goals
- **Zero-Friction Logging:** A user should be able to start an active workout session in 1 tap from the home screen.
- **Template Reusability:** Define routines once; instantiate them infinitely without re-entering exercise lists.
- **Historical Data Integrity:** Edits or deletions of routine templates or exercise library metadata MUST NEVER alter completed historical sessions.
- **100% Offline & Local First:** All data lives in local browser storage via IndexedDB. Zero mandatory network calls.
- **Bilingual Accessibility:** Full support for English and Bahasa Indonesia with seamless live switching.

### 3.2 Explicit Non-Goals (Out of Scope)
The following features are strictly prohibited from the product roadmap:
- ❌ Automatic workout plan generation or AI workout coaching.
- ❌ Prescribed daily workout schedules or recommended rest days.
- ❌ Nutrition, calorie, or macronutrient tracking (no food logs, no TDEE calculators).
- ❌ Physique scanning, body-photo analysis, or body fat estimations.
- ❌ Social features, user profiles on cloud servers, likes, comments, or public feeds.
- ❌ Mandatory user authentication (no sign-up, email verification, or passwords).
- ❌ Paid cloud subscriptions or mandatory external APIs.

---

## 4. MVP Scope vs. Future Enhancements

| Feature Area | In MVP Scope (v1.0) | Out of Scope / Post-MVP |
| :--- | :--- | :--- |
| **Onboarding** | Optional display name, unit preference (kg/lbs), optional initial body weight. Immediate access to app. | Multi-step fitness quizzes, body goal selectors. |
| **Routines** | Create, edit, rename, duplicate, archive, delete, custom exercise ordering, target sets/reps/weights/rest. | Routine sharing via URL/QR code. |
| **Logging** | Load routine into session, empty workout, add/remove sets/exercises, mark completed/skipped, rest timer, previous performance reference. | Automatic plate calculator, barcode scanning for equipment. |
| **Storage** | IndexedDB via Dexie.js, local backup JSON export/import. | Cloud sync, multi-device live sync, server backups. |
| **Progress** | Per-exercise load & volume trends, 1RM estimated trend, personal record badges, session comparisons. | Advanced statistical linear regressions, predictive fatigue scoring. |
| **Body Weight** | Optional manual log entry, simple line chart. | Smart scale Bluetooth integration, photo logs. |

---

## 5. Functional Requirements

### 5.1 Onboarding & Setup (`ONBD`)
- **`ONBD-001`**: The app shall present a streamlined welcome screen on first visit.
- **`ONBD-002`**: The app shall allow users to set an optional display name (default: "Lifter").
- **`ONBD-003`**: The app shall allow selecting preferred measurement unit: Kilograms (`kg`) [Default] or Pounds (`lbs`).
- **`ONBD-004`**: The app shall allow setting language: English (`en`) [Default] or Bahasa Indonesia (`id`).
- **`ONBD-005`**: The app shall permit immediate dismissal/skip of setup to enter the Home dashboard directly.

### 5.2 Personal Workout Routines (`ROUTINE`)
- **`ROUTINE-001`**: Users shall be able to create routines with a unique title (e.g., "Push Day") and optional description/notes.
- **`ROUTINE-002`**: Users shall be able to add exercises from the Exercise Library to a routine and define planned order.
- **`ROUTINE-003`**: For each exercise in a routine, users shall be able to define target sets, target reps (or rep range e.g., 8–12), optional target weight, and optional target rest time in seconds.
- **`ROUTINE-004`**: Users shall be able to duplicate an existing routine to create a new template.
- **`ROUTINE-005`**: Users shall be able to archive routines (soft delete) or permanently delete them with modal confirmation.
- **`ROUTINE-006`**: Users shall be able to assign optional target weekdays (e.g., Monday, Thursday) to routines purely for visual grouping/filtering on the dashboard. No scheduling alerts or penalties shall exist.
- **`ROUTINE-007`**: Modifying or deleting a routine SHALL NOT affect any previously completed workout sessions.

### 5.3 Workout Logging & Tracking (`LOG`)
- **`LOG-001`**: Users shall be able to start an active workout session from a saved routine or as an "Empty Workout".
- **`LOG-002`**: Starting a workout from a routine shall pre-populate exercise items and set counts as uncompleted input rows.
- **`LOG-003`**: The system shall pull the most recent completed performance (weight and reps) for each exercise and display it adjacent to active set inputs as a non-intrusive reference (`Previous: 50 kg × 10`).
- **`LOG-004`**: Prefilled or referenced values MUST NOT be auto-marked as completed. Sets are completed only when explicit user input occurs (e.g., tapping a checkbox/button).
- **`LOG-005`**: Users shall be able to dynamically add sets, delete sets, add new exercises, or reorder exercises during an active workout session.
- **`LOG-006`**: Users shall be able to record set types: `normal` [Default], `warmup`, `drop`, or `failure`.
- **`LOG-007`**: The system shall automatically persist active workout state to IndexedDB every 2 seconds or on any input change (Autosave).
- **`LOG-008`**: If a browser crashes, closes, or refreshes during an active session, the app shall detect the open session on relaunch and prompt the user to **Resume Workout** or **Discard Workout**.
- **`LOG-009`**: Active rest timer shall start automatically upon completing a set (if enabled in settings) or manually via a floating toggle, displaying a countdown toast/bar.
- **`LOG-010`**: Finishing a workout shall mark the session status as `completed`, record `finish_timestamp`, compute session duration, calculate total volume, evaluate personal records (PRs), and display a Workout Summary modal.
- **`LOG-011`**: Idempotency check: Tapping "Finish Workout" repeatedly or re-opening a completed session shall not create duplicate history entries.

### 5.4 Progressive Overload & Analytics (`PROG`)
- **`PROG-001`**: The system shall identify Personal Records (PRs) per exercise across three categories:
  - **Max Weight:** Highest weight successfully lifted for $\ge 1$ rep.
  - **Max Reps:** Highest repetition count achieved at a specific weight.
  - **Max Volume Single Set:** Highest calculated product ($weight \times reps$) in a single set.
  - **Estimated 1RM:** Highest calculated E1RM using Epley formula: $E1RM = w \times (1 + \frac{r}{30})$.
- **`PROG-002`**: Upon completing a workout session, the summary modal shall explicitly call out achieved PRs with badge indicators.
- **`PROG-003`**: The Progress tab shall provide visual charts (Line Chart) per exercise, allowing filtering by:
  - Estimated 1RM over time.
  - Max Weight over time.
  - Total Working Volume over time.
- **`PROG-004`**: Bodyweight exercises (e.g., Pull-ups, Push-ups) without added load shall calculate volume based purely on repetitions or added load delta.

### 5.5 Workout History (`HIST`)
- **`HIST-001`**: The History screen shall list completed workout sessions in reverse chronological order.
- **`HIST-002`**: Each card in the history list shall display: Workout Name, Date, Duration, Total Exercises, Total Completed Sets, Total Volume, and PR badges earned.
- **`HIST-003`**: Users shall be able to filter history by date range or search by workout name/exercise name.
- **`HIST-004`**: Tapping a historical workout opens the detailed session log showing exact weights, reps, set types, notes, and duration.
- **`HIST-005`**: Users shall be able to edit historical workout sets (e.g., correct a typo made during training). Saving updates shall trigger recalculation of exercise PRs and volume metrics.
- **`HIST-006`**: Users shall be able to delete a historical workout session with confirmation.

### 5.6 Exercise Library (`EXER`)
- **`EXER-001`**: The system shall ship with a pre-seeded library of at least 30 standard compound and isolation exercises across major muscle groups (Chest, Back, Legs, Shoulders, Arms, Core).
- **`EXER-002`**: Users shall be able to create custom exercises with name, primary muscle group, secondary muscle groups, equipment type (`barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `weighted_bodyweight`), and instructions.
- **`EXER-003`**: Built-in exercises cannot be deleted or renamed, but can be hidden/archived. Custom exercises can be fully edited or deleted (if unused in completed sessions) or archived (if used in completed sessions).

### 5.7 Optional Body-Weight Tracking (`BODY`)
- **`BODY-001`**: Body weight tracking shall be entirely optional, controlled by a toggle in Profile settings (Default: Disabled).
- **`BODY-002`**: When enabled, users can log daily body weight entries with date, weight value, and optional notes.
- **`BODY-003`**: Progress tab will render a Body Weight Trend line chart showing moving averages over 30/90/365 days.

### 5.8 Data Management, Backup & Local Storage (`DATA` / `BACKUP`)
- **`DATA-001`**: All application state shall reside within local browser IndexedDB storage using Dexie.js.
- **`BACKUP-001`**: Profile page shall provide an "Export Backup" feature generating a validated, formatted JSON file (`gymbro_backup_YYYYMMDD_HHMM.json`).
- **`BACKUP-002`**: Profile page shall provide an "Import Backup" feature accepting a `.json` file, performing schema validation, and rendering a preview modal (showing counts of routines, sessions, and logs to be imported).
- **`BACKUP-003`**: Import operations shall offer two modes:
  - **Merge:** Appends new records based on unique IDs; updates existing matching IDs if timestamp is newer.
  - **Overwrite / Replace:** Completely purges current local database and hydrates with file contents (requires double confirmation).
- **`BACKUP-004`**: Profile page shall provide a destructive "Clear All Data" action requiring explicit typing of "DELETE" in a modal dialog.

### 5.9 Localization & Internationalization (`I18N`)
- **`I18N-001`**: All static UI strings shall be driven by translation dictionaries for English (`en`) and Bahasa Indonesia (`id`).
- **`I18N-002`**: Switching language shall update the entire interface instantaneously without requiring a page reload.
- **`I18N-003`**: Dates, times, and decimal numbers shall format according to the active locale (`en-US` vs `id-ID`).

---

## 6. User Stories & Acceptance Criteria

### US-01: Quick Workout Execution
**As a** frequent lifter,  
**I want to** tap my saved "Leg Day" routine and immediately start logging my sets,  
**So that** I don't waste time setting up exercise lists while resting between sets.

#### Acceptance Criteria:
1. GIVEN I am on the Home dashboard, WHEN I tap "Start Leg Day", THEN an active session view opens in under 200ms.
2. GIVEN the session is opened, THEN all exercises, target set rows, and previous weights/reps for those exercises are clearly visible.
3. GIVEN I enter `100` kg and `10` reps on Set 1 and tap the checkmark button, THEN Set 1 status updates to completed, total volume counter increases, and the rest timer countdown starts.

### US-02: Routine Modification Isolation
**As a** user adjusting my training program,  
**I want to** delete an exercise from my "Pull Day" routine template,  
**So that** my future workouts don't include it, while my past workout records remain 100% accurate.

#### Acceptance Criteria:
1. GIVEN I edit my "Pull Day" routine and remove "Lat Pulldown", WHEN I tap "Save Routine", THEN the routine structure in IndexedDB updates.
2. WHEN I inspect historical sessions performed last week using "Pull Day", THEN "Lat Pulldown" and all its completed set data remain completely intact.

### US-03: Unexpected App Recovery
**As a** user in a gym with low memory on my phone,  
**I want my** active workout session saved automatically if my mobile browser refreshes,  
**So that** I never lose my logged weights and reps mid-workout.

#### Acceptance Criteria:
1. GIVEN I am in an active workout with 3 sets completed, WHEN I refresh the browser or force-close and reopen the app, THEN a full-screen banner appears: *"Unfinished Workout Detected"*.
2. WHEN I tap "Resume Workout", THEN all 3 completed sets and active elapsed time are completely restored.

---

## 7. Detailed User Flows

```
[ Flow A: First-Time User Onboarding ]
(Open Web App) ──> [ Detect DB / Profile ] ──> (Profile exists?)
                                                      │
                                   ┌──────────────────┴──────────────────┐
                                   ▼ (No)                                ▼ (Yes)
                   [ Welcome Screen / Setup Modal ]             [ Home Dashboard ]
                   ├─ Display Name (Optional)
                   ├─ Language (en/id)
                   ├─ Units (kg/lbs)
                   └─ Action: [ Get Started ]
                                   │
                                   ▼
                           [ Save Profile ]
                                   │
                                   ▼
                           [ Home Dashboard ]
```

```
[ Flow C: Routine-Based Workout Execution ]
[ Home / Workout Tab ] ──> Select Routine Card ──> Tap [ Start Routine ]
                                                           │
                                                           ▼
                                                [ Create Workout Session ]
                                                ├─ Snapshot Routine Name
                                                ├─ Hydrate Session Exercises
                                                └─ Fetch Previous Logs
                                                           │
                                                           ▼
                                                [ Active Workout Screen ]
                                                           │
                                         ┌─────────────────┴─────────────────┐
                                         ▼                                   ▼
                              [ Perform & Log Sets ]              [ Add / Remove Exercises ]
                                         │                                   │
                                         └─────────────────┬─────────────────┘
                                                           │
                                                           ▼
                                                 Tap [ Finish Workout ]
                                                           │
                                                           ▼
                                                [ Calculate PRs & Vol ]
                                                           │
                                                           ▼
                                                [ Save Session: Completed ]
                                                           │
                                                           ▼
                                                [ Summary Modal / View ]
```

---

## 8. Database Architecture & IndexedDB Schema

The application uses **IndexedDB** via **Dexie.js**. The database name is `gymbro_db`.

```
                        ┌──────────────────┐
                        │   UserProfile    │
                        ├──────────────────┤
                        │ id (PK)          │
                        │ display_name     │
                        │ preferred_unit   │
                        │ language         │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  AppSettings     │
                        └──────────────────┘

 ┌──────────────────┐                       ┌──────────────────┐
 │ UserRoutines     │ 1                   * │ RoutineExercises │
 ├──────────────────┤ ───────────────────── ├──────────────────┤
 │ id (PK)          │                       │ id (PK)          │
 │ name             │                       │ routine_id (FK)  │
 │ is_archived      │                       │ exercise_id (FK) │
 └──────────────────┘                       │ display_order    │
                                            └──────────────────┘

 ┌──────────────────┐                       ┌──────────────────┐
 │ WorkoutSessions  │ 1                   * │ SessionExercises │
 ├──────────────────┤ ───────────────────── ├──────────────────┤
 │ id (PK)          │                       │ id (PK)          │
 │ source_routine_id│                       │ session_id (FK)  │
 │ status           │                       │ exercise_id (FK) │
 │ start_timestamp  │                       │ exercise_snapshot│
 └──────────────────┘                       └──────────────────┘
                                                     │ 1
                                                     │
                                                     │ *
                                            ┌──────────────────┐
                                            │     SetLogs      │
                                            ├──────────────────┤
                                            │ id (PK)          │
                                            │ session_ex_id(FK)│
                                            │ set_number       │
                                            │ weight_kg        │
                                            │ reps             │
                                            │ is_completed     │
                                            └──────────────────┘
```

### 8.1 Object Stores & Index Declarations (Dexie Schema Syntax)

```javascript
// Database Version 1 Schema
db.version(1).stores({
  user_profile: 'id',
  app_settings: 'key',
  exercise_catalog: 'id, name, target_muscle, equipment, is_custom, is_archived',
  user_routines: 'id, name, is_archived, updated_at',
  routine_exercises: 'id, routine_id, exercise_id, [routine_id+display_order]',
  workout_sessions: 'id, source_routine_id, status, start_timestamp, finish_timestamp',
  session_exercises: 'id, session_id, exercise_id, [session_id+display_order]',
  set_logs: 'id, session_exercise_id, [session_exercise_id+set_number], is_completed',
  bodyweight_logs: 'id, timestamp'
});
```

### 8.2 Detailed Table Schemas

#### 1. `user_profile`
| Field | Type | Index/Key | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Primary Key | Fixed key: `'default_user'` |
| `display_name` | String | None | Optional name (e.g., "Alex") |
| `starting_weight_kg` | Number | None | Optional initial weight |
| `created_at` | Number | None | Unix timestamp (ms) |
| `updated_at` | Number | None | Unix timestamp (ms) |

#### 2. `app_settings`
| Field | Type | Index/Key | Description |
| :--- | :--- | :--- | :--- |
| `key` | String | Primary Key | Setting name (e.g., `'language'`, `'unit'`, `'theme'`) |
| `value` | Any | None | Setting value (`'en'` \| `'id'`, `'kg'` \| `'lbs'`) |

#### 3. `exercise_catalog`
| Field | Type | Index/Key | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Primary Key | UUID or slug (e.g., `'ex_bench_press'`) |
| `name` | String | Indexed | Name of exercise |
| `target_muscle` | String | Indexed | Primary muscle group (`chest`, `back`, etc.) |
| `secondary_muscles`| Array<String>| None | Secondary muscle groups |
| `equipment` | String | Indexed | `barbell` \| `dumbbell` \| `machine` \| `cable` \| `bodyweight` |
| `type` | String | None | `weight_reps` \| `bodyweight_reps` \| `assisted_weight` |
| `instructions` | String | None | Brief execution guide |
| `is_custom` | Boolean | Indexed | `true` if created by user; `false` if pre-seeded |
| `is_archived` | Boolean | Indexed | Soft deletion flag |

#### 4. `user_routines`
| Field | Type | Index/Key | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Primary Key | UUID |
| `name` | String | Indexed | Routine title (e.g., "Upper Body A") |
| `description` | String | None | Optional routine notes |
| `assigned_days` | Array<Number>| None | Days of week `[1, 3, 5]` (1=Monday) |
| `is_archived` | Boolean | Indexed | Soft deletion flag |
| `created_at` | Number | None | Timestamp (ms) |
| `updated_at` | Number | Indexed | Timestamp (ms) |

#### 5. `routine_exercises`
| Field | Type | Index/Key | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Primary Key | UUID |
| `routine_id` | String | Indexed | Foreign Key -> `user_routines.id` |
| `exercise_id` | String | Indexed | Foreign Key -> `exercise_catalog.id` |
| `display_order` | Number | Compound | Ordering sequence (0, 1, 2...) |
| `target_sets` | Number | None | Planned set count |
| `target_reps_min` | Number | None | Min target reps |
| `target_reps_max` | Number | None | Max target reps |
| `target_weight_kg` | Number | None | Optional target weight |
| `rest_seconds` | Number | None | Target rest duration |
| `notes` | String | None | Exercise-specific cues |

#### 6. `workout_sessions`
| Field | Type | Index/Key | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Primary Key | UUID |
| `source_routine_id`| String | Indexed | Nullable FK -> `user_routines.id` |
| `workout_name_snap`| String | None | Snapshot of routine name at session start |
| `status` | String | Indexed | `'in_progress'` \| `'completed'` \| `'discarded'` |
| `start_timestamp` | Number | Indexed | Unix timestamp (ms) |
| `finish_timestamp` | Number | Indexed | Unix timestamp (ms), null if in_progress |
| `duration_seconds` | Number | None | Derived or logged duration |
| `notes` | String | None | Overall workout notes |

#### 7. `session_exercises`
| Field | Type | Index/Key | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Primary Key | UUID |
| `session_id` | String | Indexed | Foreign Key -> `workout_sessions.id` |
| `exercise_id` | String | Indexed | Foreign Key -> `exercise_catalog.id` |
| `exercise_name_snap`| String| None | Immutable snapshot of exercise name |
| `equipment_snap` | String | None | Immutable snapshot of equipment type |
| `display_order` | Number | Compound | Ordering sequence |
| `notes` | String | None | Session-specific exercise notes |

#### 8. `set_logs`
| Field | Type | Index/Key | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Primary Key | UUID |
| `session_exercise_id`| String| Indexed | Foreign Key -> `session_exercises.id` |
| `set_number` | Number | Compound | Set sequence (1, 2, 3...) |
| `set_type` | String | None | `'normal'` \| `'warmup'` \| `'drop'` \| `'failure'` |
| `weight_kg` | Number | None | Weight logged in kg |
| `reps` | Number | None | Repetitions completed |
| `is_completed` | Boolean | Indexed | Completion toggle state |
| `completed_at` | Number | None | Unix timestamp (ms) |

#### 9. `bodyweight_logs`
| Field | Type | Index/Key | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Primary Key | UUID |
| `weight_kg` | Number | None | Measured body weight |
| `timestamp` | Number | Indexed | Unix timestamp (ms) |
| `notes` | String | None | Optional note (e.g., "Fasted morning") |

---

## 9. Data Integrity & Historical Snapshotting Strategy

To satisfy the core mandate that routine/exercise edits never corrupt historical records, gymbro implements **Snapshot Pattern Architecture**:

1. **Session Isolation:**
   When a workout session is initialized from a routine, the system reads `user_routines` and `routine_exercises`, creates a new `workout_sessions` record, and populates `session_exercises` with deep copies of exercise metadata (`exercise_name_snap`, `equipment_snap`).
2. **Immutable Snapshots:**
   Even if the user later renames "Bench Press" to "Barbell Flat Bench" in `exercise_catalog`, past `session_exercises` retain `exercise_name_snap = 'Bench Press'`.
3. **Foreign Key Resilience:**
   `session_exercises.exercise_id` remains linked to `exercise_catalog.id` solely for analytical aggregation (e.g., computing progress charts over time). If a custom exercise is deleted, the system marks `is_archived = true` instead of physically deleting the database row if linked to any `session_exercises`.

---

## 10. Query & Index Optimization Strategy

| Query Requirement | Implementation Pattern | Target Execution Time |
| :--- | :--- | :--- |
| **Fetch Previous Performance for Exercise** | Query `session_exercises` by `exercise_id` JOIN `workout_sessions` where `status == 'completed'`, ordered by `finish_timestamp DESC`, limit 1. | $< 15 \text{ ms}$ |
| **Active Session Auto-Recovery** | Query `workout_sessions` where `status == 'in_progress'`, limit 1. | $< 5 \text{ ms}$ |
| **Render Progress Chart (1 Year)** | Query `session_exercises` by `exercise_id` -> map `id`s to `set_logs` where `is_completed == true`. | $< 35 \text{ ms}$ |
| **History Infinite Scroll Page (20 items)**| Query `workout_sessions` ordered by `start_timestamp DESC`, offset/limit pagination. | $< 10 \text{ ms}$ |

---

## 11. Backup, Restore & Schema Migration Specification

### 11.1 JSON Schema Backup Format (`v1`)

```json
{
  "version": 1,
  "exported_at": 1776612000000,
  "app": "gymbro",
  "data": {
    "user_profile": { ... },
    "app_settings": [ ... ],
    "exercise_catalog": [ ... ],
    "user_routines": [ ... ],
    "routine_exercises": [ ... ],
    "workout_sessions": [ ... ],
    "session_exercises": [ ... ],
    "set_logs": [ ... ],
    "bodyweight_logs": [ ... ]
  }
}
```

### 11.2 Restore Validation Rules
1. **File Type Check:** Extension must be `.json` and valid JSON object.
2. **Header Check:** Object must contain `"app": "gymbro"` and valid integer `"version"`.
3. **Transaction Safety:** Import operations MUST run inside a single Dexie transaction across all object stores (`db.transaction('rw', db.tables, async () => { ... })`). If validation fails mid-way, the transaction rolls back automatically, leaving existing database untouched.

---

## 12. Localization & i18n Strategy

- Storage Key: `app_settings` where `key = 'language'`, value = `'en'` | `'id'`.
- Dynamic Translation Dictionary Structure:
  ```json
  {
    "common": {
      "cancel": { "en": "Cancel", "id": "Batal" },
      "save": { "en": "Save", "id": "Simpan" },
      "delete": { "en": "Delete", "id": "Hapus" }
    },
    "workout": {
      "start_routine": { "en": "Start Routine", "id": "Mulai Rutin" },
      "finish_workout": { "en": "Finish Workout", "id": "Selesai Latihan" },
      "previous_perf": { "en": "Previous", "id": "Sebelumnya" }
    }
  }
  ```

---

## 13. Quality Assurance & Testable Acceptance Matrix

| Category | Requirement ID | Test Method | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Data Integrity** | `DATA-001` | Delete Routine template | Past sessions created from routine still render in History with full details. |
| **Autosave** | `LOG-007` | Kill browser mid-session | Reopening web app shows "Resume Workout" prompt with exact set states. |
| **Localization** | `I18N-002` | Switch language to ID | Profile, Workout buttons, and History cards immediately re-render in Indonesian. |
| **Progress** | `PROG-001` | Log heavier weight than past | Personal Record badge appears on set and on workout completion summary. |
| **Backup** | `BACKUP-001`| Export JSON -> Clear Data -> Import JSON | App restores 100% of routines, history, sets, and profile preferences. |
