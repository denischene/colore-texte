(() => {
  /* ─── State ─── */
  let state = 'off'; // off | active | pending
  let currentColorized = null;
  let inputMode = null; // 'mouse' | 'keyboard'
  let hasColorizedOnce = false; // after first Enter, Tab auto-colorizes

  /* ─── Options ─── */
  let options = { colorMode: 'syllables-colored', colorScope: 'sentence', mouseMode: 'click', fontFamily: 'none' };
  const SCOPE_ORDER = ['word', 'sentence', 'paragraph', 'all'];

  /* ─── Font injection ─── */
  let fontStyleEl = null;
  function applyFont() {
    if (!fontStyleEl) {
      fontStyleEl = document.createElement('style');
      fontStyleEl.id = 'jcolore-font-style';
      document.head.appendChild(fontStyleEl);
    }
    const font = options.fontFamily;
    if (font === 'accessible-dfa') {
      fontStyleEl.textContent = `
        @font-face { font-family: 'Accessible DfA'; src: url('${browser.runtime.getURL("fonts/AccessibleDfA-VF.ttf")}') format('truetype'); font-weight: 100 900; }
        body.jcolore-active, body.jcolore-active * { font-family: 'Accessible DfA', system-ui, sans-serif !important; }
      `;
    } else if (font === 'belle-allure') {
      fontStyleEl.textContent = `
        body.jcolore-active, body.jcolore-active * { font-family: 'Belle Allure', cursive !important; }
      `;
    } else {
      fontStyleEl.textContent = '';
    }
  }

  function loadOptions() {
    browser.storage.local.get(['colorMode', 'colorScope', 'mouseMode', 'fontFamily']).then((data) => {
      options.colorMode = data.colorMode || 'syllables-colored';
      options.colorScope = data.colorScope || 'sentence';
      options.mouseMode = data.mouseMode || 'click';
      options.fontFamily = data.fontFamily || 'none';
    }).catch(() => {});
  }
  loadOptions();

  /* ─── Helpers ─── */
  function getActivatableElement(el) {
    if (!el) return null;
    const tag = el.tagName.toLowerCase();
    if (tag === 'a' && el.hasAttribute('href')) return el;
    if (tag === 'button') return el;
    if (tag === 'input' && ['submit', 'button', 'reset'].includes(el.type)) return el;
    if (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') return el;
    // Walk up to find activatable ancestor (handles link-clickarea__link etc.)
    const ancestor = el.closest('a[href], button, [role="button"], [role="link"], input[type="submit"], input[type="button"]');
    if (ancestor) return ancestor;
    return null;
  }

  /* ─── Scope labels ─── */
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
    if (scope === 'paragraph' || scope === 'sentence') {
      return el.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, div') || el;
    }
    return el; // word
  }

  function getTextTarget(el) {
    if (!el || el === document.body || el === document.documentElement) return null;
    if (el.id && el.id.startsWith('jcolore-')) return null;
    return el.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, a, span, label, button, div, blockquote, figcaption');
  }

  /* ─── DOM Manipulation (surgical – preserves focusable elements) ─── */
  function colorizeElement(el) {
    if (!el) return;
    uncolorize();

    const target = getScopeTarget(el);
    if (!target) return;
    currentColorized = target;

    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim().length > 0) textNodes.push(node);
    }
    if (textNodes.length === 0) { currentColorized = null; return; }

    for (const textNode of textNodes) {
      const processed = applyLireCouleur(textNode.textContent);
      if (processed !== textNode.textContent) {
        const span = document.createElement('span');
        span.className = 'jcolore-inserted';
        span.setAttribute('data-jcolore-original', textNode.textContent);
        span.innerHTML = processed;
        textNode.parentNode.replaceChild(span, textNode);
      }
    }
    target.classList.add('jcolore-highlighted');
  }

  function uncolorize() {
    if (!currentColorized) return;
    try {
      const inserted = currentColorized.querySelectorAll('.jcolore-inserted');
      for (const span of inserted) {
        const text = document.createTextNode(span.getAttribute('data-jcolore-original') || span.textContent);
        span.parentNode.replaceChild(text, span);
      }
      currentColorized.classList.remove('jcolore-highlighted');
      currentColorized.normalize();
    } catch(e) {}
    currentColorized = null;
  }

  /* ─── State Management ─── */
  function setState(newState) {
    state = newState;
    document.body.classList.remove('jcolore-active');

    if (state === 'off') {
      uncolorize();
      inputMode = null;
      hasColorizedOnce = false;
      if (fontStyleEl) fontStyleEl.textContent = '';
      sessionStorage.removeItem('jcolore_active');
      browser.runtime.sendMessage({ type: 'colore_off' }).catch(() => {});
    } else if (state === 'active') {
      document.body.classList.add('jcolore-active');
      applyFont();
      sessionStorage.setItem('jcolore_active', '1');
      browser.runtime.sendMessage({ type: 'colore_active' }).catch(() => {});
    } else if (state === 'pending') {
      document.body.classList.add('jcolore-active'); // keep J cursor
      uncolorize();
      applyFont();
      sessionStorage.setItem('jcolore_active', 'pending');
      browser.runtime.sendMessage({ type: 'colore_pending' }).catch(() => {});
    }
  }

  function toggle() {
    if (state === 'off') setState('active');
    else setState('off');
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
    if (state === 'pending') {
      // Resume active on left click
      setState('active');
      inputMode = 'mouse';
      const target = getTextTarget(e.target);
      if (target) {
        if (options.mouseMode === 'hover') {
          colorizeElement(target);
        } else {
          e.preventDefault();
          e.stopPropagation();
          colorizeElement(target);
        }
      }
      return;
    }

    if (state !== 'active') return;
    inputMode = 'mouse';

    const target = getTextTarget(e.target);
    if (!target) return;
    const scopeTarget = getScopeTarget(target);

    if (options.mouseMode === 'hover') {
      // Hover mode: elements already colorized on hover
      // Click activates activatable elements
      if (currentColorized) {
        const activatable = getActivatableElement(e.target);
        if (activatable) {
          uncolorize();
          // Let click through to activate
          return;
        }
      }
      return;
    }

    // Click mode
    if (currentColorized && scopeTarget === currentColorized) {
      // Second click on same scope — activate if activatable
      const activatable = getActivatableElement(e.target);
      if (activatable) {
        uncolorize();
        return; // let click through
      }
      return; // not activatable, keep colorized
    }

    // First click — colorize
    e.preventDefault();
    e.stopPropagation();
    colorizeElement(target);
  }

  /* ─── Right-click → pending ─── */
  function handleContextMenu(e) {
    if (state === 'active') {
      e.preventDefault();
      e.stopPropagation();
      setState('pending');
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
      if (state === 'active') {
        setState('pending');
        e.preventDefault();
      }
      return;
    }

    if (state === 'pending') {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        setState('active');
        inputMode = 'keyboard';
        hasColorizedOnce = true;
        const el = document.activeElement;
        if (el && el !== document.body) {
          const target = getTextTarget(el);
          if (target) colorizeElement(target);
        }
      }
      if (e.key === 'Tab') {
        inputMode = 'keyboard';
        // Let tab through naturally
      }
      return;
    }

    // state === 'active'
    if (e.key === '+' || e.key === '=') { e.preventDefault(); cycleScope(1); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); cycleScope(-1); return; }

    if (e.key === 'Tab') {
      inputMode = 'keyboard';
      // Don't prevent default — let natural tab order work
      return;
    }

    if (e.key === 'Enter' && inputMode === 'keyboard') {
      const el = document.activeElement;
      if (!el || el === document.body) return;

      const target = getTextTarget(el);
      if (!target) return;

      const scopeTarget = getScopeTarget(target);

      if (currentColorized && scopeTarget === currentColorized) {
        // Already colorized — try to activate
        const activatable = getActivatableElement(el);
        if (activatable) {
          e.preventDefault();
          e.stopPropagation();
          uncolorize();
          // Explicitly activate the element after DOM restoration
          activatable.click();
        }
        return;
      }

      // First Enter — colorize
      e.preventDefault();
      e.stopPropagation();
      hasColorizedOnce = true;
      colorizeElement(target);
    }
  }

  /* ─── Focus Handling ─── */
  function handleFocusIn(e) {
    if (state !== 'active') return;
    if (inputMode !== 'keyboard') return;
    if (!hasColorizedOnce) return; // Don't auto-colorize until first Enter

    const el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.id && el.id.startsWith('jcolore-')) return;

    const target = getTextTarget(el);
    if (target) {
      requestAnimationFrame(() => {
        if (state === 'active' && inputMode === 'keyboard') {
          colorizeElement(target);
        }
      });
    }
  }

  /* ─── When mouse moves after keyboard, switch mode ─── */
  function handleMouseMoveSwitch(e) {
    if (state !== 'active' && state !== 'pending') return;
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
      if (state === 'active') applyFont();
    }
    return false;
  });

  browser.storage.onChanged.addListener((changes) => {
    if (changes.colorMode) options.colorMode = changes.colorMode.newValue || 'syllables-colored';
    if (changes.colorScope) options.colorScope = changes.colorScope.newValue || 'sentence';
    if (changes.mouseMode) options.mouseMode = changes.mouseMode.newValue || 'click';
    if (changes.fontFamily) {
      options.fontFamily = changes.fontFamily.newValue || 'none';
      if (state === 'active') applyFont();
    }
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
  else if (saved === 'pending') setState('pending');
})();

/* ─── Default Profile ─── */
function getDefaultProfile() {
  return JSON.parse('{"name":"Syllabes séparées","params":{"novice_reader":true,"SYLLABES_LC":true},"format":{},"process":[{"function":"syllabes","separator":"·"},{"function":"phonemes","format":[{"color":"#999999","phonemes":["#","verb_3p","#_amb"]}]}]}');
}
