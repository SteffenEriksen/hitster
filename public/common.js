'use strict';

// ─── API helpers ──────────────────────────────────────────────────────────────

const api = {
  async get(path) {
    const res = await fetch(path);
    const json = await res.json();
    if (res.status === 401 && json.code === 'oauth_required') { handleOAuthRequired(); throw new Error('oauth_required'); }
    if (!res.ok) throw new Error(json.error || res.statusText);
    return json;
  },
  async post(path, body = {}) {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (res.status === 401 && json.code === 'oauth_required') { handleOAuthRequired(); throw new Error('oauth_required'); }
    if (!res.ok) throw new Error(json.error || res.statusText);
    return json;
  },
  playlists:          ()     => api.get('/api/playlists'),
  officialPlaylists:  ()     => api.get('/api/official-playlists'),
  tracks:             (id)   => api.get('/api/playlist/' + id + '/tracks'),
  resolveYearMb:      (isrc) => api.get('/api/resolve-year-mb?isrc=' + encodeURIComponent(isrc)),
  play:               (uri)  => api.post('/api/play', { uri }),
  pause:              ()     => api.post('/api/pause'),
  resume:             ()     => api.post('/api/resume'),
  seek:               (position_ms = 0) => api.post('/api/seek', { position_ms }),
};

// ─── Personal Spotify (client-side PKCE OAuth) ────────────────────────────────
// Each player can optionally connect their own Spotify account.
// Tokens live in localStorage — nothing goes to the server.
// If connected, playback calls go directly to Spotify's API from this browser.
// If not, playback falls back to the server's account (host/shared screen).

const PKCE_STORAGE_KEY = 'hitster_personal_spotify';
const PKCE_SCOPE = 'user-read-playback-state user-modify-playback-state';

let _spotifyClientId = null;
async function getSpotifyClientId() {
  if (_spotifyClientId) return _spotifyClientId;
  const data = await api.get('/auth/client-id');
  _spotifyClientId = data.clientId;
  return _spotifyClientId;
}

function pkceGenerateVerifier() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pkceGenerateChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const personalSpotify = {
  token:        null,
  expiresAt:    null,
  refreshToken: null,
  displayName:  null,
  imageUrl:     null,

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(PKCE_STORAGE_KEY) || 'null');
      if (d) {
        this.token = d.token; this.expiresAt = d.expiresAt;
        this.refreshToken = d.refreshToken; this.displayName = d.displayName || null;
        this.imageUrl = d.imageUrl || null;
      }
    } catch (_) {}
  },

  save() {
    localStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify({
      token: this.token, expiresAt: this.expiresAt,
      refreshToken: this.refreshToken, displayName: this.displayName,
      imageUrl: this.imageUrl,
    }));
  },

  isConnected() { return !!(this.token || this.refreshToken); },

  async getToken() {
    if (this.token && this.expiresAt && Date.now() < this.expiresAt - 60000) return this.token;
    if (!this.refreshToken) return null;
    try {
      const clientId = await getSpotifyClientId();
      const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.refreshToken, client_id: clientId });
      const res  = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const data = await res.json();
      if (!data.access_token) { this.disconnect(); return null; }
      this.token     = data.access_token;
      this.expiresAt = Date.now() + data.expires_in * 1000;
      if (data.refresh_token) this.refreshToken = data.refresh_token;
      this.save();
      return this.token;
    } catch (_) { return null; }
  },

  async login() {
    const clientId  = await getSpotifyClientId();
    const verifier  = pkceGenerateVerifier();
    const challenge = await pkceGenerateChallenge(verifier);
    sessionStorage.setItem('pkce_verifier', verifier);
    const params = new URLSearchParams({
      client_id: clientId, response_type: 'code',
      redirect_uri: location.origin + '/',
      code_challenge_method: 'S256', code_challenge: challenge,
      scope: PKCE_SCOPE, state: 'pkce_personal',
      show_dialog: 'true',
    });
    location.href = 'https://accounts.spotify.com/authorize?' + params.toString();
  },

  async handleCallback(code) {
    const verifier = sessionStorage.getItem('pkce_verifier');
    if (!verifier) return false;
    sessionStorage.removeItem('pkce_verifier');
    try {
      const clientId = await getSpotifyClientId();
      const body = new URLSearchParams({
        grant_type: 'authorization_code', code,
        redirect_uri: location.origin + '/',
        client_id: clientId, code_verifier: verifier,
      });
      const res  = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const data = await res.json();
      if (!data.access_token) return false;
      this.token        = data.access_token;
      this.expiresAt    = Date.now() + data.expires_in * 1000;
      this.refreshToken = data.refresh_token;
      const meRes = await fetch('https://api.spotify.com/v1/me', { headers: { 'Authorization': 'Bearer ' + this.token } });
      const me    = await meRes.json();
      this.displayName = me.display_name || me.id || 'Spotify user';
      this.imageUrl    = me.images?.[0]?.url || null;
      this.save();
      return true;
    } catch (_) { return false; }
  },

  disconnect() {
    this.token = null; this.expiresAt = null; this.refreshToken = null;
    this.displayName = null; this.imageUrl = null;
    localStorage.removeItem(PKCE_STORAGE_KEY);
  },

  async spotifyFetch(url, init = {}) {
    const token = await this.getToken();
    if (!token) return null;
    init.headers = Object.assign({ 'Authorization': 'Bearer ' + token }, init.headers || {});
    return fetch(url, init);
  },
};

