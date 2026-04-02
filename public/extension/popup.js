// Load saved options
browser.storage.local.get(['colorMode', 'colorScope']).then((data) => {
  const mode = data.colorMode || 'syllables-colored';
  const scope = data.colorScope || 'sentence';
  const modeEl = document.querySelector(`input[name="colorMode"][value="${mode}"]`);
  const scopeEl = document.querySelector(`input[name="colorScope"][value="${scope}"]`);
  if (modeEl) modeEl.checked = true;
  if (scopeEl) scopeEl.checked = true;
});

function saveOptions() {
  const mode = document.querySelector('input[name="colorMode"]:checked');
  const scope = document.querySelector('input[name="colorScope"]:checked');
  const opts = {
    colorMode: mode ? mode.value : 'syllables-colored',
    colorScope: scope ? scope.value : 'sentence'
  };
  browser.storage.local.set(opts).then(() => {
    browser.runtime.sendMessage({ type: 'options_changed', options: opts }).catch(() => {});
  });
}

document.querySelectorAll('input[name="colorMode"]').forEach(el => el.addEventListener('change', saveOptions));
document.querySelectorAll('input[name="colorScope"]').forEach(el => el.addEventListener('change', saveOptions));

document.getElementById('activate-btn').addEventListener('click', () => {
  saveOptions();
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { type: 'toggle_colore' }).catch(() => {});
    }
  });
  window.close();
});
