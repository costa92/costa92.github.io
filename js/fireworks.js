!function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var particles = [];
  var running = false;
  // Obsidian Aurora 色板：紫、蓝、青、金、粉
  var palette = [
    '#7c6fff', '#4f9fff', '#a78bfa', '#38bdf8',
    '#c084fc', '#67e8f9', '#fbbf24', '#f472b6',
    '#818cf8', '#34d399'
  ];

  function rnd(min, max) { return Math.random() * (max - min) + min; }

  function spawn(x, y) {
    var count = Math.floor(rnd(12, 20));
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 / count) * i + rnd(-0.4, 0.4);
      var speed = rnd(2, 5.5);
      var size = Math.floor(rnd(3, 7));
      var el = document.createElement('div');
      el.style.cssText = [
        'position:fixed',
        'pointer-events:none',
        'border-radius:50%',
        'z-index:99999',
        'width:' + size + 'px',
        'height:' + size + 'px',
        'background:' + palette[Math.floor(Math.random() * palette.length)],
        'left:' + (x - size / 2) + 'px',
        'top:' + (y - size / 2) + 'px',
        'box-shadow:0 0 ' + (size + 2) + 'px currentColor'
      ].join(';');
      document.body.appendChild(el);
      particles.push({
        el: el,
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        decay: rnd(0.014, 0.028),
        gravity: 0.1
      });
    }
  }

  function loop() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        document.body.removeChild(p.el);
        particles.splice(i, 1);
      } else {
        p.el.style.left = p.x + 'px';
        p.el.style.top = p.y + 'px';
        p.el.style.opacity = p.alpha;
      }
    }
    // 没有粒子时停下，避免空闲时每帧空转
    running = particles.length > 0;
    if (running) requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(loop);
  }

  document.addEventListener('click', function (e) {
    // 忽略链接/按钮点击，避免导航延迟感
    if (e.target.closest('a,button,input,select,textarea')) return;
    spawn(e.clientX, e.clientY);
    start();
  });

  document.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    if (t) { spawn(t.clientX, t.clientY); start(); }
  }, { passive: true });
}();
