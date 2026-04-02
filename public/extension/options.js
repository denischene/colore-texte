// Options page logic
const savedMsg = document.getElementById('saved-msg');

// Load saved options
browser.storage.local.get(['colorMode', 'colorScope']).then((data) => {
  const mode = data.colorMode || 'none';
  const scope = data.colorScope || 'word';
  const modeEl = document.querySelector(`input[name="colorMode"][value="${mode}"]`);
  const scopeEl = document.querySelector(`input[name="colorScope"][value="${scope}"]`);
  if (modeEl) modeEl.checked = true;
  if (scopeEl) scopeEl.checked = true;
});

function save() {
  const mode = document.querySelector('input[name="colorMode"]:checked');
  const scope = document.querySelector('input[name="colorScope"]:checked');
  const opts = {
    colorMode: mode ? mode.value : 'none',
    colorScope: scope ? scope.value : 'word'
  };
  browser.storage.local.set(opts).then(() => {
    savedMsg.classList.add('show');
    setTimeout(() => savedMsg.classList.remove('show'), 1500);
    browser.runtime.sendMessage({ type: 'options_changed', options: opts }).catch(() => {});
  });
}

document.querySelectorAll('input[name="colorMode"]').forEach(el => el.addEventListener('change', save));
document.querySelectorAll('input[name="colorScope"]').forEach(el => el.addEventListener('change', save));
