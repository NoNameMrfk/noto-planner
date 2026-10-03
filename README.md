# noto.

A calm, local-first personal planner and study companion.

**Live demo:** [https://nonamemrfk.github.io/noto-planner/](https://nonamemrfk.github.io/noto-planner/)

## What is noto.?

noto. is the workspace you open when you sit down to actually get your day done — not a Notion clone, not a SaaS dashboard, and not a pile of disconnected widgets.

It keeps **today’s tasks, schedule, lessons, focus, and notes** in one coherent place, with themes that feel intentional and data that never leaves your browser.

## Features

- **Today (living map)** — hub for tasks, schedule timeline, study streak, notes, habits, and progress
- **Tasks** — dated to-dos with categories, completion, undo
- **Calendar** — month view, events, and weekly lesson timetable
- **Lessons** — school timetable with homework → auto tasks
- **Notes** — rich-ish editor with search
- **Mood & streaks** — daily check-in and progress history
- **Focus** — Pomodoro timer, Spotify embed, study mode
- **Mini noto** — picture-in-picture / floating companion
- **Themes & UI styles** — nine color worlds × three shape languages
- **Command palette** — `⌘K` / `Ctrl+K`
- **Export / import** — JSON backups of all local data

## Tech stack

- Plain HTML, CSS, and JavaScript (no framework, no build step)
- `localStorage` for persistence
- Optional: Document Picture-in-Picture, canvas particles / space background

## Architecture

```
index.html          App shell
css/
  design-system.css Tokens, chrome, cursor, command palette
  layout.css        Sidebar, panels, forms, study, habits, calendar shell
  features.css      Lessons, notes, living map, modals
  themes.css        Color themes + responsive / mobile
js/
  01-core.js        Storage, undo, particles, cursor, theme apply
  02-timer-planner.js  Pomodoro, Today map, habits, progress widgets
  03-calendar-lessons.js  Calendar, lessons, Spotify
  04-notes-progress.js    Notes, events list, history
  05-mini-views.js        Mini noto, view switching
  06-listeners-cmd.js     Events, forms, command palette
  07-space-init.js        Deep-space canvas + boot
```

Scripts load in order and share one global scope (same as the original single-file app).

## Data

All planner data is stored under the key `orbit-study-planner-v11` in `localStorage`.

- Nothing is sent to a server.
- Use **Settings → Your data → Export backup** before clearing site data or switching browsers.
- Import merges validated arrays and never silently wipes unknown structure without confirmation.

## Running locally

```bash
# any static server
npx serve .
# or
python3 -m http.server 8080
```

Open the printed URL. Optional images (`leaf.png`, `petal.png`, `moon.png`) enhance theme atmospheres; missing files are removed automatically.

## Roadmap (realistic)

- Stronger Today → Focus handoff (start timer on a specific task)
- Optional ICS export for events
- PWA install / offline shell

## License

Personal / portfolio use. Adapt freely with credit appreciated.
