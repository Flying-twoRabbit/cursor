(() => {
  "use strict";

  const STORAGE_KEY = "chayihuo-best";
  const MAX_LIVES = 3;

  const screens = {
    start: document.getElementById("screen-start"),
    how: document.getElementById("screen-how"),
    play: document.getElementById("screen-play"),
    result: document.getElementById("screen-result"),
  };

  const els = {
    board: document.getElementById("board"),
    hudLevel: document.getElementById("hud-level"),
    hudScore: document.getElementById("hud-score"),
    hudLives: document.getElementById("hud-lives"),
    timerBar: document.getElementById("timer-bar"),
    prompt: document.getElementById("prompt"),
    resultTitle: document.getElementById("result-title"),
    resultScore: document.getElementById("result-score"),
    resultMeta: document.getElementById("result-meta"),
    bestStart: document.getElementById("best-start"),
    bestResult: document.getElementById("best-result"),
    toast: document.getElementById("toast"),
  };

  const state = {
    level: 1,
    score: 0,
    lives: MAX_LIVES,
    oddIndex: 0,
    locked: false,
    timerId: null,
    timerStartedAt: 0,
    timerDuration: 0,
    rafId: null,
  };

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      const active = key === name;
      el.hidden = !active;
      el.classList.toggle("is-active", active);
    });
  }

  function getBest() {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) ? n : 0;
  }

  function setBest(score) {
    const prev = getBest();
    if (score > prev) {
      localStorage.setItem(STORAGE_KEY, String(score));
      return true;
    }
    return false;
  }

  function refreshBestLabels() {
    const best = getBest();
    if (best > 0) {
      els.bestStart.hidden = false;
      els.bestStart.innerHTML = `历史最佳 <strong>${best}</strong> 分`;
    } else {
      els.bestStart.hidden = true;
    }
  }

  function gridSizeForLevel(level) {
    // 1–2: 2×2, 3–5: 3×3, 6–9: 4×4, 10–14: 5×5, 15+: 6×6
    if (level <= 2) return 2;
    if (level <= 5) return 3;
    if (level <= 9) return 4;
    if (level <= 14) return 5;
    return 6;
  }

  function deltaForLevel(level) {
    // Perceptual lightness delta in Lab-ish HSL lightness points
    const base = 22;
    const floor = 3.2;
    return Math.max(floor, base - (level - 1) * 1.15);
  }

  function timeForLevel(level) {
    return Math.max(2200, 5200 - (level - 1) * 160);
  }

  function hsl(h, s, l) {
    return `hsl(${h} ${s}% ${l}%)`;
  }

  function pickPalette(level) {
    const families = [
      { h: 168, s: 48, l: 42 }, // teal
      { h: 28, s: 62, l: 48 }, // amber
      { h: 210, s: 42, l: 46 }, // steel blue
      { h: 145, s: 38, l: 40 }, // moss
      { h: 340, s: 42, l: 48 }, // rose
      { h: 45, s: 55, l: 46 }, // gold
    ];
    const base = families[(level - 1) % families.length];
    const jitter = ((level * 17) % 11) - 5;
    return {
      h: (base.h + jitter + 360) % 360,
      s: base.s,
      l: base.l,
    };
  }

  function updateHud() {
    els.hudLevel.textContent = String(state.level);
    els.hudScore.textContent = String(state.score);
    els.hudLives.textContent = "●".repeat(state.lives) + "○".repeat(MAX_LIVES - state.lives);
  }

  let toastTimer = null;
  function toast(message, kind = "") {
    els.toast.hidden = false;
    els.toast.textContent = message;
    els.toast.className = "toast is-show" + (kind ? ` is-${kind}` : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove("is-show");
    }, 900);
  }

  function stopTimer() {
    if (state.timerId) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }

  function startTimer(duration) {
    stopTimer();
    state.timerDuration = duration;
    state.timerStartedAt = performance.now();
    els.timerBar.classList.remove("is-urgent");
    els.timerBar.style.transform = "scaleX(1)";

    const tick = (now) => {
      const elapsed = now - state.timerStartedAt;
      const remain = Math.max(0, 1 - elapsed / state.timerDuration);
      els.timerBar.style.transform = `scaleX(${remain})`;
      if (remain < 0.28) els.timerBar.classList.add("is-urgent");
      if (remain > 0) {
        state.rafId = requestAnimationFrame(tick);
      }
    };
    state.rafId = requestAnimationFrame(tick);

    state.timerId = setTimeout(() => {
      if (state.locked) return;
      onMiss("时间到了");
    }, duration);
  }

  function buildBoard() {
    const size = gridSizeForLevel(state.level);
    const delta = deltaForLevel(state.level);
    const palette = pickPalette(state.level);
    const total = size * size;
    state.oddIndex = Math.floor(Math.random() * total);

    // Randomly go lighter or darker for the odd tile
    const direction = Math.random() < 0.5 ? 1 : -1;
    const baseL = palette.l;
    const oddL = Math.min(78, Math.max(18, baseL + direction * delta));

    const baseColor = hsl(palette.h, palette.s, baseL);
    const oddColor = hsl(palette.h, Math.min(70, palette.s + 4), oddL);

    els.board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    els.board.replaceChildren();

    const radius = size >= 5 ? "10px" : size >= 4 ? "12px" : "14px";

    for (let i = 0; i < total; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tile";
      btn.style.background = i === state.oddIndex ? oddColor : baseColor;
      btn.style.borderRadius = radius;
      btn.style.animationDelay = `${(i % size) * 28 + Math.floor(i / size) * 18}ms`;
      btn.setAttribute("role", "gridcell");
      btn.setAttribute("aria-label", i === state.oddIndex ? "不同的色块" : "色块");
      btn.addEventListener("click", () => onTileClick(i, btn));
      els.board.appendChild(btn);
    }

    const hints = [
      "找出不同的那一块",
      "差一毫在哪里？",
      "盯紧了，色差越来越细",
      "别被相同骗了",
    ];
    els.prompt.textContent = hints[Math.min(hints.length - 1, Math.floor((state.level - 1) / 4))];
  }

  function scoreGain(level, elapsedMs, duration) {
    const speed = Math.max(0, 1 - elapsedMs / duration);
    const base = 80 + level * 18;
    return Math.round(base * (0.55 + speed * 0.7));
  }

  function onTileClick(index, btn) {
    if (state.locked) return;
    state.locked = true;
    stopTimer();

    if (index === state.oddIndex) {
      btn.classList.add("is-correct");
      const elapsed = performance.now() - state.timerStartedAt;
      const gain = scoreGain(state.level, elapsed, state.timerDuration);
      state.score += gain;
      updateHud();
      toast(`+${gain}`, "good");
      setTimeout(() => {
        state.level += 1;
        nextRound();
      }, 420);
    } else {
      btn.classList.add("is-wrong");
      const odd = els.board.children[state.oddIndex];
      if (odd) odd.classList.add("is-correct");
      onMiss("点错了");
    }
  }

  function onMiss(reason) {
    state.locked = true;
    stopTimer();
    state.lives -= 1;
    updateHud();
    toast(reason, "bad");

    if (state.lives <= 0) {
      setTimeout(endGame, 700);
      return;
    }

    setTimeout(() => {
      // Same level retry after miss
      nextRound();
    }, 650);
  }

  function nextRound() {
    state.locked = false;
    updateHud();
    buildBoard();
    startTimer(timeForLevel(state.level));
  }

  function startGame() {
    state.level = 1;
    state.score = 0;
    state.lives = MAX_LIVES;
    state.locked = false;
    updateHud();
    showScreen("play");
    nextRound();
  }

  function endGame() {
    stopTimer();
    const isNew = setBest(state.score);
    els.resultScore.textContent = String(state.score);
    els.resultTitle.textContent =
      state.score >= 1200 ? "眼力开挂" : state.score >= 600 ? "差一点就通关" : "脑回路已断裂";
    els.resultMeta.textContent = `撑到第 ${state.level} 关 · 色差已经细到肉眼极限附近`;
    if (getBest() > 0) {
      els.bestResult.hidden = false;
      els.bestResult.innerHTML = isNew
        ? `新纪录！历史最佳 <strong>${getBest()}</strong> 分`
        : `历史最佳 <strong>${getBest()}</strong> 分`;
    } else {
      els.bestResult.hidden = true;
    }
    showScreen("result");
  }

  document.getElementById("btn-start").addEventListener("click", startGame);
  document.getElementById("btn-retry").addEventListener("click", startGame);
  document.getElementById("btn-how").addEventListener("click", () => showScreen("how"));
  document.getElementById("btn-how-back").addEventListener("click", () => showScreen("start"));
  document.getElementById("btn-home").addEventListener("click", () => {
    stopTimer();
    refreshBestLabels();
    showScreen("start");
  });

  refreshBestLabels();
  showScreen("start");
})();
