'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

const roomCode   = (new URLSearchParams(location.search).get('room') || '').toUpperCase();
let socket       = null;
let myName       = '';
let myTeamIndex  = 0;
let joined       = false;
let latestSnap   = null;   // most recent snapshot from host
let seenReveal   = false;  // true when we've shown a 'revealed' phase
let caughtUp     = true;   // false = player is on the catch-up screen
const app        = document.getElementById('app');

// ─── Render helpers ───────────────────────────────────────────────────────────

function h(tag, cls, inner) {
  return '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + (inner || '') + '</' + tag + '>';
}

function renderScoreChips(snap) {
  const cur = snap.currentTeamIndex;
  return snap.teams.map((t, i) =>
    h('span', 'p-score-chip' + (i === cur ? ' active' : ''),
      esc(t.name) + ': ' + t.cards.length)
  ).join('');
}

function renderTimeline(cards, interactive, selectedSlot) {
  if (!cards.length && !interactive) {
    return h('p', 'p-waiting', 'No cards yet');
  }
  const slots = cards.length + 1;
  let row = '';
  for (let i = 0; i < slots; i++) {
    if (interactive) {
      const sel = selectedSlot === i;
      const label = cards.length === 0 ? 'Here'
        : i === 0           ? 'Before ' + cards[0].year
        : i === cards.length ? 'After ' + cards[cards.length - 1].year
        : 'Between ' + cards[i - 1].year + ' and ' + cards[i].year;
      row += '<div class="p-slot' + (sel ? ' selected' : '') + '" data-slot="' + i + '">'
           + '<button class="p-slot-btn" title="' + label + '">+</button></div>';
    } else {
      row += '<div class="p-slot"><div class="p-slot-dot"></div></div>';
    }
    if (i < cards.length) {
      const c = cards[i];
      const color = getDecadeVibe(c.year).color;
      const yr = (c.yearUncertain ? '~' : '') + c.year;
      row += '<div class="p-tc">'
           + '<div class="p-tc-year" style="color:' + color + '">' + yr + '</div>'
           + '<div class="p-tc-title">' + esc(c.title) + '</div>'
           + '<div class="p-tc-artist">' + esc(c.artist) + '</div>'
           + '</div>';
    }
  }
  return '<div class="p-timeline-wrap"><div class="p-timeline-row">' + row + '</div></div>';
}

// ─── Views ────────────────────────────────────────────────────────────────────

function renderJoinForm(teams) {
  const teamOpts = teams.length
    ? teams.map((t, i) => '<option value="' + i + '">' + esc(t.name) + '</option>').join('')
    : '<option value="0">Team 1</option><option value="1">Team 2</option>';

  app.innerHTML =
    h('div', 'p-header',
      h('span', 'p-header-title', '🎵 Hitster') +
      h('span', 'p-room-code', roomCode)) +
    h('div', 'p-card',
      h('div', 'p-form',
        h('div', '', h('p', 'p-label', 'Your name') +
          '<input id="p-name" class="p-input" type="text" placeholder="Enter your name…" maxlength="20" autocomplete="off">') +
        h('div', '', h('p', 'p-label', 'Your team') +
          '<select id="p-team" class="p-select">' + teamOpts + '</select>') +
        '<button id="p-join-btn" class="p-btn" disabled>Join Game</button>'));

  const nameEl = document.getElementById('p-name');
  const teamEl = document.getElementById('p-team');
  const joinBtn = document.getElementById('p-join-btn');

  nameEl.focus();
  nameEl.addEventListener('input', () => {
    joinBtn.disabled = !nameEl.value.trim();
  });
  joinBtn.addEventListener('click', () => {
    myName = nameEl.value.trim();
    myTeamIndex = parseInt(teamEl.value, 10) || 0;
    if (!myName) return;
    joinBtn.disabled = true;
    joinBtn.textContent = 'Joining…';
    socket.emit('player:join', { code: roomCode, name: myName, teamIndex: myTeamIndex });
  });
  nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') joinBtn.click(); });
}

function renderLobby(players) {
  const list = (players || []).map(p =>
    h('div', 'p-player-row',
      h('span', 'p-player-name', esc(p.name)) +
      (latestSnap?.teams?.[p.teamIndex]
        ? h('span', 'p-player-team', esc(latestSnap.teams[p.teamIndex].name))
        : ''))
  ).join('') || h('p', 'p-waiting', 'No other players yet');

  app.innerHTML =
    h('div', 'p-header',
      h('span', 'p-header-title', '🎵 Hitster') +
      h('span', 'p-room-code', roomCode)) +
    h('div', 'p-card',
      h('p', 'p-section-title', 'Players in room') +
      h('div', 'p-player-list', list) +
      h('p', 'p-status', 'Waiting for the host to start the game…'));
}

