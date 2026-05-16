# 🎵 Hitster

A web-based version of the [Hitster](https://hitstergame.com) timeline card game, powered by Spotify.

Players take turns drawing song cards and placing them in the correct chronological position on their personal timeline. First to collect enough cards wins.

---

## Features

- Spotify playback integration — songs play directly from your account
- MusicBrainz year resolution for accurate original release dates
- My Playlists tab + Official Hitster playlists tab (filtered to Nordic/UK/US)
- Hard mode, sudden death tiebreaker, overturn challenges
- Works locally or over a shared tunnel (VS Code dev tunnels, ngrok, etc.)

---

## Requirements

- [Node.js](https://nodejs.org) 18+
- A [Spotify Premium](https://spotify.com/premium) account (required for playback control)
- A Spotify Developer app (free to create)

---

## Setup

### 1. Create a Spotify app

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Under **Redirect URIs**, add:
   - `http://localhost:3001/auth/callback` (for local use)
   - Your tunnel URL if using one, e.g. `https://xxxx-3001.euw.devtunnels.ms/auth/callback`
3. Note down your **Client ID** and **Client Secret**.

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
PORT=3001
```

### 3. Install and run

```bash
npm install
npm start
```

Then open [http://localhost:3001](http://localhost:3001).

### 4. Log in to Spotify

On first run, click **Login with Spotify** in the auth panel (top-right corner). After approving access you'll be redirected back and the app is ready to play.

---

## Sharing over a tunnel

The app works over VS Code dev tunnels, ngrok, or similar. The OAuth redirect URI is derived dynamically from the incoming request, so it works regardless of the URL — just make sure that URL is added to your Spotify app's allowed redirect URIs.

---

## Running a game

1. Add team names (2–6 players)
2. Choose how many cards to win (default 10)
3. Select a Hitster playlist
4. Click **Start Game**

Each team takes turns: draw a card → Spotify plays the song → place it in the right year on your timeline → confirm. Get it right, keep the card. Get it wrong, it goes back to the deck.

---

## Auth modes

| Mode | When to use |
|------|-------------|
| **OAuth** (default) | Standard — log in with any Spotify account via the browser |
| **MCP** | Personal shortcut — reads credentials from a local config file; switch to it in the auth panel |
