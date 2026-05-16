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
  playlists: () => api.get('/api/playlists'),
  officialPlaylists: () => api.get('/api/official-playlists'),
  tracks: (id) => api.get('/api/playlist/' + id + '/tracks'),
  resolveYearMb: (isrc) => api.get('/api/resolve-year-mb?isrc=' + encodeURIComponent(isrc)),
  play: (uri) => api.post('/api/play', { uri }),
  pause: () => api.post('/api/pause'),
  resume: () => api.post('/api/resume'),
  seek: (position_ms = 0) => api.post('/api/seek', { position_ms }),
};

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
    // No ISRC — cache the album year so we don't re-check next time
    setYearCache(card.id, card.year);
    return card.year;
  }

  try {
    const data = await api.resolveYearMb(card.isrc);
    if (data.year) {
      setYearCache(card.id, data.year);
      card.year = data.year;
    } else {
      setYearCache(card.id, card.year);   // mark as checked
    }
  } catch (e) {
    console.warn('[MB] year lookup failed for', card.title, ':', e.message);
    // Don't cache on error — allow retry next draw
  }
  return card.year;
}

// ─── Playback error helpers ───────────────────────────────────────────────────

function showPlaybackError(msg) {
  dom.nowPlayingInfo.textContent = '';
  dom.playbackErrMsg.textContent = msg;
  dom.playbackErrPanel.classList.remove('hidden');
}

function hidePlaybackError() {
  dom.playbackErrPanel.classList.add('hidden');
  dom.playbackErrMsg.textContent = '';
}

// ─── Fun team names ───────────────────────────────────────────────────────────

const FUN_TEAM_NAMES = [
  'The Vinyl Vibes', 'Bass Droppers', 'One Hit Wonders', 'The Chord Destroyers',
  'Pitch Perfect', 'The Tone Deafs', 'Off Key Kings', 'Volume Eleven',
  'The B-Sides', 'Absolute Bangers', 'Dance Floor Disasters', 'The Remix',
  'Audio Nerds', 'Tune Hunters', 'Static Noise', 'The Earworms',
  'Melody Misfits', 'The Shufflers', 'Pocket Full of Hooks', 'Late to the Party',
  'Skip Intro', 'The Discography', 'Chart Toppers', 'Wrong Decade',
  'The Cover Band', 'Track Trackers', 'Banger Alert', 'Aux Cord Warriors',
];

let _namePool = [];
function pickTeamName() {
  if (_namePool.length === 0) _namePool = shuffle([...FUN_TEAM_NAMES]);
  return _namePool.pop();
}

// ─── Playlist tracks cache ────────────────────────────────────────────────────

const tracksCache = {};      // playlistId -> track[]
let   infoFetchSeq = 0;      // cancel stale fetches on fast playlist switching

let myPlaylistsCache    = null;   // cached result of /api/playlists
let officialPlaylistsCache = null; // cached result of /api/official-playlists
let activePlaylistTab   = 'my';   // 'my' | 'official'

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
  const decade = Math.floor((year || 2000) / 10) * 10;
  const clamped = Math.max(1920, Math.min(2020, decade));
  // Walk back to nearest defined decade
  for (let d = clamped; d >= 1920; d -= 10) {
    if (DECADE_VIBES[d]) return DECADE_VIBES[d];
  }
  return DECADE_VIBES[2020];
}

function showDecadeReveal(card) {
  const vibe = getDecadeVibe(card.year);

  // Background gradient
  dom.decadeBg.style.background =
    `linear-gradient(135deg, ${vibe.p} 0%, ${vibe.s} 100%)`;

  // Album art
  dom.decadeArt.src = card.albumArt || '';

  // Text
  dom.decadeEmojis.textContent = vibe.emojis;
  dom.decadeEra.textContent    = vibe.era;
  dom.decadeLabel.textContent  = vibe.label;

  // Floating emoji particles
  const emojis = vibe.emojis.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || ['🎵'];
  dom.decadeParticles.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const e  = emojis[i % emojis.length];
    const x  = Math.round(Math.random() * 100);
    const d  = (2 + Math.random() * 4).toFixed(1);
    const delay = (Math.random() * 3).toFixed(1);
    return `<span class="decade-particle"
      style="left:${x}%;--dur:${d}s;animation-delay:-${delay}s">${e}</span>`;
  }).join('');

  dom.decadeReveal.classList.remove('hidden');
}

function hideDecadeReveal() {
  dom.decadeReveal.classList.add('hidden');
}

// ─── Game state ───────────────────────────────────────────────────────────────

