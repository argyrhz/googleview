/* ============================================================================
   GoogleViews — main.js
   No dependencies. Everything degrades gracefully without JS.
   ========================================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- 1. NAV */
  function initNav() {
    var nav = document.querySelector('.nav');
    var burger = document.querySelector('.nav__burger');
    var drawer = document.querySelector('.nav__drawer');

    if (nav) {
      var onScroll = function () {
        nav.classList.toggle('is-stuck', window.scrollY > 8);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (burger && drawer) {
      var setOpen = function (open) {
        document.body.classList.toggle('menu-open', open);
        burger.setAttribute('aria-expanded', String(open));
        drawer.setAttribute('aria-hidden', String(!open));
      };
      setOpen(false);
      burger.addEventListener('click', function () {
        setOpen(!document.body.classList.contains('menu-open'));
      });
      drawer.addEventListener('click', function (e) {
        if (e.target.closest('a')) setOpen(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
          setOpen(false);
          burger.focus();
        }
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 1060) setOpen(false);
      });
    }
  }

  /* ------------------------------------------------------------ 2. REVEALS
     One observer drives every scroll-triggered effect on the page.        */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      runAllOnce();
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });

    // Safety net: .reveal starts at opacity 0, so if the observer never fires
    // at all the page would read as blank. If nothing has appeared after a
    // couple of seconds, show everything rather than risk that.
    setTimeout(function () {
      if (document.querySelector('.reveal.is-in')) return;
      items.forEach(function (el) { el.classList.add('is-in'); });
    }, 2500);
  }

  /* Stagger children of any [data-stagger] container */
  function initStagger() {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.getAttribute('data-stagger'), 10) || 80;
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (child.classList.contains('reveal')) {
          child.style.setProperty('--reveal-delay', i * step + 'ms');
        }
      });
    });
  }

  /* ------------------------------------------- 3. PHONE REVIEW SIMULATION
     The star row in the phone mockup fills itself once, on first view.    */
  function initSheet() {
    var sheets = document.querySelectorAll('.gsheet[data-simulate]');
    if (!sheets.length) return;

    var run = function (sheet) {
      var stars = sheet.querySelectorAll('.gsheet__stars svg');
      sheet.classList.add('is-rated');
      if (reduceMotion) {
        stars.forEach(function (s) { s.classList.add('on'); });
        return;
      }
      stars.forEach(function (star, i) {
        setTimeout(function () { star.classList.add('on'); }, 260 + i * 130);
      });
    };

    if (!('IntersectionObserver' in window)) { sheets.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        setTimeout(function () { run(entry.target); }, 400);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.45 });
    sheets.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------- 4. POINTER TILT
     Gentle parallax on the hero mockups. Pointer devices only.           */
  function initTilt() {
    if (reduceMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var scenes = document.querySelectorAll('[data-tilt-scene]');
    scenes.forEach(function (scene) {
      var targets = scene.querySelectorAll('[data-tilt]');
      if (!targets.length) return;

      var raf = null, tx = 0, ty = 0;

      var apply = function () {
        raf = null;
        targets.forEach(function (el) {
          var depth = parseFloat(el.getAttribute('data-tilt')) || 1;
          var base = el.getAttribute('data-tilt-base') || '';
          el.style.transform =
            base + ' rotateY(' + (tx * 7 * depth).toFixed(2) + 'deg)' +
            ' rotateX(' + (-ty * 5 * depth).toFixed(2) + 'deg)' +
            ' translate3d(' + (tx * 12 * depth).toFixed(1) + 'px,' +
            (ty * 9 * depth).toFixed(1) + 'px,0)';
        });
      };

      scene.addEventListener('pointermove', function (e) {
        var r = scene.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      scene.addEventListener('pointerleave', function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      });
    });
  }

  /* --------------------------------------------------------- 5. ACCORDION */
  function initFaq() {
    document.querySelectorAll('.faq').forEach(function (faq) {
      var single = faq.hasAttribute('data-single');
      faq.querySelectorAll('.faq__q').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.closest('.faq__item');
          var open = item.classList.contains('is-open');
          if (single && !open) {
            faq.querySelectorAll('.faq__item.is-open').forEach(function (other) {
              other.classList.remove('is-open');
              other.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
            });
          }
          item.classList.toggle('is-open', !open);
          btn.setAttribute('aria-expanded', String(!open));
        });
      });
    });
  }

  /* -------------------------------------------------------------- 6. FORM */
  function initForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;

    var success = form.parentNode.querySelector('.form-success');

    var validators = {
      name: function (v) { return v.trim().length >= 2 || 'Συμπλήρωσε το όνομά σου.'; },
      business: function (v) { return v.trim().length >= 2 || 'Συμπλήρωσε το όνομα της επιχείρησης.'; },
      email: function (v) {
        if (!v.trim()) return 'Συμπλήρωσε το email σου.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Το email δεν μοιάζει σωστό.';
      },
      phone: function (v) {
        if (!v.trim()) return 'Συμπλήρωσε το τηλέφωνό σου.';
        var digits = v.replace(/[^\d]/g, '');
        return digits.length >= 10 || 'Το τηλέφωνο χρειάζεται τουλάχιστον 10 ψηφία.';
      }
    };

    function validateField(input) {
      var rule = validators[input.name];
      if (!rule) return true;
      var res = rule(input.value);
      var field = input.closest('.field');
      var err = field.querySelector('.field__err');
      if (res === true) {
        field.classList.remove('field--error');
        input.removeAttribute('aria-invalid');
        return true;
      }
      field.classList.add('field--error');
      input.setAttribute('aria-invalid', 'true');
      if (err) err.textContent = res;
      return false;
    }

    form.querySelectorAll('input, textarea').forEach(function (input) {
      input.addEventListener('blur', function () {
        if (input.value) validateField(input);
      });
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (field.classList.contains('field--error')) validateField(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var first = null;
      form.querySelectorAll('input, textarea').forEach(function (input) {
        if (!validateField(input)) {
          ok = false;
          if (!first) first = input;
        }
      });
      if (!ok) {
        if (first) first.focus();
        return;
      }
      // The order goes to /api/lead, which writes it to the database. The
      // visitor's own mail client is no longer involved: it used to be the
      // only "delivery" and it recorded nothing anywhere.
      var get = function (n) {
        var el = form.querySelector('[name="' + n + '"]');
        return el ? el.value.trim() : '';
      };

      var btn = form.querySelector('button[type="submit"]');
      var btnHTML = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Στέλνεται…'; }

      var fail = form.querySelector('[data-form-fail]');
      if (!fail) {
        fail = document.createElement('p');
        fail.setAttribute('data-form-fail', '');
        fail.setAttribute('role', 'alert');
        fail.style.cssText = 'margin-top:14px;color:#C5221F;font-weight:500';
        (btn && btn.parentNode ? btn.parentNode : form).appendChild(fail);
      }
      fail.textContent = '';

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: get('name'), business: get('business'), phone: get('phone'),
          email: get('email'), city: get('city'), package: get('package'),
          message: get('message'), website: get('website')
        })
      }).then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.hidden = true;
        if (success) {
          success.classList.add('is-visible');
          success.setAttribute('tabindex', '-1');
          success.focus();
        }
      })['catch'](function () {
        if (btn) { btn.disabled = false; btn.innerHTML = btnHTML; }
        fail.textContent = 'Δεν στάλθηκε η παραγγελία. Δοκίμασε ξανά σε λίγο, ή πάρε μας τηλέφωνο.';
      });
    });
  }

  /* --------------------------------------------------------- 7. UTILITIES */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* Copy-to-clipboard for contact details */
  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var done = function () {
          var old = btn.getAttribute('data-label-done') || 'Αντιγράφηκε!';
          var prev = btn.textContent;
          btn.textContent = old;
          setTimeout(function () { btn.textContent = prev; }, 1800);
        };
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(done).catch(function () {});
        }
      });
    });
  }

  /* ------------------------------------------------------------- BOOTSTRAP */
  function runAllOnce() { /* placeholder for reduced-motion path */ }

  function init() {
    // Each feature is isolated: if one throws, the rest of the page still works
    // and, critically, the reveal pass still runs so nothing stays invisible.
    [initNav, initStagger, initReveal, initSheet, initTilt, initFaq,
     initForm, initYear, initCopy]
      .forEach(function (fn) {
        try { fn(); } catch (err) {
          if (window.console) console.error('[gv] ' + fn.name + ' failed:', err);
          if (fn === initReveal) {
            document.querySelectorAll('.reveal').forEach(function (el) {
              el.classList.add('is-in');
            });
          }
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
