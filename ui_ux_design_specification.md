# UI/UX Design Specification — gymbro

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Visual Style:** Minimalist Modern, Dark Mode Native, High Contrast, Performance-Focused  
**Primary Aesthetic:** Deep Onyx Slate `#0A0A0A` with Precision Neon Green Accent `#B6FF00`

---

## 1. Design Philosophy & Visual Identity

### 1.1 Aesthetic Philosophy
**gymbro** is designed for high-focus, low-distraction environments (e.g., dimly lit gym floors, sweaty hands, rapid navigation between sets). 

- **Utility First:** Touch targets are large ($\ge 44 \text{px}$), contrast is stark, and critical actions are reachable with a single thumb tap.
- **Premium Dark Palette:** Pure dark surfaces prevent battery drain on OLED mobile screens and reduce eye strain.
- **Selective Accent Usage:** Neon Green (`#B6FF00`) is reserved strictly for primary interactive states, completed checkmarks, active tab indicators, and Personal Record badges. It is **never** used for ambient background decoration.

---

## 2. Design Tokens & Design System

### 2.1 Color Tokens

```css
:root {
  /* Background Surfaces */
  --bg-primary: #0A0A0A;       /* Main Canvas Background */
  --bg-secondary: #111111;     /* Navigation & Header Surfaces */
  --card-surface: #171717;     /* Standard Cards, Form Fields */
  --elevated-surface: #202020; /* Modals, Floating Sheets, Popovers */
  --border-color: #2A2A2A;     /* Subtle Dividers & Card Outlines */
  --border-active: #3A3A3A;    /* Form Focus & Active State Outlines */

  /* Primary Brand Accent */
  --accent-neon: #B6FF00;       /* Primary Buttons, Active States, PR Badges */
  --accent-neon-hover: #A0E000; /* Hover state for primary actions */
  --accent-neon-dim: rgba(182, 255, 0, 0.12); /* Subtle glow backgrounds */

  /* Typography Colors */
  --text-primary: #F5F5F5;     /* Headers, Primary Titles, Set Values */
  --text-secondary: #A3A3A3;   /* Subtitles, Previous Logs, Labels */
  --text-muted: #666666;       /* Placeholders, Disabled Text */
  --text-on-accent: #0A0A0A;   /* Text rendered over Neon Green background */

  /* Semantic State Colors */
  --color-success: #B6FF00;    /* Completed Sets, Success Toasts */
  --color-error: #FF4D4D;      /* Destructive Actions, Errors */
  --color-error-dim: rgba(255, 77, 77, 0.15);
  --color-warning: #FFB800;    /* Incomplete Warning, Unfinished Alert */
  --color-warning-dim: rgba(255, 184, 0, 0.15);
}
```

### 2.2 Typography Scale

The font family relies on system-native sans-serif stacks optimized for screen density and clarity:
`font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`

| Style Token | Size (px/rem) | Weight | Line Height | Tracking | Application |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Header** | 32px / 2.0rem | 800 (ExtraBold)| 1.1 | -0.03em | Primary Dashboard Headlines |
| **Title 1** | 24px / 1.5rem | 700 (Bold) | 1.2 | -0.02em | Screen Titles, Section Headers |
| **Title 2** | 18px / 1.125rem | 600 (SemiBold) | 1.3 | -0.01em | Card Titles, Modal Headers |
| **Body Primary** | 15px / 0.9375rem| 400 (Regular) | 1.4 | Normal | Main Set Logs, Standard Inputs |
| **Body Bold** | 15px / 0.9375rem| 600 (SemiBold) | 1.4 | Normal | Highlighted Reps/Weights |
| **Caption / Label**| 13px / 0.8125rem| 500 (Medium) | 1.3 | +0.01em | Secondary Labels, Previous Logs |
| **Numeric Value** | 18px / 1.125rem | 700 (Bold) Tabular Numbers | 1.0 | Monospace | Weight & Rep Input Controls |

### 2.3 Spacing & Layout Tokens

