(() => {
  /* ─── State ─── */
  let state = 'off'; // off | pending | focus-active | mouse-active
  let pendingIcon = null;
  let cursorRing = null;
  let currentFocusEl = null;
  let colorizedElements = new Set();
  let originalContents = new Map();

  /* ─── Options ─── */
  let options = { colorMode: 'syllables-separated', colorScope: 'word' };

  function loadOptions() {
    browser.storage.local.get(['colorMode', 'colorScope']).then((data) => {
      options.colorMode = data.colorMode || 'syllables-separated';
      options.colorScope = data.colorScope || 'word';
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

  function activateElement(el) {
    if (el) el.click();
  }

  /* ─── LireCouleur Profiles ─── */
  function getProfile() {
    const mode = options.colorMode;
    if (mode === 'none') return null;

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
      const html = up.toHTML(text, tempEl);
      return html;
    } catch (e) {
      console.error('Colore Texte LireCouleur error:', e);
      return text;
    }
  }

  /* ─── Scope: find target elements ─── */
  function getScopeTargets(el) {
    const scope = options.colorScope;
    if (scope === 'all') {
      return Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dt, dd'));
    }
    if (scope === 'paragraph') {
      const p = el.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, div');
      return p ? [p] : [el];
    }
    if (scope === 'sentence') {
      // For sentence scope, we colorize the parent element (paragraph-like) containing the target
      const p = el.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, div');
      return p ? [p] : [el];
    }
    // word scope: colorize the closest text element
    return [el];
  }

  function getTextTarget(el) {
    if (!el || el === document.body || el === document.documentElement) return null;
    if (el.id && el.id.startsWith('colore-')) return null;
    return el.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, a, span, label, button, div, blockquote, figcaption');
  }

  /* ─── DOM Manipulation ─── */
  function colorizeElement(el) {
    if (!el || originalContents.has(el)) return;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim().length > 0) {
        textNodes.push(node);
      }
    }

    if (textNodes.length === 0) return;
    originalContents.set(el, el.innerHTML);

    for (const textNode of textNodes) {
      const processed = applyLireCouleur(textNode.textContent);
      if (processed !== textNode.textContent) {
        const span = document.createElement('span');
        span.innerHTML = processed;
        textNode.parentNode.replaceChild(span, textNode);
      }
    }

    el.classList.add('colore-highlighted');
    colorizedElements.add(el);
  }

  function colorizeTargets(el) {
    const targets = getScopeTargets(el);
    for (const t of targets) {
      colorizeElement(t);
    }
  }

  function uncolorizeElement(el) {
    if (!el || !originalContents.has(el)) return;
    el.innerHTML = originalContents.get(el);
    originalContents.delete(el);
    el.classList.remove('colore-highlighted');
    colorizedElements.delete(el);
  }

  function uncolorizeAll() {
    for (const [el] of originalContents) {
      try {
        el.innerHTML = originalContents.get(el);
        el.classList.remove('colore-highlighted');
      } catch(e) {}
    }
    originalContents.clear();
    colorizedElements.clear();
  }

  /* ─── Pending Icon ─── */
  function createPendingIcon() {
    if (pendingIcon) return;
    pendingIcon = document.createElement('div');
    pendingIcon.id = 'colore-pending-icon';
    pendingIcon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <text x="6" y="18" font-size="18" font-weight="bold" fill="#e65100" font-family="system-ui">O</text>
    </svg>`;
    document.documentElement.appendChild(pendingIcon);
  }

  function createCursorRing() {
    if (cursorRing) return;
    cursorRing = document.createElement('div');
    cursorRing.id = 'colore-cursor-ring';
    document.documentElement.appendChild(cursorRing);
  }

  function positionPendingIcon(el) {
    if (!pendingIcon || !el) return;
    const rect = el.getBoundingClientRect();
    pendingIcon.style.left = (rect.left + rect.width / 2) + 'px';
    pendingIcon.style.top = (rect.top - 28) + 'px';
    pendingIcon.style.display = 'block';
  }

  function hidePendingIcon() {
    if (pendingIcon) pendingIcon.style.display = 'none';
  }

  /* ─── Transition Animation ─── */
  function showTransitionRing(el, callback) {
    createCursorRing();
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    cursorRing.style.left = cx + 'px';
    cursorRing.style.top = cy + 'px';
    cursorRing.style.display = 'block';
    cursorRing.style.opacity = '1';
    setTimeout(() => {
      cursorRing.style.opacity = '0';
      setTimeout(() => {
        cursorRing.style.display = 'none';
        if (callback) callback();
      }, 600);
    }, 1400);
  }

  /* ─── State Management ─── */
  function setState(newState) {
    state = newState;
    document.body.classList.remove('colore-pending');

    if (state === 'off') {
      uncolorizeAll();
      hidePendingIcon();
      sessionStorage.removeItem('colore_active');
      browser.runtime.sendMessage({ type: 'colore_off' }).catch(() => {});
    } else if (state === 'pending') {
      document.body.classList.add('colore-pending');
      uncolorizeAll();
      createPendingIcon();
      sessionStorage.setItem('colore_active', 'pending');
      browser.runtime.sendMessage({ type: 'colore_active' }).catch(() => {});
    } else if (state === 'focus-active') {
      sessionStorage.setItem('colore_active', 'focus');
      browser.runtime.sendMessage({ type: 'colore_active' }).catch(() => {});
      hidePendingIcon();
    } else if (state === 'mouse-active') {
      sessionStorage.setItem('colore_active', 'mouse');
      browser.runtime.sendMessage({ type: 'colore_active' }).catch(() => {});
      hidePendingIcon();
    }
  }

  function toggle() {
    setState(state === 'off' ? 'pending' : 'off');
  }

  /* ─── Focus Mode (Keyboard) ─── */
  function handleFocusIn(e) {
    if (state !== 'pending' && state !== 'focus-active') return;
    const el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.id && el.id.startsWith('colore-')) return;

    if (state === 'pending') {
      positionPendingIcon(el);
      currentFocusEl = el;
      return;
    }
    currentFocusEl = el;
  }

  function handleFocusOut() {
    if (state === 'pending') hidePendingIcon();
  }

  /* ─── Mouse Mode ─── */
  function handleMouseClick(e) {
    if (state === 'pending') {
      e.preventDefault();
      e.stopPropagation();
      setState('mouse-active');
      return;
    }

    if (state !== 'mouse-active') return;

    const target = getTextTarget(e.target);
    if (!target) return;

    if (colorizedElements.has(target)) {
      if (isActivatable(target)) {
        uncolorizeElement(target);
        setTimeout(() => activateElement(target), 0);
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    colorizeTargets(target);
  }

  /* ─── Right-click to return to pending ─── */
  function handleContextMenu(e) {
    if (state === 'mouse-active' || state === 'focus-active') {
      e.preventDefault();
      e.stopPropagation();
      setState('pending');
    }
  }

  /* ─── Keyboard Handling ─── */
  function handleKeyDown(e) {
    if (state === 'off') return;

    if (e.key === 'Escape') {
      if (state === 'focus-active' || state === 'mouse-active') {
        if (state === 'focus-active' && currentFocusEl) {
          showTransitionRing(currentFocusEl, () => {});
        }
        setState('pending');
      } else if (state === 'pending') {
        setState('off');
      }
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter' && state === 'pending') {
      e.preventDefault();
      e.stopPropagation();
      setState('focus-active');
      if (currentFocusEl) colorizeTargets(currentFocusEl);
      return;
    }

    if (e.key === 'Enter' && state === 'focus-active') {
      if (!currentFocusEl) return;
      if (colorizedElements.has(currentFocusEl)) {
        if (isActivatable(currentFocusEl)) {
          e.preventDefault();
          e.stopPropagation();
          uncolorizeElement(currentFocusEl);
          setTimeout(() => activateElement(currentFocusEl), 0);
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      colorizeTargets(currentFocusEl);
    }
  }

  /* ─── Message Handling ─── */
  browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggle_colore') toggle();
    if (msg.type === 'start_pending' && state === 'off') setState('pending');
    if (msg.type === 'options_changed') {
      options = msg.options;
    }
    return false;
  });

  browser.storage.onChanged.addListener((changes) => {
    if (changes.colorMode) options.colorMode = changes.colorMode.newValue || 'syllables-separated';
    if (changes.colorScope) options.colorScope = changes.colorScope.newValue || 'word';
  });

  /* ─── Event Listeners ─── */
  document.addEventListener('focusin', handleFocusIn, true);
  document.addEventListener('focusout', handleFocusOut, true);
  document.addEventListener('click', handleMouseClick, true);
  document.addEventListener('contextmenu', handleContextMenu, true);
  document.addEventListener('keydown', handleKeyDown, true);

  /* ─── Init ─── */
  const saved = sessionStorage.getItem('colore_active');
  if (saved === 'pending' || saved === 'focus' || saved === 'mouse') {
    setState('pending');
  }
})();
