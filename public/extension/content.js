(() => {
  /* ─── State ─── */
  let state = 'off'; // off | pending | focus-active | mouse-active
  let pendingIcon = null;
  let cursorRing = null;
  let currentFocusEl = null;
  let colorizedElements = new Set();
  let originalContents = new Map();

  /* ─── Helpers ─── */
  function isActivatable(el) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'a' && el.hasAttribute('href')) return true;
    if (tag === 'button') return true;
    if (tag === 'input' && ['submit', 'button', 'reset'].includes(el.type)) return true;
    if (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') return true;
    if (el.hasAttribute('onclick') || el.hasAttribute('tabindex')) return false; // tabindex alone doesn't make activatable
    return false;
  }

  function activateElement(el) {
    if (!el) return;
    // Temporarily remove colore state so the real click/navigation fires
    el.click();
  }

  /* ─── Syllable Splitting (French heuristic) ─── */
  const VOWELS = 'aeiouyàâäéèêëïîôùûüœæAEIOUYÀÂÄÉÈÊËÏÎÔÙÛÜŒÆ';

  function isVowel(ch) {
    return VOWELS.includes(ch);
  }

  function splitSyllables(word) {
    if (word.length <= 2) return [word];
    const syllables = [];
    let current = '';

    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      current += ch;

      if (i === word.length - 1) {
        if (syllables.length > 0 && current.length === 1 && !isVowel(ch)) {
          syllables[syllables.length - 1] += current;
        } else {
          syllables.push(current);
        }
        current = '';
        continue;
      }

      const next = word[i + 1];

      if (isVowel(ch) && !isVowel(next) && i + 2 < word.length && isVowel(word[i + 2])) {
        syllables.push(current);
        current = '';
        continue;
      }

      if (!isVowel(ch) && !isVowel(next) && current.length > 1) {
        const clusters = ['bl', 'br', 'ch', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr',
                          'ph', 'pl', 'pr', 'qu', 'sc', 'sk', 'sl', 'sm', 'sn', 'sp',
                          'st', 'sw', 'th', 'tr', 'vr', 'wr'];
        const pair = (ch + next).toLowerCase();
        if (!clusters.includes(pair)) {
          syllables.push(current);
          current = '';
          continue;
        }
      }
    }

    if (current) {
      if (syllables.length > 0 && current.length === 1) {
        syllables[syllables.length - 1] += current;
      } else {
        syllables.push(current);
      }
    }

    const merged = [];
    for (const s of syllables) {
      if (merged.length > 0 && s.length === 1 && !isVowel(s)) {
        merged[merged.length - 1] += s;
      } else {
        merged.push(s);
      }
    }

    return merged.length > 0 ? merged : [word];
  }

  function syllabifyText(text) {
    const tokens = text.split(/(\s+|[.,;:!?'"()\[\]{}<>\/\\—–\-…«»""]+)/);
    return tokens.map(token => {
      if (!token || /^[\s.,;:!?'"()\[\]{}<>\/\\—–\-…«»""]+$/.test(token)) {
        return token;
      }
      const syllables = splitSyllables(token);
      if (syllables.length <= 1) return token;
      return syllables.join('<span class="colore-syllable-dot">·</span>');
    }).join('');
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
      const syllabified = syllabifyText(textNode.textContent);
      if (syllabified !== textNode.textContent) {
        const span = document.createElement('span');
        span.innerHTML = syllabified;
        textNode.parentNode.replaceChild(span, textNode);
      }
    }

    el.classList.add('colore-highlighted');
    colorizedElements.add(el);
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
      <text x="4" y="18" font-size="16" font-weight="bold" fill="#e65100" font-family="system-ui">A</text>
      <text x="14" y="18" font-size="12" fill="#e65100" font-family="system-ui">·</text>
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
    if (state === 'off') {
      setState('pending');
    } else {
      setState('off');
    }
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

    // focus-active: track the focused element but don't auto-colorize
    currentFocusEl = el;
  }

  function handleFocusOut(e) {
    if (state === 'pending') {
      hidePendingIcon();
    }
  }

  /* ─── Mouse Mode ─── */
  function getTextTarget(el) {
    if (!el || el === document.body || el === document.documentElement) return null;
    if (el.id && el.id.startsWith('colore-')) return null;
    return el.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, a, span, label, button, div');
  }

  function handleMouseClick(e) {
    if (state === 'pending') {
      // First click in pending → switch to mouse-active mode
      e.preventDefault();
      e.stopPropagation();
      setState('mouse-active');
      return;
    }

    if (state !== 'mouse-active') return;

    const target = getTextTarget(e.target);
    if (!target) return;

    if (colorizedElements.has(target)) {
      // Already colorized: if activatable, activate it
      if (isActivatable(target)) {
        // Let the click go through naturally by not preventing
        // But we need to uncolorize first to restore original DOM
        uncolorizeElement(target);
        // Don't prevent — the click will fire on the restored element
        // We need to re-trigger since we caught this one
        setTimeout(() => activateElement(target), 0);
      }
      // If not activatable, do nothing (stays colorized)
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Not yet colorized: colorize it
    e.preventDefault();
    e.stopPropagation();
    colorizeElement(target);
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
      if (currentFocusEl) {
        colorizeElement(currentFocusEl);
      }
      return;
    }

    if (e.key === 'Enter' && state === 'focus-active') {
      if (!currentFocusEl) return;

      if (colorizedElements.has(currentFocusEl)) {
        // Already colorized
        if (isActivatable(currentFocusEl)) {
          // Activate it: restore DOM then trigger
          e.preventDefault();
          e.stopPropagation();
          uncolorizeElement(currentFocusEl);
          setTimeout(() => activateElement(currentFocusEl), 0);
        }
        // If not activatable, let Enter do nothing special
        return;
      }

      // Not yet colorized: colorize it
      e.preventDefault();
      e.stopPropagation();
      colorizeElement(currentFocusEl);
      return;
    }
  }

  /* ─── Message Handling ─── */
  browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggle_colore') {
      toggle();
    }
    if (msg.type === 'start_pending') {
      if (state === 'off') setState('pending');
    }
    return false;
  });

  /* ─── Event Listeners ─── */
  document.addEventListener('focusin', handleFocusIn, true);
  document.addEventListener('focusout', handleFocusOut, true);
  document.addEventListener('click', handleMouseClick, true);
  document.addEventListener('keydown', handleKeyDown, true);

  /* ─── Init: Restore state from sessionStorage ─── */
  const saved = sessionStorage.getItem('colore_active');
  if (saved === 'pending' || saved === 'focus' || saved === 'mouse') {
    setState('pending');
  }
})();
