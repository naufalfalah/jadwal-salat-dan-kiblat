# Jadwal Salat & Kiblat

![CI](https://github.com/naufalfalah/jadwal-salat-dan-kiblat/actions/workflows/ci.yml/badge.svg)
![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-offline--first-5BB4E5?logo=googlechrome&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

> A zero-backend Progressive Web App that calculates Islamic prayer times from GPS coordinates and provides a real-time Qibla compass — works fully offline after the first load.

## Background

Prayer time apps typically rely on remote APIs, which breaks the experience when connectivity is poor — exactly when a Muslim on the move needs it most. This app was built to solve that: all five daily prayer times are computed on-device using astronomical algorithms, the Qibla direction is derived mathematically from the user's coordinates, and the entire app shell is precached by a Service Worker so it loads instantly with no network.

The target audience is Indonesian Muslims, so the default calculation method follows Kemenag RI (MoonsightingCommittee) and all UI copy is in Bahasa Indonesia.

## Tech Stack

**Vue 3 (Composition API)** — reactive primitives (`ref`, `computed`, `watch`) map cleanly onto time-sensitive domain logic like countdown timers and sensor data streams; Options API would require more boilerplate for the same reactivity surface.

**Vite 8** — native ESM dev server with sub-second HMR; Rollup-based production builds produce a lean app shell with no runtime bundler overhead.

**adhan-js** — battle-tested astronomical library that implements the equations used by major Islamic jurisprudence bodies (ISNA, MWL, Kemenag, Egyptian, Karachi); runs entirely in-browser with no network call for schedule data.

**Pinia** — lightweight store for user preferences (calculation method, madhab, notification toggle, saved location); chosen over Vuex for its first-class Composition API ergonomics and smaller bundle footprint.

**idb** — thin promise wrapper over the raw IndexedDB API; used to persist location and preferences so the app is fully functional on re-open without re-requesting geolocation.

**vite-plugin-pwa + Workbox** — `injectManifest` strategy generates the precache manifest at build time while allowing a hand-authored `sw.js` to handle push events and notification clicks — something the auto-generated SW cannot do.

**Tailwind CSS v4** — utility-first styling with the new Vite plugin integration; zero-config purging keeps the production CSS minimal.

**Nominatim (OpenStreetMap)** — free reverse geocoding for human-readable city names; chosen over Google Maps Geocoding API to avoid API keys and billing.

## Architecture Overview

The app is a single-page Vue application with no router — navigation is handled by a `ref`-driven tab switcher in `App.vue`. The architecture separates concerns into three layers:

- **Composables** (`src/composables/`) own all domain logic: `usePrayerTimes` computes the five daily prayers reactively, `useQibla` reads the device magnetometer and derives the Kaaba bearing, and `useNotification` schedules `setTimeout`-based alerts with a `visibilitychange` fallback for iOS timer freezing.
- **Pinia store** (`src/stores/settings.js`) acts as the bridge between the IndexedDB persistence layer and the reactive UI, exposing location and preferences as reactive refs that composables consume via `computed`.
- **Components** (`src/components/`) are strictly presentational — they receive props and emit events, with no business logic in `<script setup>`.

```
Browser
 └── App.vue  (tab router, wires composables → components)
      ├── usePrayerTimes  ──→ adhan-js  (all offline)
      ├── useQibla        ──→ DeviceOrientationEvent
      ├── useNotification ──→ SW registration.showNotification()
      └── useSettingsStore ─→ IndexedDB (idb)
```

The Service Worker (built from `src/sw.js` via Workbox `injectManifest`) precaches the entire app shell at install time and handles background push notifications independently of the page lifecycle.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/naufalfalah/jadwal-salat-dan-kiblat.git
cd jadwal-salat-dan-kiblat
npm install
```

### Development

```bash
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build to /dist
npm run preview    # Preview production build locally
```

### Linting & Formatting

```bash
npm run lint       # ESLint (Vue + JS flat config)
npm run lint:fix   # ESLint with auto-fix
npm run format     # Prettier
```

### Environment Variables

This project has no environment variables — by design. There is no backend, no API key, and no server-side configuration. Everything runs in the browser.

### Deployment

The app is a static build (`npm run build` → `/dist`) and deploys to any static host (Netlify, Vercel, Cloudflare Pages/Workers, GitHub Pages, etc.). It's currently live on Cloudflare Workers at [jadwal-salat-dan-kiblat.naufalfallah.workers.dev](https://jadwal-salat-dan-kiblat.naufalfallah.workers.dev).

`public/_headers` already configures the one thing that matters on whichever host you use: it serves `sw.js` with `Cache-Control: no-cache`, so browsers always fetch the latest Service Worker version and Workbox's `autoUpdate` registration can pick up new deploys immediately — otherwise a cached `sw.js` can pin a user to a stale app shell. The `_headers` file convention is read natively by Netlify and Cloudflare Pages/Workers; other static hosts need the equivalent header set through their own config.

## Key Technical Decisions

**Decision**: Use Workbox's `injectManifest` strategy instead of `generateSW`  
**Why**: The app needs to handle `push` and `notificationclick` events in the Service Worker for background notifications. The `generateSW` strategy produces a fully auto-generated SW with no escape hatch for custom event listeners. `injectManifest` lets Workbox inject the precache manifest into a hand-authored `src/sw.js`, giving full control over the SW lifecycle while still automating the asset fingerprinting.  
**Trade-off**: The `src/sw.js` must be manually maintained; any Workbox runtime caching recipes also need to be written by hand rather than declared in config.

---

**Decision**: Schedule prayer notifications with `setTimeout` (client-side) and recover missed timers on `visibilitychange`  
**Why**: Web Push requires a server to send push messages, which would break the zero-backend constraint. Instead, `useNotification` schedules one `setTimeout` per prayer at page load. The real problem is iOS: when a PWA is backgrounded, the browser freezes JavaScript timers. To compensate, a `visibilitychange` listener fires when the user returns to the app — it checks whether any prayer time fired within the last 15 minutes and shows an in-app alert if so, then reschedules the remaining timers for the day. This covers the common case of a user who opens their phone around prayer time.  
**Trade-off**: Notifications only fire if the app has been opened in the same day. Truly background push (even when the app is fully closed) is not possible without a push server. The iOS limitation is documented in the Settings UI.

---

**Decision**: Composables accept both raw values and `ref`s via `isRef` guards  
**Why**: `usePrayerTimes`, `useQibla`, and `useNotification` each check `isRef(input) ? input : ref(input)` for every parameter. This lets callers pass either a plain value or a reactive ref — the composable stays reactive either way. In `App.vue`, the location coordinates come from a Pinia store as `computed` refs, so the composable must accept refs to remain reactive to location changes without additional watcher boilerplate in the caller.  
**Trade-off**: Slightly more defensive code inside each composable, but it eliminates a class of "why didn't my prayer times update when location changed?" bugs.

---

**Decision**: Trigger `requestCompass()` from the tab-switch click event rather than on component mount  
**Why**: iOS 13+ requires `DeviceOrientationEvent.requestPermission()` to be called from within a user gesture handler — calling it in `onMounted` (outside a gesture) results in a silent rejection. By calling `requestCompass()` in `switchTab('kiblat')` (which fires directly from a button `@click`), the permission dialog appears reliably on first tap of the Kiblat tab.  
**Trade-off**: The compass only activates when the user explicitly navigates to the Kiblat tab; it cannot be pre-warmed in the background.

## Testing

```bash
npm run test       # Vitest — unit tests, runs once and exits
```

Unit tests cover the pure-math parts of the composables — currently `useQibla`'s great-circle bearing calculation, including its reactivity to changing coordinates. Anything touching the DOM, sensors, or the Service Worker lifecycle is validated manually instead:

- Manual device testing on Android (Chrome) and iOS (Safari)
- Lighthouse PWA audit (requires HTTPS deployment — run via Netlify/Vercel preview URL)
- Browser DevTools → Application → Service Workers for cache inspection
- DevTools → Network → Offline mode to verify the app shell loads without network

## License

MIT — see [LICENSE](./LICENSE).
