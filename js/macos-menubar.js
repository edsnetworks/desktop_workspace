/* macOS menu bar for Desktop Workspace (active only with decoration "macos"). */
(function () {
    'use strict';
    function init() {
        const root = document.getElementById('desktop-root');
        if (!root) return;
        const bar = document.createElement('div');
        bar.id = 'macos-menubar';
        bar.hidden = true;
        bar.innerHTML =
            '<button type="button" class="mb-logo" aria-label="Apps" title="Apps"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="6" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>' +
            '<button type="button" class="mb-app" aria-haspopup="menu"></button>' +
            '<div class="mb-menu" role="menu" hidden></div>' +
            '<span class="mb-spacer"></span>' +
            '<button type="button" class="mb-btn mb-search" aria-label="Search" title="Search"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
            '<button type="button" class="mb-btn mb-full" aria-label="Fullscreen" title="Fullscreen"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<time class="mb-clock"></time>';
        document.body.appendChild(bar);

        const appEl = bar.querySelector('.mb-app');
        const clockEl = bar.querySelector('.mb-clock');
        const lang = document.documentElement.lang || navigator.language || 'en';

        const click = (sel) => { const el = document.querySelector(sel); if (el) el.click(); };
        bar.querySelector('.mb-logo').addEventListener('click', () => click('#desktop-start'));
        bar.querySelector('.mb-search').addEventListener('click', () => click('#desktop-unified-search'));
        bar.querySelector('.mb-full').addEventListener('click', () => click('#desktop-fullscreen'));

        const menuEl = bar.querySelector('.mb-menu');
        function focusedWindow() {
            const wins = root.querySelectorAll('.desktop-window.is-focused:not(.is-minimized)');
            return wins[wins.length - 1] || null;
        }
        function closeMenu() { menuEl.hidden = true; }
        function openMenu() {
            const w = focusedWindow();
            menuEl.textContent = '';
            if (!w) { closeMenu(); return; }
            ['minimize', 'maximize', 'close'].forEach((action) => {
                const src = w.querySelector('[data-action="' + action + '"]');
                if (!src) return;
                const item = document.createElement('button');
                item.type = 'button'; item.setAttribute('role', 'menuitem');
                item.textContent = src.getAttribute('title') || action;
                item.addEventListener('click', () => { closeMenu(); src.click(); });
                menuEl.appendChild(item);
            });
            const r = appEl.getBoundingClientRect();
            menuEl.style.left = Math.max(4, r.left) + 'px';
            menuEl.hidden = false;
        }
        appEl.addEventListener('click', (e) => { e.stopPropagation(); menuEl.hidden ? openMenu() : closeMenu(); });
        document.addEventListener('click', (e) => { if (!bar.contains(e.target)) closeMenu(); }, true);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

        function activeTitle() {
            const wins = root.querySelectorAll('.desktop-window.is-focused:not(.is-minimized)');
            const w = wins[wins.length - 1];
            const t = w && w.querySelector('[data-window-title]');
            return t && t.textContent.trim() ? t.textContent.trim() : 'Desktop';
        }
        function tick() {
            const d = new Date();
            const h12 = root.dataset.clockHourCycle === '12';
            const fmt = (l) => d.toLocaleDateString(l, { weekday: 'short', day: 'numeric', month: 'short' }) + '  ' +
                d.toLocaleTimeString(l, { hour: '2-digit', minute: '2-digit', hour12: h12 });
            try { clockEl.textContent = fmt(lang.replace('_', '-')); } catch (e) { clockEl.textContent = fmt(undefined); }
        }
        function sync() {
            const on = root.dataset.decoration === 'macos';
            bar.hidden = !on;
            document.body.classList.toggle('has-macos-menubar', on);
            if (on) { appEl.textContent = activeTitle(); tick(); }
        }
        new MutationObserver(sync).observe(root, { attributes: true, subtree: true, attributeFilter: ['class', 'data-decoration'], childList: true, characterData: true });
        setInterval(tick, 15000);
        sync();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
