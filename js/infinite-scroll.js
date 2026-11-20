/**
 * 首页文章列表入场动画 + 无限滚动（darkpremium）
 * - IntersectionObserver 驱动卡片入场，替代 AOS
 * - 加载时显示紧凑状态提示
 * - rAF 节流滚动检测
 */
$(function () {
  'use strict';

  var motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ioSupported = 'IntersectionObserver' in window;

  // ── IntersectionObserver 入场动画 ────────────────────────────────
  var io = null;

  function makeObserver() {
    return new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        io.unobserve(card);
        card.classList.add('is-visible');
        // 动画结束后清理 class，让 hover transition 正常工作
        card.addEventListener('animationend', function () {
          card.classList.remove('io-animate', 'is-visible');
          card.style.removeProperty('--delay');
        }, { once: true });
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
  }

  function observeCards(cards) {
    if (!motionOk || !ioSupported) return;
    if (!io) io = makeObserver();
    cards.forEach(function (card, i) {
      card.style.setProperty('--delay', (i % 2 * 65) + 'ms');
      card.classList.add('io-animate');
      io.observe(card);
    });
  }

  var $cardsContainer = $('#dp-cards');
  if ($cardsContainer.length) {
    observeCards(Array.from($cardsContainer[0].querySelectorAll('.journal-entry')));
  }

  // ── 无限滚动 ────────────────────────────────────────────────────
  // 只自动加载 autoPages 页，之后改为「加载更多」按钮，保证页脚可达。
  // 已加载页数和滚动位置存在 sessionStorage，从文章返回时恢复。
  if (!window.infiniteScrollConfig || !window.infiniteScrollConfig.enabled) return;

  var config = window.infiniteScrollConfig;
  var autoPages = config.autoPages || 1;
  var STORE_KEY = 'home-infinite-scroll';
  var isLoading = false;
  var hasNext = config.hasNext;
  var currentPage = config.currentPage;
  var loadedPages = 0;
  var $loadingIndicator = $('#loading-indicator');
  var $loadStatus = $('#load-more-status');
  var $loadEnd = $('#load-more-end');
  var $fallbackLink = $('#load-more-fallback');
  var $loadButton = $('#load-more-button');

  if (!$cardsContainer.length) return;
  $fallbackLink.hide();

  // 旧缓存的分页 HTML 可能缺 #pagination-info，按页码推算下一页而不是直接判定读完
  function guessNextLink(page) {
    if (page >= config.totalPages || !config.nextLink) return '';
    return config.nextLink.replace(/\/page\/\d+\//, '/page/' + (page + 1) + '/');
  }

  function showButton(label) {
    $loadButton.text(label || '加载更多文章').show();
  }

  function store(scrollY) {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ pages: loadedPages, scrollY: scrollY }));
    } catch (e) {}
  }

  function loadMore() {
    if (isLoading || !hasNext || !config.nextLink) return $.Deferred().reject().promise();
    isLoading = true;
    $loadButton.hide();
    $loadingIndicator.css('display', 'inline-flex');
    $loadStatus.text('正在加载更多文章…');

    return $.ajax({
      url: config.nextLink,
      type: 'GET',
      dataType: 'html',
      // Old paginated HTML can lack the markup introduced by a new deploy.
      cache: false,
      timeout: 12000
    }).then(function (data) {
      var nextPage = new DOMParser().parseFromString(data, 'text/html');
      var newCards = Array.from(nextPage.querySelectorAll('#dp-cards .journal-entry'));
      if (!newCards.length) return $.Deferred().reject('empty').promise();

      $cardsContainer.append(newCards);
      currentPage += 1;
      loadedPages += 1;
      var info = nextPage.querySelector('#pagination-info');
      config.nextLink = info ? info.dataset.nextLink : guessNextLink(currentPage);
      hasNext = !!config.nextLink;
      $fallbackLink.attr('href', config.nextLink);
      $loadStatus.text('已加载 ' + newCards.length + ' 篇文章' + (hasNext ? '。' : '，已经读完全部文章。'));
      if (!hasNext) {
        $loadEnd.show();
      } else if (loadedPages >= autoPages) {
        showButton();
      }
    }).fail(function (reason) {
      if (reason === 'empty') {
        hasNext = false;
        $fallbackLink.show();
        $loadStatus.text('未能读取下一页文章，请使用继续阅读下一页链接。');
      } else {
        showButton('加载失败，点击重试');
        $fallbackLink.show();
        $loadStatus.text('加载失败，可以点击重试或使用继续阅读下一页链接。');
      }
    }).always(function () {
      isLoading = false;
      $loadingIndicator.hide();
    });
  }

  $loadButton.on('click', function () {
    loadMore();
  });

  // ── rAF 节流滚动检测（仅前 autoPages 页） ─────────────────────────
  var rafPending = false;

  function check() {
    if (isLoading || !hasNext || loadedPages >= autoPages) return;
    var threshold = config.threshold || 400;
    if (window.scrollY + window.innerHeight >= document.body.scrollHeight - threshold) {
      loadMore();
    }
  }

  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      check();
      rafPending = false;
    });
  }

  function startAutoLoad() {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    setTimeout(check, 600);
  }

  window.addEventListener('pagehide', function () { store(window.scrollY); });

  // ── 返回首页时恢复已加载的页和滚动位置 ─────────────────────────────
  var saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(STORE_KEY)); } catch (e) {}
  var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  var isBack = nav && nav.type === 'back_forward';

  if (isBack && saved && saved.pages > 0) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var restore = function (left) {
      if (left <= 0) return $.Deferred().resolve().promise();
      return loadMore().then(function () { return restore(left - 1); });
    };
    restore(saved.pages).always(function () {
      window.scrollTo(0, saved.scrollY || 0);
      if (loadedPages < autoPages) startAutoLoad();
      else if (hasNext && !$loadButton.is(':visible')) showButton();
    });
  } else {
    store(0);
    startAutoLoad();
  }
});
