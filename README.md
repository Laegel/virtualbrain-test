# PokeBattle

A Pokémon browser and battle arena: a React + TypeScript web app and a NestJS backend.
The backend uses [PokeAPI](https://pokeapi.co/api/v2) as its database and a
[VirtualBrain](https://app.getvirtualbrain.com/) chatbot (a "brain" built from the 898 Pokémon) to run the battles.

```
web-app/   React 18, TypeScript, Vite, Tailwind        http://localhost:5173
backend/   NestJS 11, TypeScript                        http://localhost:3001
```

## Features

- **Grid of all 898 Pokémon** (generations 1 to 8) as foil-framed trading cards (tilt and glare on hover) with
  artwork, types and HP / Attack / Defense / Speed.
- **Search and filters:** case-insensitive name search and 18 type filters (a Pokémon matches if it has any selected type).
- **Pick two fighters**, then choose a mode:
  - **Fight!** the chatbot narrates the battle, streamed as it is written.
  - **Turn-based** (bonus): the chatbot only chooses each Pokémon's attack every round. The server computes the
    result (order, accuracy, damage, HP, KO) and sends it back in the same chatbot session, until one Pokémon faints.
    The arena plays each hit in order (lunge, hit flash, floating damage, HP drain, faint) on a stage tinted with the
    fighters' type colours; the log follows the hits. Reduced-motion preferences are respected.
- **Export:** every Pokémon as a Markdown file, to build the brain (`GET /contents/all`) or one at a time (`GET /contents/:id`).
- Light and dark theme, responsive down to phone width, real buttons with visible focus styles.

## Requirements

- Node.js 20 or newer (developed on Node 26 / npm 11).
- For battles: a VirtualBrain account, a brain built from the exported files, and a chatbot API key (see below).
  Browsing, search, filters and the Markdown export work without any key.

## Install and run

### 1. Backend

```bash
cd backend
cp .env.example .env     # then edit it, see "Configuration"
npm install
npm run dev              # http://localhost:3001
```

### 2. Web app

```bash
cd web-app
npm install
npm run dev              # http://localhost:5173
```

Open http://localhost:5173. The first start of the backend fetches the 898 Pokémon from PokeAPI in the background
(898 requests, 12 at a time), then keeps them in `backend/.cache/`, so later starts are instant.
Until it has finished, the web app shows a loading state.

If port 3001 is already used on your machine, set `PORT` in `backend/.env` and `VITE_API_URL` in `web-app/.env.local`
(see `web-app/.env.example`), then restart both.

## Set up the brain (needed for battles)

1. With the backend running, generate the Markdown files:

   ```bash
   curl http://localhost:3001/contents/all
   ```

   This writes 898 files (`001-bulbasaur.md` … `898-calyrex.md`) into `backend/pokemons-ru/` and answers
   `{"directory":"pokemons-ru","count":898}`. The folder is git-ignored.
2. On [app.getvirtualbrain.com](https://app.getvirtualbrain.com/), create a **brain** and import that folder.
   Wait for the indexing to finish.
3. Create a **chatbot** from the brain and create an **API key** for it.
4. Put the key in `backend/.env` as `VIRTUALBRAIN_API_TOKEN` and restart the backend.

You can check the brain first in its chat: *"What happens if Orbeetle fights Corviknight?"*

## Configuration

| File | Variable | Default | Purpose |
|---|---|---|---|
| `backend/.env` | `PORT` | `3001` | Backend port |
| `backend/.env` | `WEB_ORIGIN` | `http://localhost:5173` | The only origin allowed by CORS |
| `backend/.env` | `VIRTUALBRAIN_API_TOKEN` | none | VirtualBrain API key. Without it, battle routes answer `503` |
| `backend/.env` | `TRUST_PROXY` | off | Only behind a reverse proxy: a hop count (`1`), a name (`loopback`) or addresses, so each client has its own rate limit. `true` is refused |
| `web-app/.env.local` | `VITE_API_URL` | `http://localhost:3001` | Where the web app finds the backend |

`.env` files are git-ignored. The API key stays in the backend: it is never sent to the browser or logged.

## Backend API

| Route | Description |
|---|---|
| `GET /ping` | Liveness check, answers `pong` |
| `GET /pokemons` | `{ pokemons: [...] }`: all 898, in the light shape used by the grid |
| `GET /pokemons/:id` | `{ pokemon }`: one Pokémon with resistances, evolutions and abilities |
| `GET /contents/:pokemonId` | One Pokémon as a Markdown file (`Content-Disposition: attachment`) |
| `GET /contents/all` | Writes the 898 Markdown files into `backend/pokemons-ru/` |
| `POST /battle` | Body `{ "fighterIds": [826, 823] }`. Streams a narrated battle as `text/plain` |
| `POST /battle/turn-based` | Same body. Streams one JSON event per line (NDJSON): `start`, `round`…, `end`, or `error` |

Errors: `400` invalid input, `403` cross-site request to `/contents/all`, `404` unknown Pokémon, `502` PokeAPI or the
chatbot is unavailable, `503` no API key, `504` the fight took too long to start, `429` rate limited or the arena is busy.
A turn-based fight that fails before its first event answers with that HTTP error; once the stream has started, a failure
arrives as a last `error` event.

## How the battles work

- The browser sends **only two Pokémon ids**. The prompt is built on the server from our own data, so the client
  cannot inject instructions into it.
- **Auth:** the API key is exchanged for a 1-hour access token plus a rotating refresh token. The backend caches
  them in memory, renews them before they expire and retries once on a `401`.
- **Turn-based rules** (`backend/src/battle/turn-engine.ts`): level 50, HP = base + 75, other stats = base + 20,
  damage from move power, Attack/Defense (or the special stats), STAB, type effectiveness, a 0.85 to 1 random factor,
  1 in 24 critical hits and move accuracy. The faster Pokémon moves first. Each fighter gets four damaging moves from
  PokeAPI (its newest level-up set, weighted by STAB and the stat the move uses, at most two per type).
  Priority moves, status effects and items are out of scope.
- The chatbot's answer is **untrusted**: only a move that exists in that fighter's own list is ever played. If the
  answer is unusable it is retried once; if that fails too, the arena plays the best attack and says so in the log.
  A fight stops after 12 rounds, so it makes between 12 and 24 chatbot calls. A reply that is not a short JSON object is
  cut off, and a chatbot that returns no session id fails the fight instead of playing on without memory.
- **Limits:** at most 4 fights run at the same time, for all clients together (a fifth gets `429`), and a fight has an
  overall deadline (3 minutes narrated, 6 turn-based) on top of the idle timeout.

## Quality and security notes

- **Validation at the edge:** Pokémon ids must be plain integers from 1 to 898 (a pipe on path parameters); bodies go
  through a global `ValidationPipe` that strips and rejects unknown fields.
- **Upstream clients:** redirects are never followed (a redirect would resend an API key or refresh token to another
  host and sidestep the URL checks). The PokeAPI client memoises every call (PokeAPI asks clients to cache), shares
  in-flight requests, retries on failure with a back-off, and refuses any follow-up URL that is not under
  `https://pokeapi.co/api/v2/` (SSRF guard). The id in a PokeAPI payload must be the one requested.
- **Failure handling:** the body of a failed chatbot response is closed, a late `401` cannot discard a newer token,
  a failed export waits for its running workers before reporting, and the disk cache is optional (validated on read,
  written atomically, and a write failure never fails a request).
- **Export:** files go to a fixed folder, with names built from the numeric id and a sanitised slug, and Pokémon names are
  escaped before they are written into Markdown. `GET /contents/all` writes files, so a request the browser marks
  `Sec-Fetch-Site: cross-site` is refused: CORS would hide the response but not stop another site from triggering it.
- **HTTP hardening:** helmet, a single allowed CORS origin, the default request body limit, rate limits (120 per minute
  in general, 2 for `/contents/all`, 10 for `/battle`, 3 for `/battle/turn-based`).
- **LLM output is plain text:** the UI never injects it as HTML. A client that disconnects cancels the upstream request.
- **Frontend:** the grid cards are memoised, off-screen cards use `content-visibility`, images load lazily, the
  search is deferred, and motion respects `prefers-reduced-motion`.

## Arena art

The battle scene is drawn over `web-app/public/arena/stadium.webp`, an image generated with Google Gemini (prompt,
measurements and how to swap it in `docs/arena-art.md`). Without the file the scene falls back to a stage tinted with
the fighters' type colours.

## Design system

Colours are CSS variables in `web-app/src/index.css` (light and dark), mapped to Tailwind colours in
`tailwind.config.js`, so components never use raw colours. The kit lives in `web-app/src/ui/`
(`Button`, `TypeBadge` / `TypeToggle`, `StatBar`, `HpBar`, `SearchInput`, `Surface`, `Spinner`).
A living reference is at **http://localhost:5173/#design-system**.

## Tests and checks

```bash
cd backend && npm test        # 126 tests: validation, Markdown, auth, upstream clients, export, turn engine, prompts, routes
cd backend && npm run build   # type check
cd backend && npm run lint
cd web-app && npm run build   # type check and production build
cd web-app && npm run lint
```

## Project layout

```
backend/src/
  common/      id pipe, validation pipe, small helpers
  pokemon/     PokeAPI client, mapping, moves, /pokemons routes
  contents/    Markdown conversion and /contents routes
  battle/      VirtualBrain auth, prompts, turn engine, /battle routes
web-app/src/
  api/         backend calls (including the streaming readers)
  hooks/       usePokemons, useSelection, useBattle, useTurnBattle
  features/    browse (grid, filters, selection), arena (both modes), design-system
  ui/          the design-system components
  theme/       light and dark theme
```

## Known limits

- A fight takes a while: each LLM call takes several seconds, and a turn-based fight makes one per round.
- The chatbot retrieves documents per question and can occasionally miss one of the two Pokémon; the narrated prompt
  therefore carries each fighter's types and stats and tells the model to rely on them.
- The battle model is deliberately simplified (see the rules above) and not the games' exact formulas.
- Caches and rate limits are in memory, per backend instance.
- Only generations 1 to 8 (ids 1 to 898) are supported.
- The exported files hold no move lists: moves come from PokeAPI at battle time.
