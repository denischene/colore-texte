(() => {
  /* ─── State ─── */
  let state = 'off'; // off | active
  let currentColorized = null; // the currently colorized element
  let originalContent = null; // innerHTML backup of currentColorized
  let inputMode = null; // 'mouse' | 'keyboard' — tracks last input method

  /* ─── Options ─── */
  let options = { colorMode: 'syllables-colored', colorScope: 'sentence', mouseMode: 'click' };

  const SCOPE_ORDER = ['word', 'sentence', 'paragraph', 'all'];

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

  /* ─── Scope labels for feedback ─── */
  const SCOPE_LABELS = { word: 'Mot', sentence: 'Phrase', paragraph: 'Paragraphe', all: 'Tout' };

  /* ─── Feedback overlay ─── */
  let feedbackTimeout = null;
  function showScopeFeedback(scopeValue) {
    let fb = document.getElementById('jcolore-scope-feedback');
    if (!fb) {
      fb = document.createElement('div');
      fb.id = 'jcolore-scope-feedback';
      fb.setAttribute('aria-live', 'polite');
      fb.setAttribute('role', 'status');
      document.body.appendChild(fb);
    }
    fb.textContent = SCOPE_LABELS[scopeValue] || scopeValue;
    fb.classList.add('jcolore-feedback-visible');
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
      fb.classList.remove('jcolore-feedback-visible');
    }, 1200);
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
    if (scopeTarget === currentColorized) return;

    colorizeElement(target);
  }

  function handleMouseClick(e) {
    if (state !== 'active') return;
    inputMode = 'mouse';

    const target = getTextTarget(e.target);
    if (!target) return;

    const scopeTarget = getScopeTarget(target);

    if (currentColorized && scopeTarget === currentColorized && isActivatable(target)) {
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
  }

  /* ─── Right-click to return off ─── */
  function handleContextMenu(e) {
    if (state === 'active') {
      e.preventDefault();
      e.stopPropagation();
      setState('off');
    }
  }

  /* ─── Scope cycling with + / - ─── */
  function cycleScope(direction) {
    const idx = SCOPE_ORDER.indexOf(options.colorScope);
    let newIdx = idx + direction;
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= SCOPE_ORDER.length) newIdx = SCOPE_ORDER.length - 1;
    if (newIdx === idx) return;
    options.colorScope = SCOPE_ORDER[newIdx];
    browser.storage.local.set({ colorScope: options.colorScope }).catch(() => {});
    showScopeFeedback(options.colorScope);
    // Re-colorize current element with new scope if something was colorized
    if (currentColorized) {
      const el = currentColorized;
      uncolorize();
      colorizeElement(el);
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

    // + and - to cycle scope
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      cycleScope(1);
      return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      cycleScope(-1);
      return;
    }

    if (e.key === 'Tab') {
      inputMode = 'keyboard';
    }

    if (e.key === 'Enter' && inputMode === 'keyboard') {
      const el = document.activeElement;
      if (!el || el === document.body) return;

      const target = getTextTarget(el);
      if (!target) return;

      const scopeTarget = getScopeTarget(target);

      if (currentColorized && scopeTarget === currentColorized && isActivatable(target)) {
        uncolorize();
        setTimeout(() => target.click(), 0);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

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
    }
  }

  /* ─── Message Handling ─── */
  browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggle_colore') toggle();
    if (msg.type === 'get_state') {
      return Promise.resolve({ state: state });
    }
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
