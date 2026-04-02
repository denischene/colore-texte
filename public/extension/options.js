const savedMsg = document.getElementById('saved-msg');

browser.storage.local.get(['colorMode', 'colorScope', 'mouseMode']).then((data) => {
  const mode = data.colorMode || 'syllables-colored';
  const scope = data.colorScope || 'sentence';
  const mouse = data.mouseMode || 'click';
  const modeEl = document.querySelector(`input[name="colorMode"][value="${mode}"]`);
  const scopeEl = document.querySelector(`input[name="colorScope"][value="${scope}"]`);
  const mouseEl = document.querySelector(`input[name="mouseMode"][value="${mouse}"]`);
  if (modeEl) modeEl.checked = true;
  if (scopeEl) scopeEl.checked = true;
  if (mouseEl) mouseEl.checked = true;
});

function save() {
  const mode = document.querySelector('input[name="colorMode"]:checked');
  const scope = document.querySelector('input[name="colorScope"]:checked');
  const mouse = document.querySelector('input[name="mouseMode"]:checked');
  const opts = {
    colorMode: mode ? mode.value : 'syllables-colored',
    colorScope: scope ? scope.value : 'sentence',
    mouseMode: mouse ? mouse.value : 'click'
  };
  browser.storage.local.set(opts).then(() => {
    savedMsg.classList.add('show');
    setTimeout(() => savedMsg.classList.remove('show'), 1500);
    browser.runtime.sendMessage({ type: 'options_changed', options: opts }).catch(() => {});
  });
}

document.querySelectorAll('input[name="colorMode"]').forEach(el => el.addEventListener('change', save));
document.querySelectorAll('input[name="colorScope"]').forEach(el => el.addEventListener('change', save));
document.querySelectorAll('input[name="mouseMode"]').forEach(el => el.addEventListener('change', save));
