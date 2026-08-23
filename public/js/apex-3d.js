/* =====================================================================
   ApexCrestVest 3D Enhancements — apex-3d.js
   Auto-detects which 3D canvases exist on the page and inits only those.
   Also wires up: count-up stats, 3D tilt (dashboard panel + plan cards),
   scroll-reveal, and growth-chart scroll trigger.
   Non-invasive: does not override any existing ApexCrestVest JS.
   ===================================================================== */

(function () {
  'use strict';

  /* ---------- Count-up animation (reusable) ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var duration = 1800;
    var start = performance.now();
    var isFloat = suffix.indexOf('.') !== -1;

    function step(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var val = target * eased;
      var display;
      if (isFloat) {
        display = Math.floor(val) + '.' + suffix.split('.')[1];
      } else {
        display = Math.floor(val);
      }
      el.textContent = prefix + display + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = prefix + Math.floor(target) + suffix;
    }
    requestAnimationFrame(step);
  }

  /* ---------- Scroll-reveal + count-up trigger ---------- */
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('apex3d-in');
          var counters = entry.target.querySelectorAll('[data-count]');
          counters.forEach(function (c) {
            if (!c.dataset.counted) {
              c.dataset.counted = '1';
              animateCount(c);
            }
          });
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.apex3d-reveal').forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------- Hero trust / stat counters (start immediately) ---------- */
  document.querySelectorAll('.apex3d-stat [data-count]').forEach(function (c) {
    if (!c.dataset.counted) {
      c.dataset.counted = '1';
      animateCount(c);
    }
  });

  /* ---------- Dashboard balance count-up ---------- */
  var balanceEl = document.getElementById('apex3d-balance');
  if (balanceEl) {
    var raw = balanceEl.getAttribute('data-amount');
    var balanceTarget = raw ? parseFloat(raw) : 48350.00;
    var decimals = parseInt(balanceEl.getAttribute('data-decimals') || '2', 10);
    var balanceStart = performance.now();
    function balanceStep(now) {
      var progress = Math.min((now - balanceStart) / 2200, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var val = balanceTarget * eased;
      balanceEl.textContent = val.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      if (progress < 1) requestAnimationFrame(balanceStep);
      else balanceEl.textContent = balanceTarget.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    requestAnimationFrame(balanceStep);
  }

  /* ---------- Dashboard panel 3D mouse-tilt ---------- */
  var dashPanel = document.getElementById('apex3d-dash');
  var dashWrap = document.querySelector('.apex3d-dash-wrap');
  if (dashPanel && dashWrap) {
    var dRect;
    function updateDRect() { dRect = dashWrap.getBoundingClientRect(); }
    updateDRect();
    window.addEventListener('resize', updateDRect);
    window.addEventListener('scroll', updateDRect, { passive: true });

    dashWrap.addEventListener('mousemove', function (e) {
      if (!dRect) updateDRect();
      var cx = dRect.left + dRect.width / 2;
      var cy = dRect.top + dRect.height / 2;
      var dx = (e.clientX - cx) / (dRect.width / 2);
      var dy = (e.clientY - cy) / (dRect.height / 2);
      var maxTilt = 14;
      dashPanel.style.transform =
        'rotateY(' + (dx * maxTilt) + 'deg) rotateX(' + (-dy * maxTilt) + 'deg) translateZ(20px)';
    });
    dashWrap.addEventListener('mouseleave', function () {
      dashPanel.style.transform = 'rotateY(0deg) rotateX(0deg) translateZ(0px)';
    });
  }

  /* ---------- Plan cards 3D tilt ---------- */
  var tiltCards = document.querySelectorAll('[data-apex3d-tilt]');
  tiltCards.forEach(function (card) {
    var cRect;
    function updateRect() { cRect = card.getBoundingClientRect(); }
    card.addEventListener('mouseenter', updateRect);
    card.addEventListener('mousemove', function (e) {
      if (!cRect) updateRect();
      var cx = cRect.left + cRect.width / 2;
      var cy = cRect.top + cRect.height / 2;
      var dx = (e.clientX - cx) / (cRect.width / 2);
      var dy = (e.clientY - cy) / (cRect.height / 2);
      var maxTilt = 10;
      card.style.transform =
        'rotateY(' + (dx * maxTilt) + 'deg) rotateX(' + (-dy * maxTilt) + 'deg) translateZ(15px) scale(1.03)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = 'rotateY(0deg) rotateX(0deg) translateZ(0px) scale(1)';
    });
  });

  /* ---------- Growth chart 3D trigger on scroll into view ---------- */
  var growthSection = document.getElementById('apex3d-growth');
  if (growthSection) {
    var growthObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (window.APEX3D) APEX3D.triggerGrowth();
          growthObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    growthObserver.observe(growthSection);
  }

  /* ---------- Initialize 3D scenes (auto-detect canvases) ---------- */
  function init3D() {
    if (!window.APEX3D) {
      setTimeout(init3D, 100);
      return;
    }
    var opts = {
      hero: !!document.getElementById('hero-canvas'),
      growth: !!document.getElementById('growth-canvas'),
      globe: !!document.getElementById('globe-canvas')
    };
    /* Only init if at least one scene is present */
    if (opts.hero || opts.growth || opts.globe) {
      APEX3D.init(opts);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3D);
  } else {
    init3D();
  }

})();
