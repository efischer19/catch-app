# feat: Core Web Vitals optimization and Lighthouse performance audit

## What do you want to build?

Optimize catch-app's performance to meet Core Web Vitals thresholds and achieve
a Lighthouse performance score of 95+. This includes optimizing bundle size,
reducing render-blocking resources, implementing efficient caching, and adding
automated performance measurement in CI.

## Acceptance Criteria

- [ ] Lighthouse performance score ≥ 95 on all pages (measured with throttled 4G preset)
- [ ] Largest Contentful Paint (LCP) < 2.5 seconds
- [ ] Interaction to Next Paint (INP) < 200ms
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] First Contentful Paint (FCP) < 1.8 seconds
- [ ] Total JavaScript bundle size < 50 KB gzipped (initial load, excluding lazy-loaded chunks)
- [ ] No render-blocking CSS or JavaScript in the critical path
- [ ] Image assets (team logos, icons) are optimized: SVG or WebP format, proper sizing, lazy-loaded where below the fold
- [ ] A Lighthouse CI check runs on every PR and fails if scores drop below configured thresholds
- [ ] Performance budgets and measurements are documented in the README

## Implementation Notes

**⚡ PWA Performance Fanatic notes — this is the central performance ticket:**

- **Bundle analysis:** Use `rollup-plugin-visualizer` or
  `source-map-explorer` to identify unexpectedly large dependencies. The app
  should have very few runtime dependencies: a lightweight router (if any),
  the Cast SDK (loaded async from Google's CDN), and nothing else.
- **Code splitting:** The video player and Cast integration should be
  lazy-loaded chunks (loaded only when the user clicks "Watch"). The team
  selector, schedule, and slate views are the critical path.
- **Font optimization:** Use system fonts
  (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
  instead of web fonts. This eliminates font loading as a performance
  bottleneck entirely.
- **JSON fetch optimization:** Gold JSON files are small and cacheable. Use
  `<link rel="preconnect">` to the CloudFront domain. Consider
  `<link rel="prefetch">` for the `upcoming_games.json` on the landing page.
- **Image optimization:** If team logos are used, provide them as inline SVGs
  or a CSS sprite sheet, not individual image files. This eliminates
  per-image HTTP requests.

**Lighthouse CI setup:**

- Use `@lhci/cli` in the CI pipeline. Configure budgets in
  `lighthouserc.json`:

```json
{
  "assertions": {
    "categories:performance": ["error", {"minScore": 0.95}],
    "categories:accessibility": ["error", {"minScore": 0.90}],
    "categories:best-practices": ["error", {"minScore": 0.95}],
    "categories:pwa": ["error", {"minScore": 0.90}]
  }
}
```

**🤑 FinOps Miser notes:**

- Smaller bundles = less CDN bandwidth = lower hosting costs (already
  negligible, but good practice for principle).
- Fast load times reduce user abandonment — the real "cost" of poor
  performance is user churn.

**♿ Accessibility Coordinator notes:**

- Performance optimizations must not sacrifice accessibility. Lazy-loading
  should use proper `loading` attributes, not custom JavaScript that hides
  content from screen readers.