function renderGame(snap) {
  if (!snap) return;
  const isMyTurn  = snap.activeTeams.includes(myTeamIndex) &&
                    snap.currentTeamIndex === myTeamIndex;
  const myCards   = snap.teams[myTeamIndex]?.cards || [];

  let content = '';

  // Header
  content += h('div', 'p-header',
    h('span', 'p-header-title', '🎵 ' + (snap.isTiebreaker ? '⚡ Sudden Death' : esc(snap.playlistName || 'Hitster'))) +
    h('span', 'p-room-code', roomCode) +
    h('span', '', snap.deckCount + ' cards left'));

  // Catch-up banner
  if (!caughtUp) {
    content += h('div', 'p-catchup', '⏩ The game has moved on — tap Continue below to catch up.');
  }

  // Phase-specific panel
  const isCurrentStealer = snap.currentStealer?.teamIndex === myTeamIndex;

  if (snap.stealPhase === 'placing' && isCurrentStealer) {
    content += renderStealPlacingPanel(snap);
  } else if (snap.stealPhase === 'placing') {
    content += renderStealWatchingPanel(snap);
  } else if (snap.phase === 'revealed') {
    content += renderRevealedPanel(snap, isMyTurn);
  } else if (snap.phase === 'pre-turn') {
    content += renderPreTurnPanel(snap, isMyTurn, myCards);
  } else if (snap.phase === 'playing') {
    content += renderPlayingPanel(snap, isMyTurn, myCards);
  } else if (snap.phase === 'finished') {
    content += renderFinishedPanel(snap);
  }

  // Scoreboard + card decks — always shown below the action panel
  if (snap.phase !== 'finished') {
    content += renderScoreboardAndDecks(snap);
  }

  app.innerHTML = content;
  attachSlotListeners(snap, isMyTurn);
  attachConfirmListener();
  attachNextTeamListener();
  attachContinueListener(snap);
  attachStealListeners(snap);
}

function renderPreTurnPanel(snap, isMyTurn, myCards) {
  return h('div', 'p-card',
    h('p', 'p-section-title', 'Current team') +
    h('p', 'p-status', isMyTurn
      ? '🎯 It\'s your team\'s turn! Waiting for the host to start…'
      : '⏳ ' + esc(snap.currentTeamName) + ' is about to play') +
    h('p', 'p-section-title', 'Your timeline') +
    renderTimeline(myCards, false, null));
}

function renderPlayingPanel(snap, isMyTurn, myCards) {
  if (isMyTurn) {
    const sel = snap.selectedSlot;
    return h('div', 'p-card',
      h('p', 'p-section-title', 'Place the card on your timeline') +
      renderTimeline(myCards, true, sel) +
      (sel !== null
        ? h('p', 'p-status', '✓ Slot ' + (sel + 1) + ' selected') +
          '<button id="p-confirm-btn" class="p-btn">✓ Confirm Placement</button>'
        : h('p', 'p-waiting', 'Tap a + to place the card')));
  }
  // Other team's turn
  const stealAvailable    = snap.stealPhase === 'available';
  const alreadyQueued     = (snap.stealQueue || []).some(s => s.teamIndex === myTeamIndex);
  const queuePos          = (snap.stealQueue || []).findIndex(s => s.teamIndex === myTeamIndex);

  let stealBtn = '';
  if (alreadyQueued) {
    stealBtn = h('div', 'p-steal-committed',
      '🤚 Committed to steal' + (queuePos >= 0 ? ' — #' + (queuePos + 1) + ' in line' : '') + '!');
  } else if (stealAvailable) {
    // Steal window is open — show claim button
    stealBtn = '<button id="p-steal-btn" class="p-btn" style="background:#e85d04;margin-top:8px">🤚 Steal!</button>';
  } else if (snap.stealEnabled) {
    // Pre-registration: commit intent before placement happens
    stealBtn =
      '<button id="p-presteal-btn" class="p-btn-steal-pre" style="margin-top:8px">🤚 Commit to Steal</button>' +
      '<div id="p-presteal-confirm" class="p-presteal-confirm hidden">' +
        '<p style="font-size:0.82rem;color:#6b7280;margin:0">If they fail, you\'ll attempt to place the card. Fail and you lose your last card.</p>' +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
          '<button id="p-presteal-yes" class="p-btn" style="background:#e85d04;flex:1">Yes, commit!</button>' +
          '<button id="p-presteal-no" class="p-btn p-btn-ghost" style="flex:1">Cancel</button>' +
        '</div>' +
      '</div>';
  }

  return h('div', 'p-card',
    (stealAvailable
      ? h('p', 'p-status', '🤚 Steal available! ' + esc(snap.currentTeamName) + ' failed.')
      : h('p', 'p-status', '🎵 ' + esc(snap.currentTeamName) + ' is choosing…')) +
    h('p', 'p-section-title', 'Their timeline') +
    renderTimeline(snap.teams[snap.currentTeamIndex]?.cards || [], false, null) +
    stealBtn);
}

