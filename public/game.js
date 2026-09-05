'use strict';

// Prefix a team's name with its 1-based team number, e.g. "1: Team Awesome"
function teamLabel(index, name) {
  return (index + 1) + ': ' + name;
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const dom = {
  gameScreen:         $('screen-game'),
  // Game header
  currentTeamName:    $('current-team-name'),
  deckCounter:        $('deck-counter'),
  scoreChips:         $('score-chips'),
  gamePlaylistInfo:   $('game-playlist-info'),
  tbBadge:            $('tb-badge'),
  roomPanel:          $('room-panel'),
  roomCode:           $('room-code'),
  playerCount:        $('player-count'),
  playerListPanel:    $('player-list-panel'),
  matchPointBanner:   $('match-point-banner'),
  hardModeBadge:      $('hard-mode-badge'),
  // Game settings overlay
  btnGameSettings:    $('btn-game-settings'),
  gameSettingsOverlay:$('game-settings-overlay'),
  gsCardsMinus:       $('gs-cards-minus'),
  gsCardsPlus:        $('gs-cards-plus'),
  gsCardsDisplay:     $('gs-cards-display'),
  gsHardFinal:        $('gs-hard-final'),
  gsHardAll:          $('gs-hard-all'),
  gsSteal:            $('gs-steal'),
  gsHardNote:         $('gs-hard-note'),
  btnGsApply:         $('btn-gs-apply'),

  btnGsCancel:        $('btn-gs-cancel'),
  // Music controls
  musicControls:    $('music-controls'),
  btnPauseResume:   $('btn-pause-resume'),
  btnRestart:       $('btn-restart'),
  nowPlayingInfo:   $('now-playing-info'),
  progressBar:      $('progress-bar'),
  progressBarWrap:  $('progress-bar-wrap'),
  progressTime:     $('progress-time'),
  btnRetryPlay:     $('btn-retry-play'),
  btnSkipSong:      $('btn-skip-song'),
  playbackErrPanel: $('playback-error-panel'),
  playbackErrMsg:   $('playback-error-msg'),
  // Card area
  cardFacedown:     $('card-facedown'),
  cardRevealed:     $('card-revealed'),
  revealYear:       $('reveal-year'),
  revealTitle:      $('reveal-title'),
  revealArtist:     $('reveal-artist'),
  resultBanner:     $('result-banner'),
  resultText:       $('result-text'),
  overturnSection:  $('overturn-section'),
  btnOverturn:      $('btn-overturn'),
  overturnConfirm:  $('overturn-confirm'),
  overturnTeamName: $('overturn-team-name'),
  btnOverturnYes:   $('btn-overturn-yes'),
  btnOverturnNo:    $('btn-overturn-no'),
  // Decade reveal
  decadeReveal:    $('decade-reveal'),
  decadeBg:        $('decade-bg'),
  decadeParticles: $('decade-particles'),
  decadeArt:       $('decade-art'),
  decadeEmojis:    $('decade-emojis'),
  decadeEra:       $('decade-era'),
  decadeLabel:     $('decade-label'),
  // Timeline
  currentTeamBar: $('current-team-bar'),
  timeline:       $('timeline'),
  otherTeams:     $('other-teams'),
  // Sudden death
  suddenDeathOverlay: $('sudden-death-overlay'),
  sdVs:               $('sd-vs'),
  btnSdFight:         $('btn-sd-fight'),
  // Starting overlay
  startingOverlay:    $('starting-overlay'),
  startingCardsGrid:  $('starting-cards-grid'),
  btnLetsPlay:        $('btn-lets-play'),
  // Hard challenge
  hardChallenge: $('hard-challenge'),
  hcTitle:       $('hc-title'),
  hcArtist:      $('hc-artist'),
  btnHcSubmit:   $('btn-hc-submit'),
  btnHcSkip:     $('btn-hc-skip'),
  // Discard
  btnDiscard:     $('btn-discard'),
  discardConfirm: $('discard-confirm'),
  btnDiscardYes:  $('btn-discard-yes'),
  btnDiscardNo:   $('btn-discard-no'),
  // Footer
  btnStartTurn: $('btn-start-turn'),
  btnConfirm:   $('btn-confirm'),
  btnConfirmSteal: $('btn-confirm-steal'),
  btnNextTeam:  $('btn-next-team'),
  // Year correction
  yearEditSection: $('year-edit-section'),
  yearEditInput:   $('year-edit-input'),
  btnYearConfirm:  $('btn-year-confirm'),
  btnYearDismiss:  $('btn-year-dismiss'),
  btnEditYear:     $('btn-edit-year'),
  // End game
  btnEndGame:        $('btn-end-game'),
  endGameConfirm:    $('end-game-confirm'),
  btnEndGameYes:     $('btn-end-game-yes'),
  btnEndGameNo:      $('btn-end-game-no'),
  // Restart game
  btnRestartGame:      $('btn-restart-game'),
  restartOverlay:      $('restart-overlay'),
  btnRestartFull:      $('btn-restart-full'),
  btnRestartRemaining: $('btn-restart-remaining'),
  btnRestartCancel:    $('btn-restart-cancel'),
  restartFullCount:    $('restart-full-count'),
  restartRemainingCount: $('restart-remaining-count'),
  // Steal
  stealSection:   $('steal-section'),
  stealTeamBtns:  $('steal-team-btns'),
  btnSkipSteal:   $('btn-skip-steal'),
  stealIndicator:     $('steal-indicator'),
  stealIndicatorText: $('steal-indicator-text'),
  hostStealTeamBtns:  $('host-steal-team-btns'),
  // Card action (click a placed card to edit/delete)
  cardActionOverlay:   $('card-action-overlay'),
  camYear:             $('cam-year'),
  camTitle:            $('cam-title'),
  camArtist:           $('cam-artist'),
  camStepChoose:       $('cam-step-choose'),
  camBtnEdit:          $('cam-btn-edit'),
  camBtnDelete:        $('cam-btn-delete'),
  camBtnCancel:        $('cam-btn-cancel'),
  camStepEdit:         $('cam-step-edit'),
  camYearInput:        $('cam-year-input'),
  camEditConfirm:      $('cam-edit-confirm'),
  camEditConfirmYear:  $('cam-edit-confirm-year'),
  camEditApply:        $('cam-edit-apply'),
  camEditBack:         $('cam-edit-back'),
  camEditConfirmYes:   $('cam-edit-confirm-yes'),
  camEditConfirmNo:    $('cam-edit-confirm-no'),
  camStepDelete:       $('cam-step-delete'),
  camDeleteTeamName:   $('cam-delete-team-name'),
  camDeleteConfirmYes: $('cam-delete-confirm-yes'),
  camDeleteConfirmNo:  $('cam-delete-confirm-no'),
  // Add card
  btnAddCard:      $('btn-add-card'),
  addCardOverlay:  $('add-card-overlay'),
  acTeam:          $('ac-team'),
  acYear:          $('ac-year'),
  acTitle:         $('ac-title'),
  acArtist:        $('ac-artist'),
  acError:         $('ac-error'),
  acConfirm:       $('ac-confirm'),
  acCancel:        $('ac-cancel'),
};

// ─── Game state ───────────────────────────────────────────────────────────────

const state = {
  phase: 'pre-turn',      // pre-turn | playing | revealed | finished
  teams: [],              // [{ name, cards: [] }]
  cardsToWin: 8,
  hardModeFinal: false,
  hardModeAll: false,
  allTracks: [],
  deck: [],
  activeTeams: [],
  activeCursor: 0,
  roundTeamsDone: 0,
  isTiebreaker: false,
  currentCard: null,
  selectedSlot: null,
  isPlaying: false,
  pendingOverturnSlot: null,
  _skipToWin: false,
  _currentYearPromise: null,
  _hardModePending: false,
  _hardModeDisablePending: false,
  // Steal
  stealEnabled:   false,
  _stealPhase:    null,   // null | 'available' | 'placing' | 'result'
  _stealQueue:    [],     // [{ teamIndex, name }] ordered by claim time
  _stealQueueIdx: 0,      // index of current stealer in queue
  _stealSlot:     null,   // slot selected by current stealer
  _stealHistory:  [],     // resolved attempts for the CURRENT card: [{ teamIndex, slot, correct, poppedCard }]
                           // kept around (even after the steal window closes) so a later year
                           // correction can undo/redo the steal outcome — cleared on a new card.

  _blindSteal:    false,  // true = steal was pre-registered; card stays hidden until steal resolves
  _cardClaimedByOriginal: false, // true = a year correction proved the original guess right while
                                  // a steal was still queued/in-progress — that attempt is now void,
                                  // but we keep waiting for it to resolve (or let the host Accept it)
};


// ─── Multiplayer state ────────────────────────────────────────────────────────

let _roomCode    = null;
let _io          = null;
let _roomPlayers = [];   // [{ socketId, name, teamIndex }]

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

// ─── Decade reveal ────────────────────────────────────────────────────────────

function showDecadeReveal(card) {
  const vibe = getDecadeVibe(card.year);
  dom.decadeBg.style.background = `linear-gradient(135deg, ${vibe.p} 0%, ${vibe.s} 100%)`;
  dom.decadeArt.src = card.albumArt || '';
  dom.decadeEmojis.textContent = vibe.emojis;
  dom.decadeEra.textContent    = vibe.era;
  dom.decadeLabel.textContent  = vibe.label;
  const emojis = vibe.emojis.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || ['🎵'];
  dom.decadeParticles.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const e     = emojis[i % emojis.length];
    const x     = Math.round(Math.random() * 100);
    const d     = (2 + Math.random() * 4).toFixed(1);
    const delay = (Math.random() * 3).toFixed(1);
    return `<span class="decade-particle" style="left:${x}%;--dur:${d}s;animation-delay:-${delay}s">${e}</span>`;
  }).join('');
  dom.decadeReveal.classList.remove('hidden');
}

