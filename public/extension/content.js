(() => {
  /* ─── State ─── */
  let state = 'off'; // off | pending | focus-active | mouse-active
  let pendingIcon = null;
  let cursorRing = null;
  let currentFocusEl = null;
  let currentMouseEl = null;
  let focusFirstEnter = true;
  let mouseFirstClick = true;
  let originalContents = new Map();

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
  }

  function uncolorizeElement(el) {
    if (!el || !originalContents.has(el)) return;
    el.innerHTML = originalContents.get(el);
    originalContents.delete(el);
    el.classList.remove('colore-highlighted', 'colore-mouse-active');
  }

  function uncolorizeAll() {
    for (const [el] of originalContents) {
      try {
        el.innerHTML = originalContents.get(el);
        el.classList.remove('colore-highlighted', 'colore-mouse-active');
      } catch(e) {}
    }
    originalContents.clear();
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
    const oldState = state;
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
      focusFirstEnter = true;
      mouseFirstClick = true;
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

  /* ─── Focus Mode ─── */
  let focusInactivityTimer = null;

  function clearFocusTimers() {
    if (focusInactivityTimer) { clearTimeout(focusInactivityTimer); focusInactivityTimer = null; }
  }

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

    clearFocusTimers();

    if (currentFocusEl && currentFocusEl !== el) {
      uncolorizeElement(currentFocusEl);
    }

    currentFocusEl = el;

    const rect = el.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => colorizeElement(el), 300);
    } else {
      colorizeElement(el);
    }

    focusInactivityTimer = setTimeout(() => {
      uncolorizeElement(el);
    }, 15000);
  }

  function handleFocusOut(e) {
    if (state === 'pending') {
      hidePendingIcon();
    }
  }

  /* ─── Mouse Mode ─── */
  let lastMouseEl = null;

  function handleMouseMove(e) {
    if (state !== 'mouse-active' && state !== 'pending') return;

    if (state === 'pending') return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.id && el.id.startsWith('colore-')) return;

    const target = el.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, a, span, label, button, div');
    if (!target) return;

    if (target === lastMouseEl) return;

    if (lastMouseEl) {
      uncolorizeElement(lastMouseEl);
    }

    lastMouseEl = target;
    colorizeElement(target);
    target.classList.add('colore-mouse-active');
  }

  function handleMouseClick(e) {
    if (state === 'pending' && mouseFirstClick) {
      e.preventDefault();
      e.stopPropagation();
      mouseFirstClick = false;
      setState('mouse-active');

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        const target = el.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, a, span, label, button, div');
        if (target) {
          lastMouseEl = target;
          colorizeElement(target);
          target.classList.add('colore-mouse-active');
        }
      }
      return;
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

    if (e.key === 'Enter' && state === 'pending' && focusFirstEnter) {
      e.preventDefault();
      e.stopPropagation();
      focusFirstEnter = false;
      setState('focus-active');
      if (currentFocusEl) {
        colorizeElement(currentFocusEl);
      }
      return;
    }

    if (e.key === 'Tab' && state === 'focus-active') {
      clearFocusTimers();
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
  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  document.addEventListener('click', handleMouseClick, true);
  document.addEventListener('keydown', handleKeyDown, true);

  /* ─── Init: Restore state from sessionStorage ─── */
  const saved = sessionStorage.getItem('colore_active');
  if (saved === 'pending' || saved === 'focus' || saved === 'mouse') {
    setState('pending');
  }
})();