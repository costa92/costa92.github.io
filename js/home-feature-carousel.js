(function () {
  'use strict';

  var carousel = document.getElementById('home-recommendations');
  if (!carousel) return;

  var slides = Array.from(carousel.querySelectorAll('.dp-home-feature'));
  var controls = carousel.querySelector('.dp-home-feature-controls');
  var imageNav = carousel.querySelector('.dp-home-feature-image-nav');
  if (slides.length < 2 || !controls || !imageNav) return;

  var dots = Array.from(controls.querySelectorAll('.feature-dot'));
  var previous = imageNav.querySelector('.feature-prev');
  var next = imageNav.querySelector('.feature-next');
  var announcer = carousel.querySelector('.dp-home-feature-announcer');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var autoPlay = carousel.dataset.autoplay === 'true';
  var interval = Math.max(3000, Number(carousel.dataset.interval) || 6000);
  var active = 0;
  var timer = null;

  function show(index, announce) {
    active = (index + slides.length) % slides.length;
    slides.forEach(function (slide, position) {
      var selected = position === active;
      slide.classList.toggle('is-active', selected);
      slide.inert = !selected;
      slide.setAttribute('aria-hidden', String(!selected));
      if (selected) slide.querySelector('img')?.removeAttribute('loading');
    });
    dots.forEach(function (dot, position) {
      if (position === active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (announce) announcer.textContent = '第 ' + (active + 1) + ' 篇：' + slides[active].querySelector('h2').textContent.trim();
  }

  function canPlay() {
    return autoPlay && !reducedMotion.matches &&
      !document.hidden && !carousel.matches(':hover') && !carousel.matches(':focus-within');
  }

  function syncTimer() {
    window.clearInterval(timer);
    timer = null;
    if (canPlay()) timer = window.setInterval(function () { show(active + 1, false); }, interval);
  }

  function move(offset) {
    show(active + offset, true);
    syncTimer();
  }

  previous.addEventListener('click', function () { move(-1); });
  next.addEventListener('click', function () { move(1); });
  dots.forEach(function (dot, index) {
    dot.addEventListener('click', function () { show(index, true); syncTimer(); });
  });
  carousel.addEventListener('pointerenter', syncTimer);
  carousel.addEventListener('pointerleave', syncTimer);
  carousel.addEventListener('focusin', syncTimer);
  carousel.addEventListener('focusout', function () { window.setTimeout(syncTimer, 0); });
  document.addEventListener('visibilitychange', syncTimer);
  reducedMotion.addEventListener('change', syncTimer);

  carousel.classList.add('is-enhanced');
  controls.hidden = false;
  imageNav.hidden = false;
  show(0, false);
  syncTimer();
})();