// ─── Playback wrappers ────────────────────────────────────────────────────────
// All playback goes through the server's logged-in Spotify account.

async function spotifyPlay(uri)             { await api.play(uri); }
async function spotifyPause()               { await api.pause(); }
async function spotifyResume()              { await api.resume(); }
async function spotifySeek(position_ms = 0) { await api.seek(position_ms); }

// ─── Year localStorage cache ──────────────────────────────────────────────────

const YEAR_KEY = 'hitster_year_';

function getYearCache(id) {
  const v = localStorage.getItem(YEAR_KEY + id);
  return v !== null ? parseInt(v, 10) : null;
}

function setYearCache(id, year) {
  try { localStorage.setItem(YEAR_KEY + id, String(year)); } catch (_) {}
}

/** Apply any cached years from localStorage to an array of tracks (mutates). */
function applyYearCache(tracks) {
  for (const t of tracks) {
    const cached = getYearCache(t.id);
    if (cached) t.year = cached;
  }
}

/** Look up the definitive release year for a card via MusicBrainz.
 *  1. localStorage hit → return instantly (no network)
 *  2. card.isrc present → fetch /api/resolve-year-mb, cache result
 *  Always mutates card.year if a better year is found. */
async function resolveCardYearMb(card) {
  const cached = getYearCache(card.id);
  if (cached !== null) {
    card.year = cached;
    return cached;
  }

  if (!card.isrc) {
    setYearCache(card.id, card.year);
    return card.year;
  }

  try {
    const data = await api.resolveYearMb(card.isrc);
    if (data.year) {
      setYearCache(card.id, data.year);
      card.year = data.year;
    } else {
      setYearCache(card.id, card.year);
    }
  } catch (e) {
    console.warn('[MB] year lookup failed for', card.title, ':', e.message);
  }
  return card.year;
}

// ─── Decade vibes ─────────────────────────────────────────────────────────────

const DECADE_VIBES = {
  1920: { era: '1920s', label: 'The Roaring Twenties', emojis: '🎷🥂🎭✨', p: '#7B5800', s: '#3E2000', color: '#B45309' },
  1930: { era: '1930s', label: 'The Swing Era',        emojis: '🎷🎺🎻🕺', p: '#37474F', s: '#1C313A', color: '#475569' },
  1940: { era: '1940s', label: 'The Wartime Era',      emojis: '🎷🎤🥁🎵', p: '#5D4037', s: '#3E2723', color: '#92400E' },
  1950: { era: '1950s', label: 'The Nifty Fifties',    emojis: '🎸🕺🍭🎷', p: '#C2185B', s: '#1565C0', color: '#DB2777' },
  1960: { era: '1960s', label: 'The Swinging Sixties', emojis: '✌️🌸🎸🌈', p: '#6A1B9A', s: '#E65100', color: '#7C3AED' },
  1970: { era: '1970s', label: 'The Groovy Seventies', emojis: '🕺💃🪩🎤', p: '#BF360C', s: '#F57F17', color: '#EA580C' },
  1980: { era: '1980s', label: 'The Awesome Eighties', emojis: '🎮📼🤖💾', p: '#AD1457', s: '#006064', color: '#E91E63' },
  1990: { era: '1990s', label: 'The Nineties',         emojis: '📺🎮💿👟', p: '#004D40', s: '#BF360C', color: '#0D9488' },
  2000: { era: '2000s', label: 'Y2K Era',              emojis: '📱💿🎧🌐', p: '#0D47A1', s: '#4A148C', color: '#2563EB' },
  2010: { era: '2010s', label: 'The Twenty-Tens',      emojis: '📸🎵🎤💫', p: '#1B5E20', s: '#E65100', color: '#059669' },
  2020: { era: '2020s', label: 'The Streaming Era',    emojis: '🎵🔊🌍✨', p: '#0D1B4B', s: '#00494D', color: '#6366F1' },
};

function getDecadeVibe(year) {
  const decade  = Math.floor((year || 2000) / 10) * 10;
  const clamped = Math.max(1920, Math.min(2020, decade));
  for (let d = clamped; d >= 1920; d -= 10) {
    if (DECADE_VIBES[d]) return DECADE_VIBES[d];
  }
  return DECADE_VIBES[2020];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function normAnswer(s) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/, '');
}

function answerMatches(input, correct) {
  const ni = normAnswer(input), nc = normAnswer(correct);
  return ni.length > 0 && (ni === nc || nc.includes(ni) || ni.includes(nc));
}

// ─── OAuth required overlay ───────────────────────────────────────────────────
// Callers can register a custom retry action; default is to reload the page.

let _oauthRetryAction = () => location.reload();

function setOAuthRetryAction(fn) { _oauthRetryAction = fn; }

function handleOAuthRequired() {
  const overlay  = document.getElementById('oauth-overlay');
  const msg      = document.getElementById('oauth-overlay-msg');
  const loginBtn = document.getElementById('oauth-overlay-login');
  const retryBtn = document.getElementById('oauth-overlay-retry');
  if (!overlay) return;

  if (location.hostname === 'localhost') {
    msg.textContent = 'This app needs access to your Spotify account to play music. Click below to log in.';
  } else {
    msg.textContent = 'Spotify login required. Click below — note that the OAuth redirect goes to localhost, so this only works if your browser is on the same machine as the server.';
  }
  loginBtn.classList.remove('hidden');
  overlay.classList.remove('hidden');

  retryBtn.onclick = () => {
    overlay.classList.add('hidden');
    _oauthRetryAction();
  };
}
