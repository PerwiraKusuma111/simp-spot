const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const RULE_ID = 101;
const DEFAULTS = {
  enabled: true,
  desktopUA: true,
  noZoom: true,
  scale: 100,
  pageZoom: 0
};

let lastUAState = null;

async function getConfig() {
  return chrome.storage.local.get(DEFAULTS);
}

async function syncUARule(enabled) {
  const want = Boolean(enabled);
  if (lastUAState === want) return;
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
    await chrome.declarativeNetRequest.updateDynamicRules({
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
  if (!isSpotify(url)) return;
  const target = (cfg.enabled && cfg.pageZoom >= 50) ? (cfg.pageZoom / 100) : (forceReset ? 1.0 : 0);
  if (!target) return;
  try {
    if (chrome.tabs.setZoomSettings) {
      await chrome.tabs.setZoomSettings(tabId, { mode: 'automatic', scope: 'per-origin' });
    }
  } catch (e) {}
  try {
    const cur = await chrome.tabs.getZoom(tabId);
    if (Math.abs(cur - target) > 0.02) {
      await chrome.tabs.setZoom(tabId, target);
    }
  } catch (e) {}
}

async function applyAll(reloadTabs, forceResetZoom) {
  const cfg = await getConfig();
  await syncUARule(cfg.desktopUA);
  try {
    const tabs = await chrome.tabs.query({ url: 'https://open.spotify.com/*' });
    for (const tab of tabs) {
      if (tab.id == null) continue;
      await applyTabZoom(tab.id, tab.url, cfg, forceResetZoom);
      if (reloadTabs) chrome.tabs.reload(tab.id);
    }
  } catch (e) {}
}

chrome.runtime.onInstalled.addListener(() => applyAll(false, false));
chrome.runtime.onStartup.addListener(() => applyAll(false, false));

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = changeInfo.url || (tab && tab.url) || '';
  if (!isSpotify(url)) return;
  if (changeInfo.status === 'loading' || changeInfo.status === 'complete' || changeInfo.url) {
    const cfg = await getConfig();
    await applyTabZoom(tabId, url, cfg, false);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    const resetZoom = Boolean(changes.pageZoom && changes.pageZoom.newValue === 0);
    applyAll(false, resetZoom);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'APPLY') {
    applyAll(Boolean(msg.reload), Boolean(msg.resetZoom)).then(() => sendResponse({ ok: true }));
    return true;
  }
});
