// Options page logic
const optCapitalize = document.getElementById('opt-capitalize');
const optUppercase = document.getElementById('opt-uppercase');
const optVowels = document.getElementById('opt-vowels');
const savedMsg = document.getElementById('saved-msg');

// Load saved options
browser.storage.local.get(['capitalize', 'uppercase', 'colorVowels']).then((data) => {
  optCapitalize.checked = !!data.capitalize;
  optUppercase.checked = !!data.uppercase;
  optVowels.checked = !!data.colorVowels;
});

function save() {
  // Mutually exclusive: capitalize and uppercase
  const opts = {
    capitalize: optCapitalize.checked,
    uppercase: optUppercase.checked,
    colorVowels: optVowels.checked
  };
  browser.storage.local.set(opts).then(() => {
    savedMsg.classList.add('show');
    setTimeout(() => savedMsg.classList.remove('show'), 1500);
    // Notify all tabs
    browser.runtime.sendMessage({ type: 'options_changed', options: opts }).catch(() => {});
  });
}

// Mutually exclusive toggles
optCapitalize.addEventListener('change', () => {
  if (optCapitalize.checked) optUppercase.checked = false;
  save();
});
optUppercase.addEventListener('change', () => {
  if (optUppercase.checked) optCapitalize.checked = false;
  save();
});
optVowels.addEventListener('change', save);