const state = {
  phase: 'setup',        // setup | pre-turn | playing | revealed
  teams: [],             // [{ name, cards: [] }]
  cardsToWin: 8,
  hardModeFinal: false,  // hard mode on the last card only
  hardModeAll: false,    // hard mode on all turns
  allTracks: [],         // all tracks from playlist
  deck: [],              // shuffled, undealt tracks
  activeTeams: [],       // indices into state.teams currently playing
  activeCursor: 0,       // position in activeTeams for current turn
  roundTeamsDone: 0,     // turns completed this round
  isTiebreaker: false,
  currentCard: null,     // track card being placed this turn
  selectedSlot: null,    // slot index chosen by team (null = none chosen)
  isPlaying: false,
  pendingOverturnSlot: null,  // slot saved for potential hard-mode overturn
  _skipToWin: false,          // set when outcome is determined mid-round
  _currentYearPromise: null,  // resolves when MusicBrainz year lookup for current card completes
  _hardModePending:        false,  // true = hardModeAll activates at the start of the next round
  _hardModeDisablePending: false,  // true = hardModeAll deactivates at the start of the next round
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const dom = {
  screens: {
    setup:  $('screen-setup'),
    game:   $('screen-game'),
    winner: $('screen-winner'),
  },
  // Setup
  teamInputs:       $('team-inputs'),
  btnAddTeam:       $('btn-add-team'),
  btnCardsMinus:    $('btn-cards-minus'),
  btnCardsPlus:     $('btn-cards-plus'),
  cardsDisplay:     $('cards-to-win-display'),
  playlistSelect:   $('playlist-select'),
  btnRefresh:       $('btn-refresh-playlists'),
  tabMy:            $('tab-my'),
  tabOfficial:      $('tab-official'),
  playlistInfo:     $('playlist-info'),
  btnStartGame:     $('btn-start-game'),
  setupError:       $('setup-error'),
  // Game
  currentTeamName:  $('current-team-name'),
  deckCounter:      $('deck-counter'),
  scoreChips:       $('score-chips'),
  musicControls:    $('music-controls'),
  btnPauseResume:   $('btn-pause-resume'),
  btnRestart:       $('btn-restart'),
  nowPlayingInfo:   $('now-playing-info'),
  progressBar:      $('progress-bar'),
  progressBarWrap:  $('progress-bar-wrap'),
  progressTime:     $('progress-time'),
  currentTeamBar:   $('current-team-bar'),
  otherTeams:       $('other-teams'),
  startingOverlay:  $('starting-overlay'),
  startingCardsGrid:$('starting-cards-grid'),
  btnLetsPlay:      $('btn-lets-play'),
  // Hard mode challenge
  hardChallenge:    $('hard-challenge'),
  hcTitle:          $('hc-title'),
  hcArtist:         $('hc-artist'),
  btnHcSubmit:      $('btn-hc-submit'),
  btnHcSkip:        $('btn-hc-skip'),
  // Overturn
  overturnSection:  $('overturn-section'),
  btnOverturn:      $('btn-overturn'),
  overturnConfirm:  $('overturn-confirm'),
  overturnTeamName: $('overturn-team-name'),
  btnOverturnYes:   $('btn-overturn-yes'),
  btnOverturnNo:    $('btn-overturn-no'),
  // Sudden death
  suddenDeathOverlay: $('sudden-death-overlay'),
  sdVs:               $('sd-vs'),
  btnSdFight:         $('btn-sd-fight'),
  tbBadge:            $('tb-badge'),
  gamePlaylistInfo:   $('game-playlist-info'),
  // Hard-mode in-game toggle
  btnEnableHard:      $('btn-enable-hard'),
  hardEnableConfirm:  $('hard-enable-confirm'),
  btnHardYes:         $('btn-hard-yes'),
  btnHardNo:          $('btn-hard-no'),
  btnDisableHard:     $('btn-disable-hard'),
  hardDisableConfirm: $('hard-disable-confirm'),
  btnHardDisableYes:  $('btn-hard-disable-yes'),
  btnHardDisableNo:   $('btn-hard-disable-no'),
  hardModeBadge:      $('hard-mode-badge'),
  // Retry / skip on playback failure
  btnRetryPlay:     $('btn-retry-play'),
  btnSkipSong:      $('btn-skip-song'),
  playbackErrPanel: $('playback-error-panel'),
  playbackErrMsg:   $('playback-error-msg'),
  decadeReveal:     $('decade-reveal'),
  decadeBg:         $('decade-bg'),
  decadeParticles:  $('decade-particles'),
  decadeArt:        $('decade-art'),
  decadeEmojis:     $('decade-emojis'),
  decadeEra:        $('decade-era'),
  decadeLabel:      $('decade-label'),
  cardFacedown:     $('card-facedown'),
  cardRevealed:     $('card-revealed'),
  revealYear:       $('reveal-year'),
  revealTitle:      $('reveal-title'),
  revealArtist:     $('reveal-artist'),
  resultBanner:     $('result-banner'),
  resultText:       $('result-text'),
  timeline:         $('timeline'),
  btnStartTurn:     $('btn-start-turn'),
  btnConfirm:       $('btn-confirm'),
  btnDiscard:       $('btn-discard'),
  discardConfirm:   $('discard-confirm'),
  btnDiscardYes:    $('btn-discard-yes'),
  btnDiscardNo:     $('btn-discard-no'),
  btnNextTeam:      $('btn-next-team'),
  // Winner
  winnerTitle:      $('winner-title'),
  winnerSubtitle:   $('winner-subtitle'),
  winnerEmojis:     $('winner-emojis'),
  winnerSongsWrap:  $('winner-songs-wrap'),
  finalScores:      $('final-scores'),
  btnPlayAgain:     $('btn-play-again'),
  matchPointBanner: $('match-point-banner'),
};

// ─── Screen switching ─────────────────────────────────────────────────────────

function showScreen(name) {
  for (const [k, el] of Object.entries(dom.screens)) {
    el.classList.toggle('active', k === name);
  }
}

// ─── Setup screen ─────────────────────────────────────────────────────────────

/** Populate the playlist <select> from a list of playlist objects. */
function setSelectOptions(playlists, showOwner) {
  if (playlists.length === 0) {
    const msg = showOwner
      ? 'No Official Hitster playlists found'
      : 'No "Hitster" playlists found';
    dom.playlistSelect.innerHTML = '<option value="">' + msg + '</option>';
    dom.playlistInfo.textContent = showOwner
      ? 'Try again later — Spotify search may be slow.'
      : 'Create a Spotify playlist with "Hitster" in the name.';
    return;
  }
  dom.playlistSelect.innerHTML = playlists.map(pl => {
    const label = showOwner
      ? pl.name + ' (' + pl.trackCount + ' tracks) — ' + pl.owner
      : pl.name + ' (' + pl.trackCount + ' tracks)';
    return '<option value="' + pl.id + '" data-count="' + pl.trackCount + '">' + label + '</option>';
  }).join('');
  updatePlaylistInfo();
  checkSetupReady();
}

async function loadMyPlaylists(forceReload) {
  if (myPlaylistsCache && !forceReload) {
    setSelectOptions(myPlaylistsCache, false);
    return;
  }
  dom.playlistSelect.innerHTML = '<option value="">Loading…</option>';
  dom.btnStartGame.disabled = true;
  dom.setupError.textContent = '';
  try {
    const playlists = await api.playlists();
    myPlaylistsCache = playlists;
    setSelectOptions(playlists, false);
  } catch (e) {
    dom.playlistSelect.innerHTML = '<option value="">Error loading playlists</option>';
    dom.setupError.textContent = e.message;
  }
}

async function loadOfficialPlaylists(forceReload) {
  if (officialPlaylistsCache && !forceReload) {
    setSelectOptions(officialPlaylistsCache, true);
    return;
  }
  dom.playlistSelect.innerHTML = '<option value="">Loading…</option>';
  dom.btnStartGame.disabled = true;
  dom.setupError.textContent = '';
  try {
    const playlists = await api.officialPlaylists();
    officialPlaylistsCache = playlists;
    setSelectOptions(playlists, true);
  } catch (e) {
    dom.playlistSelect.innerHTML = '<option value="">Error loading playlists</option>';
    dom.setupError.textContent = e.message;
  }
}

function switchPlaylistTab(tab) {
  activePlaylistTab = tab;
  dom.tabMy.classList.toggle('active', tab === 'my');
  dom.tabOfficial.classList.toggle('active', tab === 'official');
  if (tab === 'my') {
    loadMyPlaylists(false);
  } else {
    loadOfficialPlaylists(false);
  }
}

async function updatePlaylistInfo() {
  const opt = dom.playlistSelect.selectedOptions[0];
  if (!opt || !opt.value) { dom.playlistInfo.textContent = ''; return; }

  const playlistId = opt.value;

  // If already cached, apply localStorage and show range
  if (tracksCache[playlistId]) {
    applyYearCache(tracksCache[playlistId]);
    showYearRange(tracksCache[playlistId]);
    return;
  }

  // Fetch with sequence guard so fast switching doesn't show stale results
  const seq = ++infoFetchSeq;
  dom.playlistInfo.textContent = 'Loading…';
  try {
    const tracks = await api.tracks(playlistId);
    if (seq !== infoFetchSeq) return;

    // Apply any years already in localStorage, then cache tracks
    applyYearCache(tracks);
    tracksCache[playlistId] = tracks;
    showYearRange(tracks);
  } catch (_) {
    if (seq !== infoFetchSeq) return;
    dom.playlistInfo.textContent = (opt.dataset.count || '?') + ' tracks';
  }
}

function showYearRange(tracks) {
  const years = tracks.map(t => t.year).filter(Boolean);
  if (years.length === 0) {
    dom.playlistInfo.textContent = tracks.length + ' tracks';
    return;
  }
  const min = Math.min(...years);
  const max = Math.max(...years);
  dom.playlistInfo.textContent = tracks.length + ' tracks · ' + min + ' – ' + max;
}

function checkSetupReady() {
  const inputs = dom.teamInputs.querySelectorAll('.team-name-input');
  const filled = [...inputs].filter(i => i.value.trim()).length;
  dom.btnStartGame.disabled = filled < 2 || !dom.playlistSelect.value;
}

function makeTeamRow(n) {
  const name = pickTeamName();
  const row = document.createElement('div');
  row.className = 'team-input-row';
  row.innerHTML = `
    <span class="team-num">${n}</span>
    <input type="text" class="team-name-input" placeholder="Team name…" maxlength="24">
    <button class="btn-randomise-team" title="Random name">🎲</button>
    <button class="btn-remove-team" title="Remove team">×</button>
  `;
  const input = row.querySelector('.team-name-input');
  input.value = name;
  input.addEventListener('input', checkSetupReady);
  row.querySelector('.btn-randomise-team').addEventListener('click', () => {
    input.value = pickTeamName();
    checkSetupReady();
  });
  row.querySelector('.btn-remove-team').addEventListener('click', () => removeTeamInput(row));
  return row;
}

function addTeamInput() {
  const rows = dom.teamInputs.querySelectorAll('.team-input-row');
  if (rows.length >= 6) return;
  const row = makeTeamRow(rows.length + 1);
  dom.teamInputs.appendChild(row);
  row.querySelector('.team-name-input').focus();
  renumberTeams();
}

function removeTeamInput(row) {
  const rows = dom.teamInputs.querySelectorAll('.team-input-row');
  if (rows.length <= 2) return;   // keep minimum 2 teams
  row.remove();
  renumberTeams();
  checkSetupReady();
}

function renumberTeams() {
  const rows = dom.teamInputs.querySelectorAll('.team-input-row');
  rows.forEach((row, i) => {
    row.querySelector('.team-num').textContent = i + 1;
    const btn = row.querySelector('.btn-remove-team');
    btn.disabled = rows.length <= 2;
  });
  dom.btnAddTeam.disabled = rows.length >= 6;
}

function initTeamInputs() {
  dom.teamInputs.innerHTML = '';
  dom.teamInputs.appendChild(makeTeamRow(1));
  dom.teamInputs.appendChild(makeTeamRow(2));
  renumberTeams();
}

async function startGame() {
  dom.setupError.textContent = '';
  dom.btnStartGame.disabled = true;
  dom.btnStartGame.textContent = 'Loading tracks…';

  try {
    const playlistId = dom.playlistSelect.value;
    const tracks = tracksCache[playlistId] || await api.tracks(playlistId);
    tracksCache[playlistId] = tracks;
    applyYearCache(tracks);   // apply any localStorage-cached resolved years before game starts

    if (tracks.length < 5) {
      dom.setupError.textContent = 'Playlist needs at least 5 tracks with release years.';
      dom.btnStartGame.disabled = false;
      dom.btnStartGame.textContent = 'Start Game';
      return;
    }

    // Build teams
    const inputs = dom.teamInputs.querySelectorAll('.team-name-input');
    state.teams = [...inputs]
      .map(i => i.value.trim())
      .filter(Boolean)
      .map(name => ({ name, cards: [] }));

    state.cardsToWin    = parseInt(dom.cardsDisplay.textContent) || 8;
    state.hardModeFinal = $('toggle-hard-final').checked;
    state.hardModeAll   = $('toggle-hard-all').checked;
    state.allTracks     = tracks;
    state.deck          = shuffle([...tracks]);
    state.activeTeams   = state.teams.map((_, i) => i);
    state.activeCursor  = 0;
    state.roundTeamsDone = 0;
    state.isTiebreaker  = false;
    state.currentCard   = null;
    state.selectedSlot  = null;
    state.isPlaying     = false;

    // Populate playlist info strip in the game header
    const opt = dom.playlistSelect.selectedOptions[0];
    const playlistName = opt ? opt.text.replace(/\s*\(\d[\d\s,]*tracks?\)$/i, '').trim() : '';
    const years = tracks.map(t => t.year).filter(Boolean);
    const minY = years.length ? Math.min(...years) : null;
    const maxY = years.length ? Math.max(...years) : null;
    dom.gamePlaylistInfo.textContent = playlistName +
      (minY && maxY ? '  ·  ' + minY + ' – ' + maxY : '');

    // Deal one starter card to each team (revealed immediately)
    state.teams.forEach(team => {
      const card = drawCard();
      if (card) team.cards.push(card);
    });

    showScreen('game');
    syncHardModeCtl();
    showStartingCards();
  } catch (e) {
    dom.setupError.textContent = 'Error: ' + e.message;
    dom.btnStartGame.disabled = false;
    dom.btnStartGame.textContent = 'Start Game';
  }
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

let _rafHandle = null;
let _playStartTime = null;   // Date.now() when playback last started/resumed
let _playedMs = 0;           // accumulated ms before last pause
let _trackDuration = 0;

function startProgress(durationMs) {
  _trackDuration = durationMs || 0;
  _playStartTime = Date.now();
  _playedMs = 0;
  _tickProgress();
}

function _tickProgress() {
  if (_rafHandle) cancelAnimationFrame(_rafHandle);
  const elapsed = _playedMs + (state.isPlaying && _playStartTime ? Date.now() - _playStartTime : 0);
  const pct = _trackDuration > 0 ? Math.min(100, (elapsed / _trackDuration) * 100) : 0;
  dom.progressBar.style.width = pct + '%';
  const elSec = Math.floor(elapsed / 1000);
  const totSec = Math.floor(_trackDuration / 1000);
  dom.progressTime.textContent = fmtSec(elSec) + ' / ' + fmtSec(totSec);
  if (pct < 100 && state.phase === 'playing') _rafHandle = requestAnimationFrame(_tickProgress);
}

function pauseProgress() {
  _playedMs += _playStartTime ? Date.now() - _playStartTime : 0;
  _playStartTime = null;
  if (_rafHandle) { cancelAnimationFrame(_rafHandle); _rafHandle = null; }
  _tickProgress();   // update display to current position
}

function resumeProgress() {
  _playStartTime = Date.now();
  _tickProgress();
}

function stopProgress() {
  if (_rafHandle) { cancelAnimationFrame(_rafHandle); _rafHandle = null; }
  _playedMs = 0; _playStartTime = null; _trackDuration = 0;
  dom.progressBar.style.width = '0%';
  dom.progressTime.textContent = '0:00 / 0:00';
}

function fmtSec(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ─── Team UI helpers ──────────────────────────────────────────────────────────

function renderCurrentTeamBar() {
  const team = currentTeam();
  const showMp = !state.isTiebreaker &&
    state.teams.some(t => t.cards.length >= state.cardsToWin);
  dom.currentTeamBar.innerHTML =
    `<span class="ctb-label">Now playing</span>` +
    `<span class="ctb-name">${esc(team.name)}</span>` +
    `<span class="ctb-count">${team.cards.length} card${team.cards.length !== 1 ? 's' : ''}</span>` +
    (showMp ? `<span class="mp-badge">🎯 Match Point</span>` : '');
}

function renderOtherTeams() {
  const curIdx = currentTeamIndex();
  const others = state.teams
    .map((t, i) => ({ t, i }))
    .filter(({ i }) => i !== curIdx);

  if (others.length === 0) { dom.otherTeams.innerHTML = ''; return; }

  dom.otherTeams.innerHTML = others.map(({ t }) => {
    const cardsHtml = t.cards.length === 0
      ? `<span class="otr-empty">No cards yet</span>`
      : t.cards.map(c =>
          `<div class="otr-card">
            <div class="otr-year" style="color:${getDecadeVibe(c.year).color}">${c.year}</div>
            <div class="otr-title">${esc(c.title)}</div>
          </div>`
        ).join('');
    return `<div class="other-team-row">
      <span class="otr-name">${esc(t.name)}</span>
      <div class="otr-cards">${cardsHtml}</div>
    </div>`;
  }).join('');
}

// ─── Game screen helpers ──────────────────────────────────────────────────────

function currentTeamIndex() {
  return state.activeTeams[state.activeCursor];
}

function currentTeam() {
  return state.teams[currentTeamIndex()];
}

function renderScoreChips() {
  const curIdx = currentTeamIndex();
  dom.scoreChips.innerHTML = state.teams.map((t, i) => {
    const active = i === curIdx;
    const inGame = !state.isTiebreaker || state.activeTeams.includes(i);
    if (!inGame) return '';
    return `<span class="score-chip${active ? ' active' : ''}">${t.name}: ${t.cards.length}</span>`;
  }).join('');
}

function renderDeckCounter() {
  dom.deckCounter.textContent = state.deck.length + ' cards left';
}

function drawCard() {
  if (state.deck.length === 0) {
    // Reshuffle tracks not in any timeline
    const owned = new Set(state.teams.flatMap(t => t.cards.map(c => c.id)));
    const available = state.allTracks.filter(t => !owned.has(t.id));
    state.deck = shuffle(available.length > 0 ? available : [...state.allTracks]);
  }
  return state.deck.shift();
}

// ─── Phase transitions ────────────────────────────────────────────────────────

function showStartingCards() {
  dom.startingCardsGrid.innerHTML = state.teams.map(t => {
    const c = t.cards[0];
    return `<div class="starting-card-row">
      <div class="starting-card-team">${esc(t.name)}</div>
      <div class="starting-card-info">
        <div class="sc-year">${c ? c.year : '?'}</div>
        <div class="sc-title">${esc(c ? c.title : '—')}</div>
        <div class="sc-artist">${esc(c ? c.artist : '')}</div>
      </div>
    </div>`;
  }).join('');

  dom.startingOverlay.classList.remove('hidden');

  dom.btnLetsPlay.onclick = () => {
    dom.startingOverlay.classList.add('hidden');
    enterPreTurn();
  };
}

// ─── Hard-mode in-game control ────────────────────────────────────────────────

/** Sync the hard-mode enable button / badge to current state. */
function syncHardModeCtl() {
  // Always close both confirms first
  dom.hardEnableConfirm.classList.add('hidden');
  dom.hardDisableConfirm.classList.add('hidden');

  if (state._hardModePending) {
    dom.btnEnableHard.classList.add('hidden');
    dom.btnDisableHard.classList.add('hidden');
    dom.hardModeBadge.textContent = '🧠 Hard Mode: next round';
    dom.hardModeBadge.classList.remove('hidden');
  } else if (state._hardModeDisablePending) {
    dom.btnEnableHard.classList.add('hidden');
    dom.btnDisableHard.classList.add('hidden');
    dom.hardModeBadge.textContent = '🧠 Disabling: next round';
    dom.hardModeBadge.classList.remove('hidden');
  } else if (state.hardModeAll) {
    dom.btnEnableHard.classList.add('hidden');
    dom.btnDisableHard.classList.remove('hidden');
    dom.hardModeBadge.classList.add('hidden');
  } else {
    dom.btnEnableHard.classList.remove('hidden');
    dom.btnDisableHard.classList.add('hidden');
    dom.hardModeBadge.classList.add('hidden');
  }
}

function enterPreTurn() {
  state.phase = 'pre-turn';
  state.currentCard         = null;
  state.selectedSlot        = null;
  state.isPlaying           = false;
  state.pendingOverturnSlot = null;
  state._skipToWin          = false;
  state._currentYearPromise = null;

  // Apply pending hard-mode changes at the start of a fresh round
  if (state._hardModePending && state.roundTeamsDone === 0) {
    state.hardModeAll      = true;
    state._hardModePending = false;
  }
  if (state._hardModeDisablePending && state.roundTeamsDone === 0) {
    state.hardModeAll             = false;
    state._hardModeDisablePending = false;
  }
  syncHardModeCtl();
  dom.btnNextTeam.textContent = 'Next Team →';
  stopProgress();
  hideDecadeReveal();
  dom.hardChallenge.classList.add('hidden');
  dom.overturnSection.classList.add('hidden');
  dom.overturnConfirm.classList.add('hidden');
  hidePlaybackError();
  dom.suddenDeathOverlay.classList.add('hidden');

  // Tiebreaker skin
  const gameEl = dom.screens.game;
  if (state.isTiebreaker) {
    gameEl.classList.add('tiebreaker');
    gameEl.classList.remove('match-point');
    dom.tbBadge.classList.remove('hidden');
    dom.matchPointBanner.classList.add('hidden');
  } else {
    gameEl.classList.remove('tiebreaker');
    dom.tbBadge.classList.add('hidden');

    // Match-point skin — any team has hit the winning threshold
    const atGoal = state.teams.filter(t => t.cards.length >= state.cardsToWin);
    if (atGoal.length > 0) {
      gameEl.classList.add('match-point');
      const names = atGoal.map(t => t.name).join(' & ');
      const verb  = atGoal.length === 1 ? 'has' : 'have';
      dom.matchPointBanner.textContent =
        `🎯 ${names} ${verb} ${atGoal[0].cards.length} cards — last round in progress!`;
      dom.matchPointBanner.classList.remove('hidden');
    } else {
      gameEl.classList.remove('match-point');
      dom.matchPointBanner.classList.add('hidden');
    }
  }

  const team = currentTeam();
  dom.currentTeamName.textContent = team.name;
  renderScoreChips();
  renderDeckCounter();
  renderCurrentTeamBar(); renderOtherTeams();
  renderTimeline(false);  // no slots clickable

  dom.musicControls.classList.add('hidden');
  dom.cardFacedown.classList.add('hidden');
  dom.cardRevealed.classList.add('hidden');
  dom.resultBanner.classList.add('hidden');
  dom.resultBanner.className = 'result-banner hidden';

  dom.btnStartTurn.classList.remove('hidden');
  dom.btnConfirm.classList.add('hidden');
  dom.btnDiscard.classList.add('hidden');
  dom.discardConfirm.classList.add('hidden');
  dom.btnNextTeam.classList.add('hidden');
}

async function beginTurn() {
  const card = drawCard();
  if (!card) return;

  state.currentCard  = card;
  state.selectedSlot = null;
  state.phase        = 'playing';
  state.isPlaying    = false;

  // Kick off MusicBrainz year lookup immediately (non-blocking).
  // confirmPlacement() will await this promise before reading card.year.
  state._currentYearPromise = resolveCardYearMb(card);

  renderDeckCounter();
  renderCurrentTeamBar(); renderOtherTeams();
  dom.btnStartTurn.classList.add('hidden');
  dom.cardFacedown.classList.remove('hidden');
  dom.cardRevealed.classList.add('hidden');
  dom.cardRevealed.classList.remove('wrong');
  dom.resultBanner.classList.add('hidden');
  hideDecadeReveal();
  hidePlaybackError();
  dom.hardChallenge.classList.add('hidden');
  dom.musicControls.classList.remove('hidden');
  dom.discardConfirm.classList.add('hidden');
  dom.btnDiscard.classList.remove('hidden');
  dom.nowPlayingInfo.textContent = '♪ Playing…';
  dom.btnPauseResume.textContent = '⏸ Pause';

  renderTimeline(true);   // enable slots

  try {
    await api.play(card.uri);
    state.isPlaying = true;
    dom.btnPauseResume.textContent = '⏸ Pause';
    hidePlaybackError();
    startProgress(card.duration);
  } catch (e) {
    state.isPlaying = false;
    dom.btnPauseResume.textContent = '▶ Resume';
    showPlaybackError('⚠ ' + e.message);
  }
}

function selectSlot(index) {
  if (state.phase !== 'playing') return;
  state.selectedSlot = index;
  renderTimeline(true);   // re-render to highlight the chosen slot
  dom.btnConfirm.classList.remove('hidden');
}

async function confirmPlacement() {
  if (state.selectedSlot === null || !state.currentCard) return;

  state.phase = 'revealed';
  dom.btnConfirm.classList.add('hidden');
  dom.btnDiscard.classList.add('hidden');
  dom.discardConfirm.classList.add('hidden');

  // Pause music
  try { await api.pause(); } catch (_) {}
  state.isPlaying = false;
  stopProgress();
  dom.btnPauseResume.textContent = '▶ Resume';
  // Don't reveal song title yet — hard mode may be coming and that would be a spoiler

  // Ensure MusicBrainz year is resolved before we check placement correctness
  await state._currentYearPromise;

  // Check placement correctness
  const team  = currentTeam();
  const cards = team.cards;
  const slot  = state.selectedSlot;
  const year  = state.currentCard.year;

  const leftOk  = slot === 0 || cards[slot - 1].year <= year;
  const rightOk = slot >= cards.length || cards[slot].year >= year;
  const correct = leftOk && rightOk;

  if (!correct) {
    // Wrong placement → done, no hard mode check
    finishPlacement(false, slot);
    return;
  }

  // Correct placement — check if hard mode applies
  const isLastCard = team.cards.length === state.cardsToWin - 1;
  const needsHard  = state.hardModeAll ||
                     (state.hardModeFinal && (isLastCard || state.isTiebreaker));

  if (!needsHard) {
    finishPlacement(true, slot);
    return;
  }

  // Hard mode challenge — keep card face-down until after the attempt
  dom.nowPlayingInfo.textContent = '♪ Paused';
  dom.hcTitle.value  = '';
  dom.hcArtist.value = '';
  dom.hcTitle.className  = 'hc-input';
  dom.hcArtist.className = 'hc-input';
  dom.hardChallenge.classList.remove('hidden');
  dom.hcTitle.focus();

  // Return here; finishPlacement is called by the submit/skip handlers below
}

/** Returns true when no remaining team this round can tie or beat the current leader. */
function outcomeAlreadyDetermined() {
  const leaders = state.activeTeams.filter(i => state.teams[i].cards.length >= state.cardsToWin);
  if (leaders.length === 0) return false;

  const maxLeaderCards = Math.max(...leaders.map(i => state.teams[i].cards.length));

  // Teams that haven't played yet this round
  const teamsYetToPlay = state.activeTeams.length - state.roundTeamsDone - 1;
  if (teamsYetToPlay <= 0) return true;   // nobody left — round is already over

  // Can any remaining team reach at least the leader's count?
  for (let i = 1; i <= teamsYetToPlay; i++) {
    const ci      = (state.activeCursor + i) % state.activeTeams.length;
    const teamIdx = state.activeTeams[ci];
    if (state.teams[teamIdx].cards.length + 1 >= maxLeaderCards) return false;
  }
  return true;
}

function finishPlacement(correct, slot, fromHardMode = false) {
  const team = currentTeam();
  dom.hardChallenge.classList.add('hidden');
  dom.overturnSection.classList.add('hidden');
  dom.overturnConfirm.classList.add('hidden');

  // Reveal card face now — deferred from confirmPlacement so the hard-mode prompt
  // is shown while the card is still face-down
  const card = state.currentCard;
  dom.nowPlayingInfo.textContent = card.title + ' – ' + card.artist;
  dom.cardFacedown.classList.add('hidden');
  dom.revealYear.textContent   = card.year || '?';
  dom.revealTitle.textContent  = card.title;
  dom.revealArtist.textContent = card.artist;
  dom.cardRevealed.classList.remove('hidden');

  // Colour the revealed card red when wrong, reset to normal when correct
  dom.cardRevealed.classList.toggle('wrong', !correct);

  // Decade illustration
  showDecadeReveal(state.currentCard);

  // Show result banner
  dom.resultBanner.classList.remove('hidden');
  if (correct) {
    dom.resultBanner.className = 'result-banner correct';
    dom.resultText.textContent = '✓ Correct! Card added to timeline.';
    team.cards.splice(slot, 0, state.currentCard);
  } else {
    dom.resultBanner.className = 'result-banner wrong';
    dom.resultText.textContent = '✗ Wrong! Card discarded.';

    // Offer overturn only for hard-mode failures
    if (fromHardMode) {
      state.pendingOverturnSlot = slot;
      dom.overturnTeamName.textContent = team.name;
      dom.overturnSection.classList.remove('hidden');
    }
  }

  renderTimeline(false);
  renderCurrentTeamBar(); renderOtherTeams();

  if (correct && outcomeAlreadyDetermined()) {
    // No remaining team can tie or beat the leader — skip to results
    state._skipToWin = true;
    dom.btnNextTeam.textContent = '🏆 See Results!';
    dom.btnNextTeam.classList.remove('hidden');
    // Auto-advance after 3 s so players can see the reveal
    setTimeout(() => {
      if (state._skipToWin && state.phase === 'revealed') nextTeam();
    }, 3000);
  } else {
    dom.btnNextTeam.textContent = 'Next Team →';
    dom.btnNextTeam.classList.remove('hidden');
  }
}

function overturnPlacement() {
  const slot = state.pendingOverturnSlot;
  if (slot === null || !state.currentCard) return;

  const team = currentTeam();
  team.cards.splice(slot, 0, state.currentCard);
  state.pendingOverturnSlot = null;

  dom.overturnSection.classList.add('hidden');
  dom.resultBanner.className = 'result-banner correct';
  dom.resultText.textContent = '↩ Overturned! Card awarded to ' + team.name + '.';

  renderTimeline(false);
  renderCurrentTeamBar(); renderOtherTeams();
}

function nextTeam() {
  state.roundTeamsDone++;

  // Advance cursor (wraps within activeTeams)
  state.activeCursor = (state.activeCursor + 1) % state.activeTeams.length;

  // If outcome was already determined mid-round, skip straight to the win check
  if (state._skipToWin) {
    state._skipToWin    = false;
    state.roundTeamsDone = 0;
    checkWinCondition();
    return;
  }

  // Full round complete?
  if (state.roundTeamsDone >= state.activeTeams.length) {
    state.roundTeamsDone = 0;
    checkWinCondition();
    return;  // checkWinCondition may call enterPreTurn or showWinner
  }

  enterPreTurn();
}

// ─── Win condition ────────────────────────────────────────────────────────────

function showSuddenDeath() {
  // Build VS display with tied team names
  dom.sdVs.innerHTML = state.activeTeams.map((i, idx) => {
    const sep = idx < state.activeTeams.length - 1
      ? '<span class="sd-versus">VS</span>'
      : '';
    return `<span class="sd-team-name">${esc(state.teams[i].name)}</span>${sep}`;
  }).join('');

  dom.suddenDeathOverlay.classList.remove('hidden');
}

function checkWinCondition() {
  const qualifying = state.activeTeams.filter(i => state.teams[i].cards.length >= state.cardsToWin);
  if (qualifying.length === 0) {
    enterPreTurn();
    return;
  }

  const maxCards = Math.max(...qualifying.map(i => state.teams[i].cards.length));
  const leaders  = qualifying.filter(i => state.teams[i].cards.length === maxCards);

  if (leaders.length === 1) {
    showWinnerScreen(leaders);
  } else {
    // Tiebreaker
    const prevTeamCount = state.isTiebreaker ? state.activeTeams.length : Infinity;
    state.isTiebreaker   = true;
    state.activeTeams    = leaders;
    state.activeCursor   = 0;
    state.roundTeamsDone = 0;

    // Show sudden-death screen only on first entry or when the field narrows
    if (leaders.length < prevTeamCount) {
      showSuddenDeath();
    } else {
      enterPreTurn();  // same teams still tied — carry on without drama
    }
  }
}

// ─── Timeline rendering ───────────────────────────────────────────────────────

function renderTimeline(interactive) {
  const team     = currentTeam();
  const cards    = team.cards;
  const timeline = dom.timeline;
  timeline.innerHTML = '';

  if (cards.length === 0 && !interactive) {
    const empty = document.createElement('div');
    empty.className = 'timeline-empty';
    empty.textContent = 'No cards yet — start a turn!';
    timeline.appendChild(empty);
    return;
  }

  const totalSlots = cards.length + 1;
  const row = document.createElement('div');
  row.className = 'timeline-row';

  for (let i = 0; i < totalSlots; i++) {
    // Slot
    const slot = document.createElement('div');
    slot.className = 'timeline-slot';
    if (interactive) {
      if (state.selectedSlot === i) slot.classList.add('selected');
      const btn = document.createElement('button');
      btn.className = 'slot-btn';
      btn.textContent = '+';
      btn.setAttribute('aria-label', slotLabel(cards, i));
      btn.addEventListener('click', () => selectSlot(i));
      slot.appendChild(btn);
      slot.addEventListener('click', () => selectSlot(i));
    } else {
      const dot = document.createElement('div');
      dot.style.cssText = 'width:2px;height:40px;background:var(--grey-100);border-radius:1px;margin:auto';
      slot.appendChild(dot);
      slot.style.cursor = 'default';
    }
    row.appendChild(slot);

    // Card after slot (if any)
    if (i < cards.length) {
      const card = cards[i];
      const cardEl = document.createElement('div');
      cardEl.className = 'timeline-card large';
      const yearColor = getDecadeVibe(card.year).color;
      cardEl.innerHTML = `
        <div class="tc-year" style="color:${yearColor}">${card.year}</div>
        <div class="tc-title">${esc(card.title)}</div>
        <div class="tc-artist">${esc(card.artist)}</div>
      `;
      row.appendChild(cardEl);
    }
  }

  timeline.appendChild(row);

  // Scroll selected slot into view
  if (interactive && state.selectedSlot !== null) {
    const selected = row.querySelector('.timeline-slot.selected');
    if (selected) selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function slotLabel(cards, i) {
  if (cards.length === 0) return 'Here';
  if (i === 0) return 'Before ' + cards[0].year;
  if (i === cards.length) return 'After ' + cards[cards.length - 1].year;
  return 'Between ' + cards[i - 1].year + ' and ' + cards[i].year;
}

// ─── Winner screen ────────────────────────────────────────────────────────────

const WIN_EMOJIS = [
  ['🎉','🏆','🎉'], ['🌟','🥇','🌟'], ['🎊','👑','🎊'],
  ['🔥','🏆','🔥'], ['🎵','🥇','🎵'], ['⭐','🏅','⭐'],
];

function showWinnerScreen(winnerIndices) {
  state.phase = 'finished';
  const winners = winnerIndices.map(i => state.teams[i]);
  const isTied  = winners.length > 1;

  // Pick random emoji set for the hero
  const emojis = WIN_EMOJIS[Math.floor(Math.random() * WIN_EMOJIS.length)];
  dom.winnerEmojis.textContent = emojis.join(' ');

  dom.winnerTitle.textContent =
    isTied ? winners.map(t => t.name).join(' & ') + ' tie!' : winners[0].name + ' wins!';
  dom.winnerSubtitle.textContent =
    isTied
      ? `Both tied with ${winners[0].cards.length} cards — incredible!`
      : `${winners[0].cards.length} songs placed correctly 🎵`;

  // Build song list(s) for each winner
  dom.winnerSongsWrap.innerHTML = winners.map(team => {
    const rows = team.cards.map(card => {
      const color = getDecadeVibe(card.year).color;
      return `<div class="winner-song-card">
        <span class="wsc-year" style="color:${color}">${card.year}</span>
        <div class="wsc-info">
          <div class="wsc-title">${esc(card.title)}</div>
          <div class="wsc-artist">${esc(card.artist)}</div>
        </div>
      </div>`;
    }).join('');
    const header = isTied
      ? `🎵 ${esc(team.name)} — ${team.cards.length} songs`
      : `🎵 Winning songs (${team.cards.length})`;
    return `<div class="winner-songs-block">
      <div class="winner-songs-header">${header}</div>
      ${rows}
    </div>`;
  }).join('');

  // Other teams (compact row)
  const winnerSet = new Set(winners.map(t => t.name));
  const others    = state.teams
    .filter(t => !winnerSet.has(t.name))
    .sort((a, b) => b.cards.length - a.cards.length);

  dom.finalScores.innerHTML = others.length === 0 ? '' :
    `<div class="final-scores-label">Other teams</div>` +
    others.map(t =>
      `<div class="final-score-row">
        <span class="final-score-name">${esc(t.name)}</span>
        <span class="final-score-cards">${t.cards.length} cards</span>
      </div>`
    ).join('');
  dom.finalScores.style.display = others.length === 0 ? 'none' : '';

  showScreen('winner');
  // Defer the scroll reset until after the browser has painted the new screen
  requestAnimationFrame(() => { dom.screens.winner.scrollTop = 0; });
  launchConfetti();
}

function launchConfetti() {
  const canvas = $('confetti-canvas');
  const myConfetti = confetti.create(canvas, { resize: true });
  const colors = [
    '#ff0080', '#ff8c00', '#ffe400', '#00e676',
    '#00b0ff', '#e040fb', '#ff4081', '#ffffff',
  ];

  function burst(opts) { myConfetti({ spread: 100, ticks: 120, colors, ...opts }); }

  // Initial triple burst
  burst({ particleCount: 120, origin: { y: 0.5 }, angle: 90 });
  setTimeout(() => burst({ particleCount: 80,  origin: { x: 0.1, y: 0.6 }, angle: 60  }), 400);
  setTimeout(() => burst({ particleCount: 80,  origin: { x: 0.9, y: 0.6 }, angle: 120 }), 700);
  setTimeout(() => burst({ particleCount: 120, origin: { y: 0.4 }, angle: 90  }), 1200);

  // Continuous light shower
  let remaining = 8;
  const shower = setInterval(() => {
    if (--remaining <= 0) { clearInterval(shower); return; }
    burst({ particleCount: 30, origin: { x: Math.random(), y: 0.3 }, scalar: 0.8 });
  }, 600);
}

function resetGame() {
  // Reset state
  state.phase          = 'setup';
  state.teams          = [];
  state.allTracks      = [];
  state.deck           = [];
  state.activeTeams    = [];
  state.activeCursor   = 0;
  state.roundTeamsDone = 0;
  state.isTiebreaker        = false;
  state.hardModeFinal            = false;
  state.hardModeAll              = false;
  state._hardModePending         = false;
  state._hardModeDisablePending  = false;
  state.currentCard         = null;
  state.selectedSlot        = null;
  state.isPlaying           = false;
  state.pendingOverturnSlot = null;
  state._skipToWin          = false;
  state._currentYearPromise = null;
  dom.btnNextTeam.textContent = 'Next Team →';
  dom.screens.game.classList.remove('tiebreaker');
  dom.screens.game.classList.remove('match-point');
  dom.tbBadge.classList.add('hidden');
  dom.matchPointBanner.classList.add('hidden');
  dom.gamePlaylistInfo.textContent = '';

  // Reset setup form
  dom.btnStartGame.disabled = false;
  dom.btnStartGame.textContent = 'Start Game';
  dom.setupError.textContent  = '';
  initTeamInputs();

  showScreen('setup');
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
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Event listeners ──────────────────────────────────────────────────────────

// Setup
dom.btnAddTeam.addEventListener('click', addTeamInput);

dom.btnCardsMinus.addEventListener('click', () => {
  const n = parseInt(dom.cardsDisplay.textContent);
  if (n > 3) dom.cardsDisplay.textContent = n - 1;
});
dom.btnCardsPlus.addEventListener('click', () => {
  const n = parseInt(dom.cardsDisplay.textContent);
  if (n < 20) dom.cardsDisplay.textContent = n + 1;
});

dom.playlistSelect.addEventListener('change', () => { updatePlaylistInfo(); checkSetupReady(); });
dom.btnRefresh.addEventListener('click', () => {
  if (activePlaylistTab === 'my') loadMyPlaylists(true);
  else loadOfficialPlaylists(true);
});
dom.tabMy.addEventListener('click', () => switchPlaylistTab('my'));
dom.tabOfficial.addEventListener('click', () => switchPlaylistTab('official'));
dom.btnStartGame.addEventListener('click', startGame);

// Game
dom.btnStartTurn.addEventListener('click', beginTurn);
dom.btnConfirm.addEventListener('click', confirmPlacement);
dom.btnDiscard.addEventListener('click', () => {
  // First click — show inline confirmation, keep music playing
  dom.btnDiscard.classList.add('hidden');
  dom.discardConfirm.classList.remove('hidden');
});

dom.btnDiscardYes.addEventListener('click', () => {
  dom.discardConfirm.classList.add('hidden');
  state.currentCard = null;
  state._currentYearPromise = null;
  beginTurn();
});

dom.btnDiscardNo.addEventListener('click', () => {
  dom.discardConfirm.classList.add('hidden');
  dom.btnDiscard.classList.remove('hidden');
});
dom.btnNextTeam.addEventListener('click', nextTeam);

// Hard mode challenge submit
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

dom.btnHcSubmit.addEventListener('click', () => {
  const slot     = state.selectedSlot;
  const card     = state.currentCard;
  const titleOk  = answerMatches(dom.hcTitle.value,  card.title);
  const artistOk = answerMatches(dom.hcArtist.value, card.artist);

  dom.hcTitle.className  = 'hc-input ' + (titleOk  ? 'correct' : 'wrong');
  dom.hcArtist.className = 'hc-input ' + (artistOk ? 'correct' : 'wrong');

  if (titleOk && artistOk) {
    setTimeout(() => finishPlacement(true,  slot, true), 600);
  } else {
    setTimeout(() => finishPlacement(false, slot, true), 900);
  }
});

dom.btnHcSkip.addEventListener('click', () => {
  finishPlacement(false, state.selectedSlot, true);
});

// Overturn handlers
dom.btnOverturn.addEventListener('click', () => {
  dom.overturnConfirm.classList.remove('hidden');
  dom.btnOverturn.classList.add('hidden');
});
dom.btnOverturnNo.addEventListener('click', () => {
  dom.overturnConfirm.classList.add('hidden');
  dom.btnOverturn.classList.remove('hidden');
});
dom.btnOverturnYes.addEventListener('click', () => {
  overturnPlacement();
});

// Sudden-death fight button — dismiss overlay and start tiebreaker
dom.btnSdFight.addEventListener('click', () => {
  dom.suddenDeathOverlay.classList.add('hidden');
  enterPreTurn();
});

// Hard-mode in-game enable
dom.btnEnableHard.addEventListener('click', () => {
  dom.btnEnableHard.classList.add('hidden');
  dom.hardEnableConfirm.classList.remove('hidden');
});

dom.btnHardNo.addEventListener('click', () => {
  syncHardModeCtl();   // restores button, hides confirm
});

dom.btnHardYes.addEventListener('click', () => {
  if (state.roundTeamsDone === 0) {
    // No team has played this round — take effect immediately
    state.hardModeAll = true;
  } else {
    // At least one team already played this round — defer to next round
    state._hardModePending = true;
  }
  syncHardModeCtl();
});

dom.btnDisableHard.addEventListener('click', () => {
  dom.btnDisableHard.classList.add('hidden');
  dom.hardDisableConfirm.classList.remove('hidden');
});

dom.btnHardDisableNo.addEventListener('click', () => {
  syncHardModeCtl();
});

dom.btnHardDisableYes.addEventListener('click', () => {
  if (state.roundTeamsDone === 0) {
    state.hardModeAll = false;
  } else {
    state._hardModeDisablePending = true;
  }
  syncHardModeCtl();
});

dom.hcTitle.addEventListener('keydown',  e => { if (e.key === 'Enter') dom.hcArtist.focus(); });
dom.hcArtist.addEventListener('keydown', e => { if (e.key === 'Enter') dom.btnHcSubmit.click(); });

// Retry / skip on playback failure
dom.btnRetryPlay.addEventListener('click', async () => {
  dom.playbackErrPanel.classList.add('hidden');
  dom.nowPlayingInfo.textContent = '↺ Retrying…';
  try {
    await api.play(state.currentCard.uri);
    state.isPlaying = true;
    dom.btnPauseResume.textContent = '⏸ Pause';
    hidePlaybackError();
    dom.nowPlayingInfo.textContent = '♪ Playing…';
    startProgress(state.currentCard.duration);
  } catch (e) {
    showPlaybackError('⚠ ' + e.message);
  }
});

dom.btnSkipSong.addEventListener('click', () => {
  hidePlaybackError();
  // Put current card back in deck and draw a new one
  if (state.currentCard) state.deck.push(state.currentCard);
  beginTurn();
});

dom.btnPauseResume.addEventListener('click', async () => {
  try {
    if (state.isPlaying) {
      await api.pause();
      state.isPlaying = false;
      pauseProgress();
      dom.btnPauseResume.textContent = '▶ Resume';
    } else {
      await api.resume();
      state.isPlaying = true;
      resumeProgress();
      dom.btnPauseResume.textContent = '⏸ Pause';
    }
  } catch (e) {
    dom.nowPlayingInfo.textContent = '⚠ ' + e.message;
  }
});

dom.btnRestart.addEventListener('click', async () => {
  try {
    await api.seek();
    _playedMs = 0;
    _playStartTime = Date.now();
    if (!state.isPlaying) {
      await api.resume();
      state.isPlaying = true;
      dom.btnPauseResume.textContent = '⏸ Pause';
    }
    resumeProgress();
  } catch (e) {
    dom.nowPlayingInfo.textContent = '⚠ ' + e.message;
  }
});

dom.progressBarWrap.addEventListener('click', async (e) => {
  if (_trackDuration === 0) return;
  const rect = dom.progressBarWrap.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const position_ms = Math.round(pct * _trackDuration);

  // Update the progress indicator immediately so the UI feels responsive
  _playedMs = position_ms;
  _playStartTime = state.isPlaying ? Date.now() : null;
  _tickProgress();

  try {
    await api.seek(position_ms);
  } catch (err) {
    dom.nowPlayingInfo.textContent = '⚠ ' + err.message;
  }
});

// Winner
dom.btnPlayAgain.addEventListener('click', resetGame);

// ─── OAuth required overlay ───────────────────────────────────────────────────

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
    // Re-trigger the active playlist tab load so the first real API call retries
    if (activePlaylistTab === 'my') loadMyPlaylists(true);
    else loadOfficialPlaylists(true);
  };
}

// ─── Auth panel (localhost only) ──────────────────────────────────────────────

const authPanel = {
  el:          document.getElementById('auth-panel'),
  modeLabel:   document.getElementById('auth-mode-label'),
  displayName: document.getElementById('auth-display-name'),
  actions:     document.getElementById('auth-actions'),

  async refresh() {
    try {
      const s = await api.get('/auth/status');
      this.render(s);
    } catch (_) { /* non-localhost or server not ready */ }
  },

  render(s) {
    this.modeLabel.textContent = s.mode === 'oauth' ? '🔑 OAuth' : '🔧 MCP';
    this.displayName.textContent = s.displayName ? '· ' + s.displayName : '';

    const btns = [];
    if (s.mode === 'mcp') {
      btns.push('<button class="auth-btn" id="auth-btn-switch-oauth">Switch to OAuth</button>');
    } else {
      if (s.oauthLinked) {
        btns.push('<button class="auth-btn" id="auth-btn-logout">Logout</button>');
      } else if (!s.envAuth) {
        btns.push('<button class="auth-btn" id="auth-btn-login">Login with Spotify</button>');
      }
      btns.push('<button class="auth-btn auth-btn-ghost" id="auth-btn-switch-mcp">Use MCP</button>');
    }
    // Show refresh token copy helper when logged in and env var not yet set
    if (s.oauthLinked && s.refreshToken && !s.envAuth) {
      btns.push('<button class="auth-btn auth-btn-copy-rt" id="auth-btn-copy-rt" title="' + s.refreshToken + '">📋 Copy refresh token for Vercel</button>');
    }
    this.actions.innerHTML = btns.join('');

    const btnSwitchOAuth = document.getElementById('auth-btn-switch-oauth');
    if (btnSwitchOAuth) {
      btnSwitchOAuth.addEventListener('click', async () => {
        const s2 = await api.post('/auth/mode', { mode: 'oauth' });
        if (!s2.oauthLinked) { location.href = '/auth/login'; return; }
        this.render(s2);
      });
    }
    const btnSwitchMcp = document.getElementById('auth-btn-switch-mcp');
    if (btnSwitchMcp) {
      btnSwitchMcp.addEventListener('click', async () => {
        const s2 = await api.post('/auth/mode', { mode: 'mcp' });
        this.render(s2);
      });
    }
    const btnLogin = document.getElementById('auth-btn-login');
    if (btnLogin) {
      btnLogin.addEventListener('click', () => { location.href = '/auth/login'; });
    }
    const btnLogout = document.getElementById('auth-btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await api.post('/auth/logout');
        await this.refresh();
      });
    }
    const btnCopyRt = document.getElementById('auth-btn-copy-rt');
    if (btnCopyRt) {
      btnCopyRt.addEventListener('click', () => {
        navigator.clipboard.writeText(btnCopyRt.title)
          .then(() => { btnCopyRt.textContent = '✓ Copied!'; setTimeout(() => { btnCopyRt.textContent = '📋 Copy refresh token for Vercel'; }, 2000); })
          .catch(() => { prompt('Copy this refresh token and add it as SPOTIFY_REFRESH_TOKEN in Vercel:', btnCopyRt.title); });
      });
    }
  },

  init() {
    this.el.classList.remove('hidden');
    this.refresh();
  },
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

initTeamInputs();
loadMyPlaylists();
authPanel.init();

