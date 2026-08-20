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

  /* Keep touch rails oriented to the active location. */
  const centerActiveRailItems = () => {
    if (!window.matchMedia('(max-width:1120px)').matches) return;
    document.querySelector('.days .day-btn.active')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    document.querySelector('.day-panel.active .toc a.active')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  };
  document.querySelectorAll('.week-btn,.day-btn').forEach((button) => button.addEventListener('click', () => window.setTimeout(centerActiveRailItems, 80)));
})();
