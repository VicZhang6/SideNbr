# Performance & Keep-Alive Research — SideNbr (Chrome MV3 Side Panel)

**Date:** 2026-07-31  
**Scope:** Local React shell + third-party AI iframes (Perplexity, ChatGPT; planned: DeepSeek, Grok)  
**Constraints:** No reading iframe DOM; Store-safe privacy/CSP posture; reload only on explicit refresh

---

## 1. Current lifecycle analysis

### Spec goal (already intended)

| Behavior | Spec | Current code |
|----------|------|--------------|
| Lazy first mount | Mount iframe only when user first selects provider | ✅ `mounted` Set; bootstrap mounts only saved `active` |
| Keep-alive on switch | Do not destroy inactive iframes | ✅ CSS hide; React `key={id}` stable on list |
| Reload only on explicit refresh | Remount/reload iframe only via toolbar refresh | ✅ `reloadToken` bumps → iframe remounts |

### How it works today

**`src/App.tsx`**

- `mounted: Set<ProviderId>` — grows monotonically (never removes on switch).
- Bootstrap: `setMounted(new Set([provider]))` for last-used provider only.
- `selectProvider(id)`:
  - Always `setActive(id)`.
  - Adds `id` to `mounted` only if missing; returns **same Set reference** if already present → avoids unnecessary list churn.
  - If `id ∈ loaded` → `loading=false` immediately (instant switch UX); else shows loading until `onLoad`.
- List render:

```tsx
{mountedList.map((id) => (
  <ProviderFrame
    key={id}                    // stable parent key — good
    provider={PROVIDERS[id]}
    active={id === active}
    reloadToken={reloadToken[id] ?? 0}
    onLoad={() => handleFrameLoad(id)}
  />
))}
```

**`src/components/ProviderFrame.tsx`**

```tsx
<iframe
  key={`${provider.id}-${reloadToken}`}  // remount ONLY when reloadToken changes
  className={active ? "provider-frame is-active" : "provider-frame"}
  src={provider.embedUrl}
  loading="eager"
  onLoad={onLoad}
  // no sandbox; no contentDocument access
/>
```

**`src/styles.css`**

```css
.provider-frame { display: none; /* … absolute fill … */ }
.provider-frame.is-active { display: block; }
```

### Does switch already preserve iframes?

**Yes — by design and in normal React reconciliation.**

- Parent list `key={id}` does not change on switch.
- Only `active` → className toggles `is-active`.
- Inactive frames stay in the React tree and in the DOM; `display: none` does **not** unload the nested browsing context in Chromium desktop (JS/network/session inside the iframe continue, subject to background throttling).
- Switching A → B → A does **not** re-hit first-load cost if A stayed mounted and loaded.

### Remount / reload risks (bugs & footguns)

| Risk | Severity | Notes |
|------|----------|--------|
| `reloadToken` on **iframe** `key` | Intentional | Correct place for explicit refresh. **Do not** move this key to the outer `ProviderFrame` list item in a way that also depends on unrelated state. |
| `reloadToken` on **parent** `key` | Avoid | Would remount whole component + iframe; same effect if only on iframe, but parent key must stay `id` only. Currently OK. |
| Unstable `provider` object identity | Low | `PROVIDERS` is a module constant — fine. Don’t rebuild configs each render. |
| `mountedList = Array.from(mounted)` order | Low | Insertion order; keys stable. No remount from reorder alone. |
| React StrictMode (dev) | Dev-only | Double mount/unmount can load iframes twice in development. Production single mount. |
| `handleFrameLoad` early-return if already loaded | OK | After `reloadCurrent` removes id from `loaded`, next `onLoad` re-adds. |
| Closing Side Panel | Product | Chrome typically **destroys** the side panel document when the panel is closed → all iframes gone; next open = full cold path for shell + lazy remount of last active. Keep-alive is **within an open panel session**, not across panel close. |
| Extension SW suspend | Low for panel | SW cold start can delay first open (panel open path / `setPanelBehavior`); once `sidepanel.html` is up, iframe keep-alive is independent of SW. |

### Verdict

