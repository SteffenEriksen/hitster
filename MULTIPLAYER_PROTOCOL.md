# Hitster Multiplayer — Socket.io Protocol

## Room lifecycle

### Host creates room
- Host emits: `host:create_room`
- Server responds to host only: `room:created` `{ code: "AB3F" }`
- The code is a 4-character alphanumeric string (no ambiguous chars: no 0/O/1/I)

### Player joins
- Player navigates to `/player?room=AB3F`
- Player emits: `player:join` `{ code, name, teamIndex }`
- Server responds to player: `room:join_ok` `{ players, snapshot }` (snapshot may be null if game not started)
- Server emits to everyone in room (including host): `room:players_updated` `{ players }`

### Player changes team (in lobby)
- Player emits: `player:change_team` `{ code, teamIndex }`
- Server emits to everyone: `room:players_updated` `{ players }`

### Room not found
- Server emits to player: `room:error` `{ message }`

---

## Game state sync

### Host pushes state
- Host emits: `host:state` `{ code, snapshot }` at every meaningful phase change
- Server forwards to all players (not back to host): `game:state` `{ snapshot }`

### Snapshot shape
```json
{
  "phase": "pre-turn | playing | revealed | finished",
  "currentTeamIndex": 0,
  "currentTeamName": "Bass Droppers",
  "teams": [
    {
      "name": "Bass Droppers",
      "cards": [{ "year": 1987, "yearUncertain": false, "title": "Never Gonna Give You Up", "artist": "Rick Astley" }],
      "isActive": true
    }
  ],
  "activeTeams": [0, 1],
  "cardsToWin": 8,
  "deckCount": 112,
  "isTiebreaker": false,
  "selectedSlot": null,
  "card": null,
  "result": null,
  "playlistName": "Hitster 80s · 1975 – 2005",
  "winnerIndices": null
}
```

`card` is populated from `playing` phase onward (once card is drawn), but `title`/`artist` are only shown after reveal:
```json
{
  "card": {
    "year": 1987,
    "yearUncertain": false,
    "title": "Never Gonna Give You Up",
    "artist": "Rick Astley",
    "albumArt": "https://i.scdn.co/image/..."
  }
}
```

`result` is set in `revealed` phase:
```json
{
  "result": {
    "correct": true,
    "text": "✓ Correct! Card added to timeline."
  }
}
```

---

## Player actions

### Player selects a slot
- Player emits: `player:select_slot` `{ code, slotIndex }`
- Server forwards to host only: `player:slot_selected` `{ slotIndex, playerName, teamIndex }`
- Host then calls its own `selectSlot(index)` which triggers a `host:state` emit

---

## Disconnect / cleanup
- If a player disconnects: server removes from room.players, emits `room:players_updated`
- If the host disconnects: server emits `room:host_left` to all players, deletes the room
- Players should gracefully show "Host disconnected" and offer to return home

---

## Player page views

### 1. Join form (`phase: null`, not yet joined)
- Input: display name
- Dropdown: pick a team (populated from teams array in URL or initial join response)
- Button: "Join Game"

### 2. Lobby (`joined, game not started or pre-turn of first round`)
- Shows room code
- Shows player list with their team names
- Shows "Waiting for host to start..."

### 3. Game — pre-turn
- Top: current team label, score chips
- Middle: current team's timeline (no slots, read-only)
- "Waiting for [Team X] to start their turn"

### 4. Game — playing (your team's turn)
- Current team's timeline with tappable slot buttons (sends `player:select_slot`)
- Selected slot highlighted
- "Select where to place the card on [Team X]'s timeline"

### 5. Game — playing (other team's turn)
- Timeline (no slot buttons)
- "Team X is choosing..."
- **Disabled Steal button**: `🔒 Steal` (grey, `disabled`, title="Coming soon")

### 6. Game — revealed (all players see this)
- Card details: year (with ~ if uncertain), title, artist, album art
- Result banner (green/red)
- **Continue** button (always shown, just advances local view to latest snapshot)
- If game has already moved on: show banner "Game has moved on — tap Continue to catch up"

### 7. Game over
- Winner display (same info as winner.html)
- "Play Again" → back to /

---

## Key implementation notes

- **Standalone mode**: If no players are in the room, game works exactly as before. The socket events are emitted but simply have no listeners.
- **QR code**: Use `https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js` → `QRCode.toCanvas(canvasEl, url)` on the game page.
- **Player page URL**: `/player?room=CODE` served as static `player.html`
- **socket.io client script**: Available at `/socket.io/socket.io.js` (auto-served by socket.io)
- **common.js**: Load it on player.html — provides `getDecadeVibe`, `esc` etc.
- **Server structure**: `const httpServer = http.createServer(app); const io = new Server(httpServer);` — `module.exports = app` stays for Vercel (no socket.io on Vercel serverless), `httpServer.listen()` for local.
- **The teams array for the join form**: passed in the URL as `?room=CODE` only; the player page fetches team names by attempting to join (or from a lightweight `/api/room/:code` endpoint the server exposes).
