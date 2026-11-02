/* theme.js - theme management, navigation, scroll effects, KPI counters, insight filter */
(() => {
  'use strict';

  const KEY = 'ev-theme';
  const root = document.documentElement;

  // ---- Theme: applied immediately (script runs in <head>) to avoid a flash ----
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (t) => { try { localStorage.setItem(KEY, t); } catch { /* storage blocked */ } };
  root.dataset.theme = read() === 'light' ? 'light' : 'dark'; // dark-first default

  function setTheme(theme) {
    root.classList.add('theme-anim');           // enables smooth colour transitions
    root.dataset.theme = theme;
    save(theme);
    setTimeout(() => root.classList.remove('theme-anim'), 400);
  }

  // ---- Animated count-up for KPI numbers ----
  function countUp(el) {
    const end = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals, 10) || 0;
    const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (Number.isNaN(end) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = Number.isNaN(end) ? '--' : fmt(end);
      return;
    }
    const start = performance.now(), duration = 1400;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = fmt(end * (1 - Math.pow(1 - p, 3))); // ease-out cubic
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    });

    // Mobile menu
    const menuBtn = document.getElementById('menuBtn');
    const links = document.getElementById('navLinks');
    const toggleMenu = (open) => {
      links.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', () => toggleMenu(!links.classList.contains('open')));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) toggleMenu(false); });

    // Glass nav border once the page scrolls
    const nav = document.getElementById('nav');
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Active navigation highlighting (scroll-spy)
    const navLinks = [...links.querySelectorAll('a')];
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach((a) => { const s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });

    // Scroll-triggered reveal (cards only) and KPI counters
    const once = (selector, fn, options) => {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { fn(en.target); io.unobserve(en.target); } });
      }, options);
      document.querySelectorAll(selector).forEach((el) => io.observe(el));
    };
    once('.reveal', (el) => el.classList.add('in'), { threshold: 0.15 });
    once('[data-count]', countUp, { threshold: 0.6 });

    // Insight filter tabs
    const chips = document.querySelectorAll('.chip');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      chips.forEach((c) => { c.classList.toggle('active', c === chip); c.setAttribute('aria-selected', String(c === chip)); });
      document.querySelectorAll('.insight').forEach((card) => {
        card.hidden = chip.dataset.filter !== 'all' && card.dataset.cat !== chip.dataset.filter;
      });
    }));

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Typing effect for the rotating hero word
    const typed = document.getElementById('typed');
    if (typed) {
      const words = JSON.parse(typed.dataset.words);
      if (reduced) { typed.textContent = words[0]; }
      else {
        let w = 0, i = 0, deleting = false;
        const tick = () => {
          const word = words[w];
          i += deleting ? -1 : 1;
          typed.textContent = word.slice(0, i);
          let delay = deleting ? 40 : 85;
          if (!deleting && i === word.length) { deleting = true; delay = 1400; }
          else if (deleting && i === 0) { deleting = false; w = (w + 1) % words.length; delay = 350; }
          setTimeout(tick, delay);
        };
        tick();
      }
    }

    // Scroll progress bar under the navigation
    const progress = document.getElementById('progress');
    const updateProgress = () => {
      const d = document.documentElement;
      progress.style.width = (d.scrollTop / Math.max(d.scrollHeight - d.clientHeight, 1) * 100) + '%';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });

    // Pointer spotlight on cards
    document.querySelectorAll('.kpi, .insight, .preview-card').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  });
})();
