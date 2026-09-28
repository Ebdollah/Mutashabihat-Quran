# Mutashabihat Tracker — Implementation Plan

A website for tracking **mutashabihat**: Quran ayahs whose wording is similar. While reading, the user adds an ayah, marks the similar words, and links it to the other ayahs that share them. Later, they open the group and compare all the ayahs side by side, with the differing words highlighted.

- **Design (source of truth for the UI):** https://claude.ai/artifact/JvndWKD5BmVdfjPRRnTS8Q
- **Original flow:** `Notes_260928_124045 (4).pdf` (hand-drawn flow: add → exists? → store / link)

> **Status (2026-09-28):** phases 0–5 and 7 are built. Phase 6 (Neon) is fully wired, with schema, migration, three drivers and seed/import scripts; it only needs your `DATABASE_URL` and `STORAGE=db`. Phase 8 (deploy) is not started. Auth changed from Better Auth to **Auth.js** (see §10). See [README.md](README.md) for how to run it.

---

## 1. Scope and phases

| Phase | Goal | Storage | Auth |
|---|---|---|---|
| 0 | Project setup, design tokens, fonts | — | — |
| 1 | Quran data layer (Quran.com API client + cache) | — | — |
| 2 | Sets repository backed by a local JSON file | `data/store.json` | — |
| 3 | "Add ayah" flow | JSON file | — |
| 4 | "Compare a set" screen (desktop + phone) | JSON file | — |
| 5 | Polish: responsive, a11y, empty/error states, tests | JSON file | — |
| 6 | Swap the repository to Neon Postgres (Drizzle) | Neon | Auth.js |
| 7 | Sign up / log in; scope all data to the user | JSON or Neon | Auth.js (Credentials) |
| 8 | Deploy (Vercel + Neon) | Neon | Auth.js |

**Rule:** all UI and business logic talks to a `SetsRepository` interface. Moving from JSON to Neon (phase 6) is a single swap of the implementation, with no UI changes.

---

## 2. Terminology

| Term | Meaning |
|---|---|
| **Set** | A group of similar ayahs. (The PDF calls it a "tile".) The UI says "set" / "Mutashabihat set". |
| **Member** | One ayah in a set, plus the similar phrase marked in it. |
| **Phrase** | The similar part of an ayah, stored as a word range `[phraseStart, phraseEnd]` (inclusive, 0-based word indices) plus a text snapshot. |
| **Verse key** | `"surah:ayah"`, e.g. `"2:58"`. This is the Quran.com format. |
| **Token / word** | One item of `text_uthmani.split(' ')`. Waqf marks (ۚ ۖ ۗ ۛ ۘ ۙ ۩) arrive as separate tokens. |

---

## 3. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16 (App Router), TypeScript, React 19 Server Components** | Server Actions for mutations; `proxy.ts` replaces `middleware.ts` |
| Styling | **Tailwind CSS v4** with the design tokens from §9 in `@theme` | |
| Fonts | `next/font/google`: **Amiri Quran** (ayah text), **Fraunces** (headings), **IBM Plex Sans** (UI) | Self-hosted by Next, no layout shift |
| Validation | **Zod** | All Server Action inputs and all API responses |
| Quran data | **Quran.com API v4** (`https://api.quran.com/api/v4`) | Behind an adapter (§5) |
| DB (phase 6) | **Neon Postgres** + **Drizzle ORM** + `@neondatabase/serverless` | |
| Auth | **Auth.js v5** (`next-auth@beta`), Credentials provider, our own `users` table, bcrypt hashes, JWT session cookie | No third-party auth service; we own sign-up, hashing and the users table |
| Tests | **Vitest** (unit), **Playwright** (e2e) | |
| Package manager | npm | Node 20+ (built on Node 22, Next.js 16) |

---

## 4. Folder structure

