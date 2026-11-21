(function () {
  'use strict';

  var html = document.documentElement;
  var cfg = { enabled: true, noZoom: true, scale: 100 };

  try {
    if (localStorage.getItem('sm_off') !== '1') {
      html.classList.add('sm', 'sm-nozoom');
    } else {
      cfg.enabled = false;
      html.classList.add('sm-off-btn');
    }
  } catch (e) {
    html.classList.add('sm', 'sm-nozoom');
  }

  function calcScale() {
    var sw = (window.innerHeight >= window.innerWidth)
      ? Math.min(screen.width || 360, screen.height || 360)
      : Math.max(screen.width || 360, screen.height || 360);
    if (!sw) sw = 360;
    var iw = window.innerWidth || sw;
    var k = Math.max(1, Math.min(4, iw / sw));
    var userMul = Math.max(0.75, Math.min(1.6, (Number(cfg.scale) || 100) / 100));
    var baseMz = k > 1.15 ? Math.max(1.2, Math.min(2.3, k * 0.85)) : 1;
    var mz = Math.max(0.75, Math.min(2.8, baseMz * userMul));
    var splitZ = Math.max(0.42, Math.min(2.2, (iw * 0.5) / 296));
    html.style.setProperty('--sm-k', k.toFixed(3));
    html.style.setProperty('--sm-mz', mz.toFixed(3));
    html.style.setProperty('--sm-split-z', splitZ.toFixed(3));
  }

  function applyConfig() {
    if (cfg.enabled) {
      html.classList.add('sm');
      html.classList.remove('sm-off-btn');
    } else {
      html.classList.remove('sm', 'sm-home', 'sm-search', 'sm-lib', 'sm-queue', 'sm-np');
      html.classList.add('sm-off-btn');
    }
    html.classList.toggle('sm-nozoom', Boolean(cfg.enabled && cfg.noZoom));
    try { localStorage.setItem('sm_off', cfg.enabled ? '0' : '1'); } catch (e) {}
    calcScale();
    if (typeof updateNavHighlight === 'function') updateNavHighlight();
  }

  calcScale();
  window.addEventListener('resize', calcScale);
  window.addEventListener('load', calcScale);

  // Blokir pinch zoom dua jari saat anti-zoom aktif (tidak mengganggu scroll 1 jari / slider)
  function blockPinch(ev) {
    if (cfg.enabled && cfg.noZoom && ev.touches && ev.touches.length > 1) {
      ev.preventDefault();
    }
  }
  document.addEventListener('touchstart', blockPinch, { passive: false });
  document.addEventListener('touchmove', blockPinch, { passive: false });
  document.addEventListener('gesturestart', function (ev) {
    if (cfg.enabled && cfg.noZoom) ev.preventDefault();
  }, { passive: false });

  try {
    chrome.storage.local.get({ enabled: true, noZoom: true, scale: 100 }, function (d) {
      if (!d) return;
      cfg.enabled = Boolean(d.enabled);
      cfg.noZoom = Boolean(d.noZoom);
      cfg.scale = Number(d.scale) || 100;
      applyConfig();
    });
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local') return;
      if (changes.enabled) cfg.enabled = Boolean(changes.enabled.newValue);
      if (changes.noZoom) cfg.noZoom = Boolean(changes.noZoom.newValue);
      if (changes.scale) cfg.scale = Number(changes.scale.newValue) || 100;
      applyConfig();
    });
  } catch (e) {}

  // ===== HELPERS =====
  function q(testid, root) {
    return (root || document).querySelector('[data-testid="' + testid + '"]');
  }

  function press(testid) {
    var e = q(testid);
    if (e && !e.disabled) {
      e.click();
      return true;
    }
    return false;
  }

  function el(tag, id, cls, text) {
    var n = document.createElement(tag);
    if (id) n.id = id;
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function svgIcon(pathD, sizePx) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'currentColor');
    s.style.width = 'calc(' + sizePx + 'px * var(--sm-k))';
    s.style.height = 'calc(' + sizePx + 'px * var(--sm-k))';
    s.style.display = 'block';
    s.style.pointerEvents = 'none';
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', pathD);
    s.appendChild(p);
    return s;
  }

  // SVG Paths (Material / Spotify style)
  var IC = {
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    library: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z',
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    down: 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    prev: 'M6 6h2v12H6zm3.5 6 8.5 6V6z',
    next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
    shuffle: 'M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
    repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
    heartOff: 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
    heartOn: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    vol: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    lyrics: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    queue: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
    refresh: 'M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'
  };

  function parseSec(node) {
    if (!node) return 0;
    var parts = (node.textContent || '').trim().split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  function fmtSec(s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    var ps = ss < 10 ? '0' + ss : '' + ss;
    return h ? (h + ':' + (m < 10 ? '0' + m : m) + ':' + ps) : (m + ':' + ps);
  }

  function setNativeRange(container, ratio) {
    ratio = Math.max(0, Math.min(1, ratio));
    if (!container) return;
    var rng = container.querySelector('input[type="range"]');
    if (rng) {
      var min = parseFloat(rng.min);
      if (isNaN(min)) min = 0;
      var max = parseFloat(rng.max);
      if (isNaN(max)) max = 100;
      var val = min + ratio * (max - min);
      var step = parseFloat(rng.step);
      var out = (step && step < 1) ? val.toFixed(2) : String(Math.round(val));
      var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (desc && desc.set) desc.set.call(rng, out);
      else rng.value = out;
      rng.dispatchEvent(new Event('input', { bubbles: true }));
      rng.dispatchEvent(new Event('change', { bubbles: true }));
    }
    var bar = q('progress-bar', container) || q('progress-bar-background', container) || container;
    if (bar) {
      var r = bar.getBoundingClientRect();
      if (r.width > 0) {
        var cx = r.left + ratio * r.width;
        var cy = r.top + r.height / 2;
        var o1 = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1 };
        var o0 = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 0 };
        bar.dispatchEvent(new PointerEvent('pointerdown', o1));
        bar.dispatchEvent(new MouseEvent('mousedown', o1));
        bar.dispatchEvent(new PointerEvent('pointermove', o1));
        bar.dispatchEvent(new MouseEvent('mousemove', o1));
        bar.dispatchEvent(new PointerEvent('pointerup', o0));
        bar.dispatchEvent(new MouseEvent('mouseup', o0));
        bar.dispatchEvent(new MouseEvent('click', o0));
      }
    }
  }

  function seekTo(ratio) {
    setNativeRange(q('playback-progressbar'), ratio);
  }

  function setVolume(ratio) {
    setNativeRange(q('volume-bar'), ratio);
  }

  function getVolume() {
    var vb = q('volume-bar');
    if (!vb) return 1;
    var rng = vb.querySelector('input[type="range"]');
    if (rng) {
      var min = parseFloat(rng.min) || 0;
      var max = parseFloat(rng.max) || 1;
      var val = parseFloat(rng.value);
      if (!isNaN(val) && max > min) return Math.max(0, Math.min(1, (val - min) / (max - min)));
    }
    return 1;
  }

  function findLikeButton() {
    var npb = q('now-playing-bar');
    if (!npb) return null;
    var npw = q('now-playing-widget-v2', npb) || q('now-playing-widget', npb) || npb;
    var btn = q('add-button', npw);
    if (btn) return btn;
    var btns = npw.querySelectorAll('button[aria-checked], button[aria-label]');
    for (var i = 0; i < btns.length; i++) {
      var lb = (btns[i].getAttribute('aria-label') || '').toLowerCase();
      if (lb.indexOf('suka') > -1 || lb.indexOf('like') > -1 || lb.indexOf('save') > -1 ||
          lb.indexOf('simpan') > -1 || lb.indexOf('koleksi') > -1 || lb.indexOf('library') > -1) {
        return btns[i];
      }
    }
    return null;
  }

  function isLiked(btn) {
    if (!btn) return false;
    if (btn.getAttribute('aria-checked') === 'true') return true;
    var lb = (btn.getAttribute('aria-label') || '').toLowerCase();
    return lb.indexOf('hapus') > -1 || lb.indexOf('remove') > -1 || lb.indexOf('edit') > -1;
  }

  function upgradeArt(src) {
    if (!src) return '';
    return src.replace('ab67616d00004851', 'ab67616d0000b273');
  }

  function fixFilterBar(mv) {
    if (!mv) return;
    // Kecilkan wrapper desktop yang punya padding kiri-kanan tebal (>=18px) tanpa menambah padding elemen lain
    var nodes = mv.querySelectorAll('main, section, [role="presentation"], [data-testid="home-page"] > div');
    for (var k = 0; k < nodes.length && k < 40; k++) {
      var nd = nodes[k];
      if (nd.classList.contains('sm-slim') || nd.dataset.smPadChk) continue;
      nd.dataset.smPadChk = '1';
      var cs = getComputedStyle(nd);
      var pl = parseFloat(cs.paddingLeft) || 0;
      var pr = parseFloat(cs.paddingRight) || 0;
      if (pl >= 22 && pr >= 22 && nd.offsetWidth > 260) {
        nd.classList.add('sm-slim');
      }
    }
    if (mv.querySelector('.sm-flist')) return;
    var btns = mv.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var tx = (btns[i].textContent || '').trim().toLowerCase();
      if (tx === 'semua' || tx === 'all') {
        var p = btns[i].parentElement;
        if (p && p.querySelectorAll('button').length === 1 && p.parentElement) p = p.parentElement;
        if (p && p.querySelectorAll('button').length >= 2 && p.querySelectorAll('button').length <= 6) {
          p.classList.add('sm-flist');
          var cur = p.parentElement;
          while (cur && cur !== mv) {
            var pos = getComputedStyle(cur).position;
            if (pos === 'sticky' || pos === 'fixed') {
              cur.classList.add('sm-fbar');
              break;
            }
            cur = cur.parentElement;
          }
          break;
        }
      }
    }
  }

  // ===== UI STATE & REFS =====
  var root, homeHdr, btnBrand, btnProf, btnSBack, btnSGo, btnPBack, qHdr, qBg, qSide, qRef, qCls;
  var miniEl, mArt, mTitle, mArtist, mLike, mPP, mPFill;
  var navHome, navSearch, navLib;
  var npEl, npDown, npRaw, npCtx, npArt, npTitle, npArtist, npLike;
  var npSBar, npSFill, npCurTm, npDurTm;
  var npShuf, npPrev, npPP, npNext, npRep;
  var volWrap, volBar, volFill, volPct;
  var btnVol, btnLyrics, btnQueue, btnBackMob, toastEl;

  var seeking = false, seekHoldUntil = 0, seekRatio = 0, curDur = 0;
  var draggingVol = false;
  var lastPath = location.pathname;
  var lastArtRaw = '', lastTitle = '', lastArtist = '', lastProfKey = '';
  var lastPlaying = null, lastLiked = null;
  var toastTimer = null;
  var libExpandTries = 0;
  var lastLibClickAt = 0;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  function setButtonIcon(btn, pathD, sizePx) {
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    btn.appendChild(svgIcon(pathD, sizePx));
  }

  function syncSearchGo() {
    if (!btnSGo) return;
    var inp = q('search-input');
    btnSGo.classList.toggle('show', Boolean(inp && (inp.value || '').trim()));
  }

  function bindSearchInput() {
    var inp = q('search-input');
    if (!inp || inp._smBound) return;
    inp._smBound = 1;
    inp.addEventListener('input', syncSearchGo);
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        setTimeout(function () { if (inp) inp.blur(); }, 100);
      }
    });
  }

  function isHomePath() {
    var p = (location.pathname || '/').replace(/\/+$/, '') || '/';
    return p === '/' || p === '/home' || /^\/intl-[a-z0-9-]+$/i.test(p);
  }

  function updateNavHighlight() {
    if (!navHome) return;
    var isLib = html.classList.contains('sm-lib');
    var isQueue = html.classList.contains('sm-queue');
    var isNP = html.classList.contains('sm-np');
    var isSearch = html.classList.contains('sm-search') || location.pathname.indexOf('/search') === 0;
    var onHome = isHomePath();
    html.classList.toggle('sm-home', Boolean(cfg.enabled && onHome && !isLib && !isQueue && !isSearch && !isNP));
    navHome.classList.toggle('act', !isLib && !isSearch);
    navSearch.classList.toggle('act', !isLib && isSearch);
    navLib.classList.toggle('act', isLib);
  }

  function findUserWidget() {
    var u = q('user-widget-link');
    if (u) return u;
    var av = q('user-widget-avatar');
    return av ? (av.closest('button, a') || av) : null;
  }

  function syncProfile() {
    if (!btnProf) return;
    var uLink = findUserWidget();
    if (uLink) {
      var img = uLink.querySelector('img');
      var src = (img && img.src) ? img.src : '';
      var label = (uLink.getAttribute('aria-label') || uLink.getAttribute('title') || uLink.textContent || '').trim();
      var initial = label ? label.charAt(0).toUpperCase() : 'P';
      var key = 'in|' + src + '|' + initial;
      if (key === lastProfKey) return;
      lastProfKey = key;
      btnProf.className = 'logged';
      btnProf.setAttribute('aria-label', label || 'Profil');
      while (btnProf.firstChild) btnProf.removeChild(btnProf.firstChild);
      if (src) {
        var av = document.createElement('img');
        av.src = src;
        av.alt = initial;
        btnProf.appendChild(av);
      } else {
        btnProf.textContent = initial;
      }
    } else {
      if (lastProfKey === 'out') return;
      lastProfKey = 'out';
      btnProf.className = 'login';
      btnProf.setAttribute('aria-label', 'Masuk');
      while (btnProf.firstChild) btnProf.removeChild(btnProf.firstChild);
      btnProf.textContent = 'Masuk';
    }
  }

  function pinProfileMenu() {
    var menu = q('user-widget-menu');
    if (!menu) return;
    var node = menu;
    while (node.parentElement && node.parentElement !== document.body) {
      var pos = getComputedStyle(node).position;
      if (pos === 'fixed' || pos === 'absolute' || node.id === 'context-menu' || node.hasAttribute('data-tippy-root')) {
        node.classList.add('sm-prof-portal');
        break;
      }
      node = node.parentElement;
    }
  }

  function closeOverlays() {
    html.classList.remove('sm-search', 'sm-lib', 'sm-queue', 'sm-np');
    var inp = q('search-input');
    if (inp) inp.blur();
    updateNavHighlight();
  }

  function openSearch() {
    html.classList.remove('sm-lib', 'sm-queue', 'sm-np');
    html.classList.add('sm-search');
    bindSearchInput();
    syncSearchGo();
    updateNavHighlight();
    if (location.pathname.indexOf('/search') !== 0) {
      press('browse-button');
    }
    // Jangan buka keyboard otomatis saat baru masuk tab Cari
    var inp = q('search-input');
    if (inp && document.activeElement === inp) inp.blur();
    setTimeout(function () {
      var i2 = q('search-input');
      if (i2 && document.activeElement === i2) i2.blur();
    }, 120);
  }

  function isLibraryExpanded(sb) {
    if (!sb) return false;
    var btns = sb.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var lb = (btns[i].getAttribute('aria-label') || '').toLowerCase();
      if (lb.indexOf('ciutkan') > -1 || lb.indexOf('collapse') > -1 ||
          lb.indexOf('tutup koleksi') > -1 || lb.indexOf('close your library') > -1) {
        return true;
      }
      if (lb.indexOf('buka koleksi') > -1 || lb.indexOf('open your library') > -1 ||
          lb.indexOf('perluas koleksi') > -1 || lb.indexOf('expand your library') > -1) {
        return false;
      }
    }
    // Cek teks tombol yang BENAR-BENAR terlihat (hindari visually-hidden pada textContent!)
    for (var j = 0; j < btns.length; j++) {
      var b = btns[j];
      if (b.offsetWidth < 40 || b.offsetHeight < 16) continue;
      var t = (b.innerText || '').trim().toLowerCase();
      if (t === 'buat' || t === 'create' || t === 'playlist' || t === 'album' ||
          t.indexOf('baru diputar') > -1 || t.indexOf('recents') > -1 ||
          t.indexOf('koleksi kamu') > -1 || t.indexOf('your library') > -1) {
        return true;
      }
    }
    return false;
  }

  function findLibraryExpandBtn(sb) {
    var btns = sb.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var lb = (btns[i].getAttribute('aria-label') || '').toLowerCase();
      if (lb.indexOf('buka koleksi') > -1 || lb.indexOf('open your library') > -1 ||
          lb.indexOf('perluas koleksi') > -1 || lb.indexOf('expand your library') > -1 ||
          lb.indexOf('perluas') > -1 || lb.indexOf('expand') > -1) {
        if (lb.indexOf('buat') === -1 && lb.indexOf('create') === -1) return btns[i];
      }
    }
    for (var j = 0; j < btns.length; j++) {
      var lb2 = (btns[j].getAttribute('aria-label') || '').toLowerCase();
      if ((lb2.indexOf('koleksi') > -1 || lb2.indexOf('library') > -1) &&
          lb2.indexOf('buat') === -1 && lb2.indexOf('create') === -1 &&
          lb2.indexOf('cari') === -1 && lb2.indexOf('search') === -1) {
        return btns[j];
      }
    }
    var hdrBtn = sb.querySelector('header button');
    if (hdrBtn) return hdrBtn;
    for (var k = 0; k < btns.length; k++) {
      var lb3 = (btns[k].getAttribute('aria-label') || '').toLowerCase();
      if (lb3.indexOf('buat') === -1 && lb3.indexOf('create') === -1) return btns[k];
    }
    return null;
  }

  function ensureLibraryExpanded() {
    var sb = document.getElementById('Desktop_LeftSidebar_Id');
    if (!sb) return false;
    if (isLibraryExpanded(sb)) return true;
    var now = Date.now();
    if (now - lastLibClickAt < 350) return false;
    var target = findLibraryExpandBtn(sb);
    if (target) {
      lastLibClickAt = now;
      target.click();
    }
    return false;
  }

  function openLibrary() {
    html.classList.remove('sm-search', 'sm-queue', 'sm-np');
    html.classList.add('sm-lib');
    lastPath = location.pathname;
    libExpandTries = 6;
    lastLibClickAt = 0;
    updateNavHighlight();
    ensureLibraryExpanded();
    setTimeout(ensureLibraryExpanded, 400);
  }

  function findQueueButton() {
    var qb = q('control-button-queue');
    if (qb) return qb;
    var npb = q('now-playing-bar');
    if (!npb) return null;
    var btns = npb.querySelectorAll('button[aria-label]');
    for (var i = 0; i < btns.length; i++) {
      var lb = (btns[i].getAttribute('aria-label') || '').toLowerCase();
      if (lb.indexOf('antrean') > -1 || lb.indexOf('queue') > -1) return btns[i];
    }
    return null;
  }

  function isQueueBtnActive(qb) {
    if (!qb) return false;
    return qb.getAttribute('aria-pressed') === 'true' ||
      qb.getAttribute('aria-checked') === 'true' ||
      qb.getAttribute('aria-expanded') === 'true' ||
      qb.getAttribute('data-active') === 'true';
  }

  var panelMode = 'queue';

  function findNPVButton() {
    var b = q('control-button-npv') || q('now-playing-view-button') || q('npv-button');
    if (b) return b;
    var npb = q('now-playing-bar');
    if (!npb) return null;
    // 1. Cocokkan aria-label (Bahasa Indonesia & Inggris: "Tampilan Sedang Memutar", "Sekarang memutar", "Now playing view")
    var btns = npb.querySelectorAll('button[aria-label]');
    for (var i = 0; i < btns.length; i++) {
      var lb = (btns[i].getAttribute('aria-label') || '').toLowerCase();
      if ((lb.indexOf('tampilan') > -1 && (lb.indexOf('memutar') > -1 || lb.indexOf('diputar') > -1)) ||
          lb.indexOf('now playing view') > -1 ||
          lb.indexOf('sedang memutar') > -1 ||
          lb.indexOf('sekarang memutar') > -1 ||
          lb.indexOf('sedang diputar') > -1 ||
          lb.indexOf('now playing') > -1) {
        return btns[i];
      }
    }
    // 2. Fallback struktural: tombol tepat di sebelah kiri tombol Lirik atau Antrean di bar bawah kanan Spotify
    var ref = q('lyrics-button') || findQueueButton();
    if (ref && ref.previousElementSibling && ref.previousElementSibling.tagName === 'BUTTON') {
      return ref.previousElementSibling;
    }
    return null;
  }

  function hasQueueContent(node) {
    if (!node) return false;
    if (panelMode === 'info') {
      if (node.querySelector('[data-testid="NPV_Panel_OpenDiv"], [data-testid="lyrics-npv-section"], [data-testid="npv-artist-link"], [data-testid="npv-artist-bio-button"], video, canvas')) {
        return true;
      }
    } else {
      if (node.querySelector('[data-testid="queue-page"], [data-testid="tracklist-row"], [role="row"], [role="listitem"], a[href*="/track/"], a[href*="/album/"]')) {
        return true;
      }
    }
    var txt = (node.textContent || '').trim();
    return txt.length > 12;
  }

  function revealQueuePanel() {
    if (!html.classList.contains('sm-queue')) return false;
    var mv = document.getElementById('main-view');

    if (panelMode === 'queue' && location.pathname.indexOf('/queue') === 0) {
      var old = document.querySelectorAll('.sm-qpanel');
      for (var i = 0; i < old.length; i++) old[i].classList.remove('sm-qpanel');
      return true;
    }

    var primary = (panelMode === 'info')
      ? (q('NPV_Panel_OpenDiv') || q('lyrics-npv-section') || q('npv-artist-link'))
      : q('queue-page');
    var sideAside = document.querySelector('aside[aria-label*="Antrean"], aside[aria-label*="Queue"], aside[aria-label*="memutar"], aside[aria-label*="diputar"], aside[aria-label*="Now playing"], [role="complementary"]');
    var candidates = [
      primary,
      sideAside,
      document.getElementById('Desktop_PanelContainer_Id'),
      document.querySelector('.Root__right-sidebar'),
      q('right-sidebar-container')
    ];
    var anchor = null;
    for (var c = 0; c < candidates.length; c++) {
      var cand = candidates[c];
      if (!cand || cand === mv) continue;
      if (hasQueueContent(cand)) {
        anchor = cand;
        break;
      }
    }
    if (!anchor) return false;

    var panel = anchor;
    if (mv && mv.contains(anchor)) {
      while (panel.parentElement && panel.parentElement !== mv && panel.tagName !== 'ASIDE') {
        if (panel.parentElement.contains(q('home-page') || mv.querySelector('main'))) break;
        panel = panel.parentElement;
      }
    } else {
      while (panel.parentElement && panel.parentElement !== document.body &&
             (!mv || !panel.parentElement.contains(mv))) {
        panel = panel.parentElement;
      }
    }
    if (panel && panel !== mv && (!mv || !panel.contains(mv))) {
      panel.classList.add('sm-qpanel');
      return true;
    }
    return false;
  }

  var qHarvestSeq = 0;

  function parseQueueRow(row, idx) {
    var img = row.querySelector('img');
    var src = img ? (img.src || '') : '';
    var titleEl = row.querySelector('[data-testid="internal-track-link"], a[href*="/track/"]');
    var title = titleEl ? (titleEl.textContent || '').trim() : '';
    var artistLinks = row.querySelectorAll('a[href*="/artist/"]');
    var artists = [];
    for (var i = 0; i < artistLinks.length; i++) {
      var at = (artistLinks[i].textContent || '').trim();
      if (at && artists.indexOf(at) === -1) artists.push(at);
    }
    var artist = artists.join(', ');
    if (!title) {
      var txts = [];
      var nodes = row.querySelectorAll('[dir="auto"], span, a');
      for (var j = 0; j < nodes.length; j++) {
        if (nodes[j].children && nodes[j].children.length > 0) continue;
        var s = (nodes[j].textContent || '').trim();
        if (!s || s === 'E' || /^\d+:\d+$/.test(s) || /^\d+$/.test(s)) continue;
        if (txts.indexOf(s) === -1) txts.push(s);
      }
      if (txts[0]) title = txts[0];
      if (!artist && txts[1]) artist = txts[1];
    }
    if (!title) return null;
    return { idx: idx, title: title, artist: artist, src: src };
  }

  function captureQueueFromDOM() {
    var rootQ = q('queue-page') ||
      document.querySelector('aside[aria-label*="Antrean"], aside[aria-label*="Queue"]') ||
      document.getElementById('Desktop_PanelContainer_Id');
    if (!rootQ) return [];
    var rows = rootQ.querySelectorAll('[data-testid="tracklist-row"]');
    if (!rows.length) rows = rootQ.querySelectorAll('[role="row"]');
    var out = [];
    for (var i = 0; i < rows.length && out.length < 30; i++) {
      var item = parseQueueRow(rows[i], i);
      if (item) out.push(item);
    }
    return out;
  }

  function renderQueueList(items) {
    if (!qSide) return;
    while (qSide.firstChild) qSide.removeChild(qSide.firstChild);
    if (!items || !items.length) {
      if (lastTitle && lastTitle !== 'Belum ada lagu diputar') {
        qSide.appendChild(el('div', '', 'sm-qsec', 'Sekarang memutar'));
        qSide.appendChild(buildQueueRowEl({ idx: 0, title: lastTitle, artist: lastArtist, src: lastArtRaw }, true));
      }
      qSide.appendChild(el('div', '', 'sm-qempty', 'Belum ada daftar antrean berikutnya'));
      return;
    }

    qSide.appendChild(el('div', '', 'sm-qsec', 'Sekarang memutar'));
    qSide.appendChild(buildQueueRowEl(items[0], true));

    if (items.length > 1) {
      qSide.appendChild(el('div', '', 'sm-qsec nxt', 'Berikutnya'));
      for (var i = 1; i < items.length; i++) {
        qSide.appendChild(buildQueueRowEl(items[i], false));
      }
    }
  }

  function buildQueueRowEl(item, isNow) {
    var btn = el('button', '', isNow ? 'sm-qrow now' : 'sm-qrow');
    var im = el('img', '', 'sm-qimg');
    im.alt = '';
    if (item.src) im.src = item.src;
    var tx = el('div', '', 'sm-qtx');
    tx.append(
      el('div', '', 'sm-qt', item.title),
      el('div', '', 'sm-qa', item.artist || '')
    );
    btn.append(im, tx);
    if (!isNow) {
      btn.addEventListener('click', function () {
        playQueuedTrack(item);
      });
    }
    return btn;
  }

  function activateNPVPanel() {
    panelMode = 'info';
    var npvb = findNPVButton();
    var qb = findQueueButton();
    if (npvb) {
      if (qb && isQueueBtnActive(qb) && isQueueBtnActive(npvb)) {
        qb.click();
      } else if (!isQueueBtnActive(npvb)) {
        npvb.click();
      }
    } else if (qb) {
      var xBtn = document.querySelector('[data-testid="queue-page"] button[aria-label="Tutup"], [data-testid="queue-page"] button[aria-label="Close"]');
      if (xBtn) xBtn.click();
    }
    setTimeout(function () {
      if (!html.classList.contains('sm-queue')) return;
      revealQueuePanel();
      html.classList.remove('sm-qload');
    }, 180);
    setTimeout(function () {
      if (!html.classList.contains('sm-queue')) return;
      revealQueuePanel();
      html.classList.remove('sm-qload');
    }, 450);
  }

  function harvestAndShowSplit(seq) {
    var tries = 0;
    function poll() {
      if (seq !== qHarvestSeq || !html.classList.contains('sm-queue')) return;
      revealQueuePanel();
      var items = captureQueueFromDOM();
      if (items.length > 0 || tries >= 8) {
        renderQueueList(items);
        var hasNPV = Boolean(findNPVButton() || q('NPV_Panel_OpenDiv'));
        if (hasNPV) {
          html.classList.remove('sm-qfull');
          activateNPVPanel();
        } else {
          // Fallback: jika tombol Info/NPV tidak ada, tetap tampilkan Antrean penuh
          html.classList.remove('sm-qload');
          html.classList.add('sm-qfull');
        }
        return;
      }
      tries++;
      setTimeout(poll, 90);
    }
    setTimeout(poll, 100);
  }

  function playQueuedTrack(item) {
    var seq = ++qHarvestSeq;
    panelMode = 'queue';
    html.classList.add('sm-qload');
    var qb = findQueueButton();
    if (qb && !isQueueBtnActive(qb)) qb.click();

    var tries = 0;
    function findAndPlay() {
      if (seq !== qHarvestSeq || !html.classList.contains('sm-queue')) return;
      revealQueuePanel();
      var rootQ = q('queue-page') || document.getElementById('Desktop_PanelContainer_Id');
      var rows = rootQ ? rootQ.querySelectorAll('[data-testid="tracklist-row"], [role="row"]') : [];
      var hit = null;
      for (var i = 0; i < rows.length; i++) {
        var parsed = parseQueueRow(rows[i], i);
        if (parsed && parsed.title === item.title) { hit = rows[i]; break; }
      }
      if (!hit && rows[item.idx]) hit = rows[item.idx];

      if (hit) {
        var playBtn = hit.querySelector('button[aria-label*="Putar"], button[aria-label*="Play"], [data-testid="play-button"]');
        if (playBtn) playBtn.click();
        else hit.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
        setTimeout(function () { harvestAndShowSplit(seq); }, 320);
        return;
      }
      if (tries < 6) {
        tries++;
        setTimeout(findAndPlay, 90);
      } else {
        activateNPVPanel();
      }
    }
    setTimeout(findAndPlay, 110);
  }

  function closeQueue() {
    qHarvestSeq++;
    var wasOpen = html.classList.contains('sm-queue');
    html.classList.remove('sm-queue', 'sm-qload', 'sm-qfull');
    var tagged = document.querySelectorAll('.sm-qpanel');
    for (var i = 0; i < tagged.length; i++) tagged[i].classList.remove('sm-qpanel');
    if (wasOpen && location.pathname.indexOf('/queue') === 0 && window.history.length > 1) {
      window.history.back();
    } else if (wasOpen) {
      var qb = findQueueButton();
      if (qb && isQueueBtnActive(qb)) qb.click();
      var npvb = findNPVButton();
      if (npvb && isQueueBtnActive(npvb)) npvb.click();
    }
    updateNavHighlight();
  }

  function openQueue() {
    var seq = ++qHarvestSeq;
    panelMode = 'queue';
    var qb = findQueueButton();
    html.classList.remove('sm-np', 'sm-lib', 'sm-search', 'sm-qfull');
    html.classList.add('sm-queue', 'sm-qload');
    updateNavHighlight();

    if (qSide) {
      while (qSide.firstChild) qSide.removeChild(qSide.firstChild);
      qSide.appendChild(el('div', '', 'sm-qempty', 'Memuat antrean...'));
    }

    var already = Boolean(q('queue-page'));
    if (!already && qb && !isQueueBtnActive(qb)) qb.click();
    else if (!already && qb) qb.click();

    harvestAndShowSplit(seq);
  }

  function tick() {
    if (document.hidden) return;
    if (root && !root.isConnected && document.body) document.body.appendChild(root);
    if (!cfg.enabled || !mTitle) return;

    // Pastikan Koleksi langsung diperluas bila masih dalam mode ciut
    if (html.classList.contains('sm-lib') && libExpandTries > 0) {
      if (ensureLibraryExpanded()) libExpandTries = 0;
      else libExpandTries--;
    }

    // Pastikan panel Antrean selalu tampil penuh di atas #main-view saat mode Antrean aktif
    if (html.classList.contains('sm-queue')) {
      revealQueuePanel();
    }

    // Auto-tutup overlay Koleksi jika user baru saja membuka playlist/album/artis
    if (location.pathname !== lastPath) {
      var prev = lastPath;
      lastPath = location.pathname;
      if (html.classList.contains('sm-lib') && lastPath !== prev) {
        html.classList.remove('sm-lib');
      }
      if (html.classList.contains('sm-search') && lastPath.indexOf('/search') !== 0) {
        html.classList.remove('sm-search');
      }
    }

    updateNavHighlight();
    syncProfile();

    // Tampilkan tombol back mengambang di sub-halaman
    var subPage = !isHomePath() && location.pathname.indexOf('/search') !== 0;
    btnPBack.classList.toggle('show', subPage);

    fixFilterBar(document.getElementById('main-view'));
    bindSearchInput();
    if (html.classList.contains('sm-search')) syncSearchGo();

    // Sync info lagu dari now-playing-bar asli Spotify
    var npb = q('now-playing-bar');
    var npw = (npb && (q('now-playing-widget-v2', npb) || q('now-playing-widget', npb))) || npb;
    var im = (npw && q('cover-art-image', npw)) || q('cover-art-image');
    var tEl = (npw && (q('context-item-link', npw) || npw.querySelector('[data-testid="context-item-info-title"] a'))) || q('context-item-link');
    var aEl = q('now-playing-widget-v2-byline') || (npw && q('context-item-info-subtitles', npw));
    var ppEl = q('control-button-playpause');

    var rawArt = (im && im.src) || '';
    if (rawArt !== lastArtRaw) {
      lastArtRaw = rawArt;
      if (rawArt) {
        mArt.src = rawArt;
        mArt.style.visibility = 'visible';
        npArt.dataset.fallback = rawArt;
        npArt.src = upgradeArt(rawArt);
      } else {
        mArt.removeAttribute('src');
        mArt.style.visibility = 'hidden';
        npArt.removeAttribute('src');
      }
    }

    var title = (tEl && tEl.textContent) ? tEl.textContent.trim() : 'Belum ada lagu diputar';
    if (title !== lastTitle) {
      lastTitle = title;
      mTitle.textContent = title;
      npTitle.textContent = title;
    }

    var artist = (aEl && aEl.textContent) ? aEl.textContent.trim() : 'Pilih lagu untuk mulai';
    if (artist !== lastArtist) {
      lastArtist = artist;
      mArtist.textContent = artist;
      npArtist.textContent = artist;
    }

    // Play / Pause state
    var ppLbl = ppEl ? (ppEl.getAttribute('aria-label') || '').toLowerCase() : '';
    var playing = ppLbl.indexOf('jeda') > -1 || ppLbl.indexOf('pause') > -1;
    if (playing !== lastPlaying) {
      lastPlaying = playing;
      setButtonIcon(mPP, playing ? IC.pause : IC.play, 24);
      setButtonIcon(npPP, playing ? IC.pause : IC.play, 32);
    }

    // Like state
    var likeBtn = findLikeButton();
    var liked = isLiked(likeBtn);
    if (liked !== lastLiked) {
      lastLiked = liked;
      mLike.classList.toggle('liked', liked);
      npLike.classList.toggle('liked', liked);
      setButtonIcon(mLike, liked ? IC.heartOn : IC.heartOff, 21);
      setButtonIcon(npLike, liked ? IC.heartOn : IC.heartOff, 25);
    }

    // Shuffle & Repeat state
    var shufEl = q('control-button-shuffle');
    npShuf.classList.toggle('on', Boolean(shufEl && shufEl.getAttribute('aria-checked') === 'true'));

    var repEl = q('control-button-repeat');
    var repVal = repEl ? repEl.getAttribute('aria-checked') : 'false';
    npRep.classList.toggle('on', repVal === 'true' || repVal === 'mixed');
    npRep.classList.toggle('one', repVal === 'mixed');

    // Lyrics button state
    var lyrEl = q('lyrics-button');
    btnLyrics.classList.toggle('on', Boolean(lyrEl && lyrEl.getAttribute('data-active') === 'true'));

    // Progress & Duration
    var posEl = q('playback-position');
    var durEl = q('playback-duration');
    var s = parseSec(posEl);
    var e = parseSec(durEl);
    curDur = e;

    if (!seeking && Date.now() > seekHoldUntil) {
      var pct = e > 0 ? Math.min(100, (s / e) * 100) : 0;
      var pctStr = pct.toFixed(2) + '%';
      mPFill.style.width = pctStr;
      npSFill.style.width = pctStr;
      npCurTm.textContent = (posEl && posEl.textContent) ? posEl.textContent.trim() : '0:00';
      npDurTm.textContent = (durEl && durEl.textContent) ? durEl.textContent.trim() : '0:00';
    }

    // Volume
    if (!draggingVol) {
      var v = getVolume();
      volFill.style.width = Math.round(v * 100) + '%';
      volPct.textContent = Math.round(v * 100) + '%';
    }
  }

  function buildUI() {
    if (root) return;
    calcScale();

    root = el('div', 'sm-root');

    // Home Top Header (Spotify title + Profile / Masuk)
    homeHdr = el('header', 'sm-home-hdr');
    btnBrand = el('button', 'sm-brand', '', 'Spotify');
    btnBrand.setAttribute('aria-label', 'Beranda Spotify');
    btnProf = el('button', 'sm-prof', 'login', 'Masuk');
    btnProf.setAttribute('aria-label', 'Masuk');
    homeHdr.append(btnBrand, btnProf);

    // Search top buttons
    btnSBack = el('button', 'sm-sback');
    btnSBack.setAttribute('aria-label', 'Tutup Cari');
    btnSBack.appendChild(svgIcon(IC.back, 20));

    btnSGo = el('button', 'sm-sgo');
    btnSGo.setAttribute('aria-label', 'Cari');
    btnSGo.appendChild(svgIcon(IC.search, 19));

    // Sub-page floating back button
    btnPBack = el('button', 'sm-pback');
    btnPBack.setAttribute('aria-label', 'Kembali');
    btnPBack.appendChild(svgIcon(IC.back, 20));

    // Split View Header (Kiri: Info Lagu | Kanan: Antrean + Refresh + X tunggal)
    qHdr = el('div', 'sm-qhdr');
    var qhl = el('div', 'sm-qhl');
    qhl.appendChild(el('span', '', '', 'Info Lagu'));
    var qhr = el('div', 'sm-qhr');
    qhr.appendChild(el('span', '', '', 'Antrean'));
    var qActs = el('div', 'sm-qacts');
    qRef = el('button', 'sm-qref');
    qRef.setAttribute('aria-label', 'Segarkan Antrean');
    qRef.appendChild(svgIcon(IC.refresh, 16));
    qCls = el('button', 'sm-qcls');
    qCls.setAttribute('aria-label', 'Tutup');
    qCls.appendChild(svgIcon(IC.close, 17));
    qActs.append(qRef, qCls);
    qhr.appendChild(qActs);
    qHdr.append(qhl, qhr);

    qBg = el('div', 'sm-qbg', '', 'Memuat info lagu...');
    qSide = el('div', 'sm-qside');

    // ===== FLOATING MINI PLAYER =====
    miniEl = el('div', 'sm-mini');
    mArt = el('img', 'sm-m-art');
    mArt.alt = '';
    var mInfo = el('div', 'sm-m-info');
    mTitle = el('div', 'sm-m-title', '', 'Belum ada lagu diputar');
    mArtist = el('div', 'sm-m-artist', '', 'Pilih lagu untuk mulai');
    mInfo.append(mTitle, mArtist);

    var mActs = el('div', 'sm-m-acts');
    mLike = el('button', 'sm-m-like');
    mLike.setAttribute('aria-label', 'Sukai');
    mLike.appendChild(svgIcon(IC.heartOff, 21));

    mPP = el('button', 'sm-m-pp');
    mPP.setAttribute('aria-label', 'Putar atau Jeda');
    mPP.appendChild(svgIcon(IC.play, 24));
    mActs.append(mLike, mPP);

    var mPWrap = el('div', 'sm-m-pwrap');
    mPFill = el('div', 'sm-m-pfill');
    mPWrap.appendChild(mPFill);

    miniEl.append(mArt, mInfo, mActs, mPWrap);

    // ===== BOTTOM NAV BAR =====
    var nav = el('nav', 'sm-nav');
    navHome = el('button', 'sm-nav-home', 'sm-nbtn act');
    navHome.append(svgIcon(IC.home, 23), el('span', '', '', 'Beranda'));

    navSearch = el('button', 'sm-nav-search', 'sm-nbtn');
    navSearch.append(svgIcon(IC.search, 23), el('span', '', '', 'Cari'));

    navLib = el('button', 'sm-nav-lib', 'sm-nbtn');
    navLib.append(svgIcon(IC.library, 23), el('span', '', '', 'Koleksi'));

    nav.append(navHome, navSearch, navLib);

    // ===== FULL-SCREEN NOW PLAYING SHEET =====
    npEl = el('div', 'sm-np');

    var npTop = el('div', 'sm-np-top');
    npDown = el('button', 'sm-np-down');
    npDown.setAttribute('aria-label', 'Tutup Pemutar');
    npDown.appendChild(svgIcon(IC.down, 28));
    npCtx = el('div', 'sm-np-ctx', '', 'SEDANG DIPUTAR');
    npRaw = el('button', 'sm-np-raw', '', 'Asli');
    npTop.append(npDown, npCtx, npRaw);

    var npArtWrap = el('div', 'sm-np-artwrap');
    npArt = el('img', 'sm-np-art');
    npArt.alt = '';
    npArt.onerror = function () {
      if (npArt.dataset.fallback && npArt.src !== npArt.dataset.fallback) {
        npArt.src = npArt.dataset.fallback;
      }
    };
    npArtWrap.appendChild(npArt);

    var npBottom = el('div', 'sm-np-bot');

    var npMeta = el('div', 'sm-np-meta');
    var npTx = el('div', 'sm-np-tx');
    npTitle = el('div', 'sm-np-title', '', 'Belum ada lagu diputar');
    npArtist = el('div', 'sm-np-artist', '', '');
    npTx.append(npTitle, npArtist);

    npLike = el('button', 'sm-np-like');
    npLike.setAttribute('aria-label', 'Sukai');
    npLike.appendChild(svgIcon(IC.heartOff, 25));
    npMeta.append(npTx, npLike);

    // Progress slider
    var npProg = el('div', 'sm-np-prog');
    npSBar = el('div', 'sm-np-sbar');
    var npSTrack = el('div', 'sm-np-strack');
    npSFill = el('div', 'sm-np-sfill');
    npSFill.appendChild(el('div', 'sm-np-sknob'));
    npSTrack.appendChild(npSFill);
    npSBar.appendChild(npSTrack);

    var npTimes = el('div', 'sm-np-times');
    npCurTm = el('span', 'sm-np-cur', '', '0:00');
    npDurTm = el('span', 'sm-np-dur', '', '0:00');
    npTimes.append(npCurTm, npDurTm);
    npProg.append(npSBar, npTimes);

    // Main 5 controls
    var npCtl = el('div', 'sm-np-ctl');
    npShuf = el('button', 'sm-np-shuf', 'sub');
    npShuf.setAttribute('aria-label', 'Acak');
    npShuf.appendChild(svgIcon(IC.shuffle, 22));

    npPrev = el('button', 'sm-np-prev');
    npPrev.setAttribute('aria-label', 'Sebelumnya');
    npPrev.appendChild(svgIcon(IC.prev, 32));

    npPP = el('button', 'sm-np-pp');
    npPP.setAttribute('aria-label', 'Putar atau Jeda');
    npPP.appendChild(svgIcon(IC.play, 32));

    npNext = el('button', 'sm-np-next');
    npNext.setAttribute('aria-label', 'Berikutnya');
    npNext.appendChild(svgIcon(IC.next, 32));

    npRep = el('button', 'sm-np-rep', 'sub');
    npRep.setAttribute('aria-label', 'Ulangi');
    npRep.appendChild(svgIcon(IC.repeat, 22));

    npCtl.append(npShuf, npPrev, npPP, npNext, npRep);

    // Inline Volume drawer
    volWrap = el('div', 'sm-vol-wrap');
    volWrap.appendChild(svgIcon(IC.vol, 18));
    volBar = el('div', 'sm-vol-bar');
    var volTrack = el('div', 'sm-vol-track');
    volFill = el('div', 'sm-vol-fill');
    volFill.appendChild(el('div', 'sm-vol-knob'));
    volTrack.appendChild(volFill);
    volBar.appendChild(volTrack);
    volPct = el('span', 'sm-vol-pct', '', '100%');
    volWrap.append(volBar, volPct);

    // Bottom utility buttons
    var npFoot = el('div', 'sm-np-foot');
    btnVol = el('button', 'sm-np-vol');
    btnVol.append(svgIcon(IC.vol, 17), el('span', '', '', 'Volume'));

    btnLyrics = el('button', 'sm-np-lyr');
    btnLyrics.append(svgIcon(IC.lyrics, 17), el('span', '', '', 'Lirik'));

    btnQueue = el('button', 'sm-np-q');
    btnQueue.append(svgIcon(IC.queue, 17), el('span', '', '', 'Antrean'));

    npFoot.append(btnVol, btnLyrics, btnQueue);

    npBottom.append(npMeta, npProg, npCtl, volWrap, npFoot);
    npEl.append(npTop, npArtWrap, npBottom);

    // Floating button to return to Mobile Mode when viewing original Desktop UI
    btnBackMob = el('button', 'sm-back-mob', '', 'Mode Mobile');

    // Toast
    toastEl = el('div', 'sm-toast');

    root.append(homeHdr, btnSBack, btnSGo, btnPBack, qHdr, qBg, qSide, miniEl, nav, npEl, toastEl);
    document.body.append(root, btnBackMob);

    // ===== EVENTS =====
    btnBrand.addEventListener('click', function () {
      var mv = document.getElementById('main-view');
      if (mv) mv.scrollTo({ top: 0, behavior: 'smooth' });
      press('home-button');
    });

    btnProf.addEventListener('click', function () {
      var uLink = findUserWidget();
      if (uLink) {
        uLink.click();
        setTimeout(pinProfileMenu, 30);
        setTimeout(pinProfileMenu, 120);
      } else {
        var loginBtn = q('login-button');
        if (loginBtn) loginBtn.click();
        else window.location.href = 'https://accounts.spotify.com/login?continue=' + encodeURIComponent(window.location.href);
      }
    });

    window.addEventListener('popstate', function () {
      setTimeout(updateNavHighlight, 40);
    });

    miniEl.addEventListener('click', function (ev) {
      if (ev.target.closest('#sm-m-acts')) return;
      html.classList.add('sm-np');
      updateNavHighlight();
    });

    mPP.addEventListener('click', function (ev) {
      ev.stopPropagation();
      press('control-button-playpause');
    });

    function toggleLike(ev) {
      if (ev) ev.stopPropagation();
      var lb = findLikeButton();
      if (lb) lb.click();
      else showToast('Putar lagu dulu untuk menyukai');
    }
    mLike.addEventListener('click', toggleLike);
    npLike.addEventListener('click', toggleLike);

    npDown.addEventListener('click', function () {
      html.classList.remove('sm-np');
      volWrap.classList.remove('show');
      updateNavHighlight();
    });

    // Swipe down pada cover art untuk menutup Now Playing
    var swipeY0 = null;
    npArtWrap.addEventListener('touchstart', function (ev) {
      if (ev.touches.length === 1) swipeY0 = ev.touches[0].clientY;
    }, { passive: true });
    npArtWrap.addEventListener('touchend', function (ev) {
      if (swipeY0 != null && ev.changedTouches.length === 1) {
        if (ev.changedTouches[0].clientY - swipeY0 > 70) {
          html.classList.remove('sm-np');
          volWrap.classList.remove('show');
          updateNavHighlight();
        }
      }
      swipeY0 = null;
    }, { passive: true });

    // Seek Slider (tap & smooth drag)
    function updateSeekVisual(clientX) {
      var r = npSBar.getBoundingClientRect();
      if (!r.width) return 0;
      var ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      seekRatio = ratio;
      var pct = (ratio * 100).toFixed(2) + '%';
      npSFill.style.width = pct;
      mPFill.style.width = pct;
      if (curDur > 0) npCurTm.textContent = fmtSec(ratio * curDur);
      return ratio;
    }

    npSBar.addEventListener('pointerdown', function (ev) {
      seeking = true;
      npSBar.classList.add('dragging');
      if (npSBar.setPointerCapture) {
        try { npSBar.setPointerCapture(ev.pointerId); } catch (e) {}
      }
      updateSeekVisual(ev.clientX);
    });
    npSBar.addEventListener('pointermove', function (ev) {
      if (!seeking) return;
      updateSeekVisual(ev.clientX);
    });
    function finishSeek(ev) {
      if (!seeking) return;
      if (ev && typeof ev.clientX === 'number') updateSeekVisual(ev.clientX);
      seeking = false;
      seekHoldUntil = Date.now() + 400;
      npSBar.classList.remove('dragging');
      seekTo(seekRatio);
    }
    npSBar.addEventListener('pointerup', finishSeek);
    npSBar.addEventListener('pointercancel', finishSeek);

    // Volume Slider
    function updateVol(clientX, commit) {
      var r = volBar.getBoundingClientRect();
      if (!r.width) return;
      var ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      volFill.style.width = Math.round(ratio * 100) + '%';
      volPct.textContent = Math.round(ratio * 100) + '%';
      if (commit) setVolume(ratio);
    }
    volBar.addEventListener('pointerdown', function (ev) {
      draggingVol = true;
      if (volBar.setPointerCapture) {
        try { volBar.setPointerCapture(ev.pointerId); } catch (e) {}
      }
      updateVol(ev.clientX, true);
    });
    volBar.addEventListener('pointermove', function (ev) {
      if (!draggingVol) return;
      updateVol(ev.clientX, true);
    });
    function endVol(ev) {
      if (!draggingVol) return;
      if (ev && typeof ev.clientX === 'number') updateVol(ev.clientX, true);
      draggingVol = false;
    }
    volBar.addEventListener('pointerup', endVol);
    volBar.addEventListener('pointercancel', endVol);

    // Playback Controls
    npShuf.addEventListener('click', function () { press('control-button-shuffle'); });
    npPrev.addEventListener('click', function () { press('control-button-skip-back'); });
    npPP.addEventListener('click', function () { press('control-button-playpause'); });
    npNext.addEventListener('click', function () { press('control-button-skip-forward'); });
    npRep.addEventListener('click', function () { press('control-button-repeat'); });

    // Utility Row
    btnVol.addEventListener('click', function () {
      volWrap.classList.toggle('show');
      btnVol.classList.toggle('on', volWrap.classList.contains('show'));
    });

    btnLyrics.addEventListener('click', function () {
      var lb = q('lyrics-button');
      if (!lb || lb.disabled || lb.getAttribute('aria-disabled') === 'true') {
        showToast('Lirik tidak tersedia untuk lagu ini');
        return;
      }
      var qb = findQueueButton();
      if (qb && isQueueBtnActive(qb)) qb.click();
      var npvb = findNPVButton();
      if (npvb && isQueueBtnActive(npvb)) npvb.click();
      html.classList.remove('sm-np', 'sm-lib', 'sm-queue', 'sm-qload', 'sm-qfull', 'sm-search');
      var tagged = document.querySelectorAll('.sm-qpanel');
      for (var i = 0; i < tagged.length; i++) tagged[i].classList.remove('sm-qpanel');
      lb.click();
      updateNavHighlight();
    });

    btnQueue.addEventListener('click', openQueue);
    qRef.addEventListener('click', openQueue);
    qCls.addEventListener('click', closeQueue);

    // Bottom Navigation
    navHome.addEventListener('click', function () {
      closeQueue();
      closeOverlays();
      press('home-button');
      updateNavHighlight();
    });

    navSearch.addEventListener('click', function () {
      closeQueue();
      openSearch();
    });

    navLib.addEventListener('click', function () {
      closeQueue();
      if (html.classList.contains('sm-lib')) {
        html.classList.remove('sm-lib');
        updateNavHighlight();
      } else {
        openLibrary();
      }
    });

    // Search Back & Submit
    btnSBack.addEventListener('click', function () {
      html.classList.remove('sm-search');
      var inp = q('search-input');
      if (inp) inp.blur();
      updateNavHighlight();
    });

    btnSGo.addEventListener('click', function () {
      var inp = q('search-input');
      if (inp && (inp.value || '').trim()) {
        inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        var form = inp.closest('form');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        inp.blur();
      }
    });

    // Sub-page back
    btnPBack.addEventListener('click', function () {
      if (window.history.length > 1) window.history.back();
      else press('home-button');
    });

    // Toggle Asli / Mode Mobile
    npRaw.addEventListener('click', function () {
      cfg.enabled = false;
      applyConfig();
      try { chrome.storage.local.set({ enabled: false }); } catch (e) {}
    });

    btnBackMob.addEventListener('click', function () {
      cfg.enabled = true;
      applyConfig();
      try { chrome.storage.local.set({ enabled: true }); } catch (e) {}
    });

    updateNavHighlight();
    tick();
    setInterval(tick, 500);
  }

  if (document.body) buildUI();
  else document.addEventListener('DOMContentLoaded', buildUI);
})();
