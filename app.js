// ---------------- Theme (dark/light) ----------------
const THEME_KEY = 'cg_theme';
const rootEl = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  rootEl.setAttribute('data-bs-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferred = saved || 'light';
  applyTheme(preferred);
  themeToggle.checked = preferred === 'dark';
})();
themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked ? 'dark' : 'light'));

// ---------------- State & Persistence ----------------
const STORAGE_KEY = 'cg_scoretracker_v1';

const defaultState = () => ({
  players: [],
  peak: 1,
  sequence: [],
  currentRound: 0,
  bidsLocked: {},      // roundIndex: true/false
  scored: {},          // roundIndex: true/false
  bids: {},            // roundIndex: { name: number|string '' }
  actuals: {},         // roundIndex: { name: number|string '' }
  scores: {},          // name: number
  started: false
});

let state = loadState() || defaultState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  document.getElementById('saveHint').textContent = 'Lokaal opgeslagen.';
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function resetGame() {
  state = defaultState();
  saveState();
  renderAll();
}

// ---------------- Helpers ----------------
function parseNames(text) {
  return text.split(/[\n,]/g).map(s => s.trim()).filter(Boolean);
}
function buildSequence(peak) {
  const up = Array.from({ length: peak }, (_, i) => i + 1);
  const down = Array.from({ length: peak - 1 }, (_, i) => peak - 1 - i);
  return up.concat(down);
}
function ensureRoundObjects(rIdx) {
  if (!state.bids[rIdx]) state.bids[rIdx] = {};
  if (!state.actuals[rIdx]) state.actuals[rIdx] = {};
}
function recomputeScores() {
  for (const p of state.players) state.scores[p] = 0;
  const totalRounds = state.sequence.length;
  for (let r = 0; r < totalRounds; r++) {
    if (!state.scored[r]) continue;
    for (const p of state.players) {
      const bid = Number(state.bids[r]?.[p] ?? '');
      const actual = Number(state.actuals[r]?.[p] ?? '');
      if (Number.isFinite(bid) && Number.isFinite(actual)) {
        if (bid === actual) {
          state.scores[p] += 10 + (2 * bid); // Exact
        } else {
          state.scores[p] -= 2; // Fout
        }
      }
    }
  }
}
function totalRounds() { return state.sequence.length; }

function getRoundStage(rIdx) {
  // bepaalt welke knop actief is in de onderbalk
  if (!state.bidsLocked[rIdx]) return 'bidding';       // Lock actief
  if (!state.scored[rIdx]) return 'locked';            // Score actief
  return 'scored';                                     // Next actief
}

// ---------------- Rendering ----------------
function renderSetup() {
  const setupCard = document.getElementById('setupCard');
  const postSetup = document.getElementById('postSetup');
  const gameCard = document.getElementById('gameCard');
  const footerBar = document.getElementById('footerBar');

  if (!state.started) {
    setupCard.classList.remove('d-none');
    postSetup.classList.add('d-none');
    gameCard.classList.add('d-none');
    footerBar.classList.add('d-none');
  } else {
    setupCard.classList.add('d-none');
    postSetup.classList.remove('d-none');
    gameCard.classList.remove('d-none');
    footerBar.classList.remove('d-none');
  }
}

function renderGameHeader() {
  const rIdx = state.currentRound;
  const total = totalRounds();
  document.getElementById('roundNumber').textContent = rIdx + 1;
  document.getElementById('roundTotal').textContent = total;
  document.getElementById('cardsThisRound').textContent = state.sequence[rIdx];
  document.getElementById('badgeRound').textContent = rIdx + 1;
  document.getElementById('seqPreview').textContent = state.sequence.join(' ');
  document.getElementById('btn-prev').disabled = rIdx === 0;

  // Top "Volgende" is alleen toegestaan als ronde gescoord is
  document.getElementById('btn-next').disabled = !(state.scored[rIdx]) || rIdx >= total - 1;

  // "Ontgrendel ronde" is actief zodra er iets vaststaat (locked of scored)
  document.getElementById('btn-unlock-round').disabled = !(state.bidsLocked[rIdx] || state.scored[rIdx]);

  // Onderbalk status + labels
  renderControlBar();
}