function renderRevealedPanel(snap, isMyTurn) {
  const card   = snap.card;
  const result = snap.result;
  if (!card) return '';
  const yr      = (card.yearUncertain ? '~' : '') + card.year;
  const color   = getDecadeVibe(card.year).color;
  const isWrong = result && !result.correct;

  let html = '';

  // Prominent result block at the TOP — hard to miss
  if (result) {
    if (isWrong) {
      html +=
        '<div class="p-verdict p-verdict--wrong">' +
          '<div class="p-verdict-icon">✗</div>' +
          '<div class="p-verdict-text">Wrong!</div>' +
          '<div class="p-verdict-sub">' + esc(result.text.replace('✗ Wrong! ', '')) + '</div>' +
        '</div>';
    } else {
      html +=
        '<div class="p-verdict p-verdict--correct">' +
          '<div class="p-verdict-icon">✓</div>' +
          '<div class="p-verdict-text">Correct!</div>' +
        '</div>';
    }
  }

  // Card details
  html += h('div', 'p-card' + (isWrong ? ' p-card--wrong' : ''),
    h('div', 'p-card-reveal',
      (card.albumArt ? '<img class="p-card-art" src="' + esc(card.albumArt) + '" alt="">' : '') +
      h('div', 'p-card-year', yr) +
      h('div', 'p-card-title', esc(card.title)) +
      h('div', 'p-card-artist', esc(card.artist))));

  const isNextTeam = snap.nextTeamIndex === myTeamIndex;
  if (isNextTeam) {
    html +=
      h('div', 'p-next-banner', '🎯 Your team is up next!') +
      '<button id="p-next-team-btn" class="p-btn" style="margin:8px 16px 0;width:calc(100% - 32px)">▶ Start Our Turn &amp; Play</button>';
  } else {
    html += '<button id="p-continue-btn" class="p-btn" style="margin:8px 16px 0;width:calc(100% - 32px)">Continue →</button>';
  }
  return html;
}

function renderStealPlacingPanel(snap) {
  const stealer = snap.currentStealer;
  const cards   = stealer?.cards || [];   // this is now the CURRENT team's deck
  const sel     = stealer?.stealSlot ?? null;
  return h('div', 'p-card',
    h('div', 'p-next-banner', '🤚 Your team is stealing!') +
    h('p', 'p-waiting', 'Place the card correctly on ' + esc(snap.currentTeamName) + '\'s timeline:') +
    renderTimeline(cards, true, sel) +
    (sel !== null
      ? h('p', 'p-status', '✓ Slot ' + (sel + 1) + ' selected') +
        '<button id="p-steal-confirm-btn" class="p-btn" style="background:#e85d04">🤚 Confirm Steal</button>'
      : h('p', 'p-waiting', 'Tap a + to place the card')));
}

function renderStealWatchingPanel(snap) {
  const stealer = snap.currentStealer;
  const name    = stealer ? esc(snap.teams[stealer.teamIndex]?.name || 'A team') : 'A team';
  return h('div', 'p-card',
    h('p', 'p-status', '🤚 ' + name + ' is attempting a steal…') +
    h('p', 'p-section-title', 'Their timeline') +
    renderTimeline(stealer?.cards || [], false, null));
}

