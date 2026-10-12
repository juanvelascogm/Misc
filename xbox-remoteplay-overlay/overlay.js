// ==UserScript==
// @name         Xbox Remote Play - touch gamepad overlay
// @namespace    https://github.com/juanvelascogm/Misc
// @version      1.2
// @description  Portrait layout with a virtual Xbox gamepad under the stream; mixes audio with other apps
// @author       juanvelascogm
// @match        https://www.xbox.com/*
// @match        https://xbox.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(() => {
  if (window.__xrpOverlay) return;
  window.__xrpOverlay = true;

  // ---- Audio: mix with other apps (e.g. YouTube PiP) instead of interrupting them
  const setAmbient = () => {
    try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
  };
  setAmbient();
  document.addEventListener('play', setAmbient, true);
  document.addEventListener('playing', setAmbient, true);
  setInterval(setAmbient, 5000);

  // ---- Virtual standard-mapping gamepad
  const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, XBOX: 16, SHARE: 17 };
  const buttons = Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 }));
  const axes = [0, 0, 0, 0];
  const pad = {
    id: 'Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)',
    index: 0, connected: true, mapping: 'standard', timestamp: 0, axes, buttons,
    hapticActuators: [], vibrationActuator: null,
  };
  const realGetGamepads = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : () => [];
  let padVisible = false;
  navigator.getGamepads = () => {
    // A physically connected pad wins when the overlay is hidden.
    if (!padVisible) {
      const real = Array.from(realGetGamepads() || []).filter(Boolean);
      if (real.length) return real;
    }
    pad.timestamp = performance.now();
    return [pad, null, null, null];
  };
  const announce = () => {
    const ev = new Event('gamepadconnected');
    ev.gamepad = pad;
    window.dispatchEvent(ev);
  };
  const setBtn = (i, down) => {
    const b = buttons[i];
    b.pressed = b.touched = down;
    b.value = down ? 1 : 0;
  };

  // ---- Resilience: iOS kills the stream when the page is backgrounded or the screen locks
  const streamVideo = () => {
    const v = document.querySelector('video');
    return v && v.videoWidth > 0 ? v : null;
  };
  let banner = null;
  const showBanner = (text) => {
    if (!document.body) return;
    if (!banner) {
      banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top) + 8px);left:8px;right:104px;z-index:2147483647;' +
        'padding:10px 12px;border-radius:12px;background:#b81f1f;color:#fff;font:600 14px -apple-system,system-ui,sans-serif;display:none';
      banner.addEventListener('click', () => location.reload());
      document.body.appendChild(banner);
    }
    banner.textContent = text;
    banner.style.display = text ? 'block' : 'none';
  };
  const reloadGuarded = () => {
    try {
      const now = Date.now();
      const t = JSON.parse(sessionStorage.getItem('xrpReloads') || '[]').filter((x) => now - x < 60000);
      if (t.length >= 3) { showBanner('Stream keeps dropping. Tap here to reload.'); return; }
      t.push(now);
      sessionStorage.setItem('xrpReloads', JSON.stringify(t));
    } catch (_) {}
    location.reload();
  };
  let streamingAtHide = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { streamingAtHide = !!streamVideo(); return; }
    keepAwake();
    if (!streamingAtHide) return;
    streamingAtHide = false;
    // Back in the tab: give the stream a moment, then reload if the picture is frozen or gone.
    const v0 = streamVideo();
    const t0 = v0 ? v0.currentTime : 0;
    setTimeout(() => {
      const v = streamVideo();
      if (!v || v.paused || !(v.currentTime > t0 + 0.2)) reloadGuarded();
    }, 1500);
  });

  // Keep the screen awake while streaming (auto-lock would cut the stream).
  let wakeLock = null;
  async function keepAwake() {
    try {
      if (!navigator.wakeLock || wakeLock || document.hidden || !streamVideo()) return;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (_) { wakeLock = null; }
  }

  // Watchdog while visible: a frozen picture shows a tap-to-reload banner.
  let lastT = -1, lastChange = Date.now();
  setInterval(() => {
    keepAwake();
    const v = streamVideo();
    if (!v || document.hidden) { lastChange = Date.now(); return; }
    if (v.currentTime !== lastT) { lastT = v.currentTime; lastChange = Date.now(); if (banner) showBanner(''); }
    else if (Date.now() - lastChange > 8000) showBanner('Stream lost. Tap here to reload.');
  }, 2000);

  // ---- UI
  const css = `
  :root{--xrp-h:calc(100vh - 56.25vw)}
  #xrp-panel{position:fixed;left:0;right:0;bottom:0;height:var(--xrp-h);background:linear-gradient(#17171a,#0b0b0d);z-index:2147483646;
    touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;display:none;overflow:hidden;
    font:600 4.5vw -apple-system,system-ui,sans-serif;color:#cfcfd6}
  #xrp-panel.on{display:block}
  #xrp-panel *{touch-action:none;-webkit-tap-highlight-color:transparent;box-sizing:border-box}
  .xrp-b{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:50%;
    background:radial-gradient(#2c2c32,#1a1a1e);border:.5vw solid #0a0a0c;box-shadow:0 .8vw 1.6vw #000;transform:translate(-50%,-50%)}
  .xrp-b.on{filter:brightness(1.8);box-shadow:none}
  .xrp-pill{border-radius:4vw}
  .xrp-fy{background:#c9a30f;color:#fff}.xrp-fx{background:#1f5fc4;color:#fff}.xrp-fb{background:#b81f1f;color:#fff}.xrp-fa{background:#2a8a2a;color:#fff}
  .xrp-stick{position:absolute;border-radius:50%;background:#101013;border:.6vw solid #26262b;box-shadow:inset 0 0 3vw #000;transform:translate(-50%,-50%)}
  .xrp-knob{position:absolute;left:50%;top:50%;width:62%;height:62%;margin:-31% 0 0 -31%;border-radius:50%;
    background:radial-gradient(#34343b,#1c1c20);border:.5vw solid #0a0a0c}
  #xrp-reload{position:fixed;top:calc(env(safe-area-inset-top) + 6px);right:52px;z-index:2147483647;width:40px;height:40px;
    border-radius:20px;border:0;background:rgba(40,40,46,.8);color:#fff;font-size:20px}
  #xrp-toggle{position:fixed;top:calc(env(safe-area-inset-top) + 6px);right:6px;z-index:2147483647;width:40px;height:40px;
    border-radius:20px;border:0;background:rgba(40,40,46,.8);color:#fff;font-size:20px}
  body.xrp-on video{position:fixed!important;top:0!important;left:0!important;width:100vw!important;
    height:56.25vw!important;object-fit:contain!important;background:#000!important;z-index:2147483000!important}
  `;
  const style = document.createElement('style');
  style.textContent = css;

  const panel = document.createElement('div');
  panel.id = 'xrp-panel';
  const toggle = document.createElement('button');
  toggle.id = 'xrp-toggle';
  toggle.textContent = '\u{1F3AE}';
  const reloadBtn = document.createElement('button');
  reloadBtn.id = 'xrp-reload';
  reloadBtn.textContent = '\u21BB';
  reloadBtn.addEventListener('click', () => location.reload());

  // [label, button index, x vw, y vw (from panel top), w vw, h vw, class] - layout mirrors the native app
  const defs = [
    ['LT', BTN.LT, 19, 14, 25, 10, 'xrp-pill'], ['LB', BTN.LB, 19.5, 28.7, 24, 8.5, 'xrp-pill'],
    ['RT', BTN.RT, 82, 14.3, 25, 10, 'xrp-pill'], ['RB', BTN.RB, 82, 28.2, 24, 8.5, 'xrp-pill'],
    ['\u27F2', BTN.VIEW, 43.3, 12.3, 11, 11, ''], ['\u2630', BTN.MENU, 57.3, 12.3, 11, 11, ''],
    ['\u24E7', BTN.XBOX, 43.3, 26, 11, 11, ''], ['\u{1F4F7}', BTN.SHARE, 57.3, 26, 11, 11, ''],
    ['Y', BTN.Y, 73, 46.4, 12, 12, 'xrp-fy'], ['X', BTN.X, 61.4, 56.2, 12, 12, 'xrp-fx'],
    ['B', BTN.B, 84.4, 56.2, 12, 12, 'xrp-fb'], ['A', BTN.A, 73, 66.4, 12, 12, 'xrp-fa'],
    ['\u25B2', BTN.UP, 28.7, 89, 9, 9, ''], ['\u25BC', BTN.DOWN, 28.7, 105.2, 9, 9, ''],
    ['\u25C0', BTN.LEFT, 20.6, 97.1, 9, 9, ''], ['\u25B6', BTN.RIGHT, 36.9, 97.1, 9, 9, ''],
  ];
  const pointers = new Map(); // pointerId -> {type, ...}

  for (const [label, idx, x, y, w, h, cls] of defs) {
    const el = document.createElement('div');
    el.className = 'xrp-b ' + cls;
    el.textContent = label;
    el.style.cssText = `left:${x}vw;top:${y}vw;width:${w}vw;height:${h}vw`;
    el.dataset.btn = idx;
    panel.appendChild(el);
  }
  const mkStick = (x, y, size, ax, click) => {
    const s = document.createElement('div');
    s.className = 'xrp-stick';
    s.style.cssText = `left:${x}vw;top:${y}vw;width:${size}vw;height:${size}vw`;
    s.dataset.axis = ax;
    s.dataset.click = click;
    s.innerHTML = '<div class="xrp-knob"></div>';
    panel.appendChild(s);
  };
  mkStick(28.2, 57.5, 34, 0, BTN.L3);   // left stick
  mkStick(72.9, 97.1, 32, 2, BTN.R3);   // right stick

  const refresh = () => {
    panel.querySelectorAll('.xrp-b').forEach((el) => el.classList.toggle('on', buttons[+el.dataset.btn].pressed));
  };

  panel.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.xrp-b, .xrp-stick');
    if (!t) return;
    e.preventDefault();
    try { panel.setPointerCapture(e.pointerId); } catch (_) {}
    if (t.dataset.btn !== undefined) {
      const i = +t.dataset.btn;
      pointers.set(e.pointerId, { type: 'btn', i });
      setBtn(i, true);
    } else {
      const r = t.getBoundingClientRect();
      const st = { type: 'stick', el: t, ax: +t.dataset.axis, cx: r.left + r.width / 2, cy: r.top + r.height / 2, rad: r.width / 2, t0: performance.now(), moved: false };
      pointers.set(e.pointerId, st);
      moveStick(st, e);
    }
    refresh();
  });
  function moveStick(st, e) {
    let dx = (e.clientX - st.cx) / st.rad, dy = (e.clientY - st.cy) / st.rad;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    if (m > 0.15) st.moved = true;
    axes[st.ax] = Math.abs(dx) < 0.08 ? 0 : dx;
    axes[st.ax + 1] = Math.abs(dy) < 0.08 ? 0 : dy;
    const k = st.el.firstChild;
    k.style.transform = `translate(${dx * st.rad * 0.5}px,${dy * st.rad * 0.5}px)`;
  }
  panel.addEventListener('pointermove', (e) => {
    const st = pointers.get(e.pointerId);
    if (st && st.type === 'stick') { e.preventDefault(); moveStick(st, e); }
  });
  const up = (e) => {
    const st = pointers.get(e.pointerId);
    if (!st) return;
    pointers.delete(e.pointerId);
    if (st.type === 'btn') setBtn(st.i, false);
    else {
      axes[st.ax] = axes[st.ax + 1] = 0;
      st.el.firstChild.style.transform = '';
      // a quick tap without dragging = stick click (L3/R3)
      if (!st.moved && performance.now() - st.t0 < 250) {
        const i = +st.el.dataset.click;
        setBtn(i, true);
        setTimeout(() => { setBtn(i, false); refresh(); }, 80);
      }
    }
    refresh();
  };
  panel.addEventListener('pointerup', up);
  panel.addEventListener('pointercancel', up);
  panel.addEventListener('contextmenu', (e) => e.preventDefault());

  const setPad = (on) => {
    padVisible = on;
    panel.classList.toggle('on', on);
    document.body.classList.toggle('xrp-on', on);
    if (on) announce();
  };
  toggle.addEventListener('click', () => { setPad(!padVisible); keepAwake(); });

  const mount = () => {
    document.head.appendChild(style);
    document.body.append(panel, toggle, reloadBtn);
    // Auto-show the pad once a stream <video> has started.
    let auto = false;
    setInterval(() => {
      if (auto) return;
      const v = document.querySelector('video');
      if (v && v.readyState > 1 && v.videoWidth > 0) { auto = true; setPad(true); }
    }, 1000);
  };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  // Expose for debugging/testing.
  window.__xrp = { pad, setPad, BTN };
})();