function renderControlBar() {
  const rIdx = state.currentRound;
  const total = totalRounds();

  const lockBtn  = document.getElementById('btn-lock-bids');
  const scoreBtn = document.getElementById('btn-score');
  const nextBtn  = document.getElementById('btn-next-round');

  // Reset klassen
  [lockBtn, scoreBtn, nextBtn].forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
    btn.disabled = true;
  });

  const stage = getRoundStage(rIdx);

  if (stage === 'bidding') {
    // Alleen Lock is actief
    lockBtn.classList.remove('btn-secondary');
    lockBtn.classList.add('btn-primary');
    lockBtn.disabled = false;

  } else if (stage === 'locked') {
    // Alleen Score is actief
    scoreBtn.classList.remove('btn-secondary');
    scoreBtn.classList.add('btn-primary');
    scoreBtn.disabled = !canScoreRound(rIdx); // pas actief als alle 'werkelijk' ingevuld

  } else { // 'scored'
    // Alleen Next is actief
    nextBtn.classList.remove('btn-secondary');
    nextBtn.classList.add('btn-primary');
    nextBtn.disabled = rIdx >= total - 1; // laatste ronde => uit
  }
}

function renderRoundRows() {
  const rIdx = state.currentRound;
  ensureRoundObjects(rIdx);
  const tbody = document.getElementById('roundRows');
  tbody.innerHTML = '';

  for (const p of state.players) {
    const bidVal = state.bids[rIdx][p] ?? '';
    const actVal = state.actuals[rIdx][p] ?? '';

    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = p;

    const tdBid = document.createElement('td');
    const inputBid = document.createElement('input');
    inputBid.type = 'number';
    inputBid.min = '0';
    inputBid.step = '1';
    inputBid.className = 'form-control';
    inputBid.value = bidVal;
    inputBid.placeholder = 'Bod';
    inputBid.disabled = !!state.bidsLocked[rIdx];
    inputBid.addEventListener('input', () => {
      state.bids[rIdx][p] = inputBid.value === '' ? '' : Math.max(0, parseInt(inputBid.value, 10) || 0);
      saveState();
      renderGameHeader();
    });
    tdBid.appendChild(inputBid);

    const tdActual = document.createElement('td');
    const inputAct = document.createElement('input');
    inputAct.type = 'number';
    inputAct.min = '0';
    inputAct.step = '1';
    inputAct.className = 'form-control';
    inputAct.value = actVal;
    inputAct.placeholder = 'Werkelijk';
    inputAct.disabled = !state.bidsLocked[rIdx]; // pas na vastzetten
    inputAct.addEventListener('input', () => {
      state.actuals[rIdx][p] = inputAct.value === '' ? '' : Math.max(0, parseInt(inputAct.value, 10) || 0);
      saveState();
      renderGameHeader();
    });
    tdActual.appendChild(inputAct);

    const tdStatus = document.createElement('td');
    let status = '';
    if (state.scored[rIdx]) {
      const b = Number(bidVal); const a = Number(actVal);
      if (Number.isFinite(b) && Number.isFinite(a)) {
        status = (b === a) ? 'Exact' : 'Fout';
      }
    } else {
      status = state.bidsLocked[rIdx] ? 'Bezig' : 'Bieden';
    }
    const badgeClass =
      status === 'Exact' ? 'text-bg-success' :
      status === 'Fout' ? 'text-bg-danger' :
      'text-bg-secondary';
    tdStatus.innerHTML = `<span class="badge ${badgeClass}">${status}</span>`;

    tr.appendChild(tdName);
    tr.appendChild(tdBid);
    tr.appendChild(tdActual);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  }
}

