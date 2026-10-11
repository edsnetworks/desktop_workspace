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
            '<button type="button" class="mb-file" aria-haspopup="menu"></button>' +
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
        const fileBtn = bar.querySelector('.mb-file');
        const it = /^it\b/i.test(document.documentElement.lang || navigator.language || '');
        const L = it
            ? { file: 'File', newWin: 'Nuova finestra', newTab: 'Nuova scheda', closeTab: 'Chiudi scheda' }
            : { file: 'File', newWin: 'New Window', newTab: 'New Tab', closeTab: 'Close Tab' };
        fileBtn.textContent = L.file;

        function focusedWindow() {
            const wins = root.querySelectorAll('.desktop-window.is-focused:not(.is-minimized)');
            return wins[wins.length - 1] || null;
        }
        function closeMenu() { menuEl.hidden = true; menuEl.dataset.owner = ''; }
        function showMenu(anchor, owner, items) {
            menuEl.textContent = '';
            items.forEach((it2) => {
                const item = document.createElement('button');
                item.type = 'button'; item.setAttribute('role', 'menuitem');
                item.textContent = it2.label;
                if (it2.disabled) { item.disabled = true; item.classList.add('is-disabled'); }
                else item.addEventListener('click', () => { closeMenu(); it2.run(); });
                menuEl.appendChild(item);
            });
            const r = anchor.getBoundingClientRect();
            menuEl.style.left = Math.max(4, r.left) + 'px';
            menuEl.dataset.owner = owner;
            menuEl.hidden = false;
        }
        function toggleMenu(anchor, owner, build) {
            if (!menuEl.hidden && menuEl.dataset.owner === owner) { closeMenu(); return; }
            const items = build();
            if (!items.length) { closeMenu(); return; }
            showMenu(anchor, owner, items);
        }
        function appItems() {
            const w = focusedWindow();
            if (!w) return [];
            return ['minimize', 'maximize', 'close'].map((action) => {
                const src = w.querySelector('[data-action="' + action + '"]');
                return src ? { label: src.getAttribute('title') || action, run: () => src.click() } : null;
            }).filter(Boolean);
        }

        /* ---------- Files tabs (one iframe per window; each tab remembers a URL) ---------- */
        function filesFrame(win) {
            const f = win && win.querySelector('iframe.desktop-window-iframe');
            if (!f) return null;
            try {
                const u = new URL(f.contentWindow.location.href);
                return /\/apps\/files(?:\/|$)/.test(u.pathname) ? f : null;
            } catch (e) { return null; }
        }
        function frameUrl(f) { try { return f.contentWindow.location.href; } catch (e) { return f.src; } }
        function labelFor(urlStr) {
            try {
                const dir = new URL(urlStr).searchParams.get('dir') || '/';
                return dir.split('/').filter(Boolean).pop() || 'Files';
            } catch (e) { return 'Files'; }
        }
        function stripWindowParams(urlStr) {
            try { const u = new URL(urlStr); u.searchParams.delete('windowId'); u.searchParams.delete('openfile'); return u.toString(); }
            catch (e) { return urlStr; }
        }
        function ensureTabs(win) {
            if (win.__mbTabs) return win.__mbTabs;
            const f = filesFrame(win);
            if (!f) return null;
            const url = frameUrl(f);
            const bar2 = document.createElement('div');
            bar2.className = 'mb-tabs';
            bar2.hidden = true;
            const head = win.querySelector('.desktop-window-titlebar');
            head.parentNode.insertBefore(bar2, head.nextSibling);
            win.__mbTabs = { tabs: [{ url, label: labelFor(url) }], active: 0, el: bar2 };
            return win.__mbTabs;
        }
        function renderTabs(win) {
            const st = win.__mbTabs;
            if (!st) return;
            st.el.textContent = '';
            st.tabs.forEach((tab, i) => {
                const t = document.createElement('div');
                t.className = 'mb-tab' + (i === st.active ? ' is-active' : '');
                t.setAttribute('role', 'tab');
                const lab = document.createElement('span');
                lab.className = 'mb-tab-label'; lab.textContent = tab.label; lab.title = tab.label;
                const x = document.createElement('button');
                x.type = 'button'; x.className = 'mb-tab-close'; x.textContent = '×'; x.setAttribute('aria-label', L.closeTab);
                x.addEventListener('click', (e) => { e.stopPropagation(); closeTab(win, i); });
                t.addEventListener('click', () => switchTab(win, i));
                t.addEventListener('auxclick', (e) => { if (e.button === 1) closeTab(win, i); });
                t.append(lab, x);
                st.el.appendChild(t);
            });
            const plus = document.createElement('button');
            plus.type = 'button'; plus.className = 'mb-tab-add'; plus.textContent = '+'; plus.setAttribute('aria-label', L.newTab);
            plus.addEventListener('click', () => newTab(win));
            st.el.appendChild(plus);
            const many = st.tabs.length > 1;
            st.el.hidden = !many;
            win.classList.toggle('has-mb-tabs', many);
        }
        function navigateTo(win, url) {
            const f = win.querySelector('iframe.desktop-window-iframe');
            if (!f) return;
            win.__mbPending = true;
            f.addEventListener('load', () => { win.__mbPending = false; }, { once: true });
            setTimeout(() => { win.__mbPending = false; }, 5000);
            try { f.contentWindow.location.replace(url); } catch (e) { f.src = url; }
        }
        function saveActiveUrl(win) {
            const st = win.__mbTabs, f = st && filesFrame(win);
            if (!f || win.__mbPending) return false;
            const url = frameUrl(f), tab = st.tabs[st.active], label = labelFor(url);
            if (tab.url === url && tab.label === label) return false;
            tab.url = url; tab.label = label;
            return true;
        }
        function newTab(win) {
            const st = ensureTabs(win);
            if (!st) return;
            saveActiveUrl(win);
            const cur = st.tabs[st.active];
            st.tabs.push({ url: cur.url, label: cur.label });
            st.active = st.tabs.length - 1;
            renderTabs(win);
        }
        function switchTab(win, i) {
            const st = win.__mbTabs;
            if (!st || i === st.active) return;
            saveActiveUrl(win);
            st.active = i;
            renderTabs(win);
            navigateTo(win, st.tabs[i].url);
        }
        function closeTab(win, i) {
            const st = win.__mbTabs;
            if (!st || st.tabs.length < 2) return;
            saveActiveUrl(win);
            const wasActive = i === st.active;
            st.tabs.splice(i, 1);
            if (i < st.active) st.active -= 1;
            if (wasActive) {
                st.active = Math.min(i, st.tabs.length - 1);
                navigateTo(win, st.tabs[st.active].url);
            }
            renderTabs(win);
        }
        function newWindow() {
            const w = focusedWindow();
            const f = w && filesFrame(w);
            const href = f ? stripWindowParams(frameUrl(f)) : new URL('/index.php/apps/files/', location.origin).href;
            const img = root.querySelector('.desktop-window-icon img[src*="/apps/files/"], .desktop-pinned-app img[src*="/apps/files/"]');
            window.postMessage({
                type: 'nextcloud-desktop:open-file',
                appId: 'files-new-' + Date.now(),
                title: 'Files', subtitle: '', href,
                icon: img ? img.getAttribute('src') : '/apps/files/img/app.svg',
            }, location.origin);
        }
        function fileItems() {
            const w = focusedWindow();
            const isFiles = !!(w && filesFrame(w));
            const st = w && w.__mbTabs;
            return [
                { label: L.newWin, run: newWindow },
                { label: L.newTab, disabled: !isFiles, run: () => newTab(w) },
                { label: L.closeTab, disabled: !(st && st.tabs.length > 1), run: () => closeTab(w, st.active) },
            ];
        }
        setInterval(() => {
            document.querySelectorAll('.desktop-window').forEach((w) => {
                if (w.__mbTabs && saveActiveUrl(w)) renderTabs(w);
            });
        }, 700);

        appEl.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(appEl, 'app', appItems); });
        fileBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(fileBtn, 'file', fileItems); });
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
