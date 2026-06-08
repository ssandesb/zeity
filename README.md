# Zeity — Habit Switcher & Time Tracker

Zeity is a habit switcher and time tracker built around the idea of a **"Type of Day"**.
Instead of one rigid schedule, you keep a folder for each kind of day you have
(Deep Work, Creative Day, Rest & Recharge, Gym & Grind, Social Day, Admin & Errands).
Open a folder to reveal that day's schedule, keep-list (to-dos) and streaks.

Built with **Vite + React** and **lucide-react** icons, with a macOS-inspired UI and an
animated folder open/peek interaction.

## Features

- **Day Type folders** — macOS-style folders with a peeking note and an opening front-flap animation on hover.
- **Daily schedule** — a time-block timeline you can check off block by block.
- **Keep List** — to-do checklist with live progress bar; add new tasks inline.
- **Streak system** — current streak, best streak and a last-7-days completion strip per day type.
- **Weekly plan** — switch the type of day across the week at a glance.
- **Responsive** — polished desktop layout plus a mobile layout with slide-in sidebar.

> All data is dummy/in-memory for now (see `src/data.js`). Toggles and added tasks
> persist for the current session.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build

## Project structure

```
src/
  App.jsx              # app shell, state, "My Days" page
  data.js              # dummy day types, schedules, todos, streaks
  icons.js             # lucide icon resolver
  index.css            # design system + folder animation
  components/
    Sidebar.jsx        # macOS-style navigation
    Folder.jsx         # animated day-type folder
    DayView.jsx        # opened folder: hero, schedule, keep list, streaks
```
