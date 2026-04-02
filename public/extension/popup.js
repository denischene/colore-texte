// Load saved options
browser.storage.local.get(['colorMode', 'colorScope', 'mouseMode', 'fontFamily']).then((data) => {
  const mode = data.colorMode || 'syllables-colored';
  const scope = data.colorScope || 'sentence';
  const mouse = data.mouseMode || 'click';
  const font = data.fontFamily || 'none';
  const modeEl = document.querySelector(`input[name="colorMode"][value="${mode}"]`);
  const scopeEl = document.querySelector(`input[name="colorScope"][value="${scope}"]`);
  const mouseEl = document.querySelector(`input[name="mouseMode"][value="${mouse}"]`);
  const fontEl = document.querySelector(`input[name="fontFamily"][value="${font}"]`);
  if (modeEl) modeEl.checked = true;
  if (scopeEl) scopeEl.checked = true;
  if (mouseEl) mouseEl.checked = true;
  if (fontEl) fontEl.checked = true;
});

function saveOptions() {
  const mode = document.querySelector('input[name="colorMode"]:checked');
  const scope = document.querySelector('input[name="colorScope"]:checked');
  const mouse = document.querySelector('input[name="mouseMode"]:checked');
  const font = document.querySelector('input[name="fontFamily"]:checked');
  const opts = {
    colorMode: mode ? mode.value : 'syllables-colored',
    colorScope: scope ? scope.value : 'sentence',
    mouseMode: mouse ? mouse.value : 'click',
    fontFamily: font ? font.value : 'none'
  };
  browser.storage.local.set(opts).then(() => {
    browser.runtime.sendMessage({ type: 'options_changed', options: opts }).catch(() => {});
  });
}

document.querySelectorAll('input[name="colorMode"]').forEach(el => el.addEventListener('change', saveOptions));
document.querySelectorAll('input[name="colorScope"]').forEach(el => el.addEventListener('change', saveOptions));
document.querySelectorAll('input[name="mouseMode"]').forEach(el => el.addEventListener('change', saveOptions));
document.querySelectorAll('input[name="fontFamily"]').forEach(el => el.addEventListener('change', saveOptions));

// Check current state and update button
const btn = document.getElementById('activate-btn');

function updateButtonState() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { type: 'get_state' }).then((response) => {
        if (response && response.state === 'active') {
          btn.textContent = 'Désactiver';
          btn.classList.add('active-state');
        } else {
          btn.textContent = 'Activer';
          btn.classList.remove('active-state');
        }
      }).catch(() => {
        btn.textContent = 'Activer';
        btn.classList.remove('active-state');
      });
    }
  });
}

updateButtonState();

btn.addEventListener('click', () => {
  saveOptions();
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { type: 'toggle_colore' }).catch(() => {});
    }
  });
  window.close();
});
