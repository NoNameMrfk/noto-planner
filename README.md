# noto. Planner

A warm, offline-first personal planner & study companion.

## Structure

```
noto-planner/
├── index.html                 # App shell (HTML only)
├── css/
│   ├── design-system.css      # Tokens, UI styles, atmosphere, cursor, cmd palette
│   ├── layout.css             # Sidebar, main, panels, study, habits, calendar
│   ├── features.css           # Lessons, notes, dashboard, living map
│   └── themes.css             # Color themes + mobile styles
├── js/
│   ├── 01-core.js             # Storage, data, undo, particles, cursor
│   ├── 02-timer-planner.js    # Pomodoro, today map, habits
│   ├── 03-calendar-lessons.js # Spotify, study focus, calendar, lessons
│   ├── 04-notes-progress.js   # Todos, notes, events, progress
│   ├── 05-mini-views.js       # Mini noto (PiP), view switching
│   ├── 06-listeners-cmd.js    # Event listeners, command palette
│   └── 07-space-init.js       # Deep space background + init
└── README.md
```

Scripts load in order and share the same global scope (same as the original single file).

## Running locally

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open the URL in your browser.

## Optional assets

Theme decorations look for (same folder as `index.html`):

- `leaf.png`
- `petal.png`
- `moon.png`

Missing images are removed automatically.

## Features

- Planner & Study modes
- Living day map, tasks, calendar, timetable
- Pomodoro, habits, mood, notes
- Themes, UI styles, particles, space background, custom cursor
- Command palette (`⌘K` / `Ctrl+K`), Mini noto
- Data in `localStorage` (offline-first)

## Expanding later

- Add a new CSS file under `css/` and link it in `index.html`
- Add a new JS module under `js/` and include it **after** the modules it depends on
- Section comments inside each file mark logical blocks for further splits
