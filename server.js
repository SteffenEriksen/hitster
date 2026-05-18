'use strict';
require('dotenv').config();

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const SPOTIFY_CONFIG_PATH = process.env.SPOTIFY_CONFIG_PATH ||
  (process.env.HOME
    ? path.join(process.env.HOME, '.raiwork/mcp/spotify-mcp-server/spotify-config.json')
    : null);

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── Auth mode state ──────────────────────────────────────────────────────────

let authMode = 'oauth';  // 'mcp' | 'oauth' — OAuth is the default; MCP is a local personal option

const oauthSession = {
  accessToken:  null,
  refreshToken: null,
  expiresAt:    null,
  displayName:  null,
};

function isLocalhost(req) {
  const addr = req.ip || req.socket?.remoteAddress || '';
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

function localhostOnly(req, res, next) {
  if (!isLocalhost(req)) return res.status(403).json({ error: 'Forbidden: localhost only' });
  next();
}

// ─── Spotify token management ─────────────────────────────────────────────────

function readSpotifyConfig() {
  if (!SPOTIFY_CONFIG_PATH) return null;
  try {
    return JSON.parse(fs.readFileSync(SPOTIFY_CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error('Could not read Spotify config:', e.message);
    return null;
  }
}

function writeSpotifyConfig(config) {
  if (!SPOTIFY_CONFIG_PATH) return;
  fs.writeFileSync(SPOTIFY_CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Returns the Spotify app credentials (clientId + clientSecret).
 * Checks env vars first so public deployments work without the MCP config file.
 * Falls back to the local MCP config file for personal use.
 */
function getClientCredentials() {
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    return { clientId: process.env.SPOTIFY_CLIENT_ID, clientSecret: process.env.SPOTIFY_CLIENT_SECRET };
  }
  const config = readSpotifyConfig();
  return config ? { clientId: config.clientId, clientSecret: config.clientSecret } : null;
}

/** True when all three Spotify env vars are present — no browser login needed. */
function hasEnvAuth() {
  return !!(process.env.SPOTIFY_CLIENT_ID &&
            process.env.SPOTIFY_CLIENT_SECRET &&
            process.env.SPOTIFY_REFRESH_TOKEN);
}

// In-memory cache for env-var token (lost on cold start, refreshed automatically)
const envTokenCache = { accessToken: null, expiresAt: null };

async function getAccessTokenFromEnv() {
  const now = Date.now();
  if (envTokenCache.accessToken && envTokenCache.expiresAt && now < envTokenCache.expiresAt - 60000) {
    return envTokenCache.accessToken;
  }
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    client_id:     process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });
  const data = await spotifyRequest({
    url: 'https://accounts.spotify.com/api/token',
    method: 'POST',
    body: body.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    noAuth: true,
  });
  envTokenCache.accessToken = data.access_token;
  envTokenCache.expiresAt   = Date.now() + data.expires_in * 1000;
  console.log('Spotify token refreshed (env)');
  return envTokenCache.accessToken;
}

async function getAccessTokenMcp() {
  const config = readSpotifyConfig();
  if (!config) throw new Error('No Spotify config found');

  const now = Date.now();
  if (config.accessToken && config.expiresAt && now < config.expiresAt - 60000) {
    return config.accessToken;
  }

  // Refresh token
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const data = await spotifyRequest({
    url: 'https://accounts.spotify.com/api/token',
    method: 'POST',
    body: body.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    noAuth: true,
  });

  config.accessToken = data.access_token;
  config.expiresAt = Date.now() + data.expires_in * 1000;
  if (data.refresh_token) config.refreshToken = data.refresh_token;
  writeSpotifyConfig(config);
  console.log('Spotify token refreshed (MCP)');
  return config.accessToken;
}

async function getAccessTokenOAuth() {
  if (!oauthSession.accessToken) throw new Error('No OAuth session — user must log in at /auth/login');

  const now = Date.now();
  if (oauthSession.expiresAt && now < oauthSession.expiresAt - 60000) {
    return oauthSession.accessToken;
  }

  // Refresh
  const creds = getClientCredentials();
  if (!creds) throw new Error('No Spotify client credentials found — set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: oauthSession.refreshToken,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  const data = await spotifyRequest({
    url: 'https://accounts.spotify.com/api/token',
    method: 'POST',
    body: body.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    noAuth: true,
  });

  oauthSession.accessToken = data.access_token;
  oauthSession.expiresAt   = Date.now() + data.expires_in * 1000;
  if (data.refresh_token) oauthSession.refreshToken = data.refresh_token;
  console.log('Spotify token refreshed (OAuth)');
  return oauthSession.accessToken;
}

function getAccessToken() {
  if (authMode === 'oauth') {
    if (oauthSession.accessToken) return getAccessTokenOAuth();
    if (hasEnvAuth())             return getAccessTokenFromEnv();  // cold-start fallback
    throw new Error('No Spotify session — log in at /auth/login');
  }
  return getAccessTokenMcp();
}

// ─── Generic Spotify HTTP helper ─────────────────────────────────────────────

function spotifyRequest({ url, method = 'GET', body = null, headers = {}, noAuth = false }) {
  return new Promise(async (resolve, reject) => {
    const token = noAuth ? null : await getAccessToken().catch(reject);
    if (!noAuth && !token) return;

    const urlObj = new URL(url);
    const bodyStr = body && typeof body === 'object' ? JSON.stringify(body) : (body || null);
    const reqHeaders = { ...headers };
    if (!noAuth) reqHeaders['Authorization'] = 'Bearer ' + token;
    if (bodyStr) {
      if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: reqHeaders,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (data.trim() === '') {
          if (res.statusCode >= 400) return reject(new Error('Spotify HTTP ' + res.statusCode));
          return resolve({});
        }
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            const msg = json.error?.message || json.error_description || JSON.stringify(json);
            return reject(new Error(msg + ' (' + res.statusCode + ')'));
          }
          resolve(json);
        } catch (e) {
          // Non-JSON body — only a problem when the status is an error
          if (res.statusCode < 400) return resolve({});
          reject(new Error('Spotify error (' + res.statusCode + '): ' + data.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function spotifyGet(endpoint) {
  const url = endpoint.startsWith('https://') ? endpoint : 'https://api.spotify.com/v1' + endpoint;
  return spotifyRequest({ url });
}

function spotifyPut(endpoint, body) {
  return spotifyRequest({ url: 'https://api.spotify.com/v1' + endpoint, method: 'PUT', body });
}

// ─── Track metadata helpers ───────────────────────────────────────────────────

const SUSPECT_KEYWORDS = [
  'remaster', 'greatest hit', 'best of', 'collection', 'anniversary',
  'deluxe', 'expanded', 'compilation', 'essential', 'definitive',
  'very best', 'platinum', 'gold edition', 'complete recording',
  'legacy edition', 'super deluxe', 'reissue', 'special edition',
  'box set', 'retrospective', 'the hits', 'all the hits', 'now that\'s',
  'now music', 'classic', 'icon', 'the ultimate',
];

function isAlbumSuspect(album) {
  if (!album) return true;
  if (album.album_type === 'compilation') return true;
  const name = (album.name || '').toLowerCase();
  return SUSPECT_KEYWORDS.some(kw => name.includes(kw));
}

function cleanTitle(name) {
  return name
    .replace(/\s*[\(\[].*(remaster|remix|version|edit|live|radio|acoustic|mono|stereo|anniversary|reissue|demo|extended|original mix)[^\)\]]*[\)\]]/gi, '')
    .trim();
}

// Catches title-level variants in BOTH parenthesised form — (Re-Recorded) —
// and dash-separated form — "- Re-Recorded", "- Remastered 2011", etc.
// These tracks have their own ISRC that belongs to the variant, so MusicBrainz
// would return the variant's year rather than the original release year.
const TITLE_VARIANT_RE = /[\(\[].*(?:remaster|re.?record|re.?release|re.?issue|remix|version|edit|live|radio|acoustic|mono|stereo|anniversary|demo|extended|original mix)[^\)\]]*[\)\]]|\s+-\s+(?:remaster|re.?record|re.?release|re.?issue|remix|live|radio|acoustic|mono|stereo|anniversary|demo|extended)/i;

function isTitleSuspect(name) {
  return TITLE_VARIANT_RE.test(name);
}

// ─── MusicBrainz helper ───────────────────────────────────────────────────────

const mbYearCache = {};  // isrc → year (in-memory per server session)

function mbRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname + urlObj.search,
      method:   'GET',
      headers: {
        'User-Agent': 'Hitster/1.0 (hitster-game)',
        'Accept':     'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) return reject(new Error('MusicBrainz HTTP ' + res.statusCode));
          resolve(json);
        } catch (e) { reject(new Error('Invalid JSON from MusicBrainz: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Track formatter ──────────────────────────────────────────────────────────

function formatTrack(t) {
  const albumYear    = parseInt((t.album?.release_date || '').split('-')[0]) || null;
  const titleSuspect = isTitleSuspect(t.name);
  const suspect      = isAlbumSuspect(t.album) || titleSuspect;
  return {
    id:           t.id,
    title:        t.name,
    artist:       t.artists.map((a) => a.name).join(', '),
    year:         albumYear,
    suspect,
    titleSuspect, // true = title is a variant (re-recorded, remix, live…) — MB year unreliable
    isrc:         t.external_ids?.isrc || null,
    uri:          t.uri,
    albumArt:     t.album?.images?.[0]?.url || '',
    duration:     t.duration_ms || 0,
  };
}

// ─── API Routes ───────────────────────────────────────────────────────────────

const tracksCache = {};   // playlistId -> resolved track array (in-memory for session)

// ─── Cookie restore ───────────────────────────────────────────────────────────
// On Vercel (serverless), oauthSession is wiped on every cold start.
// We persist the session in an httpOnly cookie so any warm instance can recover.
app.use('/api', (req, _res, next) => {
  if (!oauthSession.accessToken) {
    try {
      const raw = req.headers.cookie || '';
      const match = raw.match(/hitster_session=([^;]+)/);
      if (match) {
        const data = JSON.parse(decodeURIComponent(match[1]));
        if (data.accessToken && data.expiresAt > Date.now()) {
          Object.assign(oauthSession, data);
          if (authMode !== 'mcp') authMode = 'oauth';
          console.log('Session restored from cookie for:', data.displayName);
        }
      }
    } catch (_) {}
  }
  next();
});

// ─── Non-localhost auth promotion ─────────────────────────────────────────────
app.use('/api', (req, res, next) => {
  if (!isLocalhost(req) && authMode === 'mcp' && oauthSession.accessToken) {
    authMode = 'oauth';
    console.log('Auth: auto-promoted to OAuth mode for non-localhost request');
  }
  next();
});

// ─── OAuth required guard ─────────────────────────────────────────────────────
// Block API calls when OAuth mode is active but no session exists AND
// no env-var fallback is configured.
app.use('/api', (req, res, next) => {
  if (authMode === 'oauth' && !oauthSession.accessToken && !hasEnvAuth()) {
    return res.status(401).json({ error: 'Spotify login required', code: 'oauth_required' });
  }
  next();
});

// ─── Official playlist region filter ─────────────────────────────────────────

// Terms that are explicitly allowed (Norway, Sweden, Denmark, Finland, Iceland, UK, US)
const ALLOWED_REGION_RE = /\b(norge?|norsk|norway|norwegian|nordic|norden|Sverige|svensk|sweden|swedish|Danmark|dansk|denmark|danish|Suomi|finnish|finland|Island|ísland|iceland|icelandic|UK|british|england|english|US|usa|american)\b/i;

// Country terms that indicate a region we do NOT want
const EXCLUDED_REGION_RE = /\b(german[y]?|deutsch|österreich|austri[a]?|schweiz|switzerland|swiss|frankreich|france|fran[cç]ais|español|spain|spania|spanien|ital[yi]a?|italia[an]?|portugu[eê]s|portugal|nederland[s]?|dutch|belgi[euë]|vlaanderen|polska|polsk|poland|czech|tjekkisk|slova[kc]|hungarian|ungarn|türk[iey]|turk[ey]+|brasil|brazil|brazil[ia]+|mexic[oa]|latina?|latam|japan[ese]?|日本|korean?|한국|china|chinese|中国|中文|russian?|россия|arabic?|عرب|hindi|india[n]?|philippine|tagalog|malay|indonesia)\b/i;

/**
 * Returns true when a playlist name is within the allowed Nordics/UK/US region
 * or has no recognisable country marker at all.
 */
function isAllowedPlaylist(name) {
  if (ALLOWED_REGION_RE.test(name)) return true;
  if (EXCLUDED_REGION_RE.test(name)) return false;
  return true;   // no country term → allow
}

// List playlists containing "hitster" (case-insensitive)
app.get('/api/playlists', async (req, res) => {
  try {
    const all = [];
    let url = '/me/playlists?limit=50&offset=0';
    while (url) {
      const data = await spotifyGet(url);
      for (const pl of (data.items || [])) {
        if (pl && pl.name.toLowerCase().includes('hitster')) {
          all.push({ id: pl.id, name: pl.name, trackCount: pl.tracks?.total || 0, imageUrl: pl.images?.[0]?.url || '' });
        }
      }
      if (data.next) {
        url = data.next;   // full URL — spotifyGet handles it
      } else {
        url = null;
      }
    }
    res.json(all);
  } catch (e) {
    console.error('/api/playlists error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// All playlists for the logged-in user (no name filter)
app.get('/api/all-playlists', async (req, res) => {
  try {
    const all = [];
    let url = '/me/playlists?limit=50&offset=0';
    while (url) {
      const data = await spotifyGet(url);
      for (const pl of (data.items || [])) {
        if (pl) all.push({ id: pl.id, name: pl.name, trackCount: pl.tracks?.total || 0, imageUrl: pl.images?.[0]?.url || '' });
      }
      url = data.next || null;
    }
    res.json(all);
  } catch (e) {
    console.error('/api/all-playlists error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Search Spotify for official Hitster playlists, filtered to Nordic/UK/US region
app.get('/api/official-playlists', async (req, res) => {
  try {
    const seen = new Set();
    const results = [];

    // Two pages of 50 = up to 100 search results
    for (let offset = 0; offset < 100; offset += 50) {
      const url = '/search?q=hitster&type=playlist&limit=50&offset=' + offset;
      const data = await spotifyGet(url);
      for (const pl of (data.playlists?.items || [])) {
        if (!pl || !pl.id || seen.has(pl.id)) continue;
        if (!isAllowedPlaylist(pl.name)) continue;
        seen.add(pl.id);
        results.push({
          id:         pl.id,
          name:       pl.name,
          owner:      pl.owner?.display_name || pl.owner?.id || '',
          trackCount: pl.tracks?.total || 0,
          imageUrl:   pl.images?.[0]?.url || '',
        });
      }
    }

    // Sort alphabetically
    results.sort((a, b) => a.name.localeCompare(b.name));
    res.json(results);
  } catch (e) {
    console.error('/api/official-playlists error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get all tracks for a playlist (up to 500), with original year resolved
app.get('/api/playlist/:id/tracks', async (req, res) => {
  try {
    const { id } = req.params;
    if (tracksCache[id]) return res.json(tracksCache[id]);

    const rawTracks = [];
    let offset = 0;
    const limit = 100;
    const max   = 500;

    // Collect raw Spotify track objects (album_type needed for suspect flag)
    while (rawTracks.length < max) {
      const fields = 'items(track(id,name,artists,album(name,images,release_date,album_type),uri,duration_ms,external_ids)),next';
      const data   = await spotifyGet(`/playlists/${id}/tracks?limit=${limit}&offset=${offset}&fields=${encodeURIComponent(fields)}`);
      const items  = data.items || [];
      for (const item of items) {
        const t = item.track;
        if (t && t.id) rawTracks.push(t);
      }
      if (!data.next || items.length < limit) break;
      offset += limit;
    }

    // Format tracks — year is raw album year; client resolves per-card via MusicBrainz on draw
    const tracks = rawTracks.map(formatTrack).filter(t => t.year);
    const suspectCount = tracks.filter(t => t.suspect).length;
    console.log(`Tracks: ${tracks.length} total, ${suspectCount} suspect`);

    tracksCache[id] = tracks;
    res.json(tracks);
  } catch (e) {
    console.error('/api/playlist tracks error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Resolve original release year via MusicBrainz ISRC lookup (called per card draw)
app.get('/api/resolve-year-mb', async (req, res) => {
  const { isrc } = req.query;
  if (!isrc) return res.status(400).json({ error: 'isrc required' });

  if (mbYearCache[isrc] !== undefined) return res.json({ year: mbYearCache[isrc] });

  try {
    const url = 'https://musicbrainz.org/ws/2/recording/?query=isrc:' +
                encodeURIComponent(isrc) + '&fmt=json';
    const data = await mbRequest(url);

    let earliest = null;
    for (const recording of (data.recordings || [])) {
      for (const release of (recording.releases || [])) {
        // Prefer the release-group's first release date (most accurate original year)
        const dateStr = release['release-group']?.['first-release-date'] || release.date || '';
        const yr = parseInt(dateStr.split('-')[0]);
        if (yr && yr > 1900 && (!earliest || yr < earliest)) earliest = yr;
      }
    }

    mbYearCache[isrc] = earliest;
    console.log('[MB] ' + isrc + ' → ' + earliest);
    res.json({ year: earliest });
  } catch (e) {
    console.warn('[MB] error for ' + isrc + ':', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Play a track URI on active device.
// If Spotify returns "no active device" (404), automatically find an available
// device, transfer playback to it, and retry — so a briefly-idle Spotify client
// doesn't surface an error to the players.
app.post('/api/play', async (req, res) => {
  try {
    const { uri } = req.body;
    if (!uri) return res.status(400).json({ error: 'uri required' });

    try {
      await spotifyPut('/me/player/play', { uris: [uri] });
    } catch (e) {
      if (!e.message.includes('404') && !/no active device/i.test(e.message)) throw e;

      // Find any available device and wake it up
      const data   = await spotifyGet('/me/player/devices');
      const device = (data.devices || []).find(d => d.is_active) || (data.devices || [])[0];
      if (!device) throw new Error('No Spotify devices available — open Spotify on a device and try again.');

      console.log('/api/play: no active device, transferring to', device.name);
      await spotifyPut('/me/player', { device_ids: [device.id], play: false });
      await new Promise(r => setTimeout(r, 600));   // give Spotify a moment
      await spotifyPut('/me/player/play', { uris: [uri] });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('/api/play error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Pause playback
app.post('/api/pause', async (req, res) => {
  try {
    await spotifyPut('/me/player/pause');
    res.json({ ok: true });
  } catch (e) {
    console.error('/api/pause error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Resume playback
app.post('/api/resume', async (req, res) => {
  try {
    await spotifyPut('/me/player/play');
    res.json({ ok: true });
  } catch (e) {
    console.error('/api/resume error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Seek to a position (position_ms in body, defaults to 0 for restart)
app.post('/api/seek', async (req, res) => {
  try {
    const position_ms = Math.max(0, Math.round(req.body?.position_ms ?? 0));
    await spotifyPut('/me/player/seek?position_ms=' + position_ms);
    res.json({ ok: true });
  } catch (e) {
    console.error('/api/seek error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Auth routes ─────────────────────────────────────────────────────────────
// Derive the base URL from the incoming request so that the OAuth redirect_uri
// works whether the app is accessed via localhost or a tunnel (e.g. dev tunnels,
// ngrok).  Tunnels set X-Forwarded-Proto / X-Forwarded-Host; direct access falls
// back to req.protocol / req.host.
function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host  = req.headers['x-forwarded-host']  || req.get('host') || ('localhost:' + PORT);
  // x-forwarded-proto can be a comma-separated list (e.g. "https, http") — take the first
  return proto.split(',')[0].trim() + '://' + host;
}

app.get('/auth/status', (req, res) => {
  res.json({
    mode:         authMode,
    displayName:  authMode === 'mcp' ? 'MCP account' : (oauthSession.displayName || null),
    oauthLinked:  !!(oauthSession.accessToken),
    envAuth:      hasEnvAuth(),
    // Expose refresh token so the user can copy it into SPOTIFY_REFRESH_TOKEN on Vercel
    refreshToken: oauthSession.refreshToken || null,
  });
});

// Returns the Spotify client ID — safe to expose publicly; needed for client-side PKCE OAuth
app.get('/auth/client-id', (req, res) => {
  const creds = getClientCredentials();
  if (!creds) return res.status(503).json({ error: 'Spotify credentials not configured' });
  res.json({ clientId: creds.clientId });
});

app.post('/auth/mode', (req, res) => {
  const { mode } = req.body || {};
  if (mode !== 'mcp' && mode !== 'oauth') {
    return res.status(400).json({ error: 'mode must be "mcp" or "oauth"' });
  }
  authMode = mode;
  console.log('Auth mode switched to:', authMode);
  res.json({
    mode:        authMode,
    displayName: authMode === 'mcp' ? 'MCP account' : (oauthSession.displayName || null),
    oauthLinked: !!(oauthSession.accessToken),
  });
});

app.get('/auth/login', (req, res) => {
  const creds = getClientCredentials();
  if (!creds) return res.status(500).send('No Spotify credentials — set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your environment or .env file');

  const redirectUri = getBaseUrl(req) + '/auth/callback';
  console.log('OAuth login redirect_uri:', redirectUri);
  const params = new URLSearchParams({
    client_id:     creds.clientId,
    response_type: 'code',
    redirect_uri:  redirectUri,
    scope:         'user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative',
  });
  res.redirect('https://accounts.spotify.com/authorize?' + params.toString());
});

app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.redirect('/?auth_error=' + encodeURIComponent(error));
  if (!code) return res.status(400).send('Missing code');

  const creds = getClientCredentials();
  if (!creds) return res.status(500).send('No Spotify credentials found');

  try {
    const redirectUri = getBaseUrl(req) + '/auth/callback';
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     creds.clientId,
      client_secret: creds.clientSecret,
    });

    const data = await spotifyRequest({
      url: 'https://accounts.spotify.com/api/token',
      method: 'POST',
      body: body.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      noAuth: true,
    });

    oauthSession.accessToken  = data.access_token;
    oauthSession.refreshToken = data.refresh_token;
    oauthSession.expiresAt    = Date.now() + data.expires_in * 1000;

    // Fetch display name
    try {
      const me = await spotifyRequest({ url: 'https://api.spotify.com/v1/me', noAuth: false });
      oauthSession.displayName = me.display_name || me.id || 'Unknown';
    } catch (_) {
      oauthSession.displayName = 'Spotify user';
    }

    authMode = 'oauth';
    console.log('OAuth login complete for:', oauthSession.displayName);

    // Persist session in an httpOnly cookie so Vercel cold starts can restore it
    const sessionPayload = encodeURIComponent(JSON.stringify({
      accessToken:  oauthSession.accessToken,
      refreshToken: oauthSession.refreshToken,
      expiresAt:    oauthSession.expiresAt,
      displayName:  oauthSession.displayName,
    }));
    res.cookie('hitster_session', sessionPayload, {
      httpOnly: true,
      secure:   true,
      sameSite: 'lax',
      maxAge:   30 * 24 * 60 * 60 * 1000,  // 30 days
    });
    res.redirect('/');
  } catch (e) {
    console.error('OAuth callback error:', e.message);
    res.redirect('/?auth_error=' + encodeURIComponent(e.message));
  }
});

app.post('/auth/logout', (req, res) => {
  oauthSession.accessToken  = null;
  oauthSession.refreshToken = null;
  oauthSession.expiresAt    = null;
  oauthSession.displayName  = null;
  res.clearCookie('hitster_session');
  console.log('OAuth session cleared');
  res.json({ ok: true, mode: authMode, oauthLinked: false });
});

// ─── Start ────────────────────────────────────────────────────────────────────

// Export for Vercel (serverless — Vercel creates the HTTP server itself)
module.exports = app;

// Local development: start the server directly
if (require.main === module) {
  http.createServer(app).listen(PORT, () => {
    console.log('Hitster running at http://localhost:' + PORT);
  });
}
