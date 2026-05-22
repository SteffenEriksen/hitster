'use strict';

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const dom = {
  winnerEmojis:    $('winner-emojis'),
  winnerTitle:     $('winner-title'),
  winnerSubtitle:  $('winner-subtitle'),
  winnerSongsWrap: $('winner-songs-wrap'),
  finalScores:     $('final-scores'),
  btnPlayAgain:    $('btn-play-again'),
  btnWinnerRestartFull:      $('btn-winner-restart-full'),
  btnWinnerRestartRemaining: $('btn-winner-restart-remaining'),
  winnerRestartFullCount:      $('winner-restart-full-count'),
  winnerRestartRemainingCount: $('winner-restart-remaining-count'),
};

// ─── Winner screen rendering ──────────────────────────────────────────────────

const WIN_EMOJIS = [
  ['🎉','🏆','🎉'], ['🌟','🥇','🌟'], ['🎊','👑','🎊'],
  ['🔥','🏆','🔥'], ['🎵','🥇','🎵'], ['⭐','🏅','⭐'],
];

function renderWinnerScreen(winnerData) {
  const { teams, winnerIndices, allTracks = [], deck = [] } = winnerData;
  const winners = winnerIndices.map(i => teams[i]);
  const isTied  = winners.length > 1;

  const emojis = WIN_EMOJIS[Math.floor(Math.random() * WIN_EMOJIS.length)];
  dom.winnerEmojis.textContent = emojis.join(' ');

  dom.winnerTitle.textContent =
    isTied ? winners.map(t => t.name).join(' & ') + ' tie!' : winners[0].name + ' wins!';
  dom.winnerSubtitle.textContent =
    isTied
      ? `Both tied with ${winners[0].cards.length} cards — incredible!`
      : `${winners[0].cards.length} songs placed correctly 🎵`;

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

  const winnerSet = new Set(winners.map(t => t.name));
  const others    = teams
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

  // Restart buttons
  dom.winnerRestartFullCount.textContent      = allTracks.length + ' songs';
  dom.winnerRestartRemainingCount.textContent = deck.length > 0 ? deck.length + ' songs' : 'none left';
  dom.btnWinnerRestartRemaining.disabled      = deck.length === 0;
}

// ─── Confetti ────────────────────────────────────────────────────────────────

function launchConfetti() {
  const canvas     = $('confetti-canvas');
  const myConfetti = confetti.create(canvas, { resize: true });
  const colors = [
    '#ff0080', '#ff8c00', '#ffe400', '#00e676',
    '#00b0ff', '#e040fb', '#ff4081', '#ffffff',
  ];
  function burst(opts) { myConfetti({ spread: 100, ticks: 120, colors, ...opts }); }

  burst({ particleCount: 120, origin: { y: 0.5 }, angle: 90 });
  setTimeout(() => burst({ particleCount: 80,  origin: { x: 0.1, y: 0.6 }, angle: 60  }), 400);
  setTimeout(() => burst({ particleCount: 80,  origin: { x: 0.9, y: 0.6 }, angle: 120 }), 700);
  setTimeout(() => burst({ particleCount: 120, origin: { y: 0.4 }, angle: 90  }), 1200);

  let remaining = 8;
  const shower = setInterval(() => {
    if (--remaining <= 0) { clearInterval(shower); return; }
    burst({ particleCount: 30, origin: { x: Math.random(), y: 0.3 }, scalar: 0.8 });
  }, 600);
}

// ─── Restart helpers ──────────────────────────────────────────────────────────

function doRestart(mode, winnerData) {
  const { allTracks = [], deck = [], teams, cardsToWin, hardModeFinal, hardModeAll, playlistName } = winnerData;
  const pool    = mode === 'remaining' && deck.length > 0 ? [...deck] : [...allTracks];
  const newDeck = shuffle(pool);

  const newTeams = teams.map(t => ({ name: t.name, cards: [] }));
  newTeams.forEach(team => {
    if (newDeck.length > 0) team.cards.push(newDeck.shift());
  });

  sessionStorage.setItem('hitster_game', JSON.stringify({
    teams:         newTeams,
    cardsToWin:    cardsToWin,
    hardModeFinal: hardModeFinal || false,
    hardModeAll:   hardModeAll   || false,
    allTracks,
    deck:          newDeck,
    activeTeams:   newTeams.map((_, i) => i),
    activeCursor:  0,
    roundTeamsDone: 0,
    isTiebreaker:  false,
    playlistName:  playlistName || '',
  }));
  location.href = 'game.html';
}

// ─── Event listeners ──────────────────────────────────────────────────────────

dom.btnPlayAgain.addEventListener('click', () => { location.href = '/'; });

// ─── Boot ─────────────────────────────────────────────────────────────────────

(async () => {
  const raw = sessionStorage.getItem('hitster_winner');
  if (!raw) { location.href = '/'; return; }

  let winnerData;
  try { winnerData = JSON.parse(raw); } catch (_) { location.href = '/'; return; }

  renderWinnerScreen(winnerData);
  dom.btnWinnerRestartFull.addEventListener('click',      () => doRestart('full',      winnerData));
  dom.btnWinnerRestartRemaining.addEventListener('click', () => doRestart('remaining', winnerData));
  // Scroll to top after paint
  requestAnimationFrame(() => { window.scrollTo(0, 0); });
  launchConfetti();
})();
