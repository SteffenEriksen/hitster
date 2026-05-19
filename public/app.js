'use strict';

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

const tracksCache     = {};       // playlistId -> track[]
let   infoFetchSeq    = 0;        // cancel stale fetches on fast playlist switching
let   myPlaylistsCache      = null;
let   allPlaylistsCache     = null;
let   officialPlaylistsCache = null;
let   activePlaylistTab     = 'my';   // 'my' | 'all' | 'search' | 'official'

// ─── DOM refs (setup screen) ──────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const dom = {
  teamInputs:     $('team-inputs'),
  btnAddTeam:     $('btn-add-team'),
  btnCardsMinus:  $('btn-cards-minus'),
  btnCardsPlus:   $('btn-cards-plus'),
  cardsDisplay:   $('cards-to-win-display'),
  playlistSelect: $('playlist-select'),
  btnRefresh:     $('btn-refresh-playlists'),
  tabMy:          $('tab-my'),
  tabAll:         $('tab-all'),
  tabSearch:      $('tab-search'),
  tabOfficial:    $('tab-official'),
  playlistFilterWrap:  $('playlist-filter-wrap'),
  playlistFilter:      $('playlist-filter'),
  playlistSearchWrap:  $('playlist-search-wrap'),
  playlistSearchInput: $('playlist-search-input'),
  btnPlaylistSearch:   $('btn-playlist-search'),
  playlistMinTracksWrap: $('playlist-min-tracks-wrap'),
  toggleMinTracks:       $('toggle-min-tracks'),
  playlistInfo:   $('playlist-info'),
  btnStartGame:   $('btn-start-game'),
  setupError:     $('setup-error'),
};

// ─── Setup screen ─────────────────────────────────────────────────────────────

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
  if (myPlaylistsCache && !forceReload) { setSelectOptions(myPlaylistsCache, false); return; }
  dom.playlistSelect.innerHTML = '<option value="">Loading…</option>';
  dom.btnStartGame.disabled = true;
  dom.setupError.textContent = '';
  try {
    myPlaylistsCache = await api.playlists();
    setSelectOptions(myPlaylistsCache, false);
  } catch (e) {
    dom.playlistSelect.innerHTML = '<option value="">Error loading playlists</option>';
    dom.setupError.textContent = e.message;
  }
}

async function loadOfficialPlaylists(forceReload) {
  if (officialPlaylistsCache && !forceReload) { setSelectOptions(officialPlaylistsCache, true); return; }
  dom.playlistSelect.innerHTML = '<option value="">Loading…</option>';
  dom.btnStartGame.disabled = true;
  dom.setupError.textContent = '';
  try {
    officialPlaylistsCache = await api.officialPlaylists();
    setSelectOptions(officialPlaylistsCache, true);
  } catch (e) {
    dom.playlistSelect.innerHTML = '<option value="">Error loading playlists</option>';
    dom.setupError.textContent = e.message;
  }
}

async function loadAllPlaylists(forceReload) {
  if (allPlaylistsCache && !forceReload) { applyAllPlaylistsFilter(); return; }
  dom.playlistSelect.innerHTML = '<option value="">Loading…</option>';
  dom.btnStartGame.disabled = true;
  dom.setupError.textContent = '';
  try {
    allPlaylistsCache = await api.get('/api/all-playlists');
    applyAllPlaylistsFilter();
  } catch (e) {
    dom.playlistSelect.innerHTML = '<option value="">Error loading playlists</option>';
    dom.setupError.textContent = e.message;
  }
}

function applyAllPlaylistsFilter() {
  if (!allPlaylistsCache) return;
  const q      = dom.playlistFilter.value.toLowerCase().trim();
  const minFifty = dom.toggleMinTracks.checked;
  let filtered = allPlaylistsCache;
  if (q)        filtered = filtered.filter(pl => pl.name.toLowerCase().includes(q));
  if (minFifty) filtered = filtered.filter(pl => pl.trackCount >= 50);
  setSelectOptions(filtered, false);
}

