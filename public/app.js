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
let   minTracksFilter       = 50;     // null = no filter
let   lastSearchResults     = null;   // cached raw search results for re-filtering
let   selectedPlaylists     = [];     // [{ id, name, trackCount }] — playlists added to the game

/** Show a playlist-loading error to the user. */
function _playlistError(msg) {
  dom.playlistSelect.innerHTML = '<option value="">' + esc(msg) + '</option>';
  dom.playlistInfo.textContent  = '';
  dom.setupError.textContent    = msg;
}

// ─── DOM refs (setup screen) ──────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const dom = {
  teamInputs:     $('team-inputs'),
  btnAddTeam:     $('btn-add-team'),
  btnCardsMinus:  $('btn-cards-minus'),
  btnCardsPlus:   $('btn-cards-plus'),
  cardsDisplay:   $('cards-to-win-display'),
  playlistSelect: $('playlist-select'),
  btnAddPlaylist: $('btn-add-playlist'),
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
  playlistSizeFilter:  $('playlist-size-filter'),
  playlistInfo:   $('playlist-info'),
  selectedPlaylists: $('selected-playlists'),
  btnStartGame:   $('btn-start-game'),
  setupError:     $('setup-error'),
};

// ─── Setup screen ─────────────────────────────────────────────────────────────

