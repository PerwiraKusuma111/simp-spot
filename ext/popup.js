const DEFAULTS = {
  enabled: true,
  desktopUA: true,
  noZoom: true,
  scale: 100,
  pageZoom: 0
};

const elEnabled = document.getElementById('enabled');
const elDesktopUA = document.getElementById('desktopUA');
const elNoZoom = document.getElementById('noZoom');
const elSRng = document.getElementById('srng');
const elSVal = document.getElementById('sval');
const elZVal = document.getElementById('zval');
const elBtn = document.getElementById('btnApply');
const elSt = document.getElementById('st');
const sbtns = Array.from(document.querySelectorAll('.sbtn'));
const zbtns = Array.from(document.querySelectorAll('.zbtn'));

function renderScale(v) {
  elSRng.value = v;
  elSVal.textContent = v + '%';
  sbtns.forEach((b) => b.classList.toggle('act', Number(b.dataset.s) === v));
}

function renderZoom(v) {
  elZVal.textContent = v === 0 ? 'Auto' : (v + '%');
  zbtns.forEach((b) => b.classList.toggle('act', Number(b.dataset.z) === v));
}

function save(obj) {
  chrome.storage.local.set(obj);
}

chrome.storage.local.get(DEFAULTS, (d) => {
  elEnabled.checked = Boolean(d.enabled);
  elDesktopUA.checked = Boolean(d.desktopUA);
  elNoZoom.checked = Boolean(d.noZoom);
  renderScale(Number(d.scale) || 100);
  renderZoom(Number(d.pageZoom) || 0);
});

elEnabled.addEventListener('change', () => save({ enabled: elEnabled.checked }));
elNoZoom.addEventListener('change', () => save({ noZoom: elNoZoom.checked }));

elDesktopUA.addEventListener('change', () => {
  save({ desktopUA: elDesktopUA.checked });
  elSt.textContent = 'Klik Terapkan & Reload agar UA berubah';
});

let sTimer = null;
elSRng.addEventListener('input', () => {
  const v = Number(elSRng.value);
  renderScale(v);
  clearTimeout(sTimer);
  sTimer = setTimeout(() => save({ scale: v }), 80);
});
elSRng.addEventListener('change', () => {
  clearTimeout(sTimer);
  const v = Number(elSRng.value);
  renderScale(v);
  save({ scale: v });
});

sbtns.forEach((b) => {
  b.addEventListener('click', () => {
    const v = Number(b.dataset.s);
    renderScale(v);
    save({ scale: v });
  });
});

zbtns.forEach((b) => {
  b.addEventListener('click', () => {
    const v = Number(b.dataset.z);
    renderZoom(v);
    save({ pageZoom: v });
  });
});

elBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'APPLY', reload: true, resetZoom: Number(elZVal.textContent === 'Auto') === 1 }, () => {
    elSt.textContent = 'Tersimpan & Spotify di-reload';
    setTimeout(() => { elSt.textContent = ''; }, 2000);
  });
});
