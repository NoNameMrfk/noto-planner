# noto. Planner

A modular split of the original single-file HTML application.

## Structure

```
noto-planner/
├── index.html          # Main HTML structure
├── css/
│   └── styles.css      # All styles (design system, themes, components)
├── js/
│   └── app.js          # Application logic (state, rendering, interactions)
└── README.md
```

## How to run

Open `index.html` in a browser (or serve the folder with any static server):

```bash
# Example with Python
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or simply open the file:

```bash
open index.html   # macOS
xdg-open index.html  # Linux
```

All data is stored in `localStorage` under the key `orbit-study-planner-v11`.

## Notes

- Decorative images referenced in the HTML (`leaf.png`, etc.) are optional; the app works without them.
- The original was a single monolithic HTML file; this split keeps the exact same behavior while improving maintainability.