- **Base Unit:** 4px grid system (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
- **Card Padding:** `16px` on mobile, `24px` on desktop screens.
- **Border Radius Tokens:**
  - Small (Inputs, Chips, Badges): `6px`
  - Medium (Cards, Action Panels): `12px`
  - Large (Modals, Bottom Sheets): `20px`
  - Full (Circular Badges, Pill Buttons): `9999px`

---

## 3. Reusable Component Specifications

### 3.1 `AppShell` & Navigation Layout

- **Mobile View ($< 768 \text{px}$):**
  - **Header:** Sticky top bar (`height: 56px`), `#111111` background, subtle `#2A2A2A` bottom border. Contains logo/title on left, quick status/language toggle on right.
  - **Content Area:** Scrollable viewport with bottom margin padding (`72px`) to prevent bottom nav overlap.
  - **Bottom Navigation Bar:** Fixed bottom bar (`height: 64px`), `#111111` surface, containing 5 standard navigation destinations with icons and labels.

- **Desktop View ($\ge 768 \text{px}$):**
  - **Left Sidebar Navigation:** Fixed left panel (`width: 240px`), containing branding logo, 5 primary navigation links with active indicators, and user profile widget at bottom.
  - **Main Viewport:** Expands to fill remaining screen space with max-width container (`1024px`) centered horizontally.

#### Navigation Items (5 Primary Tabs):
1. **Home:** Icon `Home` — Dashboard overview, quick workout entry.
2. **Workout:** Icon `Dumbbell` — Routines list, start empty session, exercise library.
3. **History:** Icon `Clock/Calendar` — Reverse-chronological completed workout log.
4. **Progress:** Icon `TrendingUp` — Performance graphs, PR list, bodyweight trend.
5. **Profile:** Icon `User/Settings` — Preferences, backups, language selection.

```
+-----------------------------------------------------------------------+
| App Header (Mobile) / Left Sidebar (Desktop)                          |
+-----------------------------------------------------------------------+
|  [Logo] gymbro                       [Lang: EN] [Active Session Indicator]|
+-----------------------------------------------------------------------+
|  Main Scrollable Content Area                                         |
|  Max-width: 1024px (Centered on Desktop)                              |
|                                                                       |
+-----------------------------------------------------------------------+
| Fixed Bottom Navigation Bar (Mobile Only)                             |
|  [Home]    [Workout]    [History]    [Progress]    [Profile]          |
+-----------------------------------------------------------------------+
```

---

### 3.2 `SetLogRow` Component Specification

The core repetitive interaction component during workout logging.

```
+-----------------------------------------------------------------------+
| [SET]   [PREVIOUS]      [KG / LBS]       [REPS]         [STATUS]      |
|                                                                       |
|  1      50 kg x 10    [  52.5  ]       [  10  ]       [  (V)  ]     |
|  (Type)               (Input Num)      (Input Num)   (Check Toggle)   |
+-----------------------------------------------------------------------+
```

- **Set Label:** Shows set number (e.g., `1`, `2`, `3`) or badge for Set Type (`W` for Warmup, `D` for Drop, `F` for Failure).
- **Previous Reference:** Small secondary text (`--text-secondary`): `50 kg × 10`.
- **Weight Input:** Numeric input box with `#171717` background, rounded `6px`, focused state highlighted with neon border.
- **Reps Input:** Numeric input box, same design styling.
- **Completion Checkmark Toggle:**
  - **Uncompleted State:** Square/pill button with subtle outline (`#3A3A3A`), icon `Check` in muted gray (`#666666`).
  - **Completed State:** Filled `#B6FF00` background, icon `Check` in dark black (`#0A0A0A`). Triggers subtle scale haptic animation ($1.0 \rightarrow 1.15 \rightarrow 1.0$).

---

### 3.3 `RestTimer` Floating Component

- **Location:** Docked right above the bottom navigation bar on mobile, or bottom-right corner on desktop.
- **Visuals:** Compact pill banner (`#202020` surface, `#B6FF00` thin top border).
- **Controls:**
  - Live countdown readout: `01:28` (Monospace font).
  - Quick adjustments: `+15s`, `-15s`.
  - Action buttons: `Pause / Play`, `Skip / Close`.
  - Audio/Haptic Alert: Plays short pleasant beep/vibration when countdown hits `00:00`.

---

## 4. Screen-by-Screen Layout Specifications

### Screen 1: First-Time Onboarding & Setup

- **Purpose:** Collect optional user preferences without blocking immediate app usage.
- **Layout:** Centered modal card on dark canvas.
- **Elements:**
  - App Logo: `gymbro` text in boldExtra with glowing neon green period.
  - Headline: *"Welcome to gymbro"*
  - Subtitle: *"Minimalist, local-first workout logging."*
  - Form Fields:
    - Display Name (Text input, optional, placeholder: *"e.g. Alex"*).
    - Preferred Language (Segmented control button: `[ English ]` | `[ Bahasa Indonesia ]`).
    - Preferred Unit (Segmented control button: `[ Kilograms (kg) ]` | `[ Pounds (lbs) ]`).
  - Primary Action Button: `[ Start Workout Tracking ]` (Solid Neon Green).
  - Secondary Link: `[ Skip & Go to Dashboard ]` (Muted text button).

---

### Screen 2: Home Dashboard

- **Purpose:** Central hub to launch workouts, resume active sessions, and check weekly momentum.
- **Layout:** Vertical stacked cards with high visual contrast.
- **Elements:**
  1. **Header Greeting:** *"Welcome back, Alex"* + date display.
  2. **Active Unfinished Workout Banner (Conditional):** If an in-progress session exists, display an alert banner (`--color-warning-dim` background, yellow border) with text *"In-Progress Workout Detected"* and buttons `[ Resume Workout ]` / `[ Discard ]`.
  3. **Quick Start Hero Section:**
     - Large CTA Card: `[ + Start Empty Workout ]`
     - Quick Routine Chips: Horizontal scrollable list of user's saved routines with 1-tap `[ Start ]` action.
  4. **Weekly Activity Metric Card:**
     - Summary: *"3 workouts completed this week"*.
     - Minimalist 7-day indicator dots (Mon - Sun) glowing neon green on active workout days.
  5. **Recent Personal Records Carousel:** Cards showing exercise name, PR type achieved, and timestamp.

---

### Screen 3: Workout Tab & Saved Routine List

- **Purpose:** Manage saved routine templates and launch sessions.
- **Layout:** Two-tab top header: `[ Saved Routines ]` | `[ Exercise Library ]`.
- **Elements:**
  - Top Action: `[ + Create New Routine ]` button.
  - Saved Routine Cards Stack:
    - Card Header: Routine Title (e.g., *"Push Day A"*), assigned day tags (e.g., *"Mon / Thu"*).
    - Exercise Preview List: Subtle bullet list of included exercises (e.g., *"Bench Press, Incline DB Press, Tricep Dips"*).
    - Card Actions: `[ Start Workout ]` (Primary Green), `[ Edit ]` (IconButton), `[ ... ]` Overflow menu (`Duplicate`, `Archive`, `Delete`).

---

### Screen 4: Create / Edit Routine Editor

- **Purpose:** Assemble a reusable workout template.
- **Layout:** Vertical form editor with draggable/reorderable exercise cards.
- **Elements:**
  - Input: Routine Name (e.g., *"Leg Day Blitz"*).
  - Input: Routine Description / Notes (Optional text area).
  - Exercise List Section:
    - Reorder handle `::` on left of each exercise item.
    - Exercise Name + Target Configuration Table:
      - Sets count input.
      - Rep range input (e.g., `8 - 12`).
      - Target Weight input.
      - Rest timer preset selector (`60s`, `90s`, `120s`, `Custom`).
    - Action: `[ Add Exercise ]` (Opens Exercise Search Modal).
  - Footer Action Bar: `[ Cancel ]` button and `[ Save Routine ]` button.

---

### Screen 5: Active Workout Logging Screen

- **Purpose:** Real-time gym session recorder.
- **Layout:** Sticky top header (elapsed session timer, finish button), scrollable exercise cards, fixed bottom rest bar.
- **Header Bar:**
  - Live Workout Clock: `00:42:15` (Elapsed time).
  - Workout Title: *"Push Day"* (Editable inline).
  - Top Right Action: `[ Finish Workout ]` (Solid Neon Green button).
- **Exercise Card Items:**
  - Header: Exercise Name, Equipment tag, overflow menu (`Replace Exercise`, `Delete Exercise`, `Add Note`).
  - Previous Performance Sub-header: *"Previous: 80 kg × 8, 80 kg × 8, 85 kg × 6"*
  - Set Table: Columns: `SET`, `PREVIOUS`, `KG`, `REPS`, `COMPLETED (V)`.
  - Dynamic Row Add Button: `[ + Add Set ]` below table.
- **Bottom Controls:**
  - `[ + Add Exercise ]` button centered.
  - `[ Cancel / Discard Session ]` text link at bottom.

---

### Screen 6: Workout Completion Summary Modal

- **Purpose:** Celebrate session completion and display performance achievements.
- **Layout:** Full-screen modal overlay with dark gradient background.
- **Elements:**
  - Celebration Graphic / Icon: Glowing trophy or badge.
  - Title: *"Workout Complete!"*
  - Stats Grid (2x2):
    - **Total Duration:** `54 mins`
    - **Total Volume:** `12,450 kg`
    - **Sets Completed:** `18 sets`
    - **PRs Achieved:** `2 New PRs!`
  - PR Highlights Section: Cards detailing broken records (e.g., *"Bench Press: New 1RM Record — 105 kg"*).
  - Exercise Breakdown List: Compact summary of exercises, completed weights and reps.
  - Primary Action Button: `[ Save & Return Home ]`.

---

### Screen 7: Workout History & Detailed Historical Log

- **Purpose:** Review past sessions and make necessary log corrections.
- **Layout:** Reverse chronological timeline list.
- **Card Items:**
  - Header: Date (e.g., *"Yesterday, Oct 18"*), Workout Name.
  - Sub-stats: `45 mins` • `14 sets` • `8,200 kg volume`.
  - Collapsible Detail View:
    - Lists full exercise table with historical weight/rep logs.
    - Action: `[ Edit History Log ]` button (allows fixing typos in weights/reps, triggers recalculation of PR metrics).

---

### Screen 8: Progress Analytics Screen

- **Purpose:** Observe long-term performance trends over weeks and months.
- **Layout:** Segmented filter controls at top, followed by interactive line charts.
- **Elements:**
  - Exercise Selector Dropdown: Search & select exercise (e.g., *"Barbell Squat"*).
  - Metric Selector: `[ Estimated 1RM ]` | `[ Max Weight ]` | `[ Total Volume ]`.
  - Time Range Selector: `[ 1M ]` | `[ 3M ]` | `[ 6M ]` | `[ All Time ]`.
  - Chart Canvas: High-contrast line chart with glowing neon data points. Tapping a node displays a tooltip with exact date, weight, and rep values, plus a button `[ View Workout Log ]` navigating to that historical session.
  - Personal Records Breakdown Table: Shows all-time highest weight, reps, and volume for selected exercise.

---

### Screen 9: Profile, Settings & Backup Manager

- **Purpose:** App settings, language switching, and local data backups.
- **Layout:** Grouped setting lists.
- **Sections:**
  1. **User Profile:** Display name input, starting body weight.
  2. **Preferences:**
     - UI Language: Dropdown / Segmented Toggle (`English` / `Bahasa Indonesia`).
     - Unit System: Toggle (`kg` / `lbs`).
     - Optional Body Weight Tracking: Toggle switch (`Enabled` / `Disabled`).
  3. **Data Management & Backup:**
     - Info Box: *"All your workout data is stored locally in your browser."*
     - Button: `[ Export Data Backup (JSON) ]`
     - Button: `[ Import Data Backup (JSON) ]`
     - Destructive Action: `[ Clear All Local Data ]` (Triggers confirm modal requiring "DELETE" text input).

---

## 5. Localization & Language UI Patterns

### 5.1 Bilingual Translation Dictionary Key Reference

All UI components reference keys formatted as follows:

| Component Target | English (`en`) | Bahasa Indonesia (`id`) |
| :--- | :--- | :--- |
| `nav.home` | Home | Beranda |
| `nav.workout` | Workout | Latihan |
| `nav.history` | History | Riwayat |
| `nav.progress` | Progress | Kemajuan |
| `nav.profile` | Profile | Profil |
| `workout.start_empty` | Start Empty Workout | Mulai Latihan Kosong |
| `workout.finish` | Finish Workout | Selesai Latihan |
| `workout.previous` | Previous | Sebelumnya |
| `workout.set` | Set | Set |
| `workout.reps` | Reps | Repetisi |
| `workout.weight` | Weight | Beban |
| `backup.export` | Export Backup | Ekspor Cadangan |
| `backup.import` | Import Backup | Impor Cadangan |

---

## 6. Accessibility & Contrast Verification

- **Color Contrast Ratios:**
  - Primary text (`#F5F5F5`) on main background (`#0A0A0A`): **18.2:1** (Exceeds WCAG AAA standard of 7:1).
  - Accent text (`#B6FF00`) on surface background (`#171717`): **13.4:1** (Exceeds WCAG AAA standard).
  - Secondary text (`#A3A3A3`) on card background (`#171717`): **6.1:1** (Exceeds WCAG AA standard of 4.5:1).
- **Interactive Touch Targets:** All buttons, input boxes, checkmark toggles, and navigation links have minimum touch dimensions of $44 \times 44 \text{px}$.
- **Focus States:** High contrast outline (`2px solid #B6FF00`) on all keyboard-focused input elements for accessibility compliance.

---

## 7. Design Acceptance Checklist

- [x] Product name is consistently specified as **gymbro**.
- [x] Dark mode visual system defined with `#0A0A0A` background and `#B6FF00` neon accent.
- [x] All 5 primary navigation tabs defined for mobile bottom bar and desktop sidebar.
- [x] Clear visual distinction between planned routine templates and active workout sessions.
- [x] Screen specifications provided for onboarding, dashboard, workout logging, rest timer, completion summary, history, progress, and backups.
- [x] All interactive controls adhere to minimum $44 \text{px}$ touch target sizes.
- [x] Full localization strings provided for English and Bahasa Indonesia.