function renderScoreboardAndDecks(snap) {
  // Sort by card count descending, keep original index for highlighting
  const sorted = snap.teams
    .map((t, i) => ({ ...t, idx: i }))
    .sort((a, b) => b.cards.length - a.cards.length);

  const teams = sorted.map(t => {
    const isCurrent = t.idx === snap.currentTeamIndex;
    const isMe      = t.idx === myTeamIndex;
    const cls       = 'p-team-deck'
      + (isMe      ? ' p-team-deck--mine'    : '')
      + (isCurrent ? ' p-team-deck--current' : '');

    const badge = isCurrent ? h('span', 'p-deck-badge p-deck-badge--playing', '▶ Playing')
                : isMe      ? h('span', 'p-deck-badge p-deck-badge--me',      '★ You')
                : '';

    const cards = t.cards.length === 0
      ? h('p', 'p-deck-empty', 'No cards yet')
      : '<div class="p-deck-scroll">' +
          t.cards.map(c => {
            const color = getDecadeVibe(c.year).color;
            const yr    = (c.yearUncertain ? '~' : '') + c.year;
            return '<div class="p-deck-card">' +
              '<div class="p-deck-year" style="color:' + color + '">' + yr + '</div>' +
              '<div class="p-deck-title">' + esc(c.title) + '</div>' +
              '</div>';
          }).join('') +
        '</div>';

    return h('div', cls,
      h('div', 'p-deck-header',
        h('span', 'p-deck-name', esc(t.name)) +
        badge +
        h('span', 'p-deck-count', t.cards.length + ' card' + (t.cards.length !== 1 ? 's' : ''))
      ) +
      cards
    );
  }).join('');

  return h('div', 'p-scoreboard', teams);
}

function renderFinishedPanel(snap) {
  if (!snap.winnerIndices) return '';
  const winners = snap.winnerIndices.map(i => snap.teams[i].name);
  return h('div', 'p-card',
    h('h2', '', '🏆 ' + esc(winners.join(' & ')) + (winners.length > 1 ? ' tie!' : ' wins!')) +
    h('div', 'p-scores', renderScoreChips(snap)) +
    '<button class="p-btn p-btn-ghost" onclick="location.href=\'\/\'" style="margin-top:12px">Back to home</button>');
}

function renderError(msg) {
  app.innerHTML =
    h('div', 'p-header', h('span', 'p-header-title', '🎵 Hitster')) +
    h('div', 'p-error', esc(msg)) +
    '<button class="p-btn p-btn-ghost" onclick="location.href=\'/\'" style="margin-top:12px">Go home</button>';
}

function renderRoomError(msg) {
  app.innerHTML =
    h('div', 'p-header', h('span', 'p-header-title', '🎵 Hitster')) +
    h('div', 'p-error', esc(msg)) +
    h('div', 'p-card',
      h('p', 'p-section-title', 'Enter a room code') +
      '<div style="display:flex;gap:8px;margin-top:4px">' +
        '<input id="p-room-input" class="p-input" type="text" maxlength="6" ' +
          'placeholder="e.g. AB3F" autocomplete="off" spellcheck="false" ' +
          'style="text-transform:uppercase;letter-spacing:0.12em;font-weight:700">' +
        '<button id="p-room-join-btn" class="p-btn" style="width:auto;padding:12px 20px">Join</button>' +
      '</div>') +
    '<button class="p-btn p-btn-ghost" onclick="location.href=\'/\'" style="margin-top:8px">Go home</button>';

  const input = document.getElementById('p-room-input');
  const btn   = document.getElementById('p-room-join-btn');

  function tryJoin() {
    const code = (input?.value || '').trim().toUpperCase();
    if (code.length < 2) return;
    location.href = '/player?room=' + encodeURIComponent(code);
  }

  btn?.addEventListener('click', tryJoin);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') tryJoin(); });
  input?.focus();
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

function attachSlotListeners(snap, isMyTurn) {
  if (!isMyTurn || snap.phase !== 'playing') return;
  document.querySelectorAll('.p-slot').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.slot, 10);
      socket.emit('player:select_slot', { code: roomCode, slotIndex: idx });
    });
  });
}

function attachConfirmListener() {
  const btn = document.getElementById('p-confirm-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = 'Confirming…';
    socket.emit('player:confirm_placement', { code: roomCode });
  });
}

function attachNextTeamListener() {
  const btn = document.getElementById('p-next-team-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = 'Starting…';
    caughtUp = true;
    seenReveal = false;
    socket.emit('player:next_team', { code: roomCode });
  });
}

