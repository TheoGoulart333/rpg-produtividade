'use strict';

/* ============================================================
   1. DOMAIN — Lógica de Gamificação
   ============================================================ */

const LEVELS = [
  { name: 'Iniciante',  icon: '⚔️',  min: 0    },
  { name: 'Aprendiz',   icon: '🗡️',  min: 50   },
  { name: 'Soldado',    icon: '🛡️',  min: 150  },
  { name: 'Veterano',   icon: '🏹',  min: 300  },
  { name: 'Campeão',    icon: '⚡',  min: 500  },
  { name: 'Herói',      icon: '🌟',  min: 750  },
  { name: 'Lendário',   icon: '👑',  min: 1100 },
  { name: 'Imortal',    icon: '🔮',  min: 1500 },
];

/** XP concedido por dificuldade */
const XP_MAP = { easy: 10, medium: 25, hard: 50 };

/**
 * @param {number} totalXP
 * @returns {{ current, next, levelIndex, progress, xpInLevel, xpNeeded }}
 */

function getLevelInfo(totalXP) {
  let levelIndex = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].min) { levelIndex = i; break; }
  }

  const current    = LEVELS[levelIndex];
  const next       = LEVELS[levelIndex + 1] ?? null;
  const base       = current.min;
  const cap        = next ? next.min : current.min + 500;
  const xpInLevel  = totalXP - base;
  const xpNeeded   = cap - base;
  const progress   = next ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;

  return { current, next, levelIndex, progress, xpInLevel, xpNeeded };
}

/* ============================================================
   2. STATE — Gerenciamento e Persistência
   ============================================================ */

const STORAGE_KEY = 'gtm_state_v1';

/**
 * @returns {{ tasks: Array, totalXP: number }}
 */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validação básica de integridade
      if (Array.isArray(parsed.tasks) && typeof parsed.totalXP === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[GTM] Falha ao carregar estado:', e);
  }
  return { tasks: [], totalXP: 0 };
}

/**
 * @param {{ tasks: Array, totalXP: number }} state
 */
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('[GTM] localStorage cheio ou indisponível:', e);
    showToast('⚠️ Não foi possível salvar. Armazenamento cheio.');
  }
}

let state = loadState();

/* ============================================================
   3. UI — Renderização e Eventos
   ============================================================ */

let currentFilter = 'all';
let toastTimer    = null;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showError(msg) {
  document.getElementById('error-msg').textContent = msg;
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function renderHUD() {
  const done     = state.tasks.filter(t => t.done).length;
  const total    = state.tasks.length;
  const li       = getLevelInfo(state.totalXP);
  const barEl    = document.getElementById('xp-bar');
  const barCont  = document.getElementById('xp-bar-container');

  document.getElementById('level-label').textContent = `Nível ${li.levelIndex + 1}`;
  document.getElementById('level-name').textContent  = li.current.name;
  document.getElementById('avatar').textContent      = li.current.icon;
  document.getElementById('stat-done').textContent   = done;
  document.getElementById('stat-total').textContent  = total;
  document.getElementById('stat-xp').textContent     = state.totalXP;

  barEl.style.width = li.progress + '%';
  barCont.setAttribute('aria-valuenow', li.progress);

  document.getElementById('xp-fraction').textContent = li.next
    ? `${li.xpInLevel} / ${li.xpNeeded} XP`
    : 'Nível máximo! 🎉';
}

function renderTasks() {
  const list = document.getElementById('task-list');

  let tasks = state.tasks;
  if (currentFilter === 'pending') tasks = tasks.filter(t => !t.done);
  if (currentFilter === 'done')    tasks = tasks.filter(t => t.done);

  if (tasks.length === 0) {
    const msgs = {
      all:     'Nenhuma tarefa ainda.<br>Adicione sua primeira missão!',
      pending: 'Sem tarefas pendentes. Continue assim! 🎯',
      done:    'Nenhuma tarefa concluída ainda. Bora lá! 💪',
    };
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon" aria-hidden="true">📋</span>
        ${msgs[currentFilter]}
      </div>`;
    return;
  }

  list.innerHTML = tasks.map(task => `
    <div class="task-card ${task.done ? 'done' : ''}" data-id="${task.id}">
      <button
        class="check-btn"
        onclick="toggleTask('${task.id}')"
        aria-label="${task.done ? 'Reabrir tarefa' : 'Marcar como concluída'}"
      >${task.done ? '✓' : ''}</button>

      <span class="task-text">${escapeHtml(task.text)}</span>

      <div class="task-meta">
        <span class="xp-badge ${task.difficulty}" aria-label="${XP_MAP[task.difficulty]} XP">
          +${XP_MAP[task.difficulty]} XP
        </span>
        <button
          class="del-btn"
          onclick="deleteTask('${task.id}')"
          aria-label="Remover tarefa: ${escapeHtml(task.text)}"
        >✕</button>
      </div>
    </div>
  `).join('');
}

function render() {
  renderHUD();
  renderTasks();
}

/* ── Actions ─────────────────────────────────────────────── */

function addTask() {
  const input = document.getElementById('task-input');
  const diff  = document.getElementById('diff-select').value;
  const text  = input.value.trim();

  // Validação
  if (!text) {
    showError('O nome da tarefa não pode ser vazio.');
    input.focus();
    return;
  }
  if (text.length < 3) {
    showError('Descreva melhor a tarefa (mínimo 3 caracteres).');
    input.focus();
    return;
  }
  showError('');

  const task = {
    id:         `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    difficulty: diff,
    done:       false,
    createdAt:  Date.now(),
  };

  state.tasks.unshift(task);
  saveState(state);
  input.value = '';
  render();
  showToast('Missão adicionada! 📋');
}

/**
 * @param {string} id
 */
function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  const previousLevelIndex = getLevelInfo(state.totalXP).levelIndex;

  if (!task.done) {
    task.done     = true;
    state.totalXP += XP_MAP[task.difficulty];

    const newLevelIndex = getLevelInfo(state.totalXP).levelIndex;

    if (newLevelIndex > previousLevelIndex) {
      const newLevel = LEVELS[newLevelIndex];
      showToast(`🎉 Subiu para ${newLevel.name} ${newLevel.icon}`);
    } else {
      showToast(`✅ +${XP_MAP[task.difficulty]} XP ganhos!`);
    }
  } else {
    task.done     = false;
    state.totalXP = Math.max(0, state.totalXP - XP_MAP[task.difficulty]);
    showToast('Tarefa reaberta.');
  }

  saveState(state);
  render();
}

/**
 * @param {string} id
 */
function deleteTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  if (task.done) {
    state.totalXP = Math.max(0, state.totalXP - XP_MAP[task.difficulty]);
  }

  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState(state);
  render();
  showToast('Tarefa removida.');
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.tab').forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  renderTasks();
}

/* ── Event listeners ─────────────────────────────────────── */

document.getElementById('add-btn')
  .addEventListener('click', addTask);

document.getElementById('task-input')
  .addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

document.getElementById('task-input')
  .addEventListener('input', () => showError(''));

document.querySelectorAll('.tab')
  .forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.filter)));

/* ── Boot ────────────────────────────────────────────────── */
render();