```
├─ auth.ts                         # Auth.js config (Credentials + JWT)
├─ proxy.ts                        # redirects signed-out visitors (Next 16 "middleware")
├─ app/
│  ├─ layout.tsx                   # fonts, <html>
│  ├─ page.tsx                     # redirect → /sets
│  ├─ globals.css                  # Tailwind v4 + design tokens (@theme)
│  ├─ (auth)/layout.tsx, login/, signup/
│  ├─ (app)/layout.tsx             # requires login; TopBar
│  │  ├─ sets/layout.tsx           # sidebar (desktop) / pills (phone)
│  │  ├─ sets/page.tsx             # → most recent set, or empty state
│  │  ├─ sets/[setId]/page.tsx     # Compare screen (loads set + ±1 context)
│  │  └─ add/page.tsx              # Add ayah (?surah=&ayah=&set=)
│  └─ api/auth/[...nextauth]/route.ts
├─ components/
│  ├─ TopBar.tsx, NavLinks.tsx, SetSidebar.tsx, AuthForm.tsx, WordPicker.tsx
│  ├─ compare/ CompareView.tsx, AyahCard.tsx, SetHeader.tsx, tokens.ts (diff → render tokens)
│  ├─ add/ AddAyahForm.tsx, SurahAyahPicker.tsx, useVerseLookup.ts
│  └─ ui/ Button.tsx, Segmented.tsx, Switch.tsx, Menu.tsx, icons.tsx
├─ lib/
│  ├─ env.ts                       # zod-validated env
│  ├─ quran/ client.ts, surahs.ts, tokens.ts, verseKey.ts
│  ├─ diff/lcs.ts
│  ├─ repo/ types.ts, shared.ts, json-repo.ts, drizzle-repo.ts, index.ts (getRepo)
│  ├─ actions/ sets.ts, auth.ts    # Server Actions
│  ├─ auth/session.ts              # requireUserId()
│  ├─ sample.ts                    # addSampleSets()
│  └─ sets-view.ts                 # sidebar summaries
├─ db/ schema.ts, index.ts (driver switch), migrations/0000_init.sql
├─ data/ sample-sets.json (committed), store.json (git-ignored)
├─ scripts/ seed.ts, import-json.ts, gen-surahs.ts, load-env.ts
├─ tests/ quran.test.ts, json-repo.test.ts
├─ drizzle.config.ts, vitest.config.ts
└─ .env.example (committed), .env.local (git-ignored)
```

---

## 5. Quran data layer (phase 1)

### 5.1 Endpoints (tested and working without an API key)

| Need | Request | Fields used |
|---|---|---|
| Surah list | `GET /api/v4/chapters?language=en` | `id, name_simple, name_arabic, verses_count` |
| One ayah | `GET /api/v4/verses/by_key/{surah}:{ayah}?fields=text_uthmani` | `verse.verse_key, verse.text_uthmani` |
| Many ayahs (optional) | `GET /api/v4/verses/by_chapter/{surah}?fields=text_uthmani&per_page=50&page=N` | For prefetching a surah |

Example response (trimmed):
```json
{ "verse": { "verse_key": "2:58", "verse_number": 58, "page_number": 9, "juz_number": 1,
  "text_uthmani": "وَإِذْ قُلْنَا ٱدْخُلُوا۟ هَـٰذِهِ ٱلْقَرْيَةَ ..." } }
```

Notes:
- **Surah list is static:** bundle it as `lib/quran/surahs.ts` (generate once from `/chapters`), so the dropdowns never wait on the network.
- Quran.com is moving to the **Quran Foundation API** (`api.quran.foundation`), which needs OAuth2 client credentials. Keep every call inside `lib/quran/client.ts`, so switching later means changing only that file plus the env vars `QURAN_CLIENT_ID` / `QURAN_CLIENT_SECRET`.
- Python's default user agent got a 403; curl and `fetch` worked. Send a `User-Agent: mutashabihat/1.0` header.

### 5.2 `lib/quran/client.ts`

```ts
export type Verse = { key: string; surah: number; ayah: number; text: string };

export async function getVerse(key: string): Promise<Verse | null>
// - validate key with verseKey.ts (surah 1–114, ayah 1–verses_count)
// - fetch(`${BASE}/verses/by_key/${key}?fields=text_uthmani`, { next: { revalidate: 60*60*24*30 } })
// - zod-parse; return null on 404
// - ayah text never changes → cache aggressively

export async function getVerses(keys: string[]): Promise<Record<string, Verse>>
// Promise.all over getVerse, deduped; used by the Compare page for members + prev/next context
```

