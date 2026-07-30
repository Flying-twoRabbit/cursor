/**
 * 差一毫 — Canvas 版核心
 * 兼容微信小游戏运行时；浏览器预览时由 preview-adapter 注入 wx。
 */
(function () {
  "use strict";

  var STORAGE_KEY = "chayihuo-best";
  var MAX_LIVES = 3;

  var COLORS = {
    ink: "#0b1c24",
    inkSoft: "#14303b",
    foam: "#e8f4f1",
    foamMuted: "#a8c5be",
    amber: "#f0a04b",
    amberDeep: "#d4842e",
    mint: "#3ecfad",
    danger: "#e85d5d",
    orbTeal: "#1f6b6a",
    orbAmber: "#8a5a28",
  };

  var sys = wx.getSystemInfoSync();
  var dpr = Math.min(sys.pixelRatio || 2, 3);
  var W = sys.windowWidth;
  var H = sys.windowHeight;

  var canvas = wx.createCanvas();
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  var ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  var raf =
    (canvas.requestAnimationFrame && canvas.requestAnimationFrame.bind(canvas)) ||
    (typeof requestAnimationFrame !== "undefined" && requestAnimationFrame) ||
    function (cb) {
      return setTimeout(function () {
        cb(Date.now());
      }, 16);
    };
  var caf =
    (canvas.cancelAnimationFrame && canvas.cancelAnimationFrame.bind(canvas)) ||
    (typeof cancelAnimationFrame !== "undefined" && cancelAnimationFrame) ||
    clearTimeout;

  var nowFn =
    (typeof performance !== "undefined" && performance.now && performance.now.bind(performance)) ||
    function () {
      return Date.now();
    };

  // ---------- layout helpers ----------
  var pad = Math.max(16, Math.min(28, W * 0.06));
  var contentW = Math.min(W - pad * 2, 420);
  var contentX = (W - contentW) / 2;

  var hitAreas = [];
  var toast = { text: "", kind: "", until: 0 };
  var screen = "start"; // start | how | play | result
  var screenEnterAt = nowFn();

  var state = {
    level: 1,
    score: 0,
    lives: MAX_LIVES,
    oddIndex: 0,
    locked: false,
    timerId: null,
    timerStartedAt: 0,
    timerDuration: 0,
    tiles: [], // {x,y,w,h,color,radius,scale,shake,glow}
    boardBuiltAt: 0,
    resultTitle: "",
    resultMeta: "",
    isNewBest: false,
    prompt: "找出不同的那一块",
  };

  function getBest() {
    try {
      var n = Number(wx.getStorageSync(STORAGE_KEY));
      return Number.isFinite(n) ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  function setBest(score) {
    var prev = getBest();
    if (score > prev) {
      try {
        wx.setStorageSync(STORAGE_KEY, String(score));
      } catch (e) {}
      return true;
    }
    return false;
  }

  function showToast(message, kind) {
    toast.text = message;
    toast.kind = kind || "";
    toast.until = nowFn() + 900;
  }

  function gridSizeForLevel(level) {
    if (level <= 2) return 2;
    if (level <= 5) return 3;
    if (level <= 9) return 4;
    if (level <= 14) return 5;
    return 6;
  }

  function deltaForLevel(level) {
    var base = 22;
    var floor = 3.2;
    return Math.max(floor, base - (level - 1) * 1.15);
  }

  function timeForLevel(level) {
    return Math.max(2200, 5200 - (level - 1) * 160);
  }

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0,
      g = 0,
      b = 0;
    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return (
      "#" +
      [r, g, b]
        .map(function (v) {
          var n = Math.round((v + m) * 255);
          return (n < 16 ? "0" : "") + n.toString(16);
        })
        .join("")
    );
  }

  function pickPalette(level) {
    var families = [
      { h: 168, s: 48, l: 42 },
      { h: 28, s: 62, l: 48 },
      { h: 210, s: 42, l: 46 },
      { h: 145, s: 38, l: 40 },
      { h: 340, s: 42, l: 48 },
      { h: 45, s: 55, l: 46 },
    ];
    var base = families[(level - 1) % families.length];
    var jitter = ((level * 17) % 11) - 5;
    return {
      h: (base.h + jitter + 360) % 360,
      s: base.s,
      l: base.l,
    };
  }

  function scoreGain(level, elapsedMs, duration) {
    var speed = Math.max(0, 1 - elapsedMs / duration);
    var base = 80 + level * 18;
    return Math.round(base * (0.55 + speed * 0.7));
  }

  function stopTimer() {
    if (state.timerId) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
  }

  function startTimer(duration) {
    stopTimer();
    state.timerDuration = duration;
    state.timerStartedAt = nowFn();
    state.timerId = setTimeout(function () {
      if (state.locked) return;
      onMiss("时间到了");
    }, duration);
  }

  function roundRect(x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawBackground(t) {
    var g = ctx.createLinearGradient(0, 0, W * 0.2, H);
    g.addColorStop(0, "#07141a");
    g.addColorStop(0.45, COLORS.ink);
    g.addColorStop(1, "#0f2a28");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var drift = Math.sin(t / 1400) * 12;
    var drift2 = Math.cos(t / 1800) * 10;

    ctx.save();
    ctx.globalAlpha = 0.35;
    var orb1 = ctx.createRadialGradient(
      W * 0.12 + drift,
      H * 0.35 + drift2,
      10,
      W * 0.12 + drift,
      H * 0.35 + drift2,
      Math.min(W, H) * 0.42
    );
    orb1.addColorStop(0, COLORS.orbTeal);
    orb1.addColorStop(1, "rgba(31,107,106,0)");
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, W, H);

    var orb2 = ctx.createRadialGradient(
      W * 0.88 - drift2,
      H * 0.78 + drift,
      10,
      W * 0.88 - drift2,
      H * 0.78 + drift,
      Math.min(W, H) * 0.36
    );
    orb2.addColorStop(0, COLORS.orbAmber);
    orb2.addColorStop(1, "rgba(138,90,40,0)");
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawText(text, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = (opts.weight || "600") + " " + (opts.size || 16) + "px sans-serif";
    ctx.fillStyle = opts.color || COLORS.foam;
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = opts.baseline || "top";
    if (opts.maxWidth) {
      ctx.fillText(text, x, y, opts.maxWidth);
    } else {
      ctx.fillText(text, x, y);
    }
    ctx.restore();
  }

  function wrapText(text, maxWidth, size, weight) {
    ctx.save();
    ctx.font = (weight || "400") + " " + size + "px sans-serif";
    var lines = [];
    var line = "";
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = text[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    ctx.restore();
    return lines;
  }

  function addHit(id, x, y, w, h, meta) {
    hitAreas.push({ id: id, x: x, y: y, w: w, h: h, meta: meta || null });
  }

  function drawButton(label, x, y, w, h, primary, id) {
    roundRect(x, y, w, h, h / 2);
    if (primary) {
      ctx.fillStyle = COLORS.amber;
      ctx.fill();
      ctx.shadowColor = "rgba(240,160,75,0.28)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      drawText(label, x + w / 2, y + h / 2, {
        size: 16,
        weight: "700",
        color: "#1a1208",
        align: "center",
        baseline: "middle",
      });
    } else {
      ctx.strokeStyle = "rgba(232,244,241,0.22)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawText(label, x + w / 2, y + h / 2, {
        size: 16,
        weight: "600",
        color: COLORS.foamMuted,
        align: "center",
        baseline: "middle",
      });
    }
    addHit(id, x, y, w, h);
  }

  function drawBrand(text, x, y, size) {
    ctx.save();
    ctx.font = "700 " + size + "px serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    var grad = ctx.createLinearGradient(x, y, x + size * text.length * 0.85, y + size);
    grad.addColorStop(0.2, COLORS.foam);
    grad.addColorStop(0.55, COLORS.mint);
    grad.addColorStop(1, COLORS.amber);
    ctx.fillStyle = grad;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function screenAlpha() {
    var a = (nowFn() - screenEnterAt) / 420;
    return Math.max(0, Math.min(1, easeOut(a)));
  }

  function setScreen(name) {
    screen = name;
    screenEnterAt = nowFn();
    hitAreas = [];
  }

  function buildBoard() {
    var size = gridSizeForLevel(state.level);
    var delta = deltaForLevel(state.level);
    var palette = pickPalette(state.level);
    var total = size * size;
    state.oddIndex = Math.floor(Math.random() * total);

    var direction = Math.random() < 0.5 ? 1 : -1;
    var baseL = palette.l;
    var oddL = Math.min(78, Math.max(18, baseL + direction * delta));
    var baseColor = hslToRgb(palette.h, palette.s, baseL);
    var oddColor = hslToRgb(palette.h, Math.min(70, palette.s + 4), oddL);

    var boardSize = Math.min(contentW, Math.min(W - pad * 2, H * 0.48));
    var gap = size >= 5 ? 7 : 10;
    var tile = (boardSize - gap * (size - 1)) / size;
    var boardX = contentX + (contentW - boardSize) / 2;
    var boardY = H * 0.28;

    var radius = size >= 5 ? 10 : size >= 4 ? 12 : 14;
    state.tiles = [];
    state.boardBuiltAt = nowFn();

    for (var i = 0; i < total; i++) {
      var col = i % size;
      var row = Math.floor(i / size);
      state.tiles.push({
        x: boardX + col * (tile + gap),
        y: boardY + row * (tile + gap),
        w: tile,
        h: tile,
        color: i === state.oddIndex ? oddColor : baseColor,
        radius: radius,
        scale: 1,
        shake: 0,
        glow: 0,
        delay: col * 28 + row * 18,
      });
    }

    var hints = ["找出不同的那一块", "差一毫在哪里？", "盯紧了，色差越来越细", "别被相同骗了"];
    state.prompt = hints[Math.min(hints.length - 1, Math.floor((state.level - 1) / 4))];
  }

  function nextRound() {
    state.locked = false;
    buildBoard();
    startTimer(timeForLevel(state.level));
  }

  function startGame() {
    state.level = 1;
    state.score = 0;
    state.lives = MAX_LIVES;
    state.locked = false;
    setScreen("play");
    nextRound();
  }

  function endGame() {
    stopTimer();
    state.isNewBest = setBest(state.score);
    state.resultTitle =
      state.score >= 1200 ? "眼力开挂" : state.score >= 600 ? "差一点就通关" : "脑回路已断裂";
    state.resultMeta = "撑到第 " + state.level + " 关 · 色差已经细到肉眼极限附近";
    setScreen("result");
  }

  function onMiss(reason) {
    state.locked = true;
    stopTimer();
    state.lives -= 1;
    showToast(reason, "bad");

    if (state.tiles[state.oddIndex]) {
      state.tiles[state.oddIndex].glow = 1;
    }

    if (state.lives <= 0) {
      setTimeout(endGame, 700);
      return;
    }
    setTimeout(function () {
      nextRound();
    }, 650);
  }

  function onTileClick(index) {
    if (state.locked || screen !== "play") return;
    state.locked = true;
    stopTimer();

    var tile = state.tiles[index];
    if (index === state.oddIndex) {
      tile.glow = 1;
      tile.scale = 1.12;
      var elapsed = nowFn() - state.timerStartedAt;
      var gain = scoreGain(state.level, elapsed, state.timerDuration);
      state.score += gain;
      showToast("+" + gain, "good");
      setTimeout(function () {
        state.level += 1;
        nextRound();
      }, 420);
    } else {
      tile.shake = 1;
      if (state.tiles[state.oddIndex]) state.tiles[state.oddIndex].glow = 1;
      onMiss("点错了");
    }
  }

  function hitTest(x, y) {
    for (var i = hitAreas.length - 1; i >= 0; i--) {
      var a = hitAreas[i];
      if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return a;
    }
    return null;
  }

  function onPointer(x, y) {
    if (screen === "play" && !state.locked) {
      for (var i = 0; i < state.tiles.length; i++) {
        var t = state.tiles[i];
        if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) {
          onTileClick(i);
          return;
        }
      }
    }

    var hit = hitTest(x, y);
    if (!hit) return;

    if (hit.id === "start" || hit.id === "retry") startGame();
    else if (hit.id === "how") setScreen("how");
    else if (hit.id === "how-back") setScreen("start");
    else if (hit.id === "home") {
      stopTimer();
      setScreen("start");
    }
  }

  wx.onTouchStart(function (e) {
    var touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!touch) return;
    var x = touch.clientX != null ? touch.clientX : touch.x;
    var y = touch.clientY != null ? touch.clientY : touch.y;
    onPointer(x, y);
  });

  // ---------- screens ----------
  function drawStart() {
    var alpha = screenAlpha();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, (1 - alpha) * 14);

    var y = H * 0.22;
    drawBrand("差一毫", contentX, y, Math.min(56, contentW * 0.2));
    y += 72;
    drawText("差一点，就差很多", contentX, y, {
      size: Math.min(24, contentW * 0.07),
      weight: "700",
      color: COLORS.foam,
    });
    y += 42;
    var lines = wrapText(
      "在几乎相同的色块里，找出那个细微不同的。越往后，色差越细。",
      contentW * 0.92,
      15,
      "400"
    );
    for (var i = 0; i < lines.length; i++) {
      drawText(lines[i], contentX, y + i * 24, { size: 15, weight: "400", color: COLORS.foamMuted });
    }
    y += lines.length * 24 + 36;

    var btnW = Math.min(148, contentW * 0.42);
    var btnH = 48;
    drawButton("开始找色", contentX, y, btnW, btnH, true, "start");
    drawButton("怎么玩", contentX + btnW + 12, y, btnW * 0.85, btnH, false, "how");

    var best = getBest();
    if (best > 0) {
      drawText("历史最佳 " + best + " 分", contentX, y + btnH + 28, {
        size: 14,
        weight: "500",
        color: COLORS.mint,
      });
    }
    ctx.restore();
  }

  function drawHow() {
    var alpha = screenAlpha();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, (1 - alpha) * 14);

    var y = H * 0.2;
    drawBrand("差一毫", contentX, y, 28);
    y += 48;
    drawText("怎么玩", contentX, y, { size: 28, weight: "700" });
    y += 48;

    var rules = [
      "1. 点出颜色不同的那一格。",
      "2. 越往后格子越多、色差越细、时间越紧。",
      "3. 点错扣一命；三命用尽结束。",
    ];
    for (var i = 0; i < rules.length; i++) {
      drawText(rules[i], contentX, y + i * 36, { size: 16, weight: "400", color: COLORS.foamMuted });
    }
    y += rules.length * 36 + 40;
    drawButton("知道了", contentX, y, 140, 48, true, "how-back");
    ctx.restore();
  }

  function drawPlay() {
    hitAreas = [];
    var t = nowFn();

    // HUD
    var hudY = Math.max(24, H * 0.06);
    drawText("关卡", contentX, hudY, { size: 11, weight: "600", color: COLORS.foamMuted });
    drawText(String(state.level), contentX, hudY + 16, { size: 20, weight: "700" });

    drawText("得分", W / 2, hudY, {
      size: 11,
      weight: "600",
      color: COLORS.foamMuted,
      align: "center",
    });
    drawText(String(state.score), W / 2, hudY + 16, {
      size: 20,
      weight: "700",
      align: "center",
    });

    var livesStr = "";
    for (var i = 0; i < MAX_LIVES; i++) livesStr += i < state.lives ? "●" : "○";
    drawText("生命", contentX + contentW, hudY, {
      size: 11,
      weight: "600",
      color: COLORS.foamMuted,
      align: "right",
    });
    drawText(livesStr, contentX + contentW, hudY + 16, {
      size: 18,
      weight: "700",
      color: COLORS.amber,
      align: "right",
    });

    // timer
    var remain = 1;
    if (state.timerDuration > 0) {
      remain = Math.max(0, 1 - (t - state.timerStartedAt) / state.timerDuration);
    }
    var barY = hudY + 52;
    var barH = 4;
    roundRect(contentX, barY, contentW, barH, 2);
    ctx.fillStyle = "rgba(232,244,241,0.1)";
    ctx.fill();

    if (remain > 0) {
      var barGrad = ctx.createLinearGradient(contentX, 0, contentX + contentW * remain, 0);
      if (remain < 0.28) {
        barGrad.addColorStop(0, COLORS.amber);
        barGrad.addColorStop(1, COLORS.danger);
      } else {
        barGrad.addColorStop(0, COLORS.mint);
        barGrad.addColorStop(1, COLORS.amber);
      }
      roundRect(contentX, barY, contentW * remain, barH, 2);
      ctx.fillStyle = barGrad;
      ctx.fill();
    }

    drawText(state.prompt, W / 2, barY + 18, {
      size: 14,
      weight: "500",
      color: COLORS.foamMuted,
      align: "center",
    });

    // tiles
    for (var ti = 0; ti < state.tiles.length; ti++) {
      var tile = state.tiles[ti];
      var age = t - state.boardBuiltAt - tile.delay;
      var enter = age < 0 ? 0 : Math.min(1, easeOut(age / 380));
      var scale = (0.82 + 0.18 * enter) * (tile.scale || 1);
      if (tile.scale > 1) {
        tile.scale += (1 - tile.scale) * 0.12;
      }

      var shakeX = 0;
      if (tile.shake > 0) {
        shakeX = Math.sin(t / 30) * 6 * tile.shake;
        tile.shake *= 0.9;
        if (tile.shake < 0.05) tile.shake = 0;
      }

      var cx = tile.x + tile.w / 2 + shakeX;
      var cy = tile.y + tile.h / 2;
      var tw = tile.w * scale;
      var th = tile.h * scale;

      ctx.save();
      ctx.globalAlpha = enter;
      if (tile.glow > 0) {
        ctx.shadowColor = "rgba(62,207,173,0.7)";
        ctx.shadowBlur = 16 * tile.glow;
        tile.glow *= 0.97;
      }
      roundRect(cx - tw / 2, cy - th / 2, tw, th, tile.radius);
      ctx.fillStyle = tile.color;
      ctx.fill();
      // subtle top highlight
      ctx.globalAlpha = enter * 0.18;
      roundRect(cx - tw / 2, cy - th / 2, tw, th * 0.45, tile.radius);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }
  }

  function drawResult() {
    var alpha = screenAlpha();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, (1 - alpha) * 14);

    var y = H * 0.2;
    drawBrand("差一毫", contentX, y, 28);
    y += 52;
    drawText(state.resultTitle, contentX, y, { size: 28, weight: "700" });
    y += 52;
    drawText(String(state.score), contentX, y, {
      size: Math.min(64, contentW * 0.22),
      weight: "700",
      color: COLORS.amber,
    });
    var scoreW = ctx.measureText
      ? (function () {
          ctx.save();
          ctx.font = "700 " + Math.min(64, contentW * 0.22) + "px sans-serif";
          var w = ctx.measureText(String(state.score)).width;
          ctx.restore();
          return w;
        })()
      : 80;
    drawText("分", contentX + scoreW + 8, y + Math.min(64, contentW * 0.22) * 0.55, {
      size: 18,
      weight: "600",
      color: COLORS.foamMuted,
      baseline: "middle",
    });
    y += Math.min(64, contentW * 0.22) + 16;
    drawText(state.resultMeta, contentX, y, {
      size: 14,
      weight: "400",
      color: COLORS.foamMuted,
      maxWidth: contentW,
    });
    y += 40;

    var best = getBest();
    if (best > 0) {
      drawText((state.isNewBest ? "新纪录！历史最佳 " : "历史最佳 ") + best + " 分", contentX, y, {
        size: 14,
        weight: "600",
        color: COLORS.mint,
      });
      y += 36;
    }

    var btnW = Math.min(148, contentW * 0.42);
    drawButton("再来一局", contentX, y, btnW, 48, true, "retry");
    drawButton("回首页", contentX + btnW + 12, y, btnW * 0.85, 48, false, "home");
    ctx.restore();
  }

  function drawToastLayer() {
    if (!toast.text || nowFn() > toast.until) return;
    var remain = toast.until - nowFn();
    var a = remain > 700 ? 1 : remain / 700;
    ctx.save();
    ctx.globalAlpha = a;
    var label = toast.text;
    ctx.font = "600 14px sans-serif";
    var tw = ctx.measureText(label).width + 36;
    var th = 36;
    var tx = (W - tw) / 2;
    var ty = H - Math.max(36, sys.safeArea ? H - sys.safeArea.bottom + 12 : 48) - th;
    if (ty < H * 0.75) ty = H - 64;

    roundRect(tx, ty, tw, th, th / 2);
    ctx.fillStyle = "rgba(11,28,36,0.92)";
    ctx.fill();
    ctx.strokeStyle =
      toast.kind === "good"
        ? "rgba(62,207,173,0.45)"
        : toast.kind === "bad"
          ? "rgba(232,93,93,0.45)"
          : "rgba(232,244,241,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
    drawText(label, W / 2, ty + th / 2, {
      size: 14,
      weight: "600",
      color: toast.kind === "good" ? COLORS.mint : toast.kind === "bad" ? "#ffb0b0" : COLORS.foam,
      align: "center",
      baseline: "middle",
    });
    ctx.restore();
  }

  function loop() {
    hitAreas = [];
    var t = nowFn();
    drawBackground(t);

    if (screen === "start") drawStart();
    else if (screen === "how") drawHow();
    else if (screen === "play") drawPlay();
    else if (screen === "result") drawResult();

    drawToastLayer();
    raf(loop);
  }

  setScreen("start");
  raf(loop);

  // Export for browser preview / tests
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { onPointer: onPointer, getScreen: function () { return screen; } };
  }
})();
