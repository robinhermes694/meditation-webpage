# Mindful — Daily Meditation

A browser-based meditation app with guided sessions, ambient soundscapes, breathing guidance, and synthesized voice narration.

## Standalone repo

This repo is intended to be standalone. Clone it anywhere, then open `index.html` from the repo root, or serve it with:

```bash
python3 -m http.server 8080
```

## Features

- Multiple meditation modes: Morning Calm, Focus, Sleep, Gratitude, Loving-Kindness, Deep Body Scan, SOS Calm, Open meditation
- Session lengths: 5 / 10 / 15 / 20 / 30 minutes
- Voice narration with voice selector and preview
- Breathing circle with adjustable pace: 5s / 7s / 8s per phase
- Interval bell support: Off / 1 / 3 / 5 / 10 minutes
- Ambient music/mixer tracks with volume control
- Mood check-in after sessions
- Session history with daily streak tracking and total minutes
- Dark mode with auto-detect and persistence
- Responsive layout

---

## Running locally

Serve this repo root and open `index.html`:

```bash
python3 -m http.server 8080
```

Then open the URL corresponding to this repo folder.

---

## File overview

| File | Description |
|------|-------------|
| `index.html` | App shell and UI markup |
| `app.js` | Session logic, audio mixer, history, streaks, voice ranking |
| `styles.css` | Theme, layout, dark mode |
| `PLAN.md` | Implementation status and milestones |
| `audio/` | Voice tracks by persona |
| `generate_mp3s.py` | MP3 generation helper |
| `gen_kokoro.py` | Kokoro TTS generation helper |
| `kokoro-models/` | Local model artifacts |

---

## Audio notes

- Generated/verified MP3s are stored under `audio/`.
- Some sessions also load royalty-free ambient tracks from musicscreen.org.
- The 310 MB Kokoro ONNX model is excluded from this repo because it exceeds GitHub's 100 MB file limit; see `.gitignore`.

---

## Status

Most planned phases are complete. Remaining deferred items:

- Post-session journaling
- Browser notification reminders
- 7-day intro course
- Optional ElevenLabs API integration

If you want, the next natural repo improvements are:
- add a GitHub Pages workflow
- add a generated thumbnail/preview screenshot
- add a `deploy/` or server config snippet
