// Track which tabs have colore active
const activeTabs = new Set();

browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'colore_active' && sender.tab) {
    activeTabs.add(sender.tab.id);
  }
  if (msg.type === 'colore_off' && sender.tab) {
    activeTabs.delete(sender.tab.id);
  }
  return false;
});

// Keyboard command
browser.commands.onCommand.addListener((command) => {
  if (command === 'toggle-colore') {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        browser.tabs.sendMessage(tabs[0].id, { type: 'toggle_colore' }).catch(() => {});
      }
    });
  }
});

// Propagate to new tabs opened from active tabs
browser.tabs.onCreated.addListener((tab) => {
  if (tab.openerTabId && activeTabs.has(tab.openerTabId)) {
    const sendPending = (attempts) => {
      browser.tabs.sendMessage(tab.id, { type: 'start_pending' }).catch(() => {
        if (attempts < 15) setTimeout(() => sendPending(attempts + 1), 300);
      });
    };
    setTimeout(() => sendPending(0), 500);
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});