let _searchDebounce = null;

async function loadSearchPlaylists(q) {
  q = (q || '').trim();
  if (!q) {
    dom.playlistSelect.innerHTML = '<option value="">Type to search Spotify playlists…</option>';
    dom.playlistInfo.textContent = '';
    dom.btnStartGame.disabled = true;
    return;
  }
  dom.playlistSelect.innerHTML = '<option value="">Searching…</option>';
  dom.btnStartGame.disabled = true;
  dom.setupError.textContent = '';
  try {
    let playlists = await api.get('/api/search-playlists?q=' + encodeURIComponent(q));
    if (dom.toggleMinTracks.checked) playlists = playlists.filter(pl => pl.trackCount >= 50);
    setSelectOptions(playlists, true);
  } catch (e) {
    dom.playlistSelect.innerHTML = '<option value="">Search failed</option>';
    dom.setupError.textContent = e.message;
  }
}

function switchPlaylistTab(tab) {
  activePlaylistTab = tab;
  dom.tabMy.classList.toggle('active', tab === 'my');
  dom.tabAll.classList.toggle('active', tab === 'all');
  dom.tabSearch.classList.toggle('active', tab === 'search');
  dom.tabOfficial.classList.toggle('active', tab === 'official');
  // Show/hide contextual inputs
  dom.playlistFilterWrap.classList.toggle('hidden', tab !== 'all');
  dom.playlistSearchWrap.classList.toggle('hidden', tab !== 'search');
  dom.playlistMinTracksWrap.classList.toggle('hidden', tab !== 'all' && tab !== 'search');
  if (tab !== 'all')    dom.playlistFilter.value = '';
  if (tab !== 'search') dom.playlistSearchInput.value = '';
  if (tab === 'my')       loadMyPlaylists(false);
  else if (tab === 'all') loadAllPlaylists(false);
  else if (tab === 'search') loadSearchPlaylists('');
  else                    loadOfficialPlaylists(false);
}