Keep-alive **already works** for in-session provider switching. Primary gaps are **first-load latency** (DNS/TLS/SPA of third parties), **hide strategy quality** (faster re-paint / a11y), **optional warm-up**, and **memory policy** when scaling to 4 heavy SPAs — not a missing “mounted Set” architecture.

---

## 2. Multi-iframe keep-alive best practices

Goal: switch without destroying nested documents; minimize paint/focus cost; avoid accidental interaction with hidden frames.

### Comparison

| Technique | Nested document kept? | Parent render cost when hidden | Re-show cost | Focus / a11y | Recommendation for this project |
|-----------|----------------------|--------------------------------|--------------|--------------|----------------------------------|
| **`display: none`** (current) | Yes (Chromium) | Element out of render tree | May rebuild parent paint for iframe box; nested SPA usually still warm | No hit-testing | **Acceptable baseline**; already used |
| **`visibility: hidden` + `pointer-events: none`** (+ absolute fill) | Yes | Keeps box/render state more readily | Often cheaper toggle for “tab” UIs | Still in a11y tree unless `aria-hidden` / `inert` | **Preferred upgrade** for inactive frames |
| **`content-visibility: hidden`** (wrapper or iframe) | Yes (element not skipped out of existence) | Skips rendering contents; **preserves rendering state** for faster unhide ([web.dev / MDN](https://web.dev/articles/content-visibility)) | Better than `display:none` for re-show of heavy content | Skipped contents not focusable/find-in-page | **Good P1 experiment** on `.provider-frame` inactive state |
| **Offscreen / `translate` + opacity 0** | Yes | Still may composite | Fast; risk of GPU memory for multiple layers | Need `inert` / `aria-hidden` | Optional; watch memory with 4 SPAs |
| **Unmount React node** | No — full reload on reselect | Zero for that provider | Full SPA load | N/A | Only for **low-memory mode** / LRU eviction |
| **`loading="lazy"` while hidden** | Delays first load | — | First select pays full load | — | Use only for **idle warm-up candidates**, not for active frame |

### Practical recipe (recommended)

1. **Never unmount** on switch (keep `mounted` Set).
2. Stack all frames `position: absolute; inset: 0` (already done).
3. Inactive:

   ```css
   .provider-frame {
     position: absolute;
     inset: 0;
     width: 100%;
     height: 100%;
     border: 0;
     /* keep-alive hide: prefer over display:none when testing re-show jank */
     visibility: hidden;
     pointer-events: none;
     /* optional: content-visibility: hidden; contain: strict; */
   }
   .provider-frame.is-active {
     visibility: visible;
     pointer-events: auto;
     /* content-visibility: visible; */
     z-index: 1;
   }
   ```

4. Set `inert` (and/or `aria-hidden={!active}`) on inactive iframes so keyboard/assistive tech cannot tab into a hidden ChatGPT/Perplexity UI.
5. **Do not** rely on `display:none` vs `visibility` to “pause” third-party timers — Chromium still runs iframe JS with throttling; only **unmount** or navigates away truly frees most memory.

### Why not only `content-visibility: auto`?

`auto` is for off-screen **in-document** content (long pages). Side-panel frames are intentionally full-size and stacked; use explicit `hidden` / `visible` tied to `active`, not scroll-based auto.

---

## 3. Load-speed techniques (privacy-safe; no iframe DOM read)

All items below only touch the **extension page** (shell) or **declarative** browser hints. No `contentDocument`, no injected content scripts into providers, no chat scraping.

### 3.1 `preconnect` / `dns-prefetch` in `sidepanel.html`

**Current:** `sidepanel.html` has no resource hints — first iframe pays full DNS + TCP + TLS before HTML.

**Do (P0):**

```html
<head>
  <!-- Critical: last-used / default provider origin(s) -->
  <link rel="preconnect" href="https://www.perplexity.ai" crossorigin />
  <link rel="preconnect" href="https://chatgpt.com" crossorigin />
  <!-- Secondary: APIs/CDNs often used by those SPAs (tune via Network panel) -->
  <link rel="dns-prefetch" href="https://openai.com" />
  <!-- When DeepSeek / Grok are added: preconnect only top 1–2 active origins; dns-prefetch the rest -->
</head>
```

- `preconnect`: DNS + TCP + TLS early (~100–500 ms savings possible on cold path per [web.dev](https://web.dev/articles/preconnect-and-dns-prefetch)).
- Cap preconnects (~2–4); extra origins → `dns-prefetch` only.
- Align origins with real `embedUrl` hosts (`providers.ts`: `https://www.perplexity.ai`, `https://chatgpt.com`).
- Optional: inject hints **dynamically** from `PROVIDERS` at build time so new AIs stay in sync.

**Privacy:** Hints only open connections to origins the user is about to embed anyway; no content inspection. Prefer preconnect for the **default/last-active** provider if you want to avoid warming unused vendors.

### 3.2 Lazy first mount vs idle warm-up

| Strategy | Behavior | Tradeoff |
|----------|----------|----------|
| **Lazy (current)** | Mount iframe on first select | Best memory; second provider always cold once |
| **Idle warm-up (P1)** | After active `onLoad`, `requestIdleCallback` / `setTimeout` mount **one** next provider | Faster first switch; +memory +background network |
| **Mount all on open** | All providers at panel open | Worst memory/network; not recommended for 4 SPAs |

**Recommended warm-up policy:**

```text
on active frame load:
  if user setting allowWarmup !== false:
    schedule idle (timeout ~2–4s, requestIdleCallback if available):
      mount at most ONE additional provider (e.g. the other of two, or last-used-2)
      never mount all four proactively
```

- Warm-up iframes: can use `loading="lazy"` only if you still force mount into DOM with dimensions; for absolute stacked frames, **`loading="eager"` once mounted** is clearer — control cost via **whether** you mount, not the attribute alone.
- Cancel warm-up if panel hidden / user already switched to that id / low-memory mode.

### 3.3 `loading="eager"` vs `lazy`

- **Active / user-selected frame:** `loading="eager"` (current) — correct.
- **Not-yet-mounted:** cheapest “lazy” is **not rendering the iframe at all** (current `mounted` Set) — better than `loading="lazy"` on a present iframe.
- Don’t set `lazy` on the only visible frame; it can delay first paint of the AI UI.

### 3.4 Reducing React remounts

Already good; codify as rules:

1. List item `key={providerId}` only — **never** `key={\`${id}-${reloadToken}\`}` on the list.
2. Keep `reloadToken` key **only** on the `<iframe>` (or set `iframe.src = src` / `contentWindow.location.reload()` equivalent without reading DOM — assigning `src` via React state is fine).
3. Stable `PROVIDERS` config; avoid inline `provider={{...}}` object literals.
4. `setMounted` return previous Set when unchanged (already done).
5. Avoid resetting `mounted` on settings open/close, online/offline, or overlay toggles.
6. Production build without StrictMode double-mount noise for perf tests (`main.tsx` currently wraps `StrictMode` — fine for correctness; measure perf in production build).

### 3.5 Service Worker tip

- Extension SW (`background.ts`) configures side panel + optional private DNR; it **cannot usefully cache third-party AI HTML/JS** for embed:
  - Cross-origin opaque/cache partitioning.
  - SPAs are huge, versioned, cookie/session sensitive.
  - Caching their documents in the extension risks staleness and store/privacy review issues.
- **Do not** add a shell SW just to precache ChatGPT/Perplexity.
- Optional: precache **only** extension assets (`sidepanel.html`, JS/CSS, icons) if you introduce an extension page SW later — marginal vs Chrome’s own extension resource loading.
- Private build’s `browsingData` clear of provider SWs is a **compat** hammer, not a speed feature (can even slow next load).

### 3.6 Chrome Side Panel cold start

Layered costs when user opens the panel:

1. **MV3 service worker wake** (if suspended) — can add tens–hundreds of ms before extension APIs respond.
2. **Load `sidepanel.html` + React bundle** — keep shell tiny (already lean: local UI only).
3. **`chrome.storage` read** for last provider — already async bootstrap; avoid blocking first paint more than necessary (can paint chrome/toolbar first, then mount iframe — soft improvement).
4. **Third-party SPA** in iframe — dominates wall clock; shell optimizations cannot beat provider TTFB/JS parse.

Mitigations:

- `openPanelOnActionClick: true` (already) — no extra round-trip message required for common open path.
- Minimize work in `bootstrap()` on SW start (DNR install is private-build only; keep store-safe path light).
- Resource hints (3.1) + lazy single iframe (current) = best ROI.
- Accept: **closing the panel drops keep-alive**; document this in UX (“切换免重载；关闭侧栏后需重新加载”).

### 3.7 Other safe shell wins

- Code-split is unnecessary if shell stays small; don’t pull heavy icon packs into critical path beyond what you use.
- Fonts: system UI fonts (current CSS approach) — good.
- `referrerPolicy="strict-origin-when-cross-origin"` — keep (privacy + fine for load).
- Host permissions already allow cookie jar behavior for embeds; don’t broaden to `<all_urls>` for “speed”.

---

## 4. Memory tradeoffs (up to 4 heavy SPAs)

| Mounted frames | Expected impact (order of magnitude) | UX |
|----------------|--------------------------------------|-----|
| 1 | Baseline | First other provider always cold |
| 2 | Noticeable RAM (+hundreds of MB possible) | Instant switch between the pair |
| 3–4 | High risk on 8 GB machines; background timers/WebSockets multiply | Instant switch matrix; thermal/battery cost |

**Facts of life:**

- Each of ChatGPT / Perplexity / DeepSeek / Grok is a full client router + model UI + websockets.
- Hidden ≠ unloaded. Keep-alive **trades RAM for time**.
- Chrome may discard renderer under memory pressure — rare, but users can still see a “reload” if the process dies.

**Policy recommendations:**

1. Default: **lazy mount + keep forever within panel session** (current) for ≤2 providers — OK.
2. At 3–4 providers: add **settings**:
   - `keepaliveMode: "all" | "lru-2" | "active-only"`
   - **LRU-2:** keep active + one previous; unmount oldest → frees memory, next visit reloads.
3. Optional: idle **timeout unmount** (e.g. hidden > 30–60 min) for non-active frames.
4. Expose rough guidance in Settings: “保留多个 AI 会占用更多内存”.
5. Never mount four at panel open by default.

---

## 5. Concrete recommended changes (this repo)

### P0 — High value, low risk

| # | Change | Files | Why |
|---|--------|-------|-----|
| P0.1 | Add `preconnect` / `dns-prefetch` for current embed origins | `sidepanel.html` (or build inject) | Cuts cold connection setup before iframe navigation |
| P0.2 | Keep architecture: `mounted` Set + stable `key={id}` + `reloadToken` only on iframe | `App.tsx`, `ProviderFrame.tsx` | Already correct — **do not regress** when adding providers |
| P0.3 | Document for contributors: switch must not clear `mounted`; refresh is the only remount path | this doc / CONTRIBUTING | Prevent future footguns |
| P0.4 | When adding DeepSeek/Grok: extend CSP `frame-src` + host_permissions + hints together | `manifest`, `providers.ts`, html | Avoid broken/slow first embeds |

### P1 — Switch quality & second-provider latency

| # | Change | Files | Why |
|---|--------|-------|-----|
| P1.1 | Prefer `visibility`/`content-visibility` hide over `display:none`; add `inert` + `aria-hidden={!active}` | `styles.css`, `ProviderFrame.tsx` | Faster re-show; a11y; fewer focus leaks |
| P1.2 | Idle warm-up of **one** secondary provider after first `onLoad` (setting-gated) | `App.tsx`, `storage.ts`, Settings UI | Makes first A→B switch feel keep-alive |
| P1.3 | Measure: Performance panel + Chrome Task Manager RAM with 1 vs 2 vs 4 frames | manual QA | Baseline before shipping warm-up defaults |
| P1.4 | Optional: paint toolbar immediately; mount iframe after `bootstrapped` (already mostly true) | `App.tsx` | Perceived shell speed |

### P2 — Scale to 4 AIs / power users

| # | Change | Files | Why |
|---|--------|-------|-----|
| P2.1 | `keepaliveMode` + LRU unmount | `App.tsx`, settings, storage | Memory safety |
| P2.2 | Per-provider origin list for hints generated from `PROVIDERS` | build or small util | Maintainability |
| P2.3 | Telemetry-free local counters (optional dev flag): time-to-onLoad per provider | dev-only | Tune SLOW_LOAD_MS (12s) and warm-up delay |
| P2.4 | Consider `iframe.src` reload via state URL cache-bust instead of React `key` | `ProviderFrame` | Equivalent; key approach is already fine |

### Tiny example (doc only — not applied)

```tsx
// ProviderFrame: keep-alive friendly hide + explicit reload key on iframe only
export function ProviderFrame({ provider, active, reloadToken, onLoad }: Props) {
  return (
    <iframe
      key={`${provider.id}-${reloadToken}`}
      className={active ? "provider-frame is-active" : "provider-frame"}
      title={provider.label}
      src={provider.embedUrl}
      allow={provider.allow}
      referrerPolicy="strict-origin-when-cross-origin"
      loading="eager"
      // @ts-expect-error inert is valid in modern Chromium
      inert={active ? undefined : true}
      aria-hidden={active ? undefined : true}
      onLoad={onLoad}
    />
  );
}
```

```html
<!-- sidepanel.html head: connection warm-up -->
<link rel="preconnect" href="https://www.perplexity.ai" crossorigin />
<link rel="preconnect" href="https://chatgpt.com" crossorigin />
<link rel="dns-prefetch" href="https://openai.com" />
```

---

## 6. What NOT to do

| Anti-pattern | Why |
|--------------|-----|
| **Inject scripts / CSS into provider iframes** | Cross-origin blocked; privacy violation; ToS / store risk; brittle |
| **Read `iframe.contentDocument` / scrape chats** | CORS; violates product privacy promise (`PRIVACY.md`) |
| **Strip CSP / XFO via DNR in Store-safe build “for speed”** | Not a load-speed fix; review rejection risk; private-only compat path must stay separate |
| **Broaden CSP `script-src` or use remote side panel page** | MV3 forbids remote code; `side_panel.default_path` must be extension-local |
| **Extension SW cache of third-party AI documents** | Ineffective/stale/session-wrong; privacy optics bad |
| **`sandbox` attribute “to improve security/perf” without testing** | Breaks auth, storage, payments, clipboard, mic on real AI sites |
| **Mount all 4 iframes on panel open** | Memory bomb; hurts cold start |
| **Use `reloadToken` (or `Date.now()`) as React `key` on the mapped parent** | Accidental full remount storms |
| **Clear `mounted` on every `active` change** | Destroys keep-alive — classic regression |
| **Background tabs / hidden workers to “pre-login” providers via scraping** | Permission bloat; policy risk |
| **Keep SW alive with 20s alarms solely for panel perf** | Discouraged MV3 pattern; doesn’t keep iframes alive when panel closed |
| **Promise “no reload after closing side panel”** | Panel document teardown is browser-owned |

---

## 7. Summary

1. **Keep-alive on switch is already implemented** via `mounted` + CSS hide + stable keys; explicit refresh is the only intentional remount path (`reloadToken` on the iframe).
2. **Biggest real latency** is third-party SPA cold load and **panel open cold start**, not React switch logic.
3. **Highest ROI next steps:** resource hints (P0), better inactive CSS + `inert` (P1), optional single-provider idle warm-up (P1), LRU/memory mode when 4 AIs ship (P2).
4. Stay inside privacy bounds: shell-only optimizations; no iframe DOM access; no Store-safe header stripping for “performance.”

---

## References (project)

- `/Users/viczhang/workspace/Playground/AIsidebar/src/App.tsx` — lifecycle, `mounted` / `loaded` / `reloadToken`
- `/Users/viczhang/workspace/Playground/AIsidebar/src/components/ProviderFrame.tsx` — iframe props & key
- `/Users/viczhang/workspace/Playground/AIsidebar/src/styles.css` — `.provider-frame` / `.is-active`
- `/Users/viczhang/workspace/Playground/AIsidebar/sidepanel.html` — shell document (hints go here)
- `/Users/viczhang/workspace/Playground/AIsidebar/src/providers.ts` — embed origins
- `/Users/viczhang/workspace/Playground/AIsidebar/public/manifest.json` — MV3 CSP `frame-src`, side panel
- `/Users/viczhang/workspace/Playground/AIsidebar/PRIVACY.md` — no chat/DOM collection