function hideDecadeReveal() {
  dom.decadeReveal.classList.add('hidden');
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

let _rafHandle    = null;
let _playStartTime = null;
let _playedMs     = 0;
let _trackDuration = 0;

// ─── Spotify Connect session keepalive ────────────────────────────────────────
// Actually pausing between turns lets the Spotify Connect device idle out — after a
// while it drops off as the "active device" and the host has to physically tap play
// again before /play works. Instead we mute the volume and keep it looping (repeat
// = track) so it's never actually paused/stopped, then restore the volume before the
// next card plays. Repeat=track also means a song that runs to its natural end —
// during active guessing or during the muted wait — just starts over automatically,
// instead of going silent and leaving nothing playing.
let _savedVolume    = null;   // volume_percent to restore ( null = unknown/never captured )
let _sessionMuted   = false;  // true while we're holding the session open via mute
let _repeatEnsured  = false;  // true once we've set repeat=track for this Spotify session

async function ensureRepeatTrack() {
  if (_repeatEnsured || !personalSpotify.isConnected()) return;
  try {
    await spotifySetRepeat('track');
    _repeatEnsured = true;
  } catch (_) {
    // Not all devices support repeat mode — harmless if it fails, we just lose the
    // auto-restart-on-end behaviour on that device.
  }
}

async function holdSpotifySession() {
  if (!personalSpotify.isConnected()) return;
  try {
    if (_savedVolume === null) {
      const pb = await spotifyGetPlaybackState();
      if (pb && typeof pb.device?.volume_percent === 'number') _savedVolume = pb.device.volume_percent;
    }
    await spotifySetVolume(0);
    _sessionMuted = true;
  } catch (_) {
    // Device doesn't support volume control (e.g. some smart speakers) — fall back
    // to a real pause rather than leaving it playing at full volume.
    try { await spotifyPause(); } catch (_) {}
  }
}

async function releaseSpotifySession() {
  if (!_sessionMuted) return;

  try { await spotifySetVolume(_savedVolume ?? 70); } catch (_) {}
  _sessionMuted = false;
}


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
  const elSec  = Math.floor(elapsed / 1000);
  const totSec = Math.floor(_trackDuration / 1000);
  dom.progressTime.textContent = fmtSec(elSec) + ' / ' + fmtSec(totSec);
  if (pct < 100 && state.phase === 'playing') _rafHandle = requestAnimationFrame(_tickProgress);
}

