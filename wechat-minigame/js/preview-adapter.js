/**
 * 浏览器预览适配层：模拟微信小游戏 wx API，方便本地验证 Canvas 逻辑。
 * 仅用于 preview.html，正式微信环境不加载本文件。
 */
(function () {
  "use strict";

  var canvas = document.getElementById("game");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "game";
    document.body.appendChild(canvas);
  }

  function syncSize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = Math.min(window.innerWidth, 430);
    var h = window.innerHeight;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    return { w: w, h: h, dpr: dpr };
  }

  var size = syncSize();
  window.addEventListener("resize", function () {
    size = syncSize();
  });

  var touchHandlers = [];

  window.wx = {
    createCanvas: function () {
      return canvas;
    },
    getSystemInfoSync: function () {
      return {
        windowWidth: size.w,
        windowHeight: size.h,
        pixelRatio: size.dpr,
        safeArea: { top: 0, bottom: size.h, left: 0, right: size.w },
      };
    },
    getStorageSync: function (key) {
      return localStorage.getItem(key) || "";
    },
    setStorageSync: function (key, value) {
      localStorage.setItem(key, String(value));
    },
    onTouchStart: function (fn) {
      touchHandlers.push(fn);
    },
  };

  function emit(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = ((clientX - rect.left) / rect.width) * size.w;
    var y = ((clientY - rect.top) / rect.height) * size.h;
    var evt = { touches: [{ clientX: x, clientY: y }] };
    touchHandlers.forEach(function (fn) {
      fn(evt);
    });
  }

  canvas.addEventListener(
    "touchstart",
    function (e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      emit(t.clientX, t.clientY);
    },
    { passive: false }
  );

  canvas.addEventListener("mousedown", function (e) {
    emit(e.clientX, e.clientY);
  });
})();