function setSelectOptions(playlists, showOwner) {
  const filtered = minTracksFilter
    ? playlists.filter(pl => pl.trackCount >= minTracksFilter)
    : playlists;

  if (filtered.length === 0) {
    let msg, info;
    if (minTracksFilter && playlists.length > 0) {
      msg  = 'No playlists with ' + minTracksFilter + '+ tracks';
      info = 'Try a lower minimum, or click the selected number to clear the filter.';
    } else if (showOwner) {
      msg  = 'No Official Hitster playlists found';
      info = 'Try again later — Spotify search may be slow.';
    } else {
      msg  = 'No playlists found';
      info = '';
    }
    dom.playlistSelect.innerHTML = '<option value="">' + msg + '</option>';
    dom.playlistInfo.textContent = info;
    return;
  }
  dom.playlistSelect.innerHTML = filtered.map(pl => {
    const label = showOwner
      ? pl.name + ' (' + pl.trackCount + ' tracks) — ' + pl.owner
      : pl.name + ' (' + pl.trackCount + ' tracks)';
    return '<option value="' + pl.id + '" data-count="' + pl.trackCount + '" data-name="' + esc(pl.name) + '">' + label + '</option>';
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
    let playlists;
    if (personalSpotify.isConnected()) {
      if (!personalSpotify.hasPlaylistScope()) {
        _playlistError('⚠ Spotify needs updated permissions — open the profile button, log out, then reconnect.');
        return;
      }
      const items = await personalSpotify.pagedGet('https://api.spotify.com/v1/me/playlists?limit=50');
      playlists = items
        .filter(pl => pl && pl.name.toLowerCase().includes('hitster'))
        .map(pl => ({ id: pl.id, name: pl.name, trackCount: pl.tracks?.total || 0, imageUrl: pl.images?.[0]?.url || '' }));
    } else {
      playlists = await api.playlists();
    }
    myPlaylistsCache = playlists;
    setSelectOptions(playlists, false);
  } catch (e) {
    _playlistError(e.name === 'ScopeError'
      ? '⚠ Spotify permission error — open the profile button, log out, then reconnect.'
      : '⚠ Could not load playlists: ' + e.message);
  }
}

async function loadOfficialPlaylists(forceReload) {
  if (officialPlaylistsCache && !forceReload) { setSelectOptions(officialPlaylistsCache, true); return; }
  dom.playlistSelect.innerHTML = '<option value="">Loading…</option>';
  dom.btnStartGame.disabled = true;
  dom.setupError.textContent = '';
  try {
    let playlists;
    if (personalSpotify.isConnected()) {
      if (!personalSpotify.hasPlaylistScope()) {
        _playlistError('⚠ Spotify needs updated permissions — open the profile button, log out, then reconnect.');
        return;
      }
      const seen = new Set();
      playlists = [];
      for (let offset = 0; offset < 100; offset += 50) {
        const data = await personalSpotify.jsonGet(
          `https://api.spotify.com/v1/search?q=hitster&type=playlist&limit=50&offset=${offset}`
        );
        for (const pl of (data?.playlists?.items || [])) {
          if (!pl || !pl.id || seen.has(pl.id)) continue;
          if (!isAllowedPlaylist(pl.name)) continue;
          seen.add(pl.id);
          playlists.push({ id: pl.id, name: pl.name, owner: pl.owner?.display_name || '', trackCount: pl.tracks?.total || 0, imageUrl: pl.images?.[0]?.url || '' });
        }
      }
      playlists.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      playlists = await api.officialPlaylists();
    }
    officialPlaylistsCache = playlists;
    setSelectOptions(playlists, true);
  } catch (e) {
    _playlistError(e.name === 'ScopeError'
      ? '⚠ Spotify permission error — open the profile button, log out, then reconnect.'
      : '⚠ Could not load playlists: ' + e.message);
  }
}

async function loadAllPlaylists(forceReload) {
  if (allPlaylistsCache && !forceReload) { applyAllPlaylistsFilter(); return; }
  dom.playlistSelect.innerHTML = '<option value="">Loading…</option>';
  dom.btnStartGame.disabled = true;
  dom.setupError.textContent = '';
  try {
    let playlists;
    if (personalSpotify.isConnected()) {
      if (!personalSpotify.hasPlaylistScope()) {
        _playlistError('⚠ Spotify needs updated permissions — open the profile button, log out, then reconnect.');
        return;
      }
      const items = await personalSpotify.pagedGet('https://api.spotify.com/v1/me/playlists?limit=50');
      playlists = items
        .filter(pl => pl)
        .map(pl => ({ id: pl.id, name: pl.name, trackCount: pl.tracks?.total || 0, imageUrl: pl.images?.[0]?.url || '' }));
    } else {
      playlists = await api.get('/api/all-playlists');
    }
    allPlaylistsCache = playlists;
    applyAllPlaylistsFilter();
  } catch (e) {
    _playlistError(e.name === 'ScopeError'
      ? '⚠ Spotify permission error — open the profile button, log out, then reconnect.'
      : '⚠ Could not load playlists: ' + e.message);
  }
}

function applyAllPlaylistsFilter() {
  if (!allPlaylistsCache) return;
  const q      = dom.playlistFilter.value.toLowerCase().trim();
  const filtered = q ? allPlaylistsCache.filter(pl => pl.name.toLowerCase().includes(q)) : allPlaylistsCache;
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
    let playlists;
    if (personalSpotify.isConnected()) {
      if (!personalSpotify.hasPlaylistScope()) {
        _playlistError('⚠ Spotify needs updated permissions — open the profile button, log out, then reconnect.');
        return;
      }
      const data = await personalSpotify.jsonGet(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=playlist&limit=50`
      );
      playlists = (data?.playlists?.items || [])
        .filter(pl => pl && pl.id)
        .map(pl => ({ id: pl.id, name: pl.name, owner: pl.owner?.display_name || '', trackCount: pl.tracks?.total || 0, imageUrl: pl.images?.[0]?.url || '' }));
    } else {
      playlists = await api.get('/api/search-playlists?q=' + encodeURIComponent(q));
    }
    lastSearchResults = playlists;
    setSelectOptions(playlists, true);
  } catch (e) {
    _playlistError(e.name === 'ScopeError'
      ? '⚠ Spotify permission error — open the profile button, log out, then reconnect.'
      : '⚠ Search failed: ' + e.message);
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
    const tracks = personalSpotify.isConnected()
      ? await fetchPersonalTracks(playlistId)
      : await api.tracks(playlistId);
    if (seq !== infoFetchSeq) return;
    applyYearCache(tracks);
    tracksCache[playlistId] = tracks;
    showYearRange(tracks);
    renderSelectedPlaylists(); // update unique count if this playlist is now in the selection
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
  dom.btnStartGame.disabled = filled < 2 || selectedPlaylists.length === 0;
  dom.btnAddPlaylist.disabled = !dom.playlistSelect.value;
}

function getUniqueTrackCount() {
  // Returns the actual deduplicated count if all selected playlists are cached,
  // otherwise returns null (fall back to estimated sum).
  if (!selectedPlaylists.every(pl => tracksCache[pl.id])) return null;
  const seen = new Set();
  for (const pl of selectedPlaylists) {
    for (const t of tracksCache[pl.id]) seen.add(t.id);
  }
  return seen.size;
}

function renderSelectedPlaylists() {
  if (selectedPlaylists.length === 0) {
    dom.selectedPlaylists.innerHTML =
      '<p class="selected-empty">No playlists added — select one above and click <strong>＋ Add</strong>.</p>';
    return;
  }

  const chips =
    '<div class="selected-chips">' +
    selectedPlaylists.map(pl =>
      '<div class="playlist-chip">' +
        '<span class="playlist-chip-name">' + esc(pl.name) + '</span>' +
        '<span class="playlist-chip-count">' + pl.trackCount + ' tracks</span>' +
        '<button class="playlist-chip-remove" data-id="' + esc(pl.id) + '" title="Remove">×</button>' +
      '</div>'
    ).join('') +
    '</div>';

  let summary = '';
  if (selectedPlaylists.length > 1) {
    const rawTotal  = selectedPlaylists.reduce((s, pl) => s + pl.trackCount, 0);
    const unique    = getUniqueTrackCount();
    if (unique !== null) {
      const dupes = rawTotal - unique;
      summary = '<p class="selected-total">' + unique + ' unique tracks across ' +
        selectedPlaylists.length + ' playlists' +
        (dupes > 0 ? ' <span class="selected-dupes">(' + dupes + ' duplicates removed)</span>' : '') +
        '</p>';
    } else {
      summary = '<p class="selected-total">~' + rawTotal + ' tracks across ' +
        selectedPlaylists.length + ' playlists</p>';
    }
  }

  dom.selectedPlaylists.innerHTML = chips + summary;
}

function addPlaylist() {
  const opt = dom.playlistSelect.selectedOptions[0];
  if (!opt || !opt.value) return;
  if (selectedPlaylists.some(pl => pl.id === opt.value)) return;
  selectedPlaylists.push({
    id:         opt.value,
    name:       opt.dataset.name || opt.text.split(/\s+\(\d+/)[0],
    trackCount: parseInt(opt.dataset.count, 10) || 0,
  });
  renderSelectedPlaylists();
  checkSetupReady();
}

function removePlaylist(id) {
  selectedPlaylists = selectedPlaylists.filter(pl => pl.id !== id);
  renderSelectedPlaylists();
  checkSetupReady();
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
    // Fetch tracks for every selected playlist (parallel, reuse cache)
    const trackArrays = await Promise.all(
      selectedPlaylists.map(async pl => {
        if (tracksCache[pl.id]) return tracksCache[pl.id];
        const tracks = personalSpotify.isConnected()
          ? await fetchPersonalTracks(pl.id)
          : await api.tracks(pl.id);
        tracksCache[pl.id] = tracks;
        return tracks;
      })
    );

    // Merge and deduplicate by track ID
    const seenIds = new Set();
    const allTracks = [];
    for (const tracks of trackArrays) {
      for (const t of tracks) {
        if (!seenIds.has(t.id)) { seenIds.add(t.id); allTracks.push(t); }
      }
    }
    applyYearCache(allTracks);

    if (allTracks.length < 5) {
      dom.setupError.textContent   = 'Selected playlists need at least 5 tracks with release years.';
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
    const deck = shuffle([...allTracks]);
    teams.forEach(team => {
      if (deck.length > 0) team.cards.push(deck.shift());
    });

    const years = allTracks.map(t => t.year).filter(Boolean);
    const minY  = years.length ? Math.min(...years) : null;
    const maxY  = years.length ? Math.max(...years) : null;
    const playlistInfoStr = selectedPlaylists.length === 1
      ? selectedPlaylists[0].name + (minY && maxY ? '  ·  ' + minY + ' – ' + maxY : '')
      : selectedPlaylists.length + ' playlists · ' + allTracks.length + ' tracks' +
        (minY && maxY ? '  ·  ' + minY + ' – ' + maxY : '');

    sessionStorage.setItem('hitster_game', JSON.stringify({
      teams,
      cardsToWin,
      hardModeFinal,
      hardModeAll,
      allTracks,
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
dom.btnAddPlaylist.addEventListener('click', addPlaylist);
dom.playlistSelect.addEventListener('dblclick', addPlaylist);
dom.selectedPlaylists.addEventListener('click', e => {
  const btn = e.target.closest('.playlist-chip-remove');
  if (btn) removePlaylist(btn.dataset.id);
});
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
function reapplyCurrentTabFilter() {
  if      (activePlaylistTab === 'my'       && myPlaylistsCache)       setSelectOptions(myPlaylistsCache, false);
  else if (activePlaylistTab === 'all')                                 applyAllPlaylistsFilter();
  else if (activePlaylistTab === 'search'   && lastSearchResults)      setSelectOptions(lastSearchResults, true);
  else if (activePlaylistTab === 'official' && officialPlaylistsCache) setSelectOptions(officialPlaylistsCache, true);
}

// Min-tracks pill selector
dom.playlistSizeFilter.addEventListener('click', e => {
  const btn = e.target.closest('.psf-btn');
  if (!btn) return;
  const val = parseInt(btn.dataset.min, 10);
  // Click active button → deselect (no filter); click other → select it
  minTracksFilter = (minTracksFilter === val) ? null : val;
  dom.playlistSizeFilter.querySelectorAll('.psf-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.min, 10) === minTracksFilter);
  });
  reapplyCurrentTabFilter();
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
          (personalSpotify.hasPlaylistScope() ? '' :
            '<div class="profile-scope-warning">⚠ Reconnect to enable personal playlists</div>') +
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
  if (btnLogout) btnLogout.addEventListener('click', () => {
    personalSpotify.disconnect();
    // Clear all playlist and track caches so they reload from server API
    myPlaylistsCache = null; allPlaylistsCache = null;
    officialPlaylistsCache = null; lastSearchResults = null;
    Object.keys(tracksCache).forEach(k => delete tracksCache[k]);
    renderProfileButton();
    // Reload the active tab from server
    if (activePlaylistTab === 'my')          loadMyPlaylists(false);
    else if (activePlaylistTab === 'all')    loadAllPlaylists(false);
    else if (activePlaylistTab === 'search') loadSearchPlaylists(dom.playlistSearchInput.value);
    else                                     loadOfficialPlaylists(false);
  });
  const btnConnect = document.getElementById('profile-btn-connect');
  if (btnConnect) btnConnect.addEventListener('click', () => personalSpotify.login());
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

function showConnectModal(errorMsg) {
  const modal  = document.getElementById('connect-modal');
  const errEl  = document.getElementById('connect-modal-error');
  if (errorMsg) {
    errEl.textContent = errorMsg;
    errEl.classList.remove('hidden');
  }
  modal.classList.remove('hidden');
}

function renderInfoPanel(authStatus) {
  const el = document.getElementById('info-account');
  if (!el) return;
  if (authStatus && (authStatus.oauthLinked || authStatus.envAuth)) {
    const name = authStatus.displayName || 'Spotify account';
    el.innerHTML =
      '<div class="info-card-icon">✓</div>' +
      '<h3 class="info-card-title info-card-title--green">Connected</h3>' +
      '<p class="info-card-body"><strong>' + esc(name) + '</strong> is linked and ready to use.</p>';
    el.classList.add('info-card--connected');
  } else {
    el.innerHTML =
      '<div class="info-card-icon">🔗</div>' +
      '<h3 class="info-card-title">Not connected</h3>' +
      '<p class="info-card-body">Link your Spotify account to load playlists and play music.</p>' +
      '<a href="/auth/login" class="btn-spotify-connect btn-spotify-connect--sm">Connect with Spotify</a>';
  }
}

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

  initTeamInputs();
  renderSelectedPlaylists();

  // Check Spotify connection — use fetch directly to avoid the oauth-required overlay
  try {
    const res = await fetch('/auth/status');
    const s   = await res.json();
    renderInfoPanel(s);
    if (!s.oauthLinked && !s.envAuth) {
      const authError = params.get('auth_error');
      showConnectModal(authError ? 'Could not connect: ' + decodeURIComponent(authError) + '. Please try again.' : null);
      return;
    }
  } catch (_) {
    renderInfoPanel(null);
    showConnectModal(null);
    return;
  }

  loadMyPlaylists();
})();
