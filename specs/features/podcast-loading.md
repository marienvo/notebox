# Podcast Loading Trace

## Scope

This spec defines how the Podcasts screen loads data, when the small initial spinner can disappear, and how cache layers are used to keep warm-start rendering fast.

## Goals

- Render episode rows as soon as legacy podcast markdown files are parsed.
- Keep spinner-blocking work limited to data required for first paint.
- Move RSS and artwork enrichment to background work.
- Persist artwork URI cache across app restarts.

## Components And Responsibilities

- `usePodcasts`: orchestrates file reads, parse flow, section state, and spinner timing.
- `usePlayer`: restores playlist state once per vault session and matches to episodes as they arrive.
- `podcastImageCache`: resolves artwork URI through memory cache, persistent cache, SAF metadata, and optional network fallback.

## Cache Layers

### Episode File Content Cache

- Location: module-level `fileContentCache` in `usePodcasts`.
- Key: markdown file URI.
- Value: `{ lastModified, content }`.
- Lifetime: JS runtime session.
- Invalidation: file `lastModified` mismatch or app restart.

### RSS Feed URL Caches

- Location: module-level maps in `usePodcasts`.
- Keys: `baseUri::seriesName` and `baseUri::normalizedSeriesName`.
- Value: RSS feed URL.
- Lifetime: JS runtime session.
- Purpose: enrich episodes and sections without waiting for RSS markdown file reads in later refreshes.

### Artwork URI Memory Cache

- Location: module-level `artworkUriMemoryCache` in `podcastImageCache`.
- Key: `baseUri::rss-hash`.
- Value: renderable URI (`content://.../document/...`, `file://`, or remote fallback URL) or `null`.
- Lifetime: JS runtime session.
- Purpose: avoid repeated SAF reads during row renders.

### Persistent Artwork URI Cache

- Location: `AsyncStorage`.
- Key: `notebox:artworkUriCache:${baseUri}`.
- Value: serialized map of non-empty artwork URIs keyed by memory cache key.
- Lifetime: across app restarts for the same app install.
- Purpose: hydrate memory cache early so warm restarts can render artwork without per-series SAF checks.

## Loading Phases

### Startup Preload (Concurrent)

When `baseUri` is available:

1. `usePodcasts` starts `loadPersistentArtworkUriCache(baseUri)` in a `useEffect`.
2. This loads persisted artwork URIs from `AsyncStorage` into memory cache.
3. This runs concurrently with phase 1 and does not block first list render.

### Phase 1 (Spinner-Blocking)

`refresh()` performs only rendering-critical work:

1. `listGeneralMarkdownFiles(baseUri)`.
2. Filter to legacy podcast markdown files (`isPodcastFile`).
3. Read and parse legacy files.
4. Enrich episodes with already-cached RSS URLs (if available).
5. Build sections and commit state.
6. Set `isLoading=false` in `finally`.

Spinner target: disappears immediately after sections are ready from legacy files.

### Phase 2 (Background)

After phase 1 state is rendered:

1. Read RSS markdown files (`📻 ... .md`).
2. Extract RSS feed URL + section title.
3. Persist RSS URL mappings in in-memory RSS caches.
4. Re-enrich episodes and sections if new URLs changed visible data.
5. Prime artwork cache via `primeArtworkCacheFromDisk(baseUri, rssFeedUrls)`.

`primeArtworkCacheFromDisk` only performs cached SAF metadata lookups via `getCachedPodcastArtworkUri`. It does not trigger network fetches.

### Player Restore (Concurrent With Podcast Load)

- `usePlayer` effect 1 runs on `[baseUri, player]` and reads `playlist.json` once per vault session.
- effect 2 matches the saved playlist entry against `episodesById` as episode maps update.
- This decouples playlist read timing from phase 2 enrichment.

## Artwork Resolution Rules

Given `baseUri` and `rssFeedUrl`:

1. Check artwork memory cache.
2. If miss, check SAF metadata entry (`readPodcastImageCacheEntry`) for fresh cached URI.
3. If stale or missing and caller allows full resolution (`getPodcastArtworkUri`), fetch RSS artwork URL and attempt download.
4. On successful local download, write image file + metadata and update memory cache.
5. On download failure, store remote URL fallback metadata and cache fallback URI.
6. Every memory-cache update schedules AsyncStorage write-through for that `baseUri`.

## Warm Vs Cold Behavior

### Cold Start (No Persistent Artwork Cache Yet)

- Phase 1 still renders quickly from podcast markdown files.
- Artwork may appear later per row or after phase 2 priming.
- Priming and row-level fetches progressively populate memory + persistent artwork caches.

### Warm Restart (Persistent Artwork Cache Present)

- Startup preload hydrates artwork memory cache from `AsyncStorage`.
- Episode rows can resolve artwork immediately from memory cache.
- Phase 2 priming still runs to lazy-revalidate SAF metadata and keep cache current.

## SAF Call Budget (Warm Restart, Cached Content)

Expected call profile after this design:

- `listGeneralMarkdownFiles`: 2 calls (`exists` + `listFiles`).
- podcast markdown reads: typically 0 SAF reads when `fileContentCache` is warm in-session.
- `readPlaylist`: 2 calls, concurrent with podcast loading.
- phase 2 RSS reads: often 0 when `fileContentCache` is warm in-session.
- phase 2 artwork priming: 0 when memory cache is already hydrated from `AsyncStorage`.
- row artwork resolution: 0 when memory cache hits.

Total target on warm path: roughly 4 SAF calls plus any required validation misses.

## Non-Goals

- Persisting negative artwork lookups (`null`) across restarts.
- Blocking first paint on RSS file parsing or artwork priming.
- Forcing network refresh before showing cached artwork.