function renderScores() {
  recomputeScores();
  const tbody = document.getElementById('scoreRows');
  const items = state.players.map(p => ({ name: p, score: state.scores[p] || 0 }));
  items.sort((a, b) => b.score - a.score);

  tbody.innerHTML = '';
  for (const it of items) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${it.name}</td><td class="text-end">${it.score}</td>`;
    tbody.appendChild(tr);
  }
}

function renderHistory() {
  const acc = document.getElementById('historyAcc');
  acc.innerHTML = '';
  const total = totalRounds();

  for (let r = 0; r < total; r++) {
    const rid = `hist-${r}`;
    const header = `Ronde ${r + 1} (kaarten: ${state.sequence[r]})`;

    let rows = '';
    for (const p of state.players) {
      const b = state.bids[r]?.[p];
      const a = state.actuals[r]?.[p];
      const scored = state.scored[r];
      let delta = '';
      if (scored && Number.isFinite(Number(b)) && Number.isFinite(Number(a))) {
        delta = (Number(b) === Number(a)) ? (10 + 2 * Number(b)) : (-2);
      }
      rows += `<tr><td>${p}</td><td>${b ?? ''}</td><td>${a ?? ''}</td><td class="text-end">${scored ? delta : ''}</td></tr>`;
    }

    // Actieknoppen per ronde (bewerken/ontgrendelen, ga naar deze ronde)
    const actions = `
      <div class="history-actions my-2">
        <button class="btn btn-outline-warning btn-sm" data-edit-round="${r}">Bewerken (ontgrendelen)</button>
        <button class="btn btn-outline-secondary btn-sm" data-goto-round="${r}">Ga naar ronde</button>
      </div>
    `;

    const body = `
      <div class="accordion-item">
        <h2 class="accordion-header" id="${rid}-h">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${rid}-c">
            ${header} ${state.scored[r] ? '' : '· Niet gescoord'}
          </button>
        </h2>
        <div id="${rid}-c" class="accordion-collapse collapse" data-bs-parent="#historyAcc">
          <div class="accordion-body">
            ${actions}
            <div class="table-responsive">
              <table class="table table-sm">
                <thead><tr><th>Speler</th><th>Bod</th><th>Werkelijk</th><th class="text-end">Δ</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>`;
    acc.insertAdjacentHTML('beforeend', body);
  }

  // Listeners voor dynamische knoppen in historiek
  acc.querySelectorAll('[data-edit-round]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = parseInt(btn.getAttribute('data-edit-round'), 10);
      unlockRound(r);
      state.currentRound = r;
      saveState();
      renderAll();
    });
  });
  acc.querySelectorAll('[data-goto-round]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = parseInt(btn.getAttribute('data-goto-round'), 10);
      state.currentRound = r;
      saveState();
      renderAll();
    });
  });
}

function renderAll() {
  renderSetup();
  if (state.started) {
    renderGameHeader();
    renderRoundRows();
    renderScores();
    renderHistory();
  }
}

// ---------------- Validation & Actions ----------------
function canScoreRound(rIdx) {
  if (!state.bidsLocked[rIdx]) return false;
  if (state.scored[rIdx]) return false;

  let allCorrect = true;

  for (const p of state.players) {
    const bid = Number(state.bids[rIdx]?.[p]);
    const actual = Number(state.actuals[rIdx]?.[p]);

    if (actual === '' || actual === undefined || actual === null) return false;
    if (!Number.isFinite(actual) || actual < 0) return false;

    if (bid !== actual) {
      allCorrect = false;
    }
  }

  // NEW RULE: disallow scoring if everyone guessed correctly
  if (allCorrect) return false;

  return true;
}

function startGame(players, peak) {
  state.players = players;
  state.peak = peak;
  state.sequence = buildSequence(peak);
  state.currentRound = 0;
  state.bidsLocked = {};
  state.scored = {};
  state.bids = {};
  state.actuals = {};
  state.scores = {};
  for (const p of players) state.scores[p] = 0;
  state.started = true;
  saveState();
  renderAll();
}

function lockBids(rIdx) {
  // Controleer dat elke speler een bod heeft
  for (const p of state.players) {
    const v = state.bids[rIdx]?.[p];
    if (v === '' || v === undefined || v === null) {
      alert(`Voer een bod in voor ${p}.`);
      return;
    }
    if (!Number.isFinite(Number(v)) || Number(v) < 0) {
      alert(`Ongeldig bod voor ${p}.`);
      return;
    }
  }
  // Regel: som biedingen mag NIET gelijk zijn aan aantal kaarten deze ronde
  const cardsThisRound = state.sequence[rIdx];
  const sumBids = state.players.reduce((acc, p) => acc + Number(state.bids[rIdx][p] || 0), 0);
  if (sumBids === cardsThisRound) {
    alert(`Biedingen mogen niet optellen tot ${cardsThisRound}. Meer of minder is toegestaan.`);
    return;
  }

  state.bidsLocked[rIdx] = true; // overgang naar 'locked' -> Score actief
  saveState();
  renderAll();
}

function scoreRound(rIdx) {
  if (!canScoreRound(rIdx)) return;
  state.scored[rIdx] = true; // overgang naar 'scored' -> Next actief
  saveState();
  renderAll();
}

function nextRound() {
  if (state.currentRound < totalRounds() - 1 && state.scored[state.currentRound]) {
    state.currentRound += 1;
    saveState();
    renderAll();
  }
}

function unlockRound(rIdx) {
  // Volledig ontgrendelen: terug naar "bieden"
  state.bidsLocked[rIdx] = false;
  state.scored[rIdx] = false;
  saveState();
}

// ---------------- Event Listeners ----------------
document.getElementById('btn-sample').addEventListener('click', () => {
  document.getElementById('namesInput').value = 'Alice, Bob, Carol, Dave';
  document.getElementById('peakInput').value = 3;
});

document.getElementById('btn-start').addEventListener('click', () => {
  const names = parseNames(document.getElementById('namesInput').value);
  const peak = parseInt(document.getElementById('peakInput').value, 10);
  if (names.length < 2) {
    alert('Voer minstens twee spelernamen in.');
    return;
  }
  if (!Number.isFinite(peak) || peak < 1) {
    alert('Voer een geldige piek (1 of meer) in.');
    return;
  }
  startGame(names, peak);
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Nieuw spel starten? Dit wist de voortgang.')) {
    localStorage.removeItem(STORAGE_KEY);
    resetGame();
  }
});

document.getElementById('btn-load').addEventListener('click', () => {
  const s = loadState();
  if (!s || !s.started) {
    alert('Geen opgeslagen spel gevonden.');
    return;
  }
  state = s;
  renderAll();
});

document.getElementById('btn-prev').addEventListener('click', () => {
  if (state.currentRound > 0) {
    state.currentRound -= 1;
    saveState();
    renderAll();
  }
});

document.getElementById('btn-next').addEventListener('click', () => {
  // Top 'Volgende' is alleen na scoren
  nextRound();
});

document.getElementById('btn-unlock-round').addEventListener('click', () => {
  unlockRound(state.currentRound);
  renderAll();
});

// Onderbalk knoppen (verbonden bar)
document.getElementById('btn-lock-bids').addEventListener('click', () => {
  // Na succesvol lock: knop wordt grijs (disabled) en 'Score' wordt blauw (actief) via renderControlBar()
  lockBids(state.currentRound);
});

document.getElementById('btn-score').addEventListener('click', () => {
  // Na succesvol scoren: knop wordt grijs (disabled) en 'Volgende ronde' wordt blauw (actief)
  scoreRound(state.currentRound);
});

document.getElementById('btn-next-round').addEventListener('click', () => {
  // Alleen mogelijk wanneer ronde gescoord is
  nextRound();
});

// Export/Import
document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kaartspel_score.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data.players) || !Array.isArray(data.sequence)) {
        alert('Ongeldig bestand.');
        return;
      }
      state = data;
      saveState();
      renderAll();
    } catch {
      alert('Bestand kon niet worden gelezen.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// Houd knoppen up-to-date bij focuswissels (na input in velden)
document.addEventListener('focusin', () => {
  // update score-knop (alle werkelijk ingevuld?) en onderbalkkleur
  renderControlBar();
});

// Initial render
renderAll();