- Also store the ayah text on each member (`textSnapshot`, see the data model), so the Compare page still renders if the API is down. Refetch in the background only if missing.
- `app/api/quran/verse/[key]/route.ts` exposes `getVerse` to client components (the Add page changes ayahs without a page reload). Response `Cache-Control: public, max-age=2592000, immutable`.

### 5.3 `lib/quran/verseKey.ts`
- `parseKey("2:58") → {surah:2, ayah:58}`; throws on invalid input.
- `isValidKey(surah, ayah)` uses `surahs[surah-1].verses_count`.
- `prevKey(key)` / `nextKey(key)` **stay inside the surah**: ayah 1 has no prev and the last ayah has no next. Context never crosses surahs.

### 5.4 `lib/quran/tokens.ts`
```ts
export const WAQF = /^[ۖ-ۜ۞۩]+$/;
export const tokenize = (text: string) => text.split(' ').filter(Boolean);
export const isWaqf = (t: string) => WAQF.test(t);
export const phraseText = (text: string, s: number, e: number) => tokenize(text).slice(s, e + 1).join(' ');
```
Word indices are always indices into `tokenize(text_uthmani)`, **including** waqf tokens. That's the same indexing the design prototype uses.

---

## 6. Data model

### 6.1 Domain types (`lib/repo/types.ts`)

```ts
export type SetMember = {
  id: string;            // uuid
  setId: string;
  verseKey: string;      // "2:58"
  surah: number;         // 2
  ayah: number;          // 58
  phraseStart: number;   // word index, inclusive
  phraseEnd: number;     // word index, inclusive
  phraseText: string;    // snapshot of the marked words
  textSnapshot: string;  // full text_uthmani at time of adding
  position: number;      // order inside the set (0..n-1)
  createdAt: string;     // ISO
};

export type MutashabihSet = {
  id: string;
  userId: string;        // owner (users.id)
  title: string;         // user editable; default = first 4 words of the first phrase
  note?: string;         // optional free text (future)
  members: SetMember[];  // sorted by position
  createdAt: string;
  updatedAt: string;
};
```

**Rules:**
- A set can have **1..n** members. One member is allowed, for "save this ayah only, link later".
- The same `verseKey` **cannot appear twice in one set**.
- The same `verseKey` **may appear in several sets**, because different parts of one ayah can match different ayahs. The "already tracked" lookup returns **all** matching sets. The UI shows a list; with only one match it looks like the design.
- `0 ≤ phraseStart ≤ phraseEnd < tokenize(text).length`, and neither end may be a waqf token.
- Deleting the last member deletes the set (after confirmation).

### 6.2 Repository interface

```ts
export interface SetsRepository {
  listSets(userId: string): Promise<MutashabihSet[]>;                 // newest updated first
  getSet(userId: string, setId: string): Promise<MutashabihSet | null>;
  findSetsByVerse(userId: string, verseKey: string): Promise<MutashabihSet[]>;
  createSet(userId: string, input: { title?: string; members: NewMember[] }): Promise<MutashabihSet>;
  addMember(userId: string, setId: string, m: NewMember): Promise<MutashabihSet>;
  updateMemberPhrase(userId: string, memberId: string, s: number, e: number): Promise<MutashabihSet>;
  removeMember(userId: string, memberId: string): Promise<MutashabihSet | null>; // null = set deleted
  renameSet(userId: string, setId: string, title: string): Promise<MutashabihSet>;
  reorderMembers(userId: string, setId: string, memberIds: string[]): Promise<MutashabihSet>;
  deleteSet(userId: string, setId: string): Promise<void>;
  search(userId: string, q: string): Promise<MutashabihSet[]>;       // title, verse key, surah name, phrase text
}
export type NewMember = { verseKey: string; phraseStart: number; phraseEnd: number; textSnapshot: string };
```

### 6.3 JSON implementation (phase 2): `lib/repo/json-repo.ts`

