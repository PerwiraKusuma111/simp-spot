const api = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;
const IS_FIREFOX = (typeof browser !== 'undefined' && typeof navigator !== 'undefined' && /firefox|gecko/i.test(navigator.userAgent || '') && !/chrome|edg/i.test(navigator.userAgent || ''));
const DESKTOP_UA = IS_FIREFOX
  ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'
  : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const RULE_ID = 101;
const DEFAULTS = {
  enabled: true,
  desktopUA: true,
  noZoom: true,
  scale: 100,
  pageZoom: 0
};

let lastUAState = null;
let desktopUAEnabled = true;

function storageGet(defaults) {
  return new Promise((resolve) => {
    try {
      const res = api.storage.local.get(defaults, (d) => resolve(d || defaults));
      if (res && typeof res.then === 'function') {
        res.then((d) => resolve(d || defaults), () => resolve(defaults));
      }
    } catch (e) {
      resolve(defaults);
    }
  });
}

function queryTabs(queryInfo) {
  return new Promise((resolve) => {
    try {
      const res = api.tabs.query(queryInfo, (tabs) => resolve(tabs || []));
      if (res && typeof res.then === 'function') {
        res.then((tabs) => resolve(tabs || []), () => resolve([]));
      }
    } catch (e) {
      resolve([]);
    }
  });
}

async function getConfig() {
  return storageGet(DEFAULTS);
}

// Firefox Android (Manifest V2): ubah header User-Agent lewat webRequest blocking agar Spotify Web Desktop + Widevine berjalan penuh
if (api.webRequest && api.webRequest.onBeforeSendHeaders) {
  try {
    api.webRequest.onBeforeSendHeaders.addListener(
      (details) => {
        if (!desktopUAEnabled || !details.requestHeaders) return {};
        const headers = details.requestHeaders.filter((h) => {
          const n = (h.name || '').toLowerCase();
          return n !== 'user-agent' && n !== 'sec-ch-ua-mobile' && n !== 'sec-ch-ua-platform';
        });
        headers.push({ name: 'User-Agent', value: DESKTOP_UA });
        return { requestHeaders: headers };
      },
      { urls: ['https://open.spotify.com/*'] },
      ['blocking', 'requestHeaders']
    );
  } catch (e) {}
}

async function syncUARule(enabled) {
  const want = Boolean(enabled);
  desktopUAEnabled = want;
  if (lastUAState === want) return;
  if (!api.declarativeNetRequest || !api.declarativeNetRequest.updateDynamicRules) {
    lastUAState = want;
    return;
  }
  try {
    const addRules = want ? [{
      id: RULE_ID,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'User-Agent', operation: 'set', value: DESKTOP_UA },
          { header: 'Sec-CH-UA-Mobile', operation: 'set', value: '?0' },
          { header: 'Sec-CH-UA-Platform', operation: 'set', value: '"Windows"' }
        ]
      },
      condition: {
        urlFilter: '||open.spotify.com^',
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'other']
      }
    }] : [];
    await api.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID],
      addRules
    });
    lastUAState = want;
  } catch (e) {}
}

function isSpotify(url) {
  return typeof url === 'string' && /^https:\/\/open\.spotify\.com(\/|$|\?)/i.test(url);
}

async function applyTabZoom(tabId, url, cfg, forceReset) {
  if (!isSpotify(url) || !api.tabs || !api.tabs.getZoom || !api.tabs.setZoom) return;
  const target = (cfg.enabled && cfg.pageZoom >= 50) ? (cfg.pageZoom / 100) : (forceReset ? 1.0 : 0);
  if (!target) return;
  try {
    if (api.tabs.setZoomSettings) {
      await api.tabs.setZoomSettings(tabId, { mode: 'automatic', scope: 'per-origin' });
    }
  } catch (e) {}
  try {
    const cur = await api.tabs.getZoom(tabId);
    if (Math.abs(cur - target) > 0.02) {
      await api.tabs.setZoom(tabId, target);
    }
  } catch (e) {}
}

async function applyAll(reloadTabs, forceResetZoom) {
  const cfg = await getConfig();
  await syncUARule(cfg.desktopUA);
  try {
    const tabs = await queryTabs({ url: 'https://open.spotify.com/*' });
    for (const tab of tabs) {
      if (tab.id == null) continue;
      await applyTabZoom(tab.id, tab.url, cfg, forceResetZoom);
      if (reloadTabs) api.tabs.reload(tab.id);
    }
  } catch (e) {}
}

if (api.runtime && api.runtime.onInstalled) {
  api.runtime.onInstalled.addListener(() => applyAll(false, false));
}
if (api.runtime && api.runtime.onStartup) {
  api.runtime.onStartup.addListener(() => applyAll(false, false));
}

if (api.tabs && api.tabs.onUpdated) {
  api.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const url = changeInfo.url || (tab && tab.url) || '';
    if (!isSpotify(url)) return;
    if (changeInfo.status === 'loading' || changeInfo.status === 'complete' || changeInfo.url) {
      const cfg = await getConfig();
      await applyTabZoom(tabId, url, cfg, false);
    }
  });
}

if (api.storage && api.storage.onChanged) {
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      const resetZoom = Boolean(changes.pageZoom && changes.pageZoom.newValue === 0);
      applyAll(false, resetZoom);
    }
  });
}

if (api.runtime && api.runtime.onMessage) {
  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'APPLY') {
      const p = applyAll(Boolean(msg.reload), Boolean(msg.resetZoom)).then(() => ({ ok: true }));
      if (typeof browser !== 'undefined' && browser.runtime === api.runtime) {
        return p;
      }
      p.then((res) => sendResponse(res));
      return true;
    }
  });
}

applyAll(false, false);