function pauseProgress() {
  _playedMs += _playStartTime ? Date.now() - _playStartTime : 0;
  _playStartTime = null;
  if (_rafHandle) { cancelAnimationFrame(_rafHandle); _rafHandle = null; }
  _tickProgress();
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

function currentTeamIndex() { return state.activeTeams[state.activeCursor]; }
function currentTeam()      { return state.teams[currentTeamIndex()]; }

function renderScoreChips() {
  const curIdx = currentTeamIndex();
  dom.scoreChips.innerHTML = state.teams.map((t, i) => {
    const active = i === curIdx;
    const inGame = !state.isTiebreaker || state.activeTeams.includes(i);
    if (!inGame) return '';
    return `<span class="score-chip${active ? ' active' : ''}">${esc(teamLabel(i, t.name))}: ${t.cards.length}</span>`;
  }).join('');
}

function renderDeckCounter() {
  dom.deckCounter.textContent = state.deck.length + ' cards left';
}

function renderCurrentTeamBar() {
  const team   = currentTeam();
  const idx    = currentTeamIndex();
  const showMp = !state.isTiebreaker &&
    state.teams.some(t => t.cards.length >= state.cardsToWin);
  dom.currentTeamBar.innerHTML =
    `<span class="ctb-label">Now playing</span>` +
    `<span class="ctb-name">${esc(teamLabel(idx, team.name))}</span>` +
    `<span class="ctb-count">${team.cards.length} card${team.cards.length !== 1 ? 's' : ''}</span>` +
    (showMp ? `<span class="mp-badge">🎯 Match Point</span>` : '');
}

function renderOtherTeams() {
  const curIdx = currentTeamIndex();
  const others = state.teams.map((t, i) => ({ t, i })).filter(({ i }) => i !== curIdx);
  if (others.length === 0) { dom.otherTeams.innerHTML = ''; return; }
  dom.otherTeams.innerHTML = others.map(({ t, i }) => {
    const cardsHtml = t.cards.length === 0
      ? `<span class="otr-empty">No cards yet</span>`
      : t.cards.map((c, ci) => {
          const editable = !c.isStartingCard;
          return `<div class="otr-card${editable ? ' editable' : ''}"${editable ? ` data-team="${i}" data-idx="${ci}" title="Click to edit or delete this card"` : ''}>
            <div class="otr-year" style="color:${getDecadeVibe(c.year).color}">${c.yearUncertain ? '~' : ''}${c.year}</div>
            <div class="otr-title">${esc(c.title)}</div>
          </div>`;
        }).join('');
    return `<div class="other-team-row">
      <span class="otr-name">${esc(teamLabel(i, t.name))}</span>
      <div class="otr-cards">${cardsHtml}</div>
    </div>`;
  }).join('');
}

// Delegated click handler — otherTeams is re-rendered often, so attach once instead of
// re-binding a listener per card on every render.
dom.otherTeams?.addEventListener('click', (e) => {
  const cardEl = e.target.closest('.otr-card.editable');
  if (!cardEl) return;
  openCardActionModal(parseInt(cardEl.dataset.team, 10), parseInt(cardEl.dataset.idx, 10));
});

// ─── Card actions: edit year / delete a placed card ───────────────────────────

let _camCtx = null; // { teamIndex, cardIndex }

/** Re-render every view that shows team decks, without disturbing an in-progress
 *  interactive placement (new-card slot picking or steal-slot picking). */
function _refreshAllTeamViews() {
  if (state._stealPhase === 'placing') {
    renderTimeline(true, currentTeam().cards, state._stealSlot, selectStealSlot);
  } else if (state.phase === 'playing') {
    renderTimeline(true);
  } else {
    renderTimeline(false);
  }
  renderCurrentTeamBar();
  renderOtherTeams();
  renderScoreChips();
  emitState();
}

function openCardActionModal(teamIndex, cardIndex) {
  const team = state.teams[teamIndex];
  const card = team?.cards?.[cardIndex];
  if (!card) return;

  _camCtx = { teamIndex, cardIndex };

  dom.camYear.textContent   = (card.yearUncertain ? '~' : '') + card.year;
  dom.camTitle.textContent  = card.title || '(untitled)';
  dom.camArtist.textContent = card.artist || '';

  dom.camStepChoose.classList.remove('hidden');
  dom.camStepEdit.classList.add('hidden');
  dom.camStepDelete.classList.add('hidden');
  dom.camEditConfirm.classList.add('hidden');
  dom.camYearInput.value = card.year;

  dom.cardActionOverlay.classList.remove('hidden');
}

function closeCardActionModal() {
  dom.cardActionOverlay.classList.add('hidden');
  _camCtx = null;
}

dom.camBtnCancel.addEventListener('click', closeCardActionModal);

dom.camBtnEdit.addEventListener('click', () => {
  dom.camStepChoose.classList.add('hidden');
  dom.camStepEdit.classList.remove('hidden');
  dom.camEditConfirm.classList.add('hidden');
  dom.camYearInput.focus();
  dom.camYearInput.select();
});

dom.camEditBack.addEventListener('click', () => {
  dom.camStepEdit.classList.add('hidden');
  dom.camEditConfirm.classList.add('hidden');
  dom.camStepChoose.classList.remove('hidden');
});

// Step 1 of editing: ask for confirmation before actually applying the year change
dom.camEditApply.addEventListener('click', () => {
  const newYear = parseInt(dom.camYearInput.value, 10);
  if (!newYear || newYear < 1900 || newYear > 2030) return;
  dom.camEditConfirmYear.textContent = String(newYear);
  dom.camEditConfirm.classList.remove('hidden');
});

dom.camEditConfirmNo.addEventListener('click', () => {
  dom.camEditConfirm.classList.add('hidden');
});

dom.camEditConfirmYes.addEventListener('click', () => {
  if (!_camCtx) return;
  const newYear = parseInt(dom.camYearInput.value, 10);
  if (!newYear || newYear < 1900 || newYear > 2030) return;

  const team = state.teams[_camCtx.teamIndex];
  const card = team?.cards?.[_camCtx.cardIndex];
  if (!card) { closeCardActionModal(); return; }

  card.year          = newYear;
  card.yearUncertain = false;
  setYearCache(card.id, newYear);
  setYearConfirmed(card.id, true);
  setYearUserConfirmed(card.id);

  // Keep the timeline chronologically sorted after a manual correction
  team.cards.sort((a, b) => a.year - b.year);

  // A card in the current team's timeline may have moved — clear any in-progress
  // slot selection for a new card so the host re-picks against the updated order.
  if (_camCtx.teamIndex === currentTeamIndex() && state.phase === 'playing') {
    state.selectedSlot = null;
    dom.btnConfirm.classList.add('hidden');
  }

  closeCardActionModal();
  _refreshAllTeamViews();
});

dom.camBtnDelete.addEventListener('click', () => {
  if (!_camCtx) return;
  dom.camStepChoose.classList.add('hidden');
  dom.camDeleteTeamName.textContent = teamLabel(_camCtx.teamIndex, state.teams[_camCtx.teamIndex].name);
  dom.camStepDelete.classList.remove('hidden');
});

dom.camDeleteConfirmNo.addEventListener('click', () => {
  dom.camStepDelete.classList.add('hidden');
  dom.camStepChoose.classList.remove('hidden');
});

dom.camDeleteConfirmYes.addEventListener('click', () => {
  if (!_camCtx) return;
  const team = state.teams[_camCtx.teamIndex];
  if (!team) { closeCardActionModal(); return; }
  team.cards.splice(_camCtx.cardIndex, 1);

  if (_camCtx.teamIndex === currentTeamIndex() && state.phase === 'playing') {
    state.selectedSlot = null;
    dom.btnConfirm.classList.add('hidden');
  }

  closeCardActionModal();
  _refreshAllTeamViews();
});

// ─── Add a card manually to a team's deck ─────────────────────────────────────

function openAddCardModal() {
  dom.acTeam.innerHTML = state.teams.map((t, i) =>
    `<option value="${i}">${esc(teamLabel(i, t.name))}</option>`).join('');
  dom.acYear.value   = '';
  dom.acTitle.value  = '';
  dom.acArtist.value = '';
  dom.acError.classList.add('hidden');
  dom.addCardOverlay.classList.remove('hidden');
  dom.acYear.focus();
}

function closeAddCardModal() {
  dom.addCardOverlay.classList.add('hidden');
}

dom.btnAddCard.addEventListener('click', openAddCardModal);
dom.acCancel.addEventListener('click', closeAddCardModal);

dom.acConfirm.addEventListener('click', () => {
  const teamIndex = parseInt(dom.acTeam.value, 10);
  const year      = parseInt(dom.acYear.value, 10);
  const title     = dom.acTitle.value.trim();
  const artist    = dom.acArtist.value.trim();

  if (!year || year < 1900 || year > 2030) {
    dom.acError.textContent = 'Please enter a valid year (1900–2030).';
    dom.acError.classList.remove('hidden');
    return;
  }
  const team = state.teams[teamIndex];
  if (!team) { closeAddCardModal(); return; }

  const card = {
    id:            'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    year,
    yearUncertain: false,
    title:  title  || 'Unknown title',
    artist: artist || 'Unknown artist',
  };

  // Insert in year order — before the first existing card with a strictly later year
  let insertAt = team.cards.findIndex(c => c.year > year);
  if (insertAt === -1) insertAt = team.cards.length;
  team.cards.splice(insertAt, 0, card);

  if (teamIndex === currentTeamIndex() && state.phase === 'playing') {
    state.selectedSlot = null;
    dom.btnConfirm.classList.add('hidden');
  }

  closeAddCardModal();
  _refreshAllTeamViews();
});


// ─── Draw a card from the deck ────────────────────────────────────────────────

function drawCard() {
  if (state.deck.length === 0) {
    const owned     = new Set(state.teams.flatMap(t => t.cards.map(c => c.id)));
    const available = state.allTracks.filter(t => !owned.has(t.id));
    state.deck = shuffle(available.length > 0 ? available : [...state.allTracks]);
  }
  return state.deck.shift();
}

// ─── Starting cards overlay ───────────────────────────────────────────────────

function showStartingCards() {
  dom.startingCardsGrid.innerHTML = state.teams.map((t, i) => {
    const c = t.cards[0];
    return `<div class="starting-card-row">
      <div class="starting-card-team">${esc(teamLabel(i, t.name))}</div>
      <div class="starting-card-info">
        <div class="sc-year">${c ? (c.yearUncertain ? '~' : '') + c.year : '?'}</div>
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

function syncHardModeCtl() {
  const badge = dom.hardModeBadge;
  if (state._hardModePending) {
    badge.textContent = '🧠 Hard Mode: next round';
    badge.classList.remove('hidden');
  } else if (state._hardModeDisablePending) {
    badge.textContent = '🧠 Disabling: next round';
    badge.classList.remove('hidden');
  } else if (state.hardModeAll) {
    badge.textContent = '🧠 Hard Mode ON';
    badge.classList.remove('hidden');
  } else if (state.hardModeFinal) {
    badge.textContent = '🧠 Hard: last card';
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ─── Game settings ────────────────────────────────────────────────────────────

let _gsCardsToWin = 8;          // working value inside the panel
let _gsOpenCardsToWin = 8;      // cardsToWin when panel was opened (used for floor calc)

function openGameSettings() {
  // Snapshot current state into the panel
  _gsCardsToWin = state.cardsToWin;
  _gsOpenCardsToWin = state.cardsToWin;

  dom.gsCardsDisplay.textContent  = _gsCardsToWin;
  dom.gsHardFinal.checked         = state.hardModeFinal;
  dom.gsHardAll.checked           = state.hardModeAll || state._hardModePending;
  dom.gsSteal.checked             = state.stealEnabled;
  dom.gsHardNote.classList.add('hidden');
  _updateGsCardsButtons();
  dom.gameSettingsOverlay.classList.remove('hidden');
}

function _gsMinCards() {
  // Floor: one above the current highest score, UNLESS cardsToWin was already
  // at or below the high score when the panel opened (keep that as the floor).
  const maxScore = Math.max(0, ...state.teams.map(t => t.cards.length));
  return Math.min(_gsOpenCardsToWin, maxScore + 1);
}

function _updateGsCardsButtons() {
  dom.gsCardsMinus.disabled = _gsCardsToWin <= _gsMinCards();
  dom.gsCardsPlus.disabled  = _gsCardsToWin >= 20;
}

function applyGameSettings() {
  const newHardFinal = dom.gsHardFinal.checked;
  const newHardAll   = dom.gsHardAll.checked;

  // Cards to win — immediate effect
  state.cardsToWin = _gsCardsToWin;

  // Hard mode final — immediate effect
  state.hardModeFinal = newHardFinal;

  // Hard mode all — deferred if a round is in progress
  if (newHardAll !== (state.hardModeAll || state._hardModePending)) {
    if (state.roundTeamsDone === 0) {
      state.hardModeAll             = newHardAll;
      state._hardModePending        = false;
      state._hardModeDisablePending = false;
    } else if (newHardAll) {
      state._hardModePending        = true;
      state._hardModeDisablePending = false;
    } else {
      state._hardModeDisablePending = true;
      state._hardModePending        = false;
    }
  }

  // Steal — immediate effect
  state.stealEnabled = dom.gsSteal.checked;

  syncHardModeCtl();
  dom.gameSettingsOverlay.classList.add('hidden');

  // Re-render header in case cardsToWin changed (match-point banner etc.)
  renderCurrentTeamBar();
  renderOtherTeams();
  renderScoreChips();
}

// ─── Multiplayer helpers ──────────────────────────────────────────────────────

function buildSnapshot() {
  const team       = currentTeam();
  const nextCursor = (state.activeCursor + 1) % state.activeTeams.length;
  return {
    phase:            state.phase,
    currentTeamIndex: currentTeamIndex(),
    currentTeamName:  teamLabel(currentTeamIndex(), team.name),
    nextTeamIndex:    state.activeTeams[nextCursor],   // who plays after this turn
    teams: state.teams.map((t, i) => ({
      name:     t.name,
      cards:    t.cards.map(c => ({
        year:        c.year,
        yearUncertain: !!c.yearUncertain,
        title:       c.title,
        artist:      c.artist,
      })),
      isActive: state.activeTeams.includes(i),
    })),
    activeTeams:  state.activeTeams,
    cardsToWin:   state.cardsToWin,
    deckCount:    state.deck.length,
    isTiebreaker: state.isTiebreaker,
    selectedSlot: state.selectedSlot,
    // Card is face-down during 'playing' — don't reveal title/artist/year to players
    // Also keep hidden during steal-placing when steal was pre-registered (blind steal)
    card: state.currentCard
      ? (state.phase === 'playing' || (state._stealPhase === 'placing' && state._blindSteal))
        ? { faceDown: true }
        : { year: state.currentCard.year, yearUncertain: !!state.currentCard.yearUncertain,
            title: state.currentCard.title, artist: state.currentCard.artist,
            albumArt: state.currentCard.albumArt || '' }
      : null,
    result:        null,
    playlistName:  dom.gamePlaylistInfo.textContent,
    winnerIndices: null,
    stealEnabled:  state.stealEnabled,
    stealPhase:    state._stealPhase,
    stealQueue:    state._stealQueue.map((s, idx) => ({
      teamIndex: s.teamIndex,
      name:      s.name,
      isCurrent: idx === state._stealQueueIdx,
    })),
    currentStealer: state._stealQueue[state._stealQueueIdx]
      ? { teamIndex: state._stealQueue[state._stealQueueIdx].teamIndex,
          stealSlot: state._stealSlot,
          cards:     currentTeam().cards.map(c => ({   // show CURRENT team's deck for slot selection
            year: c.year, yearUncertain: !!c.yearUncertain, title: c.title, artist: c.artist,
          })),
        }
      : null,
  };
}

function emitState(override) {
  if (!_io || !_roomCode) return;
  try {
    const snapshot = Object.assign(buildSnapshot(), override || {});
    _io.emit('host:state', { code: _roomCode, snapshot });
  } catch (_) {}
}

function _showRoomPanel(code) {
  if (!dom.roomPanel || !dom.roomCode) return;
  dom.roomCode.textContent = code;
  dom.roomPanel.classList.remove('hidden');
  // Populate the small header QR thumbnail
  const headerQr = $('header-qr');
  if (headerQr) {
    headerQr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=56x56&data='
      + encodeURIComponent(location.origin + '/player?room=' + code);
    headerQr.classList.remove('hidden');
  }
}

function _updatePlayerCount(players) {
  _roomPlayers = Array.isArray(players) ? players : [];
  const n = _roomPlayers.length;
  if (!dom.playerCount) return;
  dom.playerCount.textContent = n + (n === 1 ? ' player' : ' players');
  _renderPlayerList();
}

function _renderPlayerList() {
  // Starting overlay list
  const startList = document.getElementById('room-players-list');
  if (startList) {
    if (_roomPlayers.length === 0) {
      startList.innerHTML = '<p class="rpl-empty">No players have joined yet</p>';
      startList.classList.remove('hidden');
    } else {
      startList.innerHTML =
        '<div class="rpl-header">👥 ' + _roomPlayers.length + ' player' + (_roomPlayers.length !== 1 ? 's' : '') + ' joined</div>' +
        _roomPlayers.map(p => {
          const teamName = teamLabel(p.teamIndex, state.teams[p.teamIndex]?.name || ('Team ' + (p.teamIndex + 1)));
          return '<div class="rpl-row">' +
            '<span class="rpl-dot">●</span>' +
            '<span class="rpl-name">' + esc(p.name) + '</span>' +
            '<span class="rpl-team">' + esc(teamName) + '</span>' +
            '</div>';
        }).join('');
      startList.classList.remove('hidden');
    }
  }
  // Header popup panel
  if (dom.playerListPanel) {
    dom.playerListPanel.innerHTML = _roomPlayers.length === 0
      ? '<p class="plp-empty">No players yet</p>'
      : _roomPlayers.map(p => {
          const teamName = teamLabel(p.teamIndex, state.teams[p.teamIndex]?.name || ('Team ' + (p.teamIndex + 1)));
          return '<div class="plp-row">' +
            '<span class="plp-name">' + esc(p.name) + '</span>' +
            '<span class="plp-team">' + esc(teamName) + '</span>' +
            '</div>';
        }).join('');
  }
}

function _updateStartingJoinHint(code) {
  const hint    = document.getElementById('starting-join-hint');
  const codeEl  = document.getElementById('starting-hint-code');
  const qrEl    = document.getElementById('starting-qr');
  if (hint)   hint.classList.remove('hidden');
  if (codeEl) codeEl.textContent = code;
  if (qrEl) {
    qrEl.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data='
      + encodeURIComponent(location.origin + '/player?room=' + code);
    qrEl.classList.remove('hidden');
  }
}

// ─── QR code overlay ──────────────────────────────────────────────────────────

dom.roomCode?.addEventListener('click', () => {
  if (!_roomCode) return;
  const overlay = $('qr-overlay');
  const img     = $('qr-img');
  const urlEl   = $('qr-url');
  if (!overlay) return;
  const joinUrl = location.origin + '/player?room=' + _roomCode;
  if (urlEl) urlEl.textContent = joinUrl;
  if (img) img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(joinUrl);
  overlay.classList.remove('hidden');
});

$('btn-qr-close')?.addEventListener('click', () => {
  $('qr-overlay')?.classList.add('hidden');
});

// Tapping the small header QR also opens the full overlay
$('header-qr')?.addEventListener('click', () => dom.roomCode?.click());

// Player count button toggles the player list panel
dom.playerCount?.addEventListener('click', (e) => {
  e.stopPropagation();
  dom.playerListPanel?.classList.toggle('hidden');
});
document.addEventListener('click', () => {
  dom.playerListPanel?.classList.add('hidden');
});

// ─── Phase transitions ────────────────────────────────────────────────────────

function enterPreTurn() {
  state.phase               = 'pre-turn';
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
  dom.yearEditSection.classList.add('hidden');
  dom.btnEditYear.classList.add('hidden');
  dom.stealSection.classList.add('hidden');
  dom.btnConfirmSteal.classList.add('hidden');
  state._blindSteal = false;
  closeStealWindow();
  hidePlaybackError();
  dom.suddenDeathOverlay.classList.add('hidden');

  // Tiebreaker / match-point skin
  if (state.isTiebreaker) {
    dom.gameScreen.classList.add('tiebreaker');
    dom.gameScreen.classList.remove('match-point');
    dom.tbBadge.classList.remove('hidden');
    dom.matchPointBanner.classList.add('hidden');
  } else {
    dom.gameScreen.classList.remove('tiebreaker');
    dom.tbBadge.classList.add('hidden');
    const atGoal = state.teams
      .map((t, i) => ({ ...t, idx: i }))
      .filter(t => t.cards.length >= state.cardsToWin);
    if (atGoal.length > 0) {
      dom.gameScreen.classList.add('match-point');
      const names = atGoal.map(t => teamLabel(t.idx, t.name)).join(' & ');
      const verb  = atGoal.length === 1 ? 'has' : 'have';
      dom.matchPointBanner.textContent =
        `🎯 ${names} ${verb} ${atGoal[0].cards.length} cards — last round in progress!`;
      dom.matchPointBanner.classList.remove('hidden');
    } else {
      dom.gameScreen.classList.remove('match-point');
      dom.matchPointBanner.classList.add('hidden');
    }
  }

  const team = currentTeam();
  dom.currentTeamName.textContent = teamLabel(currentTeamIndex(), team.name);
  renderScoreChips();
  renderDeckCounter();
  renderCurrentTeamBar();
  renderOtherTeams();
  renderTimeline(false);

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
  emitState();
}

async function beginTurn() {
  const card = drawCard();
  if (!card) return;

  state.currentCard   = card;
  state.selectedSlot  = null;
  state._stealHistory = [];   // fresh card — clear any prior steal-correction bookkeeping
  state._cardClaimedByOriginal = false;
  _syncSkipStealButton();
  state.phase        = 'playing';
  state.isPlaying    = false;

  // Kick off MusicBrainz year lookup immediately (non-blocking)
  state._currentYearPromise = resolveCardYearMb(card);

  renderDeckCounter();
  renderCurrentTeamBar();
  renderOtherTeams();
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

  renderTimeline(true);

  try {
    await releaseSpotifySession();   // restore volume if we were holding the session open
    await spotifyPlay(card.uri);
    state.isPlaying = true;
    ensureRepeatTrack();   // fire-and-forget: loop this track so it auto-restarts on natural end

    dom.btnPauseResume.textContent = '⏸ Pause';
    hidePlaybackError();
    startProgress(card.duration);
    emitState();
    _updateStealIndicator();  // show steal registration bar now that music is playing
  } catch (e) {
    state.isPlaying = false;
    dom.btnPauseResume.textContent = '▶ Resume';
    showPlaybackError('⚠ ' + e.message);
  }
}

function selectSlot(index) {
  if (state.phase !== 'playing') return;
  state.selectedSlot = index;
  renderTimeline(true);
  dom.btnConfirm.classList.remove('hidden');
  emitState();
}

async function confirmPlacement() {
  if (state.selectedSlot === null || !state.currentCard) return;

  state.phase = 'revealed';
  dom.btnConfirm.classList.add('hidden');
  dom.btnDiscard.classList.add('hidden');
  dom.discardConfirm.classList.add('hidden');

  try { await holdSpotifySession(); } catch (_) {}
  state.isPlaying = false;
  stopProgress();
  dom.btnPauseResume.textContent = '▶ Resume';

  // Ensure MusicBrainz year is resolved before checking placement
  await state._currentYearPromise;

  const team  = currentTeam();
  const cards = team.cards;
  const slot  = state.selectedSlot;
  const year  = state.currentCard.year;

  const leftOk  = slot === 0 || cards[slot - 1].year <= year;
  const rightOk = slot >= cards.length || cards[slot].year >= year;
  const correct = leftOk && rightOk;

  if (!correct) {
    finishPlacement(false, slot);
    return;
  }

  // Correct — check if hard mode applies
  const isLastCard = team.cards.length === state.cardsToWin - 1;
  const needsHard  = state.hardModeAll ||
                     (state.hardModeFinal && (isLastCard || state.isTiebreaker));

  if (!needsHard) {
    finishPlacement(true, slot);
    return;
  }

  // Hard mode challenge
  dom.nowPlayingInfo.textContent = '♪ Paused';
  dom.hcTitle.value  = '';
  dom.hcArtist.value = '';
  dom.hcTitle.className  = 'hc-input';
  dom.hcArtist.className = 'hc-input';
  dom.hardChallenge.classList.remove('hidden');
  dom.hcTitle.focus();
}

// ─── Placement logic ─────────────────────────────────────────────────────────

/** Returns true when no remaining team this round can tie or beat the current leader. */
function outcomeAlreadyDetermined() {
  const leaders = state.activeTeams.filter(i => state.teams[i].cards.length >= state.cardsToWin);
  if (leaders.length === 0) return false;
  const maxLeaderCards = Math.max(...leaders.map(i => state.teams[i].cards.length));
  const teamsYetToPlay = state.activeTeams.length - state.roundTeamsDone - 1;
  if (teamsYetToPlay <= 0) return true;
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
  // Steal registration closed once placement is confirmed
  dom.stealIndicator?.classList.add('hidden');

  const card = state.currentCard;
  // Blind steal: if teams pre-registered AND placement is wrong, keep card hidden
  const isBlindSteal = !correct && state.stealEnabled && state._stealQueue.length > 0;

  if (isBlindSteal) {
    // Keep card face-down — stealers will pick blind; reveal after all steal attempts
    state._blindSteal = true;
    dom.nowPlayingInfo.textContent = '?? – ??';
    // cardFacedown stays visible; cardRevealed stays hidden
  } else {
    // Normal reveal
    dom.nowPlayingInfo.textContent = card.title + ' – ' + card.artist;
    dom.cardFacedown.classList.add('hidden');
    dom.revealYear.textContent = (card.yearUncertain ? '~' : '') + (card.year || '?');
    dom.revealYear.title = card.yearUncertain ? 'Year may be approximate — could not confirm via MusicBrainz' : '';
    dom.revealTitle.textContent  = card.title;
    dom.revealArtist.textContent = card.artist;
    dom.cardRevealed.classList.remove('hidden');
    dom.cardRevealed.classList.toggle('wrong', !correct);
    showDecadeReveal(state.currentCard);
  }

  dom.resultBanner.classList.remove('hidden');
  if (correct) {
    dom.resultBanner.className = 'result-banner correct';
    dom.resultText.textContent = '✓ Correct! Card added to timeline.';
    team.cards.splice(slot, 0, state.currentCard);
    // Correct placement — clear any pre-registered steal queue
    state._stealQueue   = [];
    state._stealQueueIdx = 0;
  } else {
    dom.resultBanner.className = 'result-banner wrong';
    dom.resultText.textContent = isBlindSteal ? '✗ Wrong! Steal in progress…' : '✗ Wrong! Card discarded.';
    if (fromHardMode) {
      state.pendingOverturnSlot = slot;
      dom.overturnTeamName.textContent = teamLabel(currentTeamIndex(), team.name);
      dom.overturnSection.classList.remove('hidden');
    }
  }

  emitState({ result: { correct, text: dom.resultText.textContent } });
  renderTimeline(false);
  renderCurrentTeamBar();
  renderOtherTeams();

  // Year is always correctable after a guess — even during a blind steal (the reveal itself
  // stays hidden until the steal window closes, but the host can fix the underlying year now).
  dom.btnEditYear.classList.remove('hidden');
  if (card.yearUncertain) {
    dom.yearEditInput.value = card.year;
    dom.yearEditSection.classList.remove('hidden');
  }

  if (correct && outcomeAlreadyDetermined()) {
    state._skipToWin = true;
    dom.btnNextTeam.textContent = '🏆 See Results!';
    dom.btnNextTeam.classList.remove('hidden');
    setTimeout(() => {
      if (state._skipToWin && state.phase === 'revealed') nextTeam();
    }, 3000);
  } else if (!correct && state.stealEnabled && state.teams.length > 1) {
    // Open steal window; "Next Team →" appears only after steal resolves or is skipped
    openStealWindow();
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
  dom.resultText.textContent = '↩ Overturned! Card awarded to ' + teamLabel(currentTeamIndex(), team.name) + '.';
  renderTimeline(false);
  renderCurrentTeamBar();
  renderOtherTeams();
}

// ─── Steal-outcome bookkeeping for year corrections ───────────────────────────

/** Reverse the card-count effect of one resolved steal attempt (used before a replay). */
function _undoStealHistoryEntry(entry, card) {
  const stealTeam = state.teams[entry.teamIndex];
  if (entry.correct) {
    const idx = stealTeam.cards.indexOf(card);
    if (idx !== -1) stealTeam.cards.splice(idx, 1);
  } else if (entry.poppedCard) {
    stealTeam.cards.push(entry.poppedCard);
    stealTeam.cards.sort((a, b) => a.year - b.year);
  }
}

/**
 * Replay a list of steal attempts (in original order) against the given timeline/year,
 * applying the same win/lose rules as confirmSteal(). Stops after the first success,
 * since in real play the steal window closes as soon as someone succeeds.
 */
function _replayStealHistory(attempts, card, cards, year) {
  const newHistory = [];
  let resolved = false;
  for (const entry of attempts) {
    if (resolved) break; // a success ends the queue — later attempts never would have happened
    const stealTeam = state.teams[entry.teamIndex];
    const leftOk  = entry.slot === 0 || cards[entry.slot - 1].year <= year;
    const rightOk = entry.slot >= cards.length || cards[entry.slot].year >= year;
    const correct = leftOk && rightOk;
    let poppedCard = null;
    if (correct) {
      stealTeam.cards.push(card);
      stealTeam.cards.sort((a, b) => a.year - b.year);
      resolved = true;
    } else if (stealTeam.cards.length > 1) {
      poppedCard = stealTeam.cards[stealTeam.cards.length - 1];
      stealTeam.cards.pop();
    }
    newHistory.push({ teamIndex: entry.teamIndex, slot: entry.slot, correct, poppedCard });
  }
  return newHistory;
}

function applyYearCorrection(newYear) {
  const card = state.currentCard;
  const slot = state.selectedSlot;
  if (!card || slot === null) return;

  // Persist the corrected year
  card.year          = newYear;
  card.yearUncertain = false;
  setYearCache(card.id, newYear);
  setYearConfirmed(card.id, true);
  setYearUserConfirmed(card.id);

  // Remove card from team timeline if it was already placed (correct first result)
  const team = currentTeam();
  const existingIdx = team.cards.indexOf(card);
  if (existingIdx !== -1) team.cards.splice(existingIdx, 1);

  // Re-evaluate placement with the corrected year
  const cards   = team.cards;
  const leftOk  = slot === 0 || cards[slot - 1]?.year <= newYear;
  const rightOk = slot >= cards.length || cards[slot]?.year >= newYear;
  const correct = leftOk && rightOk;

  // If a steal already resolved (or is still in progress) on this card, its outcome depends on
  // the team-in-turn's corrected result — undo any already-applied effects first.
  const priorAttempts   = state._stealHistory;
  const hadStealHistory = priorAttempts.length > 0;
  const stealIsPending   = state._stealPhase === 'available' || state._stealPhase === 'placing';
  if (hadStealHistory) {
    for (const entry of priorAttempts) _undoStealHistoryEntry(entry, card);
    state._stealHistory = [];
  }

  let stealNote  = '';
  let deferAward = false;

  if (correct) {
    if (stealIsPending) {
      // A steal is still queued/in-progress right now — don't cut it short mid-flow.
      // Keep waiting: the pending attempt will be voided (with no effect) once it resolves,
      // or the host can award the card immediately via "Accept card".
      state._cardClaimedByOriginal = true;
      deferAward = true;
      stealNote = ' Waiting for the in-progress steal — it will have no effect.';
    } else if (hadStealHistory) {
      // Already resolved earlier — void it now, nothing left to wait for.
      stealNote = ' Steal voided — card returns to the original team.';
    }
  } else if (hadStealHistory) {
    // Still wrong — re-check the already-resolved steal attempt(s) against the corrected year.
    state._stealHistory = _replayStealHistory(priorAttempts, card, cards, newYear);
    const winner = state._stealHistory.find(e => e.correct);
    stealNote = winner
      ? ' Steal outcome updated: ' + teamLabel(winner.teamIndex, state.teams[winner.teamIndex].name) + ' actually stole the card!'
      : ' Steal outcome re-checked against the corrected year.';
  }

  _syncSkipStealButton();

  if (correct && !deferAward) {
    team.cards.splice(slot, 0, card);
    dom.resultBanner.className = 'result-banner correct';
    dom.resultText.textContent = '✓ Correct! Card added to timeline.' + stealNote;
    dom.cardRevealed.classList.remove('wrong');
    dom.overturnSection.classList.add('hidden');
    state.pendingOverturnSlot = null;
  } else if (correct && deferAward) {
    dom.resultBanner.className = 'result-banner correct';
    dom.resultText.textContent = '✓ Correct!' + stealNote;
    dom.cardRevealed.classList.remove('wrong');
  } else {
    dom.resultBanner.className = 'result-banner wrong';
    dom.resultText.textContent = '✗ Wrong! Card discarded.' + stealNote;
    dom.cardRevealed.classList.add('wrong');
  }

  dom.revealYear.textContent = String(newYear);
  dom.revealYear.title       = '';
  dom.yearEditSection.classList.add('hidden');

  // Don't stomp on an in-progress interactive steal placement UI
  if (state._stealPhase === 'placing') {
    renderTimeline(true, currentTeam().cards, state._stealSlot, selectStealSlot);
  } else {
    renderTimeline(false);
  }
  renderCurrentTeamBar();
  renderOtherTeams();
  renderScoreChips();

  emitState({ result: { correct, text: dom.resultText.textContent } });

  if (deferAward) {
    // Stay in "waiting for the steal" mode — Next Team stays hidden until it resolves
    // (via confirmSteal's void path) or the host clicks "Accept card".
    return;
  }

  // Re-check whether the outcome is now determined
  if (correct && outcomeAlreadyDetermined()) {
    state._skipToWin = true;
    dom.btnNextTeam.textContent = '🏆 See Results!';
    setTimeout(() => {
      if (state._skipToWin && state.phase === 'revealed') nextTeam();
    }, 3000);
  } else {
    state._skipToWin = false;
    dom.btnNextTeam.textContent = 'Next Team →';
  }


}

function nextTeam() {
  state.roundTeamsDone++;
  state.activeCursor = (state.activeCursor + 1) % state.activeTeams.length;

  if (state._skipToWin) {
    state._skipToWin     = false;
    state.roundTeamsDone = 0;
    checkWinCondition();
    return;
  }

  if (state.roundTeamsDone >= state.activeTeams.length) {
    state.roundTeamsDone = 0;
    checkWinCondition();
    return;
  }

  enterPreTurn();
}

// ─── Win condition ────────────────────────────────────────────────────────────

function showSuddenDeath() {
  dom.sdVs.innerHTML = state.activeTeams.map((i, idx) => {
    const sep = idx < state.activeTeams.length - 1
      ? '<span class="sd-versus">VS</span>'
      : '';
    return `<span class="sd-team-name">${esc(teamLabel(i, state.teams[i].name))}</span>${sep}`;
  }).join('');
  dom.suddenDeathOverlay.classList.remove('hidden');
}

function checkWinCondition() {
  const qualifying = state.activeTeams.filter(i => state.teams[i].cards.length >= state.cardsToWin);
  if (qualifying.length === 0) { enterPreTurn(); return; }

  const maxCards = Math.max(...qualifying.map(i => state.teams[i].cards.length));
  const leaders  = qualifying.filter(i => state.teams[i].cards.length === maxCards);

  if (leaders.length === 1) {
    showWinnerScreen(leaders);
  } else {
    const prevTeamCount  = state.isTiebreaker ? state.activeTeams.length : Infinity;
    state.isTiebreaker   = true;
    state.activeTeams    = leaders;
    state.activeCursor   = 0;
    state.roundTeamsDone = 0;
    if (leaders.length < prevTeamCount) {
      showSuddenDeath();
    } else {
      enterPreTurn();
    }
  }
}

// ─── Timeline rendering ───────────────────────────────────────────────────────

function renderTimeline(interactive, overrideCards, overrideSlot, onSlotClick) {
  const cards        = overrideCards   !== undefined ? overrideCards   : currentTeam().cards;
  const selectedSlot = overrideSlot    !== undefined ? overrideSlot    : state.selectedSlot;
  const slotClick    = onSlotClick     || selectSlot;
  const timeline     = dom.timeline;
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
    const slot = document.createElement('div');
    slot.className = 'timeline-slot';
    if (interactive) {
      if (selectedSlot === i) slot.classList.add('selected');
      const btn = document.createElement('button');
      btn.className = 'slot-btn';
      btn.textContent = '+';
      btn.setAttribute('aria-label', slotLabel(cards, i));
      btn.addEventListener('click', () => slotClick(i));
      slot.appendChild(btn);
      slot.addEventListener('click', () => slotClick(i));
    } else {
      const dot = document.createElement('div');
      dot.style.cssText = 'width:2px;height:40px;background:var(--grey-100);border-radius:1px;margin:auto';
      slot.appendChild(dot);
      slot.style.cursor = 'default';
    }
    row.appendChild(slot);

    if (i < cards.length) {
      const card   = cards[i];
      const cardEl = document.createElement('div');
      cardEl.className = 'timeline-card large';
      const yearColor = getDecadeVibe(card.year).color;
      cardEl.innerHTML = `
        <div class="tc-year" style="color:${yearColor}"${card.yearUncertain ? ' title="Year may be approximate"' : ''}>${card.yearUncertain ? '~' : ''}${card.year}</div>
        <div class="tc-title">${esc(card.title)}</div>
        <div class="tc-artist">${esc(card.artist)}</div>
      `;
      if (!card.isStartingCard) {
        cardEl.classList.add('editable');
        cardEl.title = 'Click to edit or delete this card';
        cardEl.addEventListener('click', (e) => {
          e.stopPropagation();
          openCardActionModal(currentTeamIndex(), i);
        });
      }
      row.appendChild(cardEl);
    }
  }

  timeline.appendChild(row);

  if (interactive && selectedSlot !== null) {
    const selected = row.querySelector('.timeline-slot.selected');
    if (selected) selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function slotLabel(cards, i) {
  if (cards.length === 0)    return 'Here';
  if (i === 0)               return 'Before ' + cards[0].year;
  if (i === cards.length)    return 'After '  + cards[cards.length - 1].year;
  return 'Between ' + cards[i - 1].year + ' and ' + cards[i].year;
}

// ─── Steal ────────────────────────────────────────────────────────────────────

function openStealWindow() {
  if (!state.stealEnabled) return;
  state._stealPhase   = 'available';
  state._stealQueueIdx = 0;
  state._stealSlot    = null;
  _syncSkipStealButton();

  dom.btnNextTeam.classList.add('hidden');
  dom.btnConfirmSteal.classList.add('hidden');


  if (state._stealQueue.length > 0) {
    // Teams pre-registered — start first attempt straight away
    startStealAttempt();
  } else {
    // No pre-registrations — show the steal window for teams to claim
    dom.stealSection.classList.remove('hidden');
    _renderStealTeamBtns();
    emitState();
  }
}

function _renderStealTeamBtns() {
  const curIdx = currentTeamIndex();
  dom.stealTeamBtns.innerHTML = state.teams.map((t, i) => {
    if (i === curIdx) return '';
    const inQueue = state._stealQueue.some(s => s.teamIndex === i);
    const isCurrent = state._stealQueueIdx < state._stealQueue.length &&
                      state._stealQueue[state._stealQueueIdx].teamIndex === i;
    return `<button class="btn-steal-team${inQueue ? ' queued' : ''}" data-team="${i}"${inQueue ? ' disabled' : ''}>` +
      esc(teamLabel(i, t.name)) + (inQueue ? (isCurrent ? ' ▶' : ' #' + (state._stealQueue.findIndex(s => s.teamIndex === i) + 1)) : '') +
      `</button>`;
  }).join('');
  dom.stealTeamBtns.querySelectorAll('.btn-steal-team:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => requestSteal(parseInt(btn.dataset.team, 10)));
  });
}

function requestSteal(teamIndex) {
  // Allow pre-registration during 'playing' (queue for when/if placement fails)
  // OR direct claim during 'available' phase
  if (state._stealPhase !== 'available' && state.phase !== 'playing') return;
  if (state._stealQueue.some(s => s.teamIndex === teamIndex)) return; // already queued
  const team = state.teams[teamIndex];
  state._stealQueue.push({ teamIndex, name: team.name });
  _renderStealTeamBtns();
  emitState();
  _updateStealIndicator();  // refresh host indicator
  // Only auto-start if steal window is already open (placement already failed)
  if (state._stealPhase === 'available' && state._stealQueue.length === 1) startStealAttempt();
}

function startStealAttempt() {
  const stealer = state._stealQueue[state._stealQueueIdx];
  if (!stealer) { closeStealWindow(); return; }
  state._stealPhase = 'placing';
  state._stealSlot  = null;

  // Update the team label area to show the stealer
  dom.currentTeamName.textContent = '🤚 ' + teamLabel(stealer.teamIndex, stealer.name);
  dom.stealSection.classList.add('hidden');
  dom.btnConfirmSteal.classList.add('hidden');

  // Show CURRENT team's timeline with slot buttons (steal is placed on their deck)
  renderTimeline(true, currentTeam().cards, null, selectStealSlot);
  renderOtherTeams();
  emitState();
}

function selectStealSlot(idx) {
  if (state._stealPhase !== 'placing') return;
  state._stealSlot = idx;
  const stealer = state._stealQueue[state._stealQueueIdx];
  renderTimeline(true, currentTeam().cards, idx, selectStealSlot);
  dom.btnConfirmSteal.classList.remove('hidden');
  emitState();
}

function confirmSteal() {
  const stealer = state._stealQueue[state._stealQueueIdx];
  if (!stealer || state._stealSlot === null) return;

  if (state._cardClaimedByOriginal) {
    // A year correction proved the original guess right while this attempt was in flight.
    // The steal has no effect — award the card to the original team and close the window.
    dom.btnConfirmSteal.classList.add('hidden');
    dom.resultBanner.className = 'result-banner correct';
    dom.resultText.textContent =
      '✓ Year corrected — ' + teamLabel(currentTeamIndex(), currentTeam().name) + ' had it right! Steal voided, no effect.';
    dom.resultBanner.classList.remove('hidden');
    _finalizeCorrectedOriginalAward();
    return;
  }

  const stealTeam  = state.teams[stealer.teamIndex];

  const cards      = currentTeam().cards;   // placement checked on the CURRENT team's deck
  const slot       = state._stealSlot;
  const year       = state.currentCard.year;

  const leftOk  = slot === 0 || cards[slot - 1].year <= year;
  const rightOk = slot >= cards.length || cards[slot].year >= year;
  const correct = leftOk && rightOk;

  state._stealPhase = 'result';
  dom.btnConfirmSteal.classList.add('hidden');

  let poppedCard = null;
  if (correct) {
    stealTeam.cards.push(state.currentCard); // card joins the STEALING team's timeline
    stealTeam.cards.sort((a, b) => a.year - b.year); // keep timeline ordered
    dom.resultBanner.className = 'result-banner correct';
    dom.resultText.textContent = '🤚 Steal! ' + teamLabel(stealer.teamIndex, stealer.name) + ' takes the card!';
  } else {
    // Lose last card — but protect the initial (first) card; minimum 1 card
    if (stealTeam.cards.length > 1) {
      poppedCard = stealTeam.cards[stealTeam.cards.length - 1];
      stealTeam.cards.pop();
    }
    dom.resultBanner.className = 'result-banner wrong';
    dom.resultText.textContent = '✗ Steal failed! ' + teamLabel(stealer.teamIndex, stealer.name) + ' loses a card.';
  }

  // Remember this attempt so a later year correction can undo/redo it against the corrected year
  state._stealHistory.push({ teamIndex: stealer.teamIndex, slot, correct, poppedCard });

  dom.resultBanner.classList.remove('hidden');
  renderTimeline(false, currentTeam().cards, null, null); // keep showing current team's deck
  renderOtherTeams();
  renderScoreChips();

  emitState({ result: { correct, text: dom.resultText.textContent } });

  if (correct) {
    // Steal succeeded — advance normally after a beat
    dom.btnNextTeam.textContent = 'Next Team →';
    dom.btnNextTeam.classList.remove('hidden');
    closeStealWindow();
  } else {
    // Move to next stealer or end
    state._stealQueueIdx++;
    if (state._stealQueueIdx < state._stealQueue.length) {
      // There's another team in the queue — show "next steal" button
      dom.btnNextTeam.textContent = '🤚 Next steal →';
      dom.btnNextTeam.classList.remove('hidden');
    } else {
      // No more stealers
      dom.btnNextTeam.textContent = 'Next Team →';
      dom.btnNextTeam.classList.remove('hidden');
      closeStealWindow();
    }
  }
}

function closeStealWindow() {
  // If this was a blind steal, reveal the card now that all attempts are done
  if (state._blindSteal) {
    state._blindSteal = false;
    _revealCardUI();
  }
  state._stealPhase   = null;
  state._stealQueue   = [];
  state._stealQueueIdx = 0;
  state._stealSlot    = null;
  dom.stealSection.classList.add('hidden');
  dom.btnConfirmSteal.classList.add('hidden');
}

/** Reflect _cardClaimedByOriginal on the steal-window button: "Skip steal" ↔ "Accept card". */
function _syncSkipStealButton() {
  if (!dom.btnSkipSteal) return;
  dom.btnSkipSteal.textContent = state._cardClaimedByOriginal ? '✓ Accept card' : '⏭ Skip steal';
}

/** Award the (year-corrected-to-right) card to the original team and end the steal window. */
function _finalizeCorrectedOriginalAward() {
  const team = currentTeam();
  const card = state.currentCard;
  if (card && team.cards.indexOf(card) === -1 && state.selectedSlot !== null) {
    team.cards.splice(state.selectedSlot, 0, card);
  }
  state._cardClaimedByOriginal = false;
  _syncSkipStealButton();
  closeStealWindow();

  renderTimeline(false);
  renderCurrentTeamBar();
  renderOtherTeams();
  renderScoreChips();
  emitState({ result: { correct: true, text: dom.resultText.textContent } });

  if (outcomeAlreadyDetermined()) {
    state._skipToWin = true;
    dom.btnNextTeam.textContent = '🏆 See Results!';
    dom.btnNextTeam.classList.remove('hidden');
    setTimeout(() => {
      if (state._skipToWin && state.phase === 'revealed') nextTeam();
    }, 3000);
  } else {
    state._skipToWin = false;
    dom.btnNextTeam.textContent = 'Next Team →';
    dom.btnNextTeam.classList.remove('hidden');
  }
}

function _revealCardUI() {
  const card = state.currentCard;
  if (!card) return;
  dom.nowPlayingInfo.textContent = card.title + ' – ' + card.artist;
  dom.cardFacedown.classList.add('hidden');
  dom.cardRevealed.classList.remove('hidden');
  dom.revealYear.textContent = (card.yearUncertain ? '~' : '') + (card.year || '?');
  dom.revealYear.title = card.yearUncertain ? 'Year may be approximate — could not confirm via MusicBrainz' : '';
  dom.revealTitle.textContent = card.title;
  dom.revealArtist.textContent = card.artist;
  showDecadeReveal(card);
  dom.btnEditYear.classList.remove('hidden');
  if (card.yearUncertain) {
    dom.yearEditInput.value = card.year;
    dom.yearEditSection.classList.remove('hidden');
  }
}

function _updateStealIndicator() {
  if (!dom.stealIndicator) return;
  if (!state.stealEnabled || state.phase !== 'playing') {
    dom.stealIndicator.classList.add('hidden');
    return;
  }
  dom.stealIndicator.classList.remove('hidden');
  const curIdx = currentTeamIndex();

  if (state._stealQueue.length > 0) {
    // Teams have committed — make it unmissable
    dom.stealIndicator.className = 'steal-indicator steal-indicator--active';
    const names = state._stealQueue.map(s =>
      '<span class="steal-team-pill">' + esc(teamLabel(s.teamIndex, s.name)) + '</span>'
    ).join('');
    dom.stealIndicatorText.innerHTML =
      '<span class="steal-indicator-icon">🤚</span>' +
      '<span class="steal-indicator-label">Committed to steal:</span>' +
      names;
    dom.hostStealTeamBtns.innerHTML = '';
  } else {
    // No commits yet — subtle with register buttons
    dom.stealIndicator.className = 'steal-indicator';
    dom.stealIndicatorText.innerHTML = '<span class="steal-indicator-icon">🤚</span> Mark steal for:';
    dom.hostStealTeamBtns.innerHTML = state.teams.map((t, i) => {
      if (i === curIdx) return '';
      return `<button class="btn-host-steal-team" data-team="${i}">${esc(teamLabel(i, t.name))}</button>`;
    }).join('');
    dom.hostStealTeamBtns.querySelectorAll('.btn-host-steal-team').forEach(btn => {
      btn.addEventListener('click', () => requestSteal(parseInt(btn.dataset.team, 10)));
    });
  }
}

// ─── Winner screen (navigate to winner.html) ──────────────────────────────────

function showWinnerScreen(winnerIndices) {
  state.phase = 'finished';
  emitState({ winnerIndices });
  sessionStorage.setItem('hitster_winner', JSON.stringify({
    teams:         state.teams,
    winnerIndices,
    cardsToWin:    state.cardsToWin,
    allTracks:     state.allTracks,
    deck:          state.deck,
    hardModeFinal: state.hardModeFinal,
    hardModeAll:   state.hardModeAll,
    playlistName:  dom.gamePlaylistInfo.textContent,
  }));
  // Small delay so socket can flush the final state to players before navigation
  setTimeout(() => { location.href = 'winner.html'; }, 400);
}

function resetGame() {
  sessionStorage.removeItem('hitster_room_code');
  location.href = '/';
}

function endGame() {
  dom.endGameConfirm.classList.add('hidden');
  const maxCards      = Math.max(...state.teams.map(t => t.cards.length));
  const winnerIndices = state.teams
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.cards.length === maxCards)
    .map(({ i }) => i);
  state.phase = 'finished';
  emitState({ winnerIndices });
  sessionStorage.setItem('hitster_winner', JSON.stringify({
    teams:         state.teams,
    winnerIndices,
    cardsToWin:    state.cardsToWin,
    allTracks:     state.allTracks,
    deck:          state.deck,
    hardModeFinal: state.hardModeFinal,
    hardModeAll:   state.hardModeAll,
    playlistName:  dom.gamePlaylistInfo.textContent,
  }));
  setTimeout(() => { location.href = 'winner.html'; }, 400);
}

function restartGame(mode) {
  // mode: 'full' | 'remaining'
  // 'full'      → reshuffle the entire original track pool
  // 'remaining' → play only the cards still in the deck
  const pool    = mode === 'remaining' && state.deck.length > 0
    ? [...state.deck]
    : [...state.allTracks];
  const newDeck = shuffle(pool);

  // Reset teams — clear cards but keep names
  const teams = state.teams.map(t => ({ name: t.name, cards: [] }));

  // Deal one starter card to each team
  teams.forEach(team => {
    if (newDeck.length > 0) team.cards.push({ ...newDeck.shift(), isStartingCard: true });
  });

  sessionStorage.setItem('hitster_game', JSON.stringify({
    teams,
    cardsToWin:    state.cardsToWin,
    hardModeFinal: state.hardModeFinal,
    hardModeAll:   state.hardModeAll,
    allTracks:     state.allTracks,   // always preserve the full pool
    deck:          newDeck,
    activeTeams:   teams.map((_, i) => i),
    activeCursor:  0,
    roundTeamsDone: 0,
    isTiebreaker:  false,
    playlistName:  dom.gamePlaylistInfo.textContent,
  }));
  location.href = 'game.html';
}

// ─── Event listeners ──────────────────────────────────────────────────────────

dom.btnStartTurn.addEventListener('click', beginTurn);
dom.btnConfirm.addEventListener('click', confirmPlacement);

dom.btnDiscard.addEventListener('click', () => {
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

dom.btnNextTeam.addEventListener('click', () => {
  if (state._stealPhase === 'result' && state._stealQueueIdx < state._stealQueue.length) {
    // Another team in the steal queue — start their attempt
    dom.btnNextTeam.classList.add('hidden');
    startStealAttempt();
  } else {
    nextTeam();
  }
});

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

dom.hcTitle.addEventListener('keydown',  e => { if (e.key === 'Enter') dom.hcArtist.focus(); });
dom.hcArtist.addEventListener('keydown', e => { if (e.key === 'Enter') dom.btnHcSubmit.click(); });

dom.btnOverturn.addEventListener('click', () => {
  dom.overturnConfirm.classList.remove('hidden');
  dom.btnOverturn.classList.add('hidden');
});
dom.btnOverturnNo.addEventListener('click', () => {
  dom.overturnConfirm.classList.add('hidden');
  dom.btnOverturn.classList.remove('hidden');
});
dom.btnOverturnYes.addEventListener('click', overturnPlacement);

// Year correction
dom.btnEditYear.addEventListener('click', () => {
  dom.yearEditInput.value = state.currentCard?.year || '';
  dom.yearEditSection.classList.remove('hidden');
  dom.yearEditInput.focus();
  dom.yearEditInput.select();
});
dom.btnYearConfirm.addEventListener('click', () => {
  const newYear = parseInt(dom.yearEditInput.value, 10);
  if (!newYear || newYear < 1900 || newYear > 2030) return;
  applyYearCorrection(newYear);
});
dom.yearEditInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') dom.btnYearConfirm.click();
});
dom.btnYearDismiss.addEventListener('click', () => {
  const card = state.currentCard;
  if (card) {
    setYearConfirmed(card.id, true);
    setYearUserConfirmed(card.id);
    card.yearUncertain = false;
    dom.revealYear.textContent = String(card.year);
    dom.revealYear.title       = '';
  }
  dom.yearEditSection.classList.add('hidden');
});

// Steal
dom.btnConfirmSteal.addEventListener('click', confirmSteal);
dom.btnSkipSteal.addEventListener('click', () => {
  if (state._cardClaimedByOriginal) {
    // Corrected to right — this click means "accept" the card instead of "skip" a real steal.
    _finalizeCorrectedOriginalAward();
    return;
  }
  closeStealWindow();
  dom.btnNextTeam.textContent = 'Next Team →';
  dom.btnNextTeam.classList.remove('hidden');
  emitState();
});


// End game
dom.btnEndGame.addEventListener('click', () => {
  dom.endGameConfirm.classList.toggle('hidden');
});
dom.btnEndGameNo.addEventListener('click', () => {
  dom.endGameConfirm.classList.add('hidden');
});
dom.btnEndGameYes.addEventListener('click', endGame);

// Restart game
dom.btnRestartGame.addEventListener('click', () => {
  // populate counts before showing
  const fullCount      = state.allTracks.length;
  const remainingCount = state.deck.length;
  dom.restartFullCount.textContent      = fullCount + ' songs';
  dom.restartRemainingCount.textContent = remainingCount > 0 ? remainingCount + ' songs' : 'none left';
  dom.btnRestartRemaining.disabled      = remainingCount === 0;
  dom.endGameConfirm.classList.add('hidden');  // close end-game confirm if open
  dom.restartOverlay.classList.remove('hidden');
});
dom.btnRestartCancel.addEventListener('click', () => {
  dom.restartOverlay.classList.add('hidden');
});
dom.btnRestartFull.addEventListener('click', () => {
  dom.restartOverlay.classList.add('hidden');
  restartGame('full');
});
dom.btnRestartRemaining.addEventListener('click', () => {
  dom.restartOverlay.classList.add('hidden');
  restartGame('remaining');
});

dom.btnSdFight.addEventListener('click', () => {
  dom.suddenDeathOverlay.classList.add('hidden');
  enterPreTurn();
});

// Game settings
dom.btnGameSettings.addEventListener('click', openGameSettings);
dom.btnGsCancel.addEventListener('click', () => {
  dom.gameSettingsOverlay.classList.add('hidden');
});
dom.btnGsApply.addEventListener('click', applyGameSettings);

dom.gsCardsMinus.addEventListener('click', () => {
  if (_gsCardsToWin > _gsMinCards()) {
    _gsCardsToWin--;
    dom.gsCardsDisplay.textContent = _gsCardsToWin;
    _updateGsCardsButtons();
  }
});
dom.gsCardsPlus.addEventListener('click', () => {
  if (_gsCardsToWin < 20) {
    _gsCardsToWin++;
    dom.gsCardsDisplay.textContent = _gsCardsToWin;
    _updateGsCardsButtons();
  }
});

// Show the "next round" note when hard-all is toggled while a round is in progress
dom.gsHardAll.addEventListener('change', () => {
  const changing = dom.gsHardAll.checked !== (state.hardModeAll || state._hardModePending);
  dom.gsHardNote.classList.toggle('hidden', !(changing && state.roundTeamsDone > 0));
});

dom.btnRetryPlay.addEventListener('click', async () => {
  dom.playbackErrPanel.classList.add('hidden');
  dom.nowPlayingInfo.textContent = '↺ Retrying…';
  try {
    await releaseSpotifySession();
    await spotifyPlay(state.currentCard.uri);
    state.isPlaying = true;
    ensureRepeatTrack();
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
  if (state.currentCard) state.deck.push(state.currentCard);
  beginTurn();
});

dom.btnPauseResume.addEventListener('click', async () => {
  try {
    if (state.isPlaying) {
      await holdSpotifySession();
      state.isPlaying = false;
      pauseProgress();
      dom.btnPauseResume.textContent = '▶ Resume';
    } else {
      await releaseSpotifySession();
      await spotifyResume();
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
    await releaseSpotifySession();
    await spotifySeek();
    _playedMs = 0;
    _playStartTime = Date.now();
    if (!state.isPlaying) {
      await spotifyResume();
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
  const rect       = dom.progressBarWrap.getBoundingClientRect();
  const pct        = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const position_ms = Math.round(pct * _trackDuration);
  _playedMs      = position_ms;
  _playStartTime = state.isPlaying ? Date.now() : null;
  _tickProgress();
  try {
    await spotifySeek(position_ms);
  } catch (err) {
    dom.nowPlayingInfo.textContent = '⚠ ' + err.message;
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

(async () => {
  const raw = sessionStorage.getItem('hitster_game');
  if (!raw) { location.href = '/'; return; }

  let gameData;
  try { gameData = JSON.parse(raw); } catch (_) { location.href = '/'; return; }

  // Restore state from sessionStorage
  state.teams          = gameData.teams;
  state.cardsToWin     = gameData.cardsToWin;
  state.hardModeFinal  = gameData.hardModeFinal;
  state.hardModeAll    = gameData.hardModeAll;
  state.stealEnabled   = gameData.stealEnabled || false;
  state.allTracks      = gameData.allTracks;
  state.deck           = gameData.deck;
  state.activeTeams    = gameData.activeTeams;
  state.activeCursor   = gameData.activeCursor   ?? 0;
  state.roundTeamsDone = gameData.roundTeamsDone ?? 0;
  state.isTiebreaker   = gameData.isTiebreaker   ?? false;

  dom.gamePlaylistInfo.textContent = gameData.playlistName || '';

  personalSpotify.load();
  setOAuthRetryAction(() => { location.href = '/'; });

  // Multiplayer — optional; game works standalone if socket.io is unavailable
  try {
    _io = io();

    _io.on('connect', () => {
      const savedCode = sessionStorage.getItem('hitster_room_code');
      if (savedCode) {
        _io.emit('host:rejoin_room', { code: savedCode });
      } else {
        _io.emit('host:create_room');
      }
    });

    _io.on('room:created', ({ code }) => {
      _roomCode = code;
      sessionStorage.setItem('hitster_room_code', code);
      _showRoomPanel(code);
      _updateStartingJoinHint(code);
      emitState();   // seed the room's snapshot immediately so QR/join info has real teams
    });

    _io.on('room:rejoined', ({ code, players }) => {
      _roomCode = code;
      sessionStorage.setItem('hitster_room_code', code);
      _showRoomPanel(code);
      _updatePlayerCount(players);
      _updateStartingJoinHint(code);
      emitState();   // re-broadcast current state to any players still in the room
    });

    _io.on('room:rejoin_failed', () => {
      // Room expired (server restarted, etc.) — create a fresh one
      sessionStorage.removeItem('hitster_room_code');
      _io.emit('host:create_room');
    });

    _io.on('room:players_updated', ({ players }) => {
      _updatePlayerCount(players);
    });

    _io.on('player:slot_selected', ({ slotIndex }) => {
      if (state.phase === 'playing') selectSlot(slotIndex);
    });

    _io.on('player:confirm_placement', () => {
      if (state.phase === 'playing' && state.selectedSlot !== null) confirmPlacement();
    });

    _io.on('player:next_team', () => {
      if (state.phase !== 'revealed') return;
      nextTeam();
      // If nextTeam() landed in pre-turn (not sudden-death or game-over), start immediately
      if (state.phase === 'pre-turn') beginTurn();
    });

    _io.on('player:steal_requested', ({ teamIndex }) => {
      // requestSteal() itself guards phase (allows during 'playing' OR 'available')
      requestSteal(teamIndex);
    });
    _io.on('player:steal_slot_selected', ({ slotIndex }) => {
      if (state._stealPhase === 'placing') selectStealSlot(slotIndex);
    });
    _io.on('player:steal_confirm', () => {
      if (state._stealPhase === 'placing' && state._stealSlot !== null) confirmSteal();
    });

    _io.on('connect_error', () => {
      // Silent — multiplayer just won't work
    });
  } catch (_) {
    // socket.io not available (e.g. Vercel) — standalone mode
  }

  // Verify Spotify token is still valid — the same token from the setup page
  // but it may have expired if the user was on setup for a long time
  try {
    const token = await personalSpotify.getToken();
    if (!token) {
      _showSpotifyExpiredOverlay();
      return;
    }
  } catch (_) {
    _showSpotifyExpiredOverlay();
    return;
  }

  syncHardModeCtl();
  showStartingCards();
})();

function _showSpotifyExpiredOverlay() {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;' +
    'align-items:center;justify-content:center;z-index:500;padding:24px';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:20px;padding:36px 28px;max-width:360px;' +
    'width:100%;text-align:center;display:flex;flex-direction:column;gap:14px">' +
    '<div style="font-size:2rem">🎵</div>' +
    '<h2 style="font-size:1.15rem;font-weight:800;margin:0">Spotify connection expired</h2>' +
    '<p style="color:#6b7280;font-size:0.9rem;margin:0">Please go back to the setup page and reconnect your Spotify account before starting a game.</p>' +
    '<button onclick="sessionStorage.removeItem(\'hitster_game\');location.href=\'/\'" ' +
    'style="background:#007272;color:#fff;border:none;border-radius:50px;padding:14px;' +
    'font-size:1rem;font-weight:700;cursor:pointer;font-family:inherit">← Back to Setup</button>' +
    '</div>';
  document.body.appendChild(overlay);
}
