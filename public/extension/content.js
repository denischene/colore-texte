(() => {
  /* ─── State ─── */
  let state = 'off'; // off | active
  let currentColorized = null; // the currently colorized element
  let originalContent = null; // innerHTML backup of currentColorized
  let inputMode = null; // 'mouse' | 'keyboard' — tracks last input method

  /* ─── Options ─── */
  let options = { colorMode: 'syllables-colored', colorScope: 'sentence', mouseMode: 'click' };

  function loadOptions() {
    browser.storage.local.get(['colorMode', 'colorScope', 'mouseMode']).then((data) => {
      options.colorMode = data.colorMode || 'syllables-colored';
      options.colorScope = data.colorScope || 'sentence';
      options.mouseMode = data.mouseMode || 'click';
    }).catch(() => {});
  }
  loadOptions();

  /* ─── Helpers ─── */
  function isActivatable(el) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'a' && el.hasAttribute('href')) return true;
    if (tag === 'button') return true;
    if (tag === 'input' && ['submit', 'button', 'reset'].includes(el.type)) return true;
    if (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') return true;
    return false;
  }

  /* ─── LireCouleur Profiles ─── */
  function getProfile() {
    const mode = options.colorMode;
    if (mode === 'syllables-separated') {
      return JSON.parse('{"name":"Syllabes séparées","params":{"novice_reader":true,"SYLLABES_LC":true},"format":{},"process":[{"function":"syllabes","separator":"·"},{"function":"phonemes","format":[{"color":"#999999","phonemes":["#","verb_3p","#_amb"]}]}]}');
    }
    if (mode === 'syllables-colored') {
      return JSON.parse('{"name":"Syllabes colorées","params":{"novice_reader":true,"SYLLABES_LC":true},"format":{},"process":[{"function":"alternsyllabes","format":[{"color":"#e53935"},{"color":"#1e88e5"}]},{"function":"phonemes","format":[{"color":"#999999","phonemes":["#","verb_3p","#_amb"]}]}]}');
    }
    if (mode === 'phonemes-colored') {
      return JSON.parse(JSON.stringify(getDefaultProfile()));
    }
    if (mode === 'custom-colors') {
      return JSON.parse(JSON.stringify(getDefaultProfile()));
    }
    return null;
  }

  function applyLireCouleur(text) {
    const profileJson = getProfile();
    if (!profileJson) return text;
    try {
      const up = new UserProfile(profileJson);
      const tempEl = document.createElement('span');
      return up.toHTML(text, tempEl);
    } catch (e) {
      console.error('J\'cOLorE LireCouleur error:', e);
      return text;
    }
  }

  /* ─── Scope: find target element ─── */
  function getScopeTarget(el) {
    const scope = options.colorScope;
    if (scope === 'all') return document.body;
    if (scope === 'paragraph') {
      return el.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, div') || el;
    }
    if (scope === 'sentence') {
      return el.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, div') || el;
    }
    // word
    return el;
  }

  function getTextTarget(el) {
    if (!el || el === document.body || el === document.documentElement) return null;
    if (el.id && el.id.startsWith('jcolore-')) return null;
    return el.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, a, span, label, button, div, blockquote, figcaption');
  }

  /* ─── DOM Manipulation ─── */
  function colorizeElement(el) {
    if (!el) return;
    // Uncolorize previous first
    uncolorize();

    const target = getScopeTarget(el);
    if (!target) return;

    originalContent = target.innerHTML;
    currentColorized = target;

    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim().length > 0) textNodes.push(node);
    }
    if (textNodes.length === 0) { currentColorized = null; originalContent = null; return; }

    for (const textNode of textNodes) {
      const processed = applyLireCouleur(textNode.textContent);
      if (processed !== textNode.textContent) {
        const span = document.createElement('span');
        span.innerHTML = processed;
        textNode.parentNode.replaceChild(span, textNode);
      }
    }
    target.classList.add('jcolore-highlighted');
  }

  function uncolorize() {
    if (currentColorized && originalContent !== null) {
      try {
        currentColorized.innerHTML = originalContent;
        currentColorized.classList.remove('jcolore-highlighted');
      } catch(e) {}
    }
    currentColorized = null;
    originalContent = null;
  }

  /* ─── State Management ─── */
  function setState(newState) {
    state = newState;
    document.body.classList.remove('jcolore-active');

    if (state === 'off') {
      uncolorize();
      inputMode = null;
      sessionStorage.removeItem('jcolore_active');
      browser.runtime.sendMessage({ type: 'colore_off' }).catch(() => {});
    } else if (state === 'active') {
      document.body.classList.add('jcolore-active');
      sessionStorage.setItem('jcolore_active', '1');
      browser.runtime.sendMessage({ type: 'colore_active' }).catch(() => {});
    }
  }

  function toggle() {
    setState(state === 'off' ? 'active' : 'off');
  }

  /* ─── Mouse Handling ─── */
  function handleMouseMove(e) {
    if (state !== 'active') return;
    if (options.mouseMode !== 'hover') return;
    inputMode = 'mouse';

    const target = getTextTarget(e.target);
    if (!target) return;

    const scopeTarget = getScopeTarget(target);
    if (scopeTarget === currentColorized) return; // already colored

    colorizeElement(target);
  }

  function handleMouseClick(e) {
    if (state !== 'active') return;
    inputMode = 'mouse';

    const target = getTextTarget(e.target);
    if (!target) return;

    const scopeTarget = getScopeTarget(target);

    // If clicking the already-colorized element and it's activatable => activate
    if (currentColorized && scopeTarget === currentColorized && isActivatable(target)) {
      // Second click activates
      uncolorize();
      setTimeout(() => target.click(), 0);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (options.mouseMode === 'click') {
      e.preventDefault();
      e.stopPropagation();
      colorizeElement(target);
    }
    // In hover mode, click on activatable just activates after color is already applied
  }

  /* ─── Right-click to return off ─── */
  function handleContextMenu(e) {
    if (state === 'active') {
      e.preventDefault();
      e.stopPropagation();
      setState('off');
    }
  }

  /* ─── Keyboard Handling ─── */
  function handleKeyDown(e) {
    if (state === 'off') return;

    if (e.key === 'Escape') {
      setState('off');
      e.preventDefault();
      return;
    }

    if (e.key === 'Tab') {
      // Switching to keyboard mode
      inputMode = 'keyboard';
      // On next focus, the focusin handler will colorize
    }

    if (e.key === 'Enter' && inputMode === 'keyboard') {
      const el = document.activeElement;
      if (!el || el === document.body) return;

      const target = getTextTarget(el);
      if (!target) return;

      const scopeTarget = getScopeTarget(target);

      // If already colorized and activatable, activate it
      if (currentColorized && scopeTarget === currentColorized && isActivatable(target)) {
        uncolorize();
        setTimeout(() => target.click(), 0);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Otherwise colorize
      e.preventDefault();
      e.stopPropagation();
      colorizeElement(target);
    }
  }

  /* ─── Focus Handling ─── */
  function handleFocusIn(e) {
    if (state !== 'active') return;
    if (inputMode !== 'keyboard') return;

    const el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.id && el.id.startsWith('jcolore-')) return;

    const target = getTextTarget(el);
    if (target) colorizeElement(target);
  }

  /* ─── When mouse moves after keyboard, switch mode ─── */
  function handleMouseMoveSwitch(e) {
    if (state !== 'active') return;
    if (inputMode === 'keyboard') {
      inputMode = 'mouse';
      // Don't uncolorize here; the next click/hover will handle it
    }
  }

  /* ─── Message Handling ─── */
  browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggle_colore') toggle();
    if (msg.type === 'start_pending' && state === 'off') setState('active');
    if (msg.type === 'options_changed') {
      options = { ...options, ...msg.options };
    }
    return false;
  });

  browser.storage.onChanged.addListener((changes) => {
    if (changes.colorMode) options.colorMode = changes.colorMode.newValue || 'syllables-colored';
    if (changes.colorScope) options.colorScope = changes.colorScope.newValue || 'sentence';
    if (changes.mouseMode) options.mouseMode = changes.mouseMode.newValue || 'click';
  });

  /* ─── Event Listeners ─── */
  document.addEventListener('focusin', handleFocusIn, true);
  document.addEventListener('click', handleMouseClick, true);
  document.addEventListener('mouseover', handleMouseMove, true);
  document.addEventListener('mousemove', handleMouseMoveSwitch, true);
  document.addEventListener('contextmenu', handleContextMenu, true);
  document.addEventListener('keydown', handleKeyDown, true);

  /* ─── Init ─── */
  const saved = sessionStorage.getItem('jcolore_active');
  if (saved === '1') setState('active');
})();

/* ─── Default Profile ─── */
function getDefaultProfile() {
  return JSON.parse('{"name":"Syllabes séparées","params":{"novice_reader":true,"SYLLABES_LC":true},"format":{},"process":[{"function":"syllabes","separator":"·"},{"function":"phonemes","format":[{"color":"#999999","phonemes":["#","verb_3p","#_amb"]}]}]}');
}