function attachStealListeners(snap) {
  // Pre-commit steal (during playing phase, before placement)
  const preStealBtn = document.getElementById('p-presteal-btn');
  if (preStealBtn) {
    preStealBtn.addEventListener('click', () => {
      preStealBtn.classList.add('hidden');
      document.getElementById('p-presteal-confirm')?.classList.remove('hidden');
    });
  }
  document.getElementById('p-presteal-yes')?.addEventListener('click', () => {
    document.getElementById('p-presteal-yes').disabled = true;
    socket.emit('player:steal_request', { code: roomCode });
  });
  document.getElementById('p-presteal-no')?.addEventListener('click', () => {
    document.getElementById('p-presteal-confirm')?.classList.add('hidden');
    document.getElementById('p-presteal-btn')?.classList.remove('hidden');
  });

  // Direct steal claim (during steal-available phase)
  const stealBtn = document.getElementById('p-steal-btn');
  if (stealBtn) {
    stealBtn.addEventListener('click', () => {
      stealBtn.disabled = true;
      stealBtn.textContent = 'Waiting…';
      socket.emit('player:steal_request', { code: roomCode });
    });
  }
  // Steal slot selection on stealing team's timeline
  const isCurrentStealer = snap.currentStealer?.teamIndex === myTeamIndex;
  if (isCurrentStealer && snap.stealPhase === 'placing') {
    document.querySelectorAll('.p-slot').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.slot, 10);
        socket.emit('player:steal_slot', { code: roomCode, slotIndex: idx });
      });
    });
  }
  // Confirm steal
  const confirmStealBtn = document.getElementById('p-steal-confirm-btn');
  if (confirmStealBtn) {
    confirmStealBtn.addEventListener('click', () => {
      confirmStealBtn.disabled = true;
      confirmStealBtn.textContent = 'Confirming…';
      socket.emit('player:steal_confirm', { code: roomCode });
    });
  }
}

function attachContinueListener(snap) {
  const btn = document.getElementById('p-continue-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    caughtUp = true;
    seenReveal = false;
    renderGame(latestSnap);
  });
}

// ─── Reconnect overlay ────────────────────────────────────────────────────────

function showReconnectOverlay() {
  if (document.getElementById('p-reconnect-overlay')) return;
  const el = document.createElement('div');
  el.id = 'p-reconnect-overlay';
  el.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;' +
    'align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(2px)';
  el.innerHTML =
    '<div style="background:#fff;padding:24px 28px;border-radius:14px;text-align:center;' +
    'max-width:280px;display:flex;flex-direction:column;gap:8px">' +
    '<div style="font-size:1.5rem">⏳</div>' +
    '<p style="font-weight:800;color:#111827;margin:0">Reconnecting…</p>' +
    '<p style="font-size:0.8rem;color:#6b7280;margin:0">Connection dropped. Reconnecting automatically.</p>' +
    '</div>';
  document.body.appendChild(el);
}

function hideReconnectOverlay() {
  document.getElementById('p-reconnect-overlay')?.remove();
}

// ─── Socket setup ─────────────────────────────────────────────────────────────

function initSocket() {
  socket = io({
    reconnectionDelay:    500,
    reconnectionDelayMax: 3000,
    timeout:              10000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    hideReconnectOverlay();
    if (!roomCode) { renderError('No room code in URL. Scan the QR code again.'); return; }
    if (joined) {
      // Reconnected after a drop — re-join to restore snapshot
      socket.emit('player:join', { code: roomCode, name: myName, teamIndex: myTeamIndex });
    } else {
      socket.emit('player:get_room_info', { code: roomCode });
    }
  });

  socket.on('room:info', ({ teams }) => {
    if (!joined) renderJoinForm(teams);
  });

  socket.on('room:error', ({ message }) => {
    renderRoomError(message);
  });

  socket.on('room:join_ok', ({ players, snapshot }) => {
    hideReconnectOverlay();
    joined = true;
    latestSnap = snapshot;
    if (snapshot && snapshot.phase && snapshot.phase !== 'pre-turn') {
      caughtUp = snapshot.phase !== 'revealed';
      renderGame(snapshot);
    } else {
      caughtUp = true;
      renderLobby(players);
    }
  });

  socket.on('room:players_updated', ({ players }) => {
    if (!joined) return;
    if (!latestSnap || latestSnap.phase === 'pre-turn') {
      renderLobby(players);
    }
  });

  socket.on('game:state', ({ snapshot }) => {
    if (!joined) return;
    const prev = latestSnap;
    latestSnap = snapshot;

    // If the new snapshot is 'revealed' and we haven't shown it yet → show it
    if (snapshot.phase === 'revealed' && (!prev || prev.phase !== 'revealed')) {
      seenReveal = true;
      caughtUp = true;
    }

    // If we haven't caught up to a previous reveal, stay on catch-up view
    if (!caughtUp && snapshot.phase !== 'revealed') {
      renderGame(snapshot);
      return;
    }

    renderGame(snapshot);
  });

  socket.on('room:host_left', () => {
    hideReconnectOverlay();
    renderError('The host has disconnected. The game has ended.');
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') return;
    if (joined) showReconnectOverlay();
  });

  socket.on('connect_error', () => {
    if (!joined) {
      app.innerHTML = h('div', 'p-connecting',
        'Could not connect to the game server. Check your connection and refresh.');
    }
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

if (!roomCode) {
  renderError('No room code found. Please scan the QR code again.');
} else {
  initSocket();
}
