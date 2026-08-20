(function () {
  'use strict';

  const root = document.documentElement;
  const appbar = document.querySelector('.appbar');
  const bar = document.querySelector('.bar');
  const search = document.getElementById('search');
  const modal = document.getElementById('modal');
  const modalImage = document.getElementById('modal-img');
  const modalClose = document.getElementById('modal-close');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const dayLabel = (week, day) => {
    const weekName = week === 'week1' ? 'Foundation Week' : 'Week 2';
    const dayName = day === 'overview' ? 'Overview' : `Day ${day.replace('day', '')}`;
    return { weekName, dayName, full: `${weekName} · ${dayName}` };
  };

  /* Semantic and navigational scaffolding. */
  const skip = document.createElement('a');
  skip.className = 'skip-link';
  skip.href = '#reference-content';
  skip.textContent = 'Skip to reference content';
  document.body.prepend(skip);
  const main = document.querySelector('main.shell');
  if (main) main.id = 'reference-content';

  if (bar && appbar) {
    const navToggle = document.createElement('button');
    navToggle.className = 'nav-toggle';
    navToggle.type = 'button';
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open week and search navigation');

    const location = document.createElement('span');
    location.className = 'mobile-location';
    location.setAttribute('aria-live', 'polite');

    const brand = bar.querySelector('.brand');
    if (brand) brand.after(location, navToggle);
    else bar.prepend(location, navToggle);

    navToggle.addEventListener('click', () => {
      const open = appbar.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close week and search navigation' : 'Open week and search navigation');
    });

    const renderLocation = () => {
      const panel = document.querySelector('.day-panel.active');
      if (!panel) return;
      const label = dayLabel(panel.dataset.week, panel.dataset.day);
      location.textContent = label.full;
      document.title = `${label.full} — ELP 2026 Reference`;
      document.querySelectorAll('.week-btn,.day-btn').forEach((button) => {
        button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
      });
    };
    document.querySelectorAll('.week-btn,.day-btn').forEach((button) => {
      button.addEventListener('click', () => {
        requestAnimationFrame(renderLocation);
        if (window.matchMedia('(max-width:1120px)').matches) appbar.classList.remove('nav-open');
      });
    });
    window.addEventListener('hashchange', renderLocation);
    renderLocation();
  }

  document.querySelectorAll('.toc').forEach((toc) => toc.setAttribute('aria-label', 'Sections in this day'));
  document.querySelectorAll('.anchor').forEach((button) => {
    const heading = button.closest('.ref')?.querySelector('h3')?.textContent?.trim();
    button.setAttribute('aria-label', heading ? `Copy link to ${heading}` : 'Copy section link');
  });
  document.querySelectorAll('.focus-btn').forEach((button) => {
    const heading = button.closest('.ref')?.querySelector('h3')?.textContent?.trim();
    button.setAttribute('aria-label', heading ? `Focus on ${heading}` : 'Focus on this section');
  });

  /* Keep large source artifacts external and defer them until needed. */
  document.querySelectorAll('.img-card img').forEach((image) => {
    image.loading = 'lazy';
    image.decoding = 'async';
  });
  document.querySelectorAll('.story-svg').forEach((svg) => svg.setAttribute('focusable', 'false'));

  const disclaimerText = 'For reference purposes only. This publication makes no claim of ownership or authorship of the course content. All intellectual property and associated rights remain with their respective authors, presenters and owners.';
  if (main && !main.querySelector('.reference-disclaimer')) {
    const disclaimer = document.createElement('footer');
    disclaimer.className = 'reference-disclaimer';
    disclaimer.setAttribute('aria-label', 'Content disclaimer');
    disclaimer.innerHTML = `<b>Content disclaimer</b><p>${disclaimerText}</p>`;
    main.append(disclaimer);
  }

  /* Cross-reference search: Week, Day, Section, Match. */
  const results = document.createElement('section');
  results.className = 'search-results';
  results.id = 'search-results';
  results.setAttribute('aria-label', 'Search results');
  results.innerHTML = '<div class="search-results-head"><b>ELP cross-reference</b><span></span></div><div class="search-results-list" role="listbox"></div>';
  document.body.append(results);
  const resultCount = results.querySelector('.search-results-head span');
  const resultList = results.querySelector('.search-results-list');
  let activeResult = -1;
  let currentResults = [];

  const clearMarks = () => {
    document.querySelectorAll('mark.site-hit').forEach((mark) => mark.replaceWith(document.createTextNode(mark.textContent || '')));
  };
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const snippetFor = (article, query) => {
    const heading = article.querySelector('h3')?.textContent?.trim() || 'Section';
    const source = (article.dataset.search || article.innerText || '').replace(/\s+/g, ' ').trim();
    const lower = source.toLowerCase();
    const at = lower.indexOf(query.toLowerCase());
    const start = Math.max(0, at < 0 ? 0 : at - 58);
    const end = Math.min(source.length, (at < 0 ? 0 : at) + query.length + 92);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < source.length ? '…' : '';
    return { heading, text: `${prefix}${source.slice(start, end)}${suffix}` };
  };
  const highlightText = (text, query) => {
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (!query) return safe;
    return safe.replace(new RegExp(`(${escapeRegExp(query)})`, 'ig'), '<mark class="site-hit">$1</mark>');
  };
  const closeSearch = () => {
    results.classList.remove('open');
    results.setAttribute('aria-hidden', 'true');
    activeResult = -1;
  };
  const openResult = (item) => {
    clearMarks();
    const panel = item.article.closest('.day-panel');
    if (!panel) return;
    if (typeof window.show === 'function') window.show(panel.dataset.week, panel.dataset.day, false);
    closeSearch();
    if (search) search.value = '';
    requestAnimationFrame(() => {
      item.article.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      item.article.classList.add('is-focused');
      window.setTimeout(() => item.article.classList.remove('is-focused'), 1800);
    });
  };
  const renderSearch = (query) => {
    clearMarks();
    const q = query.trim();
    document.querySelectorAll('.search-item.filtered').forEach((item) => item.classList.remove('filtered'));
    const legacyNoResults = document.getElementById('no-results');
    if (legacyNoResults) legacyNoResults.classList.remove('show');
    if (q.length < 2) {
      currentResults = [];
      resultList.replaceChildren();
      closeSearch();
      return;
    }
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    currentResults = [...document.querySelectorAll('.day-panel .search-item')]
      .map((article) => {
        const haystack = `${article.dataset.search || ''} ${article.innerText || ''}`.toLowerCase();
        const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
        return { article, score, ...snippetFor(article, q) };
      })
      .filter((item) => item.score === terms.length)
      .slice(0, 36);
    resultList.replaceChildren();
    currentResults.forEach((item, index) => {
      const panel = item.article.closest('.day-panel');
      const label = dayLabel(panel.dataset.week, panel.dataset.day);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'search-result';
      button.setAttribute('role', 'option');
      button.dataset.resultIndex = String(index);
      button.style.setProperty('--day-accent', getComputedStyle(panel).getPropertyValue('--day-accent'));
      button.innerHTML = `<span class="search-result-loc">${label.weekName}<br>${label.dayName}</span><span><strong>${highlightText(item.heading, q)}</strong><small>${highlightText(item.text, q)}</small></span>`;
      button.addEventListener('click', () => openResult(item));
      resultList.append(button);
    });
    resultCount.textContent = currentResults.length ? `${currentResults.length} match${currentResults.length === 1 ? '' : 'es'} · Enter to open` : 'No matches';
    results.classList.add('open');
    results.setAttribute('aria-hidden', 'false');
    activeResult = -1;
  };

  if (search) {
    search.placeholder = 'Search the full reference…';
    search.setAttribute('aria-controls', 'search-results');
    search.setAttribute('aria-autocomplete', 'list');
    search.oninput = null;
    search.addEventListener('input', (event) => renderSearch(event.target.value));
    search.addEventListener('keydown', (event) => {
      const buttons = [...resultList.querySelectorAll('.search-result')];
      if (!buttons.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        activeResult = event.key === 'ArrowDown' ? Math.min(buttons.length - 1, activeResult + 1) : Math.max(0, activeResult - 1);
        buttons.forEach((button, index) => button.classList.toggle('active', index === activeResult));
        buttons[activeResult].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        openResult(currentResults[Math.max(0, activeResult)]);
      } else if (event.key === 'Escape') {
        closeSearch();
      }
    });
  }
  document.addEventListener('click', (event) => {
    if (!results.contains(event.target) && event.target !== search) closeSearch();
  });

  /* Accessible, zoomable original-infographic viewer. */
  if (modal && modalImage && modalClose) {
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Original infographic viewer');
    modal.setAttribute('aria-hidden', 'true');

    const viewerBar = document.createElement('div');
    viewerBar.className = 'viewer-bar';
    viewerBar.innerHTML = '<strong>Original infographic</strong><div class="viewer-actions"></div>';
    const actions = viewerBar.querySelector('.viewer-actions');
    const zoomOut = document.createElement('button');
    const reset = document.createElement('button');
    const zoomIn = document.createElement('button');
    zoomOut.type = reset.type = zoomIn.type = 'button';
    zoomOut.textContent = '−'; zoomOut.setAttribute('aria-label', 'Zoom out');
    reset.textContent = '100%'; reset.setAttribute('aria-label', 'Reset zoom');
    zoomIn.textContent = '+'; zoomIn.setAttribute('aria-label', 'Zoom in');
    modalClose.textContent = '×'; modalClose.setAttribute('aria-label', 'Close infographic viewer');
    actions.append(zoomOut, reset, zoomIn, modalClose);

    const stage = document.createElement('div');
    stage.className = 'viewer-stage';
    modalImage.before(stage);
    stage.append(modalImage);
    modal.prepend(viewerBar);

    let zoom = 1;
    let opener = null;
    const renderZoom = () => {
      modalImage.style.width = `${Math.round(100 * zoom)}%`;
      reset.textContent = `${Math.round(100 * zoom)}%`;
      zoomOut.disabled = zoom <= 0.75;
      zoomIn.disabled = zoom >= 2.5;
    };
    const setZoom = (next) => {
      zoom = Math.min(2.5, Math.max(0.75, next));
      renderZoom();
    };
    const closeViewer = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      opener?.focus();
    };
    zoomOut.addEventListener('click', () => setZoom(zoom - .25));
    zoomIn.addEventListener('click', () => setZoom(zoom + .25));
    reset.addEventListener('click', () => setZoom(1));
    modalClose.addEventListener('click', closeViewer);
    document.querySelectorAll('.img-card,.visual-slice[data-img]').forEach((button) => {
      button.addEventListener('click', () => {
        opener = button;
        zoom = 1;
        renderZoom();
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        window.setTimeout(() => modalClose.focus(), 0);
      });
    });
    modal.addEventListener('click', (event) => { if (event.target === modal) closeViewer(); });
    document.addEventListener('keydown', (event) => {
      if (!modal.classList.contains('open')) return;
      if (event.key === 'Escape') closeViewer();
      if (event.key === '+' || event.key === '=') setZoom(zoom + .25);
      if (event.key === '-') setZoom(zoom - .25);
    });
  }

  /* Progressive story semantics and direct links. */
  document.querySelectorAll('.visual-story').forEach((story, storyIndex) => {
    const tabs = [...story.querySelectorAll('.story-tab')];
    const views = [...story.querySelectorAll('.story-view')];
    tabs.forEach((tab, tabIndex) => {
      const tabId = `story-${storyIndex}-tab-${tabIndex}`;
      const view = views.find((item) => item.dataset.storyView === tab.dataset.storyTarget);
      const panelId = `story-${storyIndex}-panel-${tabIndex}`;
      tab.id = tabId;
      tab.setAttribute('aria-controls', panelId);
      if (view) {
        view.id = panelId;
        view.setAttribute('role', 'tabpanel');
        view.setAttribute('aria-labelledby', tabId);
        view.tabIndex = 0;
      }
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const current = tabs.indexOf(tab);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (current + 1) % tabs.length : (current - 1 + tabs.length) % tabs.length;
        tabs[next].focus();
        tabs[next].click();
      });
    });
  });

  /* Week 1 course-screen uplift: preserve the original infographic assets while
     translating the photographed models into legible, responsive web-native views. */
  const stressPlaceholder = document.querySelector('#w1d2-stress .mini-curve');
  if (stressPlaceholder) {
    stressPlaceholder.outerHTML = `<div class="adaptive-range" role="img" aria-label="Disequilibrium over time. Technical problems settle below the threshold of learning; work avoidance falls out of the productive range; adaptive work remains between the threshold of learning and limit of tolerance until a larger adaptive challenge.">
      <div class="adaptive-range__plot">
        <span class="adaptive-range__limit">Limit of tolerance</span>
        <span class="adaptive-range__threshold">Threshold of learning</span>
        <span class="adaptive-range__band">Productive range of stress</span>
        <svg aria-hidden="true" viewBox="0 0 900 330" preserveAspectRatio="none">
          <path class="adaptive-range__line" d="M20 284 C105 280 125 255 155 84 C175 16 250 8 285 118 C320 212 350 126 375 160 C400 205 425 104 448 155 C475 220 500 90 525 145 C550 205 578 106 610 154 C638 200 665 95 690 145 L700 285 C745 302 810 304 880 302"/>
          <path class="adaptive-range__avoid" d="M286 122 C325 224 395 245 520 235"/>
        </svg>
        <span class="adaptive-range__technical">Technical problem</span>
        <span class="adaptive-range__avoid-label">Work avoidance</span>
        <span class="adaptive-range__adaptive">Adaptive challenge</span>
        <span class="adaptive-range__time">Time →</span>
      </div>
    </div>`;
  }

  const challengeBody = document.querySelector('#w1d2-challenges .ref-body');
  if (challengeBody && !challengeBody.querySelector('.human-capability-signal')) {
    challengeBody.insertAdjacentHTML('beforeend', `<aside class="human-capability-signal" aria-label="Human capability signal">
      <div><strong>9 in 10</strong><span>global executives say soft skills are more important than ever.</span><i aria-hidden="true"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><em></em></i></div>
      <div><strong>70%</strong><span>of global executives say soft skills are more valuable than AI skills.</span><i class="signal-ring" aria-hidden="true"></i></div>
    </aside>`);
  }

  document.querySelector('#w1d2-feedback .numbered')?.classList.add('feedback-ladder');
  document.querySelector('#w1d3-lever .numbered')?.classList.add('lever-track');
  const strengthSpectrum = document.querySelector('#w1d3-and .pairs');
  if (strengthSpectrum) {
    strengthSpectrum.classList.add('strength-spectrum');
    strengthSpectrum.querySelectorAll('span').forEach((pair) => {
      const [left, right] = pair.textContent.split('↔').map((part) => part.trim());
      if (left && right) pair.innerHTML = `<b>${left}</b><i aria-hidden="true">∞</i><b>${right}</b>`;
    });
  }

  const polarityMapBody = document.querySelector('#w1d3-map .ref-body');
  if (polarityMapBody && !polarityMapBody.querySelector('.team-polarity')) {
    polarityMapBody.insertAdjacentHTML('beforeend', `<div class="team-polarity" aria-label="Leadership team polarity between people focus and market focus">
      <div class="team-polarity__purpose">Greater purpose <strong>Lead in market share while valuing people</strong></div>
      <div class="team-polarity__pole"><b>People focused</b><span class="up">Value people and create people-oriented process</span><span class="down">Loss of market share and weak business results</span></div>
      <div class="team-polarity__and">AND</div>
      <div class="team-polarity__pole"><b>Market focused</b><span class="up">Focus on leading in market share</span><span class="down">People feel like cogs in a machine, uncared for</span></div>
      <div class="team-polarity__fear">Deeper fear <strong>Neither people nor performance is sustained</strong></div>
    </div>`);
  }

  const eventsBody = document.querySelector('#w1d4-events .ref-body');
  if (eventsBody && !eventsBody.querySelector('.development-shift')) {
    eventsBody.insertAdjacentHTML('beforeend', `<div class="development-shift" aria-label="Shift in how personal growth at work is conceived">
      <div><small>20th-century answer</small><b>“High potentials”</b><span>Coaching, leadership programs, off-sites and corporate universities</span><span>At special times</span><span>Technical skill-sets</span></div>
      <i aria-hidden="true">→</i>
      <div><small>21st-century answer</small><b>Everyone</b><b>Together at work</b><b>Continuous</b><b>Technical and adaptive skill-sets &amp; mind-sets</b></div>
    </div>`);
  }

  const stretchBody = document.querySelector('#w1d4-stretch .ref-body');
  if (stretchBody && !stretchBody.querySelector('.lean-spectrum')) {
    stretchBody.insertAdjacentHTML('beforeend', `<div class="lean-spectrum">
      <div><h4>Overly confident — increase self-regulation</h4><ol><li>Listen more; be last to speak</li><li>Be less aggressive / slower to launch</li><li>Be more vulnerable</li><li>Be more disciplined</li><li>Take more advice</li><li>Nurture more</li></ol></div>
      <div><h4>Overly humble — increase self-expression</h4><ol><li>Speak up more; be first to speak</li><li>Be more aggressive / quicker to launch</li><li>Be more courageous</li><li>Be more optimistic</li><li>Give more advice</li><li>Coach more</li></ol></div>
    </div>`);
  }

  /* Alternate cross-program card deck. This is generated from the canonical
     day articles, so the deck can never become a second, divergent content source. */
  const sourceArticles = [...document.querySelectorAll('.day-panel .ref.search-item')];
  const deckRecords = sourceArticles.map((article, index) => {
    const panel = article.closest('.day-panel');
    const body = article.querySelector('.ref-body')?.cloneNode(true);
    body?.querySelectorAll('[id],button').forEach((node) => node.removeAttribute?.('id'));
    const heading = article.querySelector('h3')?.textContent?.trim() || `Reference card ${index + 1}`;
    const summary = article.querySelector('.ref-head p')?.textContent?.trim() || '';
    const label = dayLabel(panel?.dataset.week || 'week1', panel?.dataset.day || 'overview');
    return {
      article,
      bodyHtml: body?.innerHTML || '',
      day: panel?.dataset.day || 'overview',
      heading,
      href: article.id ? `#${article.id}` : `#${panel?.id || ''}`,
      index,
      panelId: panel?.id || '',
      search: `${heading} ${summary} ${article.dataset.search || ''}`.toLowerCase(),
      summary,
      week: panel?.dataset.week || 'week1',
      weekName: label.weekName,
      dayName: label.dayName,
    };
  });

  if (bar && deckRecords.length) {
    const viewSwitch = document.createElement('div');
    viewSwitch.className = 'view-switch';
    viewSwitch.setAttribute('role', 'group');
    viewSwitch.setAttribute('aria-label', 'Choose reference view');

    const dayViewButton = document.createElement('button');
    dayViewButton.className = 'view-option active';
    dayViewButton.type = 'button';
    dayViewButton.setAttribute('aria-pressed', 'true');
    dayViewButton.innerHTML = '<span aria-hidden="true">☷</span><span><b>Day view</b><small>Browse by week &amp; day</small></span>';

    const deckToggle = document.createElement('button');
    deckToggle.className = 'view-option deck-toggle';
    deckToggle.type = 'button';
    deckToggle.innerHTML = '<span aria-hidden="true">▤</span><span><b>Flip cards</b><small>Focus on one concept</small></span>';
    deckToggle.setAttribute('aria-label', 'Switch to flip card view');
    deckToggle.setAttribute('aria-pressed', 'false');
    viewSwitch.append(dayViewButton, deckToggle);

    const infographicDownload = document.createElement('a');
    infographicDownload.className = 'infographic-download';
    infographicDownload.href = 'assets/ELP-2026-original-infographics.zip';
    infographicDownload.download = 'ELP-2026-original-infographics.zip';
    infographicDownload.setAttribute('aria-label', 'Download all eight original ELP infographics as a ZIP file');
    infographicDownload.innerHTML = '<span aria-hidden="true">↓</span><span><b>Infographics</b><small>Download all · ZIP</small></span>';

    bar.querySelector('.theme-toggle')?.before(viewSwitch, infographicDownload);

    const deck = document.createElement('section');
    deck.className = 'deck-view';
    deck.setAttribute('aria-hidden', 'true');
    deck.innerHTML = `<header class="deck-header">
      <div class="deck-brand"><span>ELP 2026 · Alternate view</span><h2>Leadership reference deck</h2><p>Every section, one focused card at a time.</p></div>
      <button class="deck-close" type="button" aria-label="Switch to Day view">☷ <span>Day view</span></button>
    </header>
    <div class="deck-tools">
      <label class="deck-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Find any concept…" aria-label="Search every card"></label>
      <div class="deck-filters" role="group" aria-label="Filter cards by week">
        <button class="active" type="button" data-deck-filter="all" aria-pressed="true">All</button>
        <button type="button" data-deck-filter="week1" aria-pressed="false">Foundation Week</button>
        <button type="button" data-deck-filter="week2" aria-pressed="false">Week 2</button>
      </div>
    </div>
    <div class="deck-workspace">
      <button class="deck-nav deck-prev" type="button" aria-label="Previous card">←</button>
      <div class="deck-stack">
        <div class="deck-card deck-card--back" aria-hidden="true"></div>
        <article class="deck-card" tabindex="0" aria-live="polite">
          <div class="deck-card__meta"></div><h3></h3><p class="deck-card__summary"></p>
          <div class="deck-card__body"></div>
          <footer><button class="deck-context" type="button">Open in day view ↗</button></footer>
        </article>
      </div>
      <button class="deck-nav deck-next" type="button" aria-label="Next card">→</button>
    </div>
    <footer class="deck-footer"><span class="deck-counter"></span><div class="deck-progress" aria-hidden="true"><i></i></div><span class="deck-hint">← → keys · swipe</span><small>${disclaimerText}</small></footer>
    <div class="deck-empty" hidden><b>No cards found</b><span>Try another word or clear the Week filter.</span></div>`;
    document.body.append(deck);

    const deckSearch = deck.querySelector('.deck-search input');
    const deckCard = deck.querySelector('.deck-card:not(.deck-card--back)');
    const deckBody = deck.querySelector('.deck-card__body');
    const deckMeta = deck.querySelector('.deck-card__meta');
    const deckHeading = deckCard.querySelector('h3');
    const deckSummary = deck.querySelector('.deck-card__summary');
    const deckCounter = deck.querySelector('.deck-counter');
    const deckProgress = deck.querySelector('.deck-progress i');
    const deckEmpty = deck.querySelector('.deck-empty');
    const prev = deck.querySelector('.deck-prev');
    const next = deck.querySelector('.deck-next');
    let deckFilter = 'all';
    let deckMatches = [...deckRecords];
    let deckPosition = 0;
    let deckOpener = null;

    const updateDeckMatches = () => {
      const query = deckSearch.value.trim().toLowerCase();
      deckMatches = deckRecords.filter((record) => (deckFilter === 'all' || record.week === deckFilter) && (!query || record.search.includes(query)));
      deckPosition = 0;
      renderDeckCard('none');
    };
    const renderDeckCard = (direction = 'next') => {
      const record = deckMatches[deckPosition];
      const hasCards = Boolean(record);
      deckEmpty.hidden = hasCards;
      deck.querySelector('.deck-workspace').hidden = !hasCards;
      deck.querySelector('.deck-footer').hidden = !hasCards;
      if (!record) return;
      deckCard.classList.remove('arrive-next', 'arrive-prev');
      void deckCard.offsetWidth;
      if (direction !== 'none' && !reducedMotion.matches) deckCard.classList.add(direction === 'prev' ? 'arrive-prev' : 'arrive-next');
      deckMeta.innerHTML = `<span>${record.weekName}</span><b>${record.dayName}</b><em>Card ${deckPosition + 1}</em>`;
      deckHeading.textContent = record.heading;
      deckSummary.textContent = record.summary;
      deckSummary.hidden = !record.summary;
      deckBody.innerHTML = record.bodyHtml;
      deckBody.scrollTop = 0;
      deckCounter.textContent = `${deckPosition + 1} of ${deckMatches.length} cards`;
      deckProgress.style.width = `${((deckPosition + 1) / deckMatches.length) * 100}%`;
      prev.disabled = deckMatches.length < 2;
      next.disabled = deckMatches.length < 2;
    };
    const moveDeck = (step) => {
      if (deckMatches.length < 2) return;
      deckPosition = (deckPosition + step + deckMatches.length) % deckMatches.length;
      renderDeckCard(step < 0 ? 'prev' : 'next');
    };
    const openDeck = () => {
      deckOpener = document.activeElement;
      deck.classList.add('open');
      deck.setAttribute('aria-hidden', 'false');
      document.body.classList.add('deck-open');
      main?.setAttribute('inert', '');
      appbar?.setAttribute('inert', '');
      deckToggle.setAttribute('aria-pressed', 'true');
      dayViewButton.setAttribute('aria-pressed', 'false');
      dayViewButton.classList.remove('active');
      deckToggle.classList.add('active');
      renderDeckCard('none');
      window.setTimeout(() => deckSearch.focus(), 0);
    };
    const closeDeck = () => {
      deck.classList.remove('open');
      deck.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('deck-open');
      main?.removeAttribute('inert');
      appbar?.removeAttribute('inert');
      deckToggle.setAttribute('aria-pressed', 'false');
      dayViewButton.setAttribute('aria-pressed', 'true');
      dayViewButton.classList.add('active');
      deckToggle.classList.remove('active');
      deckOpener?.focus?.();
    };
    deckToggle.addEventListener('click', openDeck);
    dayViewButton.addEventListener('click', closeDeck);
    deck.querySelector('.deck-close').addEventListener('click', closeDeck);
    deckSearch.addEventListener('input', updateDeckMatches);
    deck.querySelectorAll('[data-deck-filter]').forEach((button) => button.addEventListener('click', () => {
      deckFilter = button.dataset.deckFilter;
      deck.querySelectorAll('[data-deck-filter]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      updateDeckMatches();
    }));
    prev.addEventListener('click', () => moveDeck(-1));
    next.addEventListener('click', () => moveDeck(1));
    deck.querySelector('.deck-context').addEventListener('click', () => {
      const record = deckMatches[deckPosition];
      closeDeck();
      document.querySelector(`.week-btn[data-week="${record.week}"]`)?.click();
      document.querySelector(`.day-btn[data-day="${record.day}"]`)?.click();
      window.setTimeout(() => {
        history.replaceState(null, '', record.href);
        document.querySelector(record.href)?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      }, 80);
    });
    document.addEventListener('keydown', (event) => {
      if (!deck.classList.contains('open')) return;
      if (event.key === 'Escape') closeDeck();
      if (event.key === 'ArrowLeft' && document.activeElement !== deckSearch) moveDeck(-1);
      if (event.key === 'ArrowRight' && document.activeElement !== deckSearch) moveDeck(1);
    });
    let touchStart = 0;
    deckCard.addEventListener('pointerdown', (event) => { touchStart = event.clientX; });
    deckCard.addEventListener('pointerup', (event) => {
      const distance = event.clientX - touchStart;
      if (Math.abs(distance) > 60) moveDeck(distance > 0 ? -1 : 1);
    });
    renderDeckCard('none');
  }

  /* Keep touch rails oriented to the active location. */
  const centerActiveRailItems = () => {
    if (!window.matchMedia('(max-width:1120px)').matches) return;
    document.querySelector('.days .day-btn.active')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    document.querySelector('.day-panel.active .toc a.active')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  };
  document.querySelectorAll('.week-btn,.day-btn').forEach((button) => button.addEventListener('click', () => window.setTimeout(centerActiveRailItems, 80)));
})();