async function updatePlaylistInfo() {
  const opt = dom.playlistSelect.selectedOptions[0];
  if (!opt || !opt.value) { dom.playlistInfo.textContent = ''; return; }

  const playlistId = opt.value;
  if (tracksCache[playlistId]) {
    applyYearCache(tracksCache[playlistId]);
    showYearRange(tracksCache[playlistId]);
    return;
  }

  const seq = ++infoFetchSeq;
  dom.playlistInfo.textContent = 'Loading…';
  try {
    const tracks = await api.tracks(playlistId);
    if (seq !== infoFetchSeq) return;
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
  if (years.length === 0) { dom.playlistInfo.textContent = tracks.length + ' tracks'; return; }
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
  const row  = document.createElement('div');
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
  if (rows.length <= 2) return;
  row.remove();
  renumberTeams();
  checkSetupReady();
}

function renumberTeams() {
  const rows = dom.teamInputs.querySelectorAll('.team-input-row');
  rows.forEach((row, i) => {
    row.querySelector('.team-num').textContent = i + 1;
    row.querySelector('.btn-remove-team').disabled = rows.length <= 2;
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
  dom.setupError.textContent   = '';
  dom.btnStartGame.disabled    = true;
  dom.btnStartGame.textContent = 'Loading tracks…';

  try {
    const playlistId = dom.playlistSelect.value;
    const tracks     = tracksCache[playlistId] || await api.tracks(playlistId);
    tracksCache[playlistId] = tracks;
    applyYearCache(tracks);

    if (tracks.length < 5) {
      dom.setupError.textContent   = 'Playlist needs at least 5 tracks with release years.';
      dom.btnStartGame.disabled    = false;
      dom.btnStartGame.textContent = 'Start Game';
      return;
    }

    const inputs = dom.teamInputs.querySelectorAll('.team-name-input');
    const teams  = [...inputs]
      .map(i => i.value.trim())
      .filter(Boolean)
      .map(name => ({ name, cards: [] }));

    const cardsToWin    = parseInt(dom.cardsDisplay.textContent) || 8;
    const hardModeFinal = $('toggle-hard-final').checked;
    const hardModeAll   = $('toggle-hard-all').checked;

    // Build shuffled deck and deal one starter card to each team
    const deck = shuffle([...tracks]);
    teams.forEach(team => {
      if (deck.length > 0) team.cards.push(deck.shift());
    });

    const opt          = dom.playlistSelect.selectedOptions[0];
    const playlistName = opt ? opt.text.replace(/\s*\(\d[\d\s,]*tracks?\)$/i, '').trim() : '';
    const years = tracks.map(t => t.year).filter(Boolean);
    const minY  = years.length ? Math.min(...years) : null;
    const maxY  = years.length ? Math.max(...years) : null;
    const playlistInfoStr = playlistName + (minY && maxY ? '  ·  ' + minY + ' – ' + maxY : '');

    sessionStorage.setItem('hitster_game', JSON.stringify({
      teams,
      cardsToWin,
      hardModeFinal,
      hardModeAll,
      allTracks:     tracks,
      deck,
      activeTeams:   teams.map((_, i) => i),
      activeCursor:  0,
      roundTeamsDone: 0,
      isTiebreaker:  false,
      playlistName:  playlistInfoStr,
    }));

    location.href = 'game.html';
  } catch (e) {
    dom.setupError.textContent   = 'Error: ' + e.message;
    dom.btnStartGame.disabled    = false;
    dom.btnStartGame.textContent = 'Start Game';
  }
}

// ─── Event listeners (setup) ──────────────────────────────────────────────────

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
  if (activePlaylistTab === 'my')       loadMyPlaylists(true);
  else if (activePlaylistTab === 'all') loadAllPlaylists(true);
  else if (activePlaylistTab === 'search') loadSearchPlaylists(dom.playlistSearchInput.value);
  else loadOfficialPlaylists(true);
});
dom.tabMy.addEventListener('click',       () => switchPlaylistTab('my'));
dom.tabAll.addEventListener('click',      () => switchPlaylistTab('all'));
dom.tabSearch.addEventListener('click',   () => switchPlaylistTab('search'));
dom.tabOfficial.addEventListener('click', () => switchPlaylistTab('official'));
dom.btnStartGame.addEventListener('click', startGame);
dom.playlistFilter.addEventListener('input', applyAllPlaylistsFilter);

// Search tab — debounced on input, immediate on Enter or button click
dom.playlistSearchInput.addEventListener('input', () => {
  clearTimeout(_searchDebounce);
  _searchDebounce = setTimeout(() => loadSearchPlaylists(dom.playlistSearchInput.value), 500);
});
dom.playlistSearchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { clearTimeout(_searchDebounce); loadSearchPlaylists(dom.playlistSearchInput.value); }
});
dom.btnPlaylistSearch.addEventListener('click', () => {
  clearTimeout(_searchDebounce); loadSearchPlaylists(dom.playlistSearchInput.value);
});
dom.toggleMinTracks.addEventListener('change', () => {
  if (activePlaylistTab === 'all')    applyAllPlaylistsFilter();
  if (activePlaylistTab === 'search') loadSearchPlaylists(dom.playlistSearchInput.value);
});

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
    } catch (_) {}
  },

  render(s) {
    this.modeLabel.textContent  = '';
    this.displayName.textContent = s.displayName ? s.displayName : '';
    const btns = [];
    if (s.oauthLinked) {
      btns.push('<button class="auth-btn" id="auth-btn-logout">Logout</button>');
    } else if (!s.envAuth) {
      btns.push('<button class="auth-btn" id="auth-btn-login">Login with Spotify</button>');
    }
    if (s.oauthLinked && s.refreshToken && !s.envAuth) {
      btns.push('<button class="auth-btn auth-btn-copy-rt" id="auth-btn-copy-rt" title="' + s.refreshToken + '">📋 Copy refresh token for Vercel</button>');
    }
    this.actions.innerHTML = btns.join('');
    const btnLogin = document.getElementById('auth-btn-login');
    if (btnLogin) btnLogin.addEventListener('click', () => { location.href = '/auth/login'; });
    const btnLogout = document.getElementById('auth-btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', async () => { await api.post('/auth/logout'); await this.refresh(); });
    const btnCopyRt = document.getElementById('auth-btn-copy-rt');
    if (btnCopyRt) {
      btnCopyRt.addEventListener('click', () => {
        navigator.clipboard.writeText(btnCopyRt.title)
          .then(() => { btnCopyRt.textContent = '✓ Copied!'; setTimeout(() => { btnCopyRt.textContent = '📋 Copy refresh token for Vercel'; }, 2000); })
          .catch(() => { prompt('Copy this and add as SPOTIFY_REFRESH_TOKEN in Vercel:', btnCopyRt.title); });
      });
    }
  },

  init() { this.el.classList.remove('hidden'); this.refresh(); },
};

