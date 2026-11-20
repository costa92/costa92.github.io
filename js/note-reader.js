(function () {
  'use strict';

  function init() {
    var reader = document.querySelector('.dp-note');
    var article = document.getElementById('articleContent');
    if (!reader || !article) return;

    var chapterPanel = document.getElementById('note-sidebar-col');
    var outlinePanel = document.getElementById('note-toc-col');
    var overlay = document.getElementById('note-sidebar-overlay');
    var chapterButton = document.getElementById('note-sidebar-toggle');
    var outlineButton = document.getElementById('note-toc-toggle');
    var outline = document.getElementById('note-toc-links');
    var percent = document.getElementById('note-read-percent');
    var openPanel = null;
    var returnFocus = null;
    var chapterBody = chapterPanel && chapterPanel.querySelector('.note-sidebar-body');
    var chapterButtons = Array.prototype.slice.call(document.querySelectorAll('.note-chapter-title'));

    function activeDrawer() {
      return openPanel === 'chapters' ? chapterPanel : openPanel === 'outline' ? outlinePanel : null;
    }

    function drawerFocusables(panel) {
      return Array.prototype.filter.call(panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'), function (element) {
        return !element.hidden && element.getClientRects().length > 0;
      });
    }

    function setChapterExpanded(button, expanded) {
      var list = document.getElementById(button.getAttribute('aria-controls'));
      button.setAttribute('aria-expanded', String(expanded));
      list.hidden = !expanded;
      list.style.display = expanded ? '' : 'none';
      var icon = button.querySelector('.chapter-toggle-icon');
      icon.classList.toggle('fa-chevron-down', expanded);
      icon.classList.toggle('fa-chevron-right', !expanded);
    }

    // A chapter link loads a new page. Carry the menu state across that navigation.
    if (chapterBody) {
      var stateKey = 'note-sidebar-navigation';
      var seriesPath = new URL(chapterPanel.querySelector('.note-sidebar-header a').href).pathname;
      try {
        var savedState = JSON.parse(sessionStorage.getItem(stateKey));
        sessionStorage.removeItem(stateKey);
        if (savedState && savedState.target === location.pathname && savedState.series === seriesPath) {
          chapterButtons.forEach(function (button, index) {
            setChapterExpanded(button, savedState.expanded.indexOf(index) !== -1);
          });
          requestAnimationFrame(function () { chapterBody.scrollTop = savedState.scrollTop; });
        }
      } catch (error) { /* Storage can be unavailable in private browsing. */ }

      Array.prototype.forEach.call(chapterBody.querySelectorAll('.note-section-item a'), function (link) {
        link.addEventListener('click', function () {
          try {
            sessionStorage.setItem(stateKey, JSON.stringify({
              target: new URL(link.href).pathname,
              series: seriesPath,
              expanded: chapterButtons.map(function (button, index) {
                return button.getAttribute('aria-expanded') === 'true' ? index : -1;
              }).filter(function (index) { return index !== -1; }),
              scrollTop: chapterBody.scrollTop
            }));
          } catch (error) { /* Navigation still works without stored state. */ }
        });
      });
    }

    function closeDrawer(restoreFocus) {
      var panel = activeDrawer();
      if (panel) {
        panel.removeAttribute('role');
        panel.removeAttribute('aria-modal');
      }
      if (chapterPanel) chapterPanel.classList.remove('note-sidebar-mobile-show');
      outlinePanel.classList.remove('note-toc-mobile-show');
      reader.classList.remove('note-drawer-open');
      overlay.classList.remove('active');
      if (chapterButton) chapterButton.setAttribute('aria-expanded', 'false');
      outlineButton.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      openPanel = null;
      if (restoreFocus && returnFocus) returnFocus.focus();
    }

    function toggleDrawer(which) {
      if (openPanel === which) { closeDrawer(true); return; }
      closeDrawer(false);
      openPanel = which;
      returnFocus = which === 'chapters' ? chapterButton : outlineButton;
      var panel = activeDrawer();
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      reader.classList.add('note-drawer-open');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (which === 'chapters') {
        chapterPanel.classList.add('note-sidebar-mobile-show');
        chapterButton.setAttribute('aria-expanded', 'true');
        chapterPanel.querySelector('.note-sidebar-close').focus();
      } else {
        outlinePanel.classList.add('note-toc-mobile-show');
        outlineButton.setAttribute('aria-expanded', 'true');
        outlinePanel.querySelector('.note-toc-close').focus();
      }
    }

    if (chapterButton) chapterButton.addEventListener('click', function () { toggleDrawer('chapters'); });
    outlineButton.addEventListener('click', function () { toggleDrawer('outline'); });
    if (chapterPanel) chapterPanel.querySelector('.note-sidebar-close').addEventListener('click', function () { closeDrawer(true); });
    outlinePanel.querySelector('.note-toc-close').addEventListener('click', function () { closeDrawer(true); });
    overlay.addEventListener('click', function () { closeDrawer(true); });
    document.addEventListener('keydown', function (event) {
      if (!openPanel) return;
      if (event.key === 'Escape') { closeDrawer(true); return; }
      if (event.key !== 'Tab') return;
      var panel = activeDrawer();
      var focusables = drawerFocusables(panel);
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (!panel.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    document.addEventListener('focusin', function (event) {
      var panel = activeDrawer();
      if (panel && !panel.contains(event.target)) {
        var focusables = drawerFocusables(panel);
        if (focusables.length) focusables[0].focus();
      }
    });
    window.addEventListener('resize', function () {
      var drawerBecameSidebar = (openPanel === 'outline' && window.innerWidth > 1839) ||
        (openPanel === 'chapters' && window.innerWidth > 1263);
      if (drawerBecameSidebar) {
        var focusWasInside = activeDrawer().contains(document.activeElement);
        closeDrawer(false);
        if (focusWasInside) {
          article.setAttribute('tabindex', '-1');
          article.focus({ preventScroll: true });
        }
      }
    });

    chapterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var expanded = button.getAttribute('aria-expanded') === 'true';
        setChapterExpanded(button, !expanded);
      });
    });

    var headings = Array.prototype.slice.call(article.querySelectorAll('h2, h3, h4'));
    var links = [];
    var usedIds = {};
    headings.forEach(function (heading, index) {
      var base = heading.id || 'note-heading-' + (index + 1);
      var id = base;
      var suffix = 2;
      while (usedIds[id] || (document.getElementById(id) && document.getElementById(id) !== heading)) {
        id = base + '-' + suffix++;
      }
      heading.id = id;
      usedIds[id] = true;
      var link = document.createElement('a');
      link.href = '#' + encodeURIComponent(id);
      link.textContent = heading.textContent.trim();
      link.dataset.level = heading.tagName.charAt(1);
      link.addEventListener('click', function (event) {
        event.preventDefault();
        closeDrawer(false);
        history.replaceState(null, '', '#' + encodeURIComponent(id));
        heading.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
        setActive(index);
      });
      outline.appendChild(link);
      links.push(link);
    });

    if (!headings.length) {
      outlinePanel.hidden = true;
      outlineButton.hidden = true;
      document.querySelector('.note-layout').classList.add('no-outline');
      var dock = document.querySelector('.note-reader-dock');
      var syncDockVisibility = function () {
        dock.hidden = !chapterButton || window.innerWidth > 1263;
      };
      syncDockVisibility();
      window.addEventListener('resize', syncDockVisibility);
    }

    function setActive(index) {
      links.forEach(function (link, position) {
        var active = position === index;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    var ticking = false;
    function updatePosition() {
      ticking = false;
      var active = 0;
      headings.forEach(function (heading, index) {
        if (heading.getBoundingClientRect().top <= 125) active = index;
      });
      if (links.length) setActive(active);
      var top = article.getBoundingClientRect().top + window.scrollY;
      var bottom = top + article.offsetHeight - window.innerHeight;
      var progress = bottom <= top ? 100 : Math.max(0, Math.min(100, (window.scrollY - top) / (bottom - top) * 100));
      percent.textContent = Math.round(progress) + '%';
    }
    function requestUpdate() {
      if (!ticking) { ticking = true; requestAnimationFrame(updatePosition); }
    }
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    requestUpdate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