- File: `data/sets.json`, shaped as `{ "version": 1, "sets": MutashabihSet[] }`. Create it if missing.
- Reads: `fs.promises.readFile` + JSON.parse + zod validation.
- Writes: an in-process mutex (a simple promise chain), then write `sets.json.tmp` and `rename` it over the real file (an atomic write, so a crash can't corrupt the file).
- Every method filters by `userId`, just like the DB will. That catches ownership bugs before phase 7.
- Compute `phraseText` inside the repo from `textSnapshot`, so callers can't send a mismatched value.
- `data/store.json` is git-ignored. `data/sample-sets.json` (committed) holds 4 sample sets (2:35/7:19, 2:58/7:161, 2:59/7:162, 2:62/5:69/22:17). `npm run db:seed` gives them to the seed user, and new sign-ups get them when `SAMPLE_SETS_FOR_NEW_USERS=true`.

`lib/repo/index.ts`:
```ts
export function getRepo(): SetsRepository {
  return process.env.STORAGE === 'db' ? drizzleRepo : jsonRepo;   // default: json
}
```

### 6.4 Postgres schema (phase 6): `db/schema.ts`

```ts
export const sets = pgTable('sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),                       // FK → user.id in phase 7
  title: text('title').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('sets_user_updated_idx').on(t.userId, t.updatedAt)]);

export const setMembers = pgTable('set_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  setId: uuid('set_id').notNull().references(() => sets.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),                       // denormalised for fast "find by verse"
  verseKey: text('verse_key').notNull(),
  surah: smallint('surah').notNull(),
  ayah: smallint('ayah').notNull(),
  phraseStart: smallint('phrase_start').notNull(),
  phraseEnd: smallint('phrase_end').notNull(),
  phraseText: text('phrase_text').notNull(),
  textSnapshot: text('text_snapshot').notNull(),
  position: smallint('position').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  uniqueIndex('member_set_verse_uq').on(t.setId, t.verseKey),
  index('member_user_verse_idx').on(t.userId, t.verseKey),
  check('phrase_range', sql`${t.phraseStart} >= 0 AND ${t.phraseEnd} >= ${t.phraseStart}`),
]);
```
- Optional: a `verse_cache (verse_key PK, text_uthmani, fetched_at)` table, to stop calling the Quran API for ayahs you've already fetched.
- Migration: `drizzle-kit generate` → `drizzle-kit migrate`.
- A one-off script `scripts/import-json.ts` copies `data/sets.json` into Neon (keeping ids).

---

## 7. Server Actions (`lib/actions/sets.ts`)

All actions:
1. `const userId = await requireUserId()` (redirects to /login when signed out).
2. Zod-validate the input.
3. For anything that adds a member, fetch the ayah on the server with `getVerse` (never trust client-sent text) and validate the phrase range against its tokens.
4. Call the repo.
5. `revalidatePath('/sets')` and `revalidatePath('/sets/' + id)`.
6. Return `{ ok: true, data } | { ok: false, error }`.

| Action | Input | Used by |
|---|---|---|
| `lookupVerse(key)` | `{ key }` → `{ verse, sets: MutashabihSet[] }` | Add page, step 1 |
| `createSet` | `{ title?, members: [{key, s, e}] }` (1..n) | "Create set" / "Save this ayah only" |
| `addMemberToSet` | `{ setId, key, s, e }` | "Add to this set" / "Add similar ayah" |
| `updatePhrase` | `{ memberId, s, e }` | Edit phrase (Compare card menu) |
| `removeMember` | `{ memberId }` | Card menu → "Remove from set" |
| `renameSet` | `{ setId, title }` | Inline title edit |
| `reorderMembers` | `{ setId, memberIds }` | Drag in chips row (phase 5, optional) |
| `deleteSet` | `{ setId }` | Set menu |

Errors to handle, with a user-facing message for each: invalid key · ayah not found · phrase out of range · verse already in this set · set not found / not yours · Quran API unavailable ("Couldn't load the ayah text. Try again.").

---

## 8. Screens (match the design canvas)

### 8.1 Top bar (all pages)
- Wordmark "Mutashabihat" (Fraunces 24/600), plus «متشابهات» (Amiri Quran 20, teal).
- Nav: **Sets** (`/sets`) · **Add ayah** (`/add`). The active link has a teal-soft background and `aria-current="page"`.
- Right side: **Sign in** (phase 7). After login it becomes an avatar menu with Log out.

### 8.2 `/sets` and `/sets/[setId]`: Compare a set

**Sidebar (320px, desktop):**
- Primary button **"Add ayah while reading"** → `/add`.
- Search field (label "Search sets", placeholder "Surah, ayah or word"). It filters client-side over title, verse keys, surah names and phrase text; from phase 6 it uses `repo.search` on the server.
- "Your sets · N" header.
- Set items: title (15/600), first phrase in Arabic (Amiri 18, one line, ellipsis, RTL), refs `2:58 · 7:161`. The selected item has a teal border and white background. Items are `<Link>`s to `/sets/[id]`.

**Main area:**
- Eyebrow "MUTASHABIHAT SET · N AYAHS", title (Fraunces 34, editable inline), surah names line.
- Button **"Add similar ayah"** → `/add?set={id}`, which preselects "add to this set" mode.
- **View options panel:**
  - **Ayahs:** one checkbox-chip per member (`2:58 · Al-Baqarah`), with `aria-pressed`, plus a **Show all** link. At least 1 must stay visible.
  - **Show:** segmented control: `Phrase only` | `Full ayah` (default) | `± 1 ayah`.
  - **Layout:** segmented control: `Side by side` (default; columns = min(visible, 3)) | `Stacked`.
  - **Highlight differences** switch (default on).
- **Legend:** amber = "Differs from the other ayahs shown"; dark = "Tracked phrase"; grey = "Rest of the ayah".
- **Cards:** header (verse key badge, surah name EN + AR, hide ✕ button); with `± 1 ayah`, the before/after ayahs are grey (Amiri 20) on a slightly darker background with a dashed separator. Main text: Amiri 27, line-height 2.25, `dir="rtl"`, then the end marker `﴿٥٨﴾` in Arabic-Indic digits.
- Card overflow menu (phase 5): Edit phrase · Remove from set · Open on quran.com (`https://quran.com/{surah}/{ayah}`).
- "N hidden · show all" line when any are hidden.

**View state lives in the URL** so it survives reloads and can be shared or bookmarked:
`/sets/abc?mode=context&layout=stack&diff=0&hide=2:58,5:69`. Use `useSearchParams` + `router.replace` (no scroll). Defaults are omitted from the URL.

**Phone (<768px):** the sidebar becomes a horizontal scroll of set pills (refs) at the top, and the "+" add button moves into the top bar. The Show control keeps 3 equal segments (`Phrase | Ayah | ± 1 ayah`), ayah chips wrap, and cards are always stacked (the Layout control is hidden). Main text is Amiri 23, context text 17.

**Empty states:**
- No sets at all: an illustration-free panel saying "No sets yet", "While reading, add an ayah that reminds you of another", and a button to `/add`.
- `/sets` with sets but none selected: redirect to the most recently updated set.

### 8.3 Diff algorithm (`lib/diff/lcs.ts`)

```ts
// a, b: word arrays (waqf tokens removed). Returns mask over a: true = word is part of the LCS with b.
export function lcsMask(a: string[], b: string[]): boolean[]
// For the visible members: word i of member X is "common" iff it is in the LCS of X with EVERY other visible member.
export function commonMasks(wordLists: string[][]): boolean[][]
```
- The comparison runs on **the words currently shown**: only the phrase in `Phrase only` mode, the full ayah otherwise. Context ayahs are never diffed.
- Compare by exact Uthmani string. Later, an optional "loose" setting could strip harakat (`/[ً-ٰٟۖ-ۭ]/g`) before comparing.
- Using LCS (not set membership) catches **word-order** changes, e.g. وَقُولُوا۟ حِطَّةٌ before or after ٱدْخُلُوا۟ ٱلْبَابَ سُجَّدًا in 2:58 vs 7:161.
- Cost is O(n·m) per pair; ayahs are at most ~130 words, so this is trivial. Memoize with `useMemo` on (visible keys, mode).
- Token styles: in-phrase = ink `#1D1B17`; out-of-phrase = `#A39C8F`; diff = background `#F6DDA4`, text `#4D2E00`, inset bottom border `#B7790F`; waqf = teal at 0.8em.

### 8.4 `/add`: Add an ayah while reading

Query params: `?surah=2&ayah=59` (restore/share) and `?set={id}` (open in "add to this set" mode).

**Step 1: "The ayah you're reading"**
1. Surah `<select>` ("2. Al-Baqarah — البقرة", all 114) and Ayah `<select>` (1..verses_count). Changing the surah resets the ayah to 1.
2. On change, the client calls `lookupVerse(key)`:
   - loading: a skeleton of word pills
   - error: an inline message with a Retry button
3. Status badge: **"Not in any set yet"** (neutral) or **"Already tracked"** (amber).
4. **WordPicker:** each word is a `<button>` (≥44px tall, Amiri 25). The first tap sets the start and the second sets the end (order-independent); the end words get a solid teal border and the inner words a light one. Waqf tokens aren't buttons. Hint text changes: "Tap the first word…" → "Now tap the last word…". Keyboard: Tab through words, Enter/Space to select.
5. "Similar words you marked" preview (Amiri 22) + **Clear**.
6. If the ayah is already in a set, preselect that member's saved range.

**Right column, case A: already tracked** (`sets.length ≥ 1`). This is the left branch of the PDF.
- A teal panel per matching set: "2:58 is already in “{title}”", a list of members (key + phrase, one line each), and an **Open set to compare** button.
- Step 2: **"Add another similar ayah to this set"**: surah/ayah pickers (empty by default) + WordPicker + **Add to this set** (disabled until a phrase is marked). With several matching sets, a radio group picks which one.

**Right column, case B: not tracked.** This is the right branch of the PDF.
- Step 2: **"Link a similar ayah"** (optional): surah/ayah pickers + WordPicker.
- Buttons: **Save this ayah only** (secondary; needs a step 1 phrase) and **Create set with X and Y** (primary; the label changes to "Create set" when no second ayah is chosen).
- Blocked if the second ayah is the same as the first.

**After saving:** a dark status toast (`role="status"`): "New set created with 2:59 and 7:162.", with a **View sets** link to `/sets/{newId}`. The form resets step 2 but keeps step 1, since the user will often add more.

**Future (not in first build):** a "Link more" button in step 2, for adding 3+ ayahs in one go.

---

## 9. Design tokens (from the canvas)

```css
@theme {
  --color-bg:        #F5F2EA;  /* page */
  --color-surface:   #FFFFFF;  /* cards */
  --color-surface-2: #FBF9F4;  /* top bar, sidebar, context rows, word picker bg */
  --color-muted-bg:  #EFEBE1;  /* segmented track */
  --color-line:      #E3DDD0;  /* borders */
  --color-line-2:    #D6CFBF;  /* input borders */
  --color-ink:       #1D1B17;
  --color-ink-2:     #57524A;  /* secondary text */
  --color-ink-3:     #736D63;  /* captions, context ayahs */
  --color-ink-4:     #A39C8F;  /* out-of-phrase words */
  --color-teal:      #0E5C56;  /* primary */
  --color-teal-dark: #08403C;
  --color-teal-soft: #E2EEEB;
  --color-teal-line: #B9D6D0;
  --color-amber-bg:  #F6DDA4;  /* diff highlight */
  --color-amber-ink: #4D2E00;
  --color-amber-line:#B7790F;
  --font-quran: "Amiri Quran", serif;
  --font-display: "Fraunces", Georgia, serif;
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
}
```
- Radii: 8 (buttons/segments), 10 (inputs, primary buttons), 12–16 (cards/panels), 999 (pills).
- Spacing: 16px phone gutter, 40px desktop main padding, 20px card grid gap.
- Every Arabic element gets `lang="ar" dir="rtl"`, with `text-align: right`.
- Touch targets ≥ 44px; visible focus ring (`outline: 2px solid var(--color-teal); outline-offset: 2px`).
- Dark mode: not in scope for v1. Keep all colors as tokens so it can be added later.

---

## 10. Auth: Auth.js v5 (built)

We handle auth ourselves on top of Auth.js; there is no auth service and no Better Auth.

- `auth.ts` sets up `NextAuth({ providers: [Credentials(...)], session: { strategy: 'jwt' } })`. `authorize()` looks the user up with `getRepo().getUserByEmail()` and checks the password with `bcryptjs.compare`. When the email doesn't exist it compares against a dummy hash, so a wrong email and a wrong password take the same time.
- The JWT carries `uid`; `session.user.id` is typed via module augmentation.
- `app/api/auth/[...nextauth]/route.ts` exports the handlers.
- `proxy.ts` (Next 16 renamed `middleware.ts` to `proxy.ts`; it runs on Node) redirects signed-out visitors to `/login?next=…`, and signed-in visitors away from `/login` and `/signup`.
- `lib/auth/session.ts` → `requireUserId()` is called at the top of every page and Server Action. It is the real ownership check.
- `lib/actions/auth.ts`:
  - `loginAction` calls `signIn('credentials')` and turns `AuthError` into "Email or password is incorrect."
  - `signupAction` validates with zod (email, password ≥ 8, confirm), hashes with bcrypt (cost 12), creates the user, adds the sample sets if enabled, then signs in.
  - `logoutAction` signs out.
- `users` table: `id uuid`, `email` (unique, lower-cased), `name`, `password_hash`, `created_at`. `sets.user_id` and `set_members.user_id` are foreign keys to it with `on delete cascade`.
- `ALLOW_SIGNUP=false` closes sign-up. `SAMPLE_SETS_FOR_NEW_USERS` controls the starter data.
- **Later (not built):** password reset and email verification (needs an email provider plus a `verification_tokens` table), a "change password" page, rate-limiting login attempts, and optional Google/GitHub providers (Auth.js makes these a few lines each).

---

## 11. Environment variables

The full, commented list is in `.env.example`. Summary:

| Variable | Default | Purpose |
|---|---|---|
| `STORAGE` | `json` | `json` (data/store.json) or `db` (Postgres) |
| `JSON_STORE_PATH` | `data/store.json` | Local store file |
| `DATABASE_URL` | — | Neon **pooled** connection string (app) |
| `DATABASE_URL_UNPOOLED` | — | Neon **direct** string (drizzle-kit migrations); falls back to `DATABASE_URL` |
| `DB_DRIVER` | `neon-http` | `neon-http` · `neon-ws` · `pg` |
| `DB_POOL_MAX` | `5` | Pool size for `neon-ws` / `pg` |
| `DB_LOG_QUERIES` | `false` | Log SQL |
| `AUTH_SECRET` | — | Required. `npx auth secret` |
| `AUTH_URL` | auto | Only if production URL isn't detected |
| `ALLOW_SIGNUP` | `true` | Close sign-up with `false` |
| `SAMPLE_SETS_FOR_NEW_USERS` | `false` | Starter sets for new accounts |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_NAME` | — | Used by `npm run db:seed` |
| `QURAN_API_BASE` | `https://api.quran.com/api/v4` | Quran API |
| `QURAN_CACHE_SECONDS` | `2592000` | Ayah text cache time |

---

## 12. Step-by-step build order with acceptance criteria

### Phase 0: Setup
1. `npx create-next-app@latest` (Next 16, TypeScript, App Router, Tailwind v4, ESLint).
2. Add deps: `zod`, `clsx`; dev: `vitest`, `@testing-library/react`, `playwright`.
3. Fonts in `app/layout.tsx` via `next/font/google`, exposed as CSS variables.
4. Tokens from §9 in `app/globals.css`.
5. Build the `components/ui` primitives: `Button`, `Segmented`, `Switch`, `Chip`, `Badge`.
6. ✅ `npm run dev` shows the top bar with correct fonts and colors.

### Phase 1: Quran data
1. `scripts/gen-surahs.ts` fetches `/chapters` and writes `lib/quran/surahs.ts`.
2. `verseKey.ts`, `tokens.ts`, `client.ts`, `/api/quran/verse/[key]`.
3. Unit tests: key parsing and bounds (`2:287` invalid, `1:7` valid, `114:6` valid), prev/next at the edges, tokenize/phrase on 2:58.
4. ✅ `GET /api/quran/verse/7:161` returns the text; a second call is served from cache.

### Phase 2: Local store
1. Types + `SetsRepository` + `json-repo.ts` + seed file + `getRepo()`.
2. `requireUserId()` from the Auth.js session.
3. Server Actions from §7.
4. Unit tests for the repo: create, add duplicate (rejected), find by verse, remove the last member deletes the set, and an atomic write survives concurrent calls.
5. ✅ `npm run db:seed` → seed user + 4 sample sets in `data/store.json`.

### Phase 3: Add ayah flow
1. `SurahAyahPicker`, `WordPicker`, `AlreadyTrackedPanel`, `SaveBar`, `AddAyahForm`.
2. URL sync for `surah`, `ayah`, `set`.
3. ✅ With seeded data: 2:59 shows "Not in any set yet"; marking words and linking 7:162 creates a set; 2:58 shows "Already tracked" with its set; adding another ayah to it works; a duplicate is refused with a message.

### Phase 4: Compare
1. `sets/layout.tsx` with the sidebar (server component, lists sets).
2. `sets/[setId]/page.tsx`: load the set on the server + `getVerses(members + prev/next)`; pass to `CompareView`.
3. `lib/diff/lcs.ts` + tests (2:35 vs 7:19 in phrase mode must flag يَـٰٓـَٔادَمُ/وَيَـٰٓـَٔادَمُ, وَكُلَا/فَكُلَا, مِنْهَا, رَغَدًا, مِنْ; 2:62 vs 5:69 vs 22:17 in phrase mode must flag the reordered/changed words).
4. `CompareView`, `ViewOptions`, `AyahCard`, `AyahText`, `Legend`; URL-synced view state.
5. ✅ All controls behave as in the design prototype; reloading keeps the view; the phone layout works at 390px.

### Phase 5: Polish
1. Card menu: edit phrase (reuses `WordPicker` in a dialog), remove, open on quran.com.
2. Inline rename of the set title; delete set with confirmation.
3. Loading skeletons (`loading.tsx`), `error.tsx`, `not-found.tsx` for sets.
4. A11y pass: labels, `aria-pressed`, focus order, contrast (all text ≥ 4.5:1 on its background).
5. Playwright e2e: add → create → compare → hide/show → mode switch.
6. ✅ Lighthouse a11y ≥ 95; no console errors.

### Phase 6: Neon
1. Create a Neon project → `DATABASE_URL`.
2. `drizzle.config.ts`, `db/schema.ts`, `db/index.ts` (`drizzle(neon(DATABASE_URL))`).
3. `drizzle-repo.ts` implementing the same interface (use transactions for create/add/reorder).
4. Run the same repo test suite against both implementations (parameterised tests).
5. `scripts/import-json.ts`; set `STORAGE=db`.
6. ✅ The app behaves identically with `STORAGE=db`.

### Phase 7: Auth
1. The Auth.js setup from §10; login/signup pages; `proxy.ts`; `requireUserId()` everywhere.
2. ✅ Two accounts can't see each other's sets (test it with direct URLs and actions too).

### Phase 8: Deploy
1. Vercel project; add env vars; `drizzle-kit migrate` against production Neon.
2. ✅ Production sign-up → add → compare works.

---

## 13. Edge cases checklist

- [ ] Ayah 1 has no "before" and the last ayah has no "after" (never cross into another surah).
- [ ] Very long ayahs (2:282, ~128 words): the WordPicker wraps, and the card doesn't overflow.
- [ ] Surah change resets the ayah and clears the selection.
- [ ] Selecting the same word twice gives a one-word phrase.
- [ ] A waqf token can't be a phrase start/end; indices still count it.
- [ ] Same ayah in two different sets: the lookup shows both.
- [ ] Hiding members: at least one stays visible.
- [ ] Set with one member: diff is off (nothing to compare) and the legend hides the amber entry.
- [ ] Quran API down: saved sets still render from `textSnapshot`; the Add page shows retry.
- [ ] Arabic text renders only with Amiri Quran (check the font actually loads; fall back to `serif`).
- [ ] URL params with invalid values fall back to defaults.

---

## 14. Nice-to-have (after v1)

- Audio recitation per ayah (Quran.com `/recitations/{id}/by_ayah/{key}`).
- Translation under each ayah (toggle; `translations=` param).
- "Revise" mode: show one ayah with the diff words blanked; the user recalls them.
- Tags / juz filter in the sidebar; sort sets by surah order.
- Export/import sets as JSON.
- Share a set publicly (read-only link).
- Dark mode.
