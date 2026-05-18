'use strict';

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
  matchPointBanner:   $('match-point-banner'),
  // Hard-mode controls
  btnEnableHard:      $('btn-enable-hard'),
  hardEnableConfirm:  $('hard-enable-confirm'),
  btnHardYes:         $('btn-hard-yes'),
  btnHardNo:          $('btn-hard-no'),
  btnDisableHard:     $('btn-disable-hard'),
  hardDisableConfirm: $('hard-disable-confirm'),
  btnHardDisableYes:  $('btn-hard-disable-yes'),
  btnHardDisableNo:   $('btn-hard-disable-no'),
  hardModeBadge:      $('hard-mode-badge'),
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
  btnNextTeam:  $('btn-next-team'),
  // Year correction
  yearEditSection: $('year-edit-section'),
  yearEditInput:   $('year-edit-input'),
  btnYearConfirm:  $('btn-year-confirm'),
  btnYearDismiss:  $('btn-year-dismiss'),
  btnEditYear:     $('btn-edit-year'),
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
};

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
    return `<span class="score-chip${active ? ' active' : ''}">${t.name}: ${t.cards.length}</span>`;
  }).join('');
}

function renderDeckCounter() {
  dom.deckCounter.textContent = state.deck.length + ' cards left';
}

function renderCurrentTeamBar() {
  const team   = currentTeam();
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
  const others = state.teams.map((t, i) => ({ t, i })).filter(({ i }) => i !== curIdx);
  if (others.length === 0) { dom.otherTeams.innerHTML = ''; return; }
  dom.otherTeams.innerHTML = others.map(({ t }) => {
    const cardsHtml = t.cards.length === 0
      ? `<span class="otr-empty">No cards yet</span>`
      : t.cards.map(c =>
          `<div class="otr-card">
            <div class="otr-year" style="color:${getDecadeVibe(c.year).color}">${c.yearUncertain ? '~' : ''}${c.year}</div>
            <div class="otr-title">${esc(c.title)}</div>
          </div>`
        ).join('');
    return `<div class="other-team-row">
      <span class="otr-name">${esc(t.name)}</span>
      <div class="otr-cards">${cardsHtml}</div>
    </div>`;
  }).join('');
}

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
  dom.startingCardsGrid.innerHTML = state.teams.map(t => {
    const c = t.cards[0];
    return `<div class="starting-card-row">
      <div class="starting-card-team">${esc(t.name)}</div>
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
    const atGoal = state.teams.filter(t => t.cards.length >= state.cardsToWin);
    if (atGoal.length > 0) {
      dom.gameScreen.classList.add('match-point');
      const names = atGoal.map(t => t.name).join(' & ');
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
  dom.currentTeamName.textContent = team.name;
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
}

async function beginTurn() {
  const card = drawCard();
  if (!card) return;

  state.currentCard  = card;
  state.selectedSlot = null;
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
    await spotifyPlay(card.uri);
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
  renderTimeline(true);
  dom.btnConfirm.classList.remove('hidden');
}

async function confirmPlacement() {
  if (state.selectedSlot === null || !state.currentCard) return;

  state.phase = 'revealed';
  dom.btnConfirm.classList.add('hidden');
  dom.btnDiscard.classList.add('hidden');
  dom.discardConfirm.classList.add('hidden');

  try { await spotifyPause(); } catch (_) {}
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

  const card = state.currentCard;
  dom.nowPlayingInfo.textContent = card.title + ' – ' + card.artist;
  dom.cardFacedown.classList.add('hidden');
  dom.revealYear.textContent = (card.yearUncertain ? '~' : '') + (card.year || '?');
  dom.revealYear.title = card.yearUncertain ? 'Year may be approximate — could not confirm via MusicBrainz' : '';
  dom.revealTitle.textContent  = card.title;
  dom.revealArtist.textContent = card.artist;
  dom.cardRevealed.classList.remove('hidden');
  dom.cardRevealed.classList.toggle('wrong', !correct);

  showDecadeReveal(state.currentCard);

  dom.resultBanner.classList.remove('hidden');
  if (correct) {
    dom.resultBanner.className = 'result-banner correct';
    dom.resultText.textContent = '✓ Correct! Card added to timeline.';
    team.cards.splice(slot, 0, state.currentCard);
  } else {
    dom.resultBanner.className = 'result-banner wrong';
    dom.resultText.textContent = '✗ Wrong! Card discarded.';
    if (fromHardMode) {
      state.pendingOverturnSlot = slot;
      dom.overturnTeamName.textContent = team.name;
      dom.overturnSection.classList.remove('hidden');
    }
  }

  renderTimeline(false);
  renderCurrentTeamBar();
  renderOtherTeams();

  // Always show the subtle edit button; auto-open the section only when uncertain
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
  renderCurrentTeamBar();
  renderOtherTeams();
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

  if (correct) {
    team.cards.splice(slot, 0, card);
    dom.resultBanner.className = 'result-banner correct';
    dom.resultText.textContent = '✓ Correct! Card added to timeline.';
    dom.cardRevealed.classList.remove('wrong');
    dom.overturnSection.classList.add('hidden');
    state.pendingOverturnSlot = null;
  } else {
    dom.resultBanner.className = 'result-banner wrong';
    dom.resultText.textContent = '✗ Wrong! Card discarded.';
    dom.cardRevealed.classList.add('wrong');
  }

  dom.revealYear.textContent = String(newYear);
  dom.revealYear.title       = '';
  dom.yearEditSection.classList.add('hidden');

  renderTimeline(false);
  renderCurrentTeamBar();
  renderOtherTeams();

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
    return `<span class="sd-team-name">${esc(state.teams[i].name)}</span>${sep}`;
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
      row.appendChild(cardEl);
    }
  }

  timeline.appendChild(row);

  if (interactive && state.selectedSlot !== null) {
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

// ─── Winner screen (navigate to winner.html) ──────────────────────────────────

function showWinnerScreen(winnerIndices) {
  state.phase = 'finished';
  sessionStorage.setItem('hitster_winner', JSON.stringify({
    teams:        state.teams,
    winnerIndices,
    cardsToWin:   state.cardsToWin,
  }));
  location.href = 'winner.html';
}

function resetGame() {
  location.href = '/';
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

dom.btnNextTeam.addEventListener('click', nextTeam);

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

dom.btnSdFight.addEventListener('click', () => {
  dom.suddenDeathOverlay.classList.add('hidden');
  enterPreTurn();
});

dom.btnEnableHard.addEventListener('click', () => {
  dom.btnEnableHard.classList.add('hidden');
  dom.hardEnableConfirm.classList.remove('hidden');
});
dom.btnHardNo.addEventListener('click', () => { syncHardModeCtl(); });
dom.btnHardYes.addEventListener('click', () => {
  if (state.roundTeamsDone === 0) {
    state.hardModeAll = true;
  } else {
    state._hardModePending = true;
  }
  syncHardModeCtl();
});

dom.btnDisableHard.addEventListener('click', () => {
  dom.btnDisableHard.classList.add('hidden');
  dom.hardDisableConfirm.classList.remove('hidden');
});
dom.btnHardDisableNo.addEventListener('click', () => { syncHardModeCtl(); });
dom.btnHardDisableYes.addEventListener('click', () => {
  if (state.roundTeamsDone === 0) {
    state.hardModeAll = false;
  } else {
    state._hardModeDisablePending = true;
  }
  syncHardModeCtl();
});

dom.btnRetryPlay.addEventListener('click', async () => {
  dom.playbackErrPanel.classList.add('hidden');
  dom.nowPlayingInfo.textContent = '↺ Retrying…';
  try {
    await spotifyPlay(state.currentCard.uri);
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
  if (state.currentCard) state.deck.push(state.currentCard);
  beginTurn();
});

dom.btnPauseResume.addEventListener('click', async () => {
  try {
    if (state.isPlaying) {
      await spotifyPause();
      state.isPlaying = false;
      pauseProgress();
      dom.btnPauseResume.textContent = '▶ Resume';
    } else {
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
  state.allTracks      = gameData.allTracks;
  state.deck           = gameData.deck;
  state.activeTeams    = gameData.activeTeams;
  state.activeCursor   = gameData.activeCursor   ?? 0;
  state.roundTeamsDone = gameData.roundTeamsDone ?? 0;
  state.isTiebreaker   = gameData.isTiebreaker   ?? false;

  dom.gamePlaylistInfo.textContent = gameData.playlistName || '';

  personalSpotify.load();
  setOAuthRetryAction(() => { location.href = '/'; });

  syncHardModeCtl();
  showStartingCards();
})();
