/* tableau.js - Tableau Public Embedding API v3, fullscreen, toasts and quick actions */
(() => {
  'use strict';

  const API_SRC = 'https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js';
  const LOAD_TIMEOUT = 25000; // ms before we show the error state
  let apiPromise = null;

  // ---- Toast notifications ----
  function toast(message, type = 'ok') {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' error' : '');
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600);
  }

  // ---- Helpers ----
  // Turns ".../app/profile/<user>/viz/<Workbook>/<View>?x=y" into the embeddable
  // ".../views/<Workbook>/<View>" form that <tableau-viz> expects.
  function toEmbedUrl(url) {
    try {
      const u = new URL(url);
      const m = u.pathname.match(/\/viz\/([^/]+)\/([^/]+)/);
      return m ? `${u.origin}/views/${m[1]}/${m[2]}` : u.origin + u.pathname;
    } catch { return url; }
  }
  const deviceType = () => (innerWidth < 700 ? 'phone' : innerWidth < 1024 ? 'tablet' : 'desktop');

  // Load the Tableau Embedding API once (as an ES module), then wait for the web component.
  function loadApi() {
    if (!apiPromise) {
      apiPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.type = 'module'; s.src = API_SRC;
        s.onload = resolve; s.onerror = () => reject(new Error('Tableau API blocked or offline'));
        document.head.appendChild(s);
      }).then(() => customElements.whenDefined('tableau-viz'));
    }
    return apiPromise;
  }

  // ---- Embed a viz into its shell; state drives the CSS (idle | loading | ready | error) ----
  async function loadViz(shell, force = false) {
    const state = shell.dataset.state;
    if (state === 'loading' || (state === 'ready' && !force)) return;
    shell.dataset.state = 'loading';

    const host = shell.querySelector('.viz-host');
    host.innerHTML = '';
    let timer;
    const fail = () => { clearTimeout(timer); shell.dataset.state = 'error'; };

    try {
      await loadApi();
      const viz = document.createElement('tableau-viz');
      viz.setAttribute('src', toEmbedUrl(shell.dataset.src));
      viz.setAttribute('toolbar', 'bottom');
      viz.setAttribute('hide-tabs', '');
      viz.setAttribute('width', '100%');
      viz.setAttribute('height', '100%');
      viz.setAttribute('device', deviceType());
      viz.addEventListener('firstinteractive', () => { clearTimeout(timer); shell.dataset.state = 'ready'; });
      viz.addEventListener('vizloaderror', fail);
      host.appendChild(viz);
      timer = setTimeout(fail, LOAD_TIMEOUT);
    } catch (err) {
      apiPromise = null; // allow a clean retry
      fail();
    }
  }

  // ---- Fullscreen (native API with a CSS fallback for iOS Safari) ----
  function exitFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    document.querySelectorAll('.pseudo-full').forEach((s) => s.classList.remove('pseudo-full'));
    document.body.classList.remove('lock');
  }
  function enterFullscreen(shell) {
    const fallback = () => { shell.classList.add('pseudo-full'); document.body.classList.add('lock'); };
    if (shell.requestFullscreen) shell.requestFullscreen().catch(fallback); else fallback();
  }
  function toggleFullscreen(id) {
    const shell = document.getElementById(id + 'Shell');
    if (!shell) return;
    if (document.fullscreenElement || shell.classList.contains('pseudo-full')) { exitFullscreen(); return; }
    enterFullscreen(shell);          // must run inside the click handler
    loadViz(shell);                  // make sure it is loaded
  }

  // ---- Clipboard ----
  async function copyLink() {
    const url = location.href.split('#')[0];
    try {
      await navigator.clipboard.writeText(url);
      toast('Website link copied');
    } catch {
      const t = document.createElement('textarea'); // fallback for non-secure contexts
      t.value = url; document.body.appendChild(t); t.select();
      const ok = document.execCommand('copy'); t.remove();
      ok ? toast('Website link copied') : toast('Copy failed. Copy the address bar link instead.', 'error');
    }
  }

  // ---- Wire everything up ----
  document.addEventListener('DOMContentLoaded', () => {
    const shells = [...document.querySelectorAll('.viz-shell')];

    // Lazy-load each viz shortly before it scrolls into view
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { loadViz(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '400px 0px' });
    shells.forEach((s) => io.observe(s));

    // One delegated click handler for every data-action button
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      switch (btn.dataset.action) {
        case 'fullscreen': toggleFullscreen(btn.dataset.target); break;
        case 'exit-fullscreen': exitFullscreen(); break;
        case 'retry': loadViz(btn.closest('.viz-shell'), true); break;
        case 'copy': copyLink(); break;
        case 'download': toast('Project summary downloading'); break; // link handles the download
        case 'top': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      }
    });

    // Esc closes the CSS-fallback fullscreen (native fullscreen handles Esc itself)
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') exitFullscreen(); });
  });
})();