// ─── Profile button (top-right of setup screen) ───────────────────────────────

function renderProfileButton() {
  const wrap = document.getElementById('profile-btn-wrap');
  if (!wrap) return;
  if (personalSpotify.isConnected()) {
    const img = personalSpotify.imageUrl
      ? '<img src="' + personalSpotify.imageUrl + '" alt="" class="profile-btn-img">'
      : '<span class="profile-btn-initials">' + (personalSpotify.displayName || '?').charAt(0).toUpperCase() + '</span>';
    wrap.innerHTML =
      '<div class="profile-btn-container">' +
        '<button class="profile-btn" id="profile-btn" aria-haspopup="true">' + img + '</button>' +
        '<div class="profile-dropdown hidden" id="profile-dropdown">' +
          '<div class="profile-dropdown-name">🎵 ' + (personalSpotify.displayName || 'Spotify user') + '</div>' +
          '<button class="profile-dropdown-logout" id="profile-btn-logout">Log out</button>' +
        '</div>' +
      '</div>';
  } else {
    wrap.innerHTML =
      '<div class="profile-btn-container">' +
        '<button class="profile-btn profile-btn-empty" id="profile-btn" title="Connect Spotify">' +
          '<span class="profile-btn-icon">♪</span>' +
        '</button>' +
        '<div class="profile-dropdown hidden" id="profile-dropdown">' +
          '<div class="profile-dropdown-name">Not connected</div>' +
          '<button class="profile-dropdown-connect" id="profile-btn-connect">Connect Spotify</button>' +
        '</div>' +
      '</div>';
  }
  document.getElementById('profile-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('profile-dropdown').classList.toggle('hidden');
  });
  document.addEventListener('click', () => {
    const dd = document.getElementById('profile-dropdown');
    if (dd) dd.classList.add('hidden');
  }, { once: false });
  const btnLogout = document.getElementById('profile-btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', () => { personalSpotify.disconnect(); renderProfileButton(); });
  const btnConnect = document.getElementById('profile-btn-connect');
  if (btnConnect) btnConnect.addEventListener('click', () => personalSpotify.login());
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

(async () => {
  // Handle PKCE callback (Spotify redirects back to / with ?code=...&state=pkce_personal)
  const params = new URLSearchParams(location.search);
  if (params.get('state') === 'pkce_personal' && params.get('code')) {
    await personalSpotify.handleCallback(params.get('code'));
    history.replaceState({}, '', '/');
  }

  personalSpotify.load();
  renderProfileButton();

  // OAuth retry on setup page retries the active playlist tab
  setOAuthRetryAction(() => {
    if (activePlaylistTab === 'my')          loadMyPlaylists(true);
    else if (activePlaylistTab === 'all')    loadAllPlaylists(true);
    else if (activePlaylistTab === 'search') loadSearchPlaylists(dom.playlistSearchInput.value);
    else                                     loadOfficialPlaylists(true);
  });
})();

initTeamInputs();
loadMyPlaylists();
