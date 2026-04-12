---
title: "ADR-003: Service Worker Caching Strategy for Offline Reliability"
status: "Accepted"
date: "2026-04-12"
tags:
  - "pwa"
  - "caching"
  - "performance"
---

## Context

- **Problem:** Catch must remain usable on flaky or offline connections while
  avoiding excessive data transfer.
- **Constraints:** App shell assets should be instantly available after first
  install. Gold JSON should feel fast and still refresh in the background.
  Large video files (`.mp4`) must never be cached.

## Decision

We use a versioned service worker strategy with three request classes:

1. **App Shell (precache + cache-first):**
   - Precache core shell assets during `install` (HTML, CSS, manifest, icon,
     offline page).
   - Serve cached shell assets first, then network fallback.
   - Versioned cache names are used so old shell caches can be removed on
     `activate`.
2. **Gold JSON (stale-while-revalidate):**
   - Serve cached JSON immediately when present.
   - Fetch fresh JSON in the background and update cache.
   - If no cache and network fails, return a friendly offline JSON response.
3. **Media and other bypass paths (network-only):**
   - `.mp4` requests are always network-only and never cached.

For navigation requests with no cache and no network, return an accessible
offline page with the message: **"You're offline — check back when connected."**

## Consequences

- **Positive:** Fast repeat loads, resilient offline experience, reduced CDN
  requests for previously viewed schedules.
- **Negative:** Additional service worker logic and cache invalidation
  responsibilities.
