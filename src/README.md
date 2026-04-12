# `src/` — Frontend Source Files

This directory contains all frontend source files for **Catch** — an MLB
schedule and boxscore PWA with Chromecast casting support. Run `npm run dev`
from the project root to start the Vite dev server with hot reload.

## File Structure

```text
src/
├── index.html          # Main HTML entry point (Vite root)
├── main.ts             # TypeScript entry point (theme toggle, interactive behavior)
├── vite-env.d.ts       # Vite TypeScript type declarations
├── assets/
│   ├── styles.css      # Base stylesheet (CSS custom properties, responsive layout)
│   └── favicon.svg     # Placeholder favicon
└── README.md           # This file — documents structure and conventions
```

## Conventions

### HTML (`index.html`)

- **Semantic elements** — Use `<header>`, `<main>`, `<nav>`, `<section>`,
  `<footer>` instead of generic `<div>` elements.
- **Accessibility attributes** — Every page must include:
  - `lang` attribute on `<html>`
  - Viewport `<meta>` tag for responsive design
  - A **skip-to-content** link as the first focusable element
  - ARIA landmark roles (`banner`, `navigation`, `main`, `contentinfo`)
  - Descriptive `alt` text on all images
  - Proper heading hierarchy (one `<h1>`, then `<h2>`, `<h3>`, etc.)
- **Progressive enhancement** — Core content is accessible without JavaScript.

### CSS (`assets/styles.css`)

- **CSS custom properties** for all colors, fonts, and spacing values.
- **Light and dark themes** controlled via `[data-theme]` attribute on `<html>`.
- **WCAG 2.1 AA color contrast** — All text/background combinations meet the
  4.5:1 minimum ratio for normal text.
- **Mobile-first** — Base styles target small screens; use `@media` queries for
  larger breakpoints.
- **No frameworks** — Vanilla CSS only. Add preprocessors or frameworks as
  needed via an ADR.

### TypeScript (`main.ts`)

- **Vanilla TypeScript** — No framework dependencies (see ADR-002).
- **Strict mode** — TypeScript `strict` compiler option enabled.
- **Progressive enhancement** — The page works without JavaScript; scripts add
  interactive enhancements (e.g., dark mode toggle).
- **Accessibility** — Interactive elements include proper ARIA attributes and
  keyboard support.

## Accessibility Testing

### Browser DevTools (Quick Check)

1. Open `src/index.html` in Chrome, Firefox, or Edge.
2. Open DevTools → **Lighthouse** (Chrome) or **Accessibility** panel.
3. Run an accessibility audit and review the results.

### Keyboard Navigation Test

1. Press `Tab` to move through all interactive elements.
2. Verify the **skip-to-content** link appears on first `Tab` press.
3. Confirm all buttons and links are reachable and operable with
   `Enter` or `Space`.
4. Check that focus indicators are clearly visible.

### Color Contrast Verification

Use one of these tools to verify WCAG 2.1 AA compliance (4.5:1 for normal text,
3:1 for large text):

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser (desktop app)](https://www.tpgi.com/color-contrast-checker/)
- Chrome DevTools → Elements → Computed → contrast ratio display

### Screen Reader Testing

- **macOS**: VoiceOver (built in) — press `Cmd+F5` to toggle
- **Windows**: NVDA (free) — [download](https://www.nvda-project.org/)
- **Cross-platform**: Browser extensions like axe DevTools or WAVE

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [The A11Y Project Checklist](https://www.a11yproject.com/checklist/)
- [HTML5 Semantic Elements Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element)
