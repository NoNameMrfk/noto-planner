# noto. Planner

A warm, offline-first personal planner & study companion.

## Structure

```
noto-planner/
├── index.html          # App shell (HTML structure only)
├── css/
│   └── styles.css      # Design system, themes, components, layout
├── js/
│   └── app.js          # Application logic (data, views, features)
└── README.md
```

## Running locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Optional assets

Theme decorations reference these image files in the same directory as `index.html` (or adjust paths):

- `leaf.png`
- `petal.png`
- `moon.png`

They are optional — missing images are removed gracefully by the app.

## Features

- Planner & Study modes
- Living day map, tasks, calendar, timetable
- Pomodoro timer, habits, mood tracking, notes
- Themes, UI styles, particles, space background, custom cursor
- Command palette (`⌘K` / `Ctrl+K`), Mini noto (Picture-in-Picture)
- All data stored in `localStorage` (offline-first)

## Expanding later

- **CSS**: Section markers (`/* ========== ... ========== */`) make it easy to extract modules (e.g. `css/themes.css`, `css/calendar.css`).
- **JS**: Logical blocks are labeled (storage, calendar, lessons, notes, timer, map, command palette, space, mini-noto). Split into modules when ready and load them from `index.html` in order.
