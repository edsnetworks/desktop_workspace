/* Desktop Workspace search: a small Spotlight-style panel that queries Nextcloud's unified search
 * providers through the OCS API. It does not depend on the header search button, which newer
 * Nextcloud versions no longer render in the moved header. Results are plain links inside a
 * ".unified-search-overlay" container, so the desktop's link router opens them in desktop windows. */
(function () {
    'use strict';

    const it = /^it\b/i.test(document.documentElement.lang || navigator.language || '');
    const T = it
        ? { placeholder: 'Cerca in Nextcloud', none: 'Nessun risultato', searching: 'Ricerca in corso…', error: 'Ricerca non disponibile', hint: 'Digita per cercare · Esc per chiudere' }
        : { placeholder: 'Search Nextcloud', none: 'No results', searching: 'Searching…', error: 'Search unavailable', hint: 'Type to search · Esc to close' };

    const MAX_PER_PROVIDER = 6;
    let overlay = null;
    let input = null;
    let list = null;
    let status = null;
    let providers = null;
    let controller = null;
    let timer = 0;
    let serial = 0;

    function ocs(path) {
        const root = (window.OC && OC.getRootPath) ? OC.getRootPath() : '';
        return `${root}/ocs/v2.php/${path}`;
    }

    async function getJson(url, signal) {
        const response = await fetch(url, {
            credentials: 'same-origin',
            signal,
            headers: { 'OCS-APIRequest': 'true', Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
    }

    async function loadProviders(signal) {
        if (providers) return providers;
        const data = await getJson(ocs('search/providers?format=json'), signal);
        const items = (data && data.ocs && data.ocs.data) || [];
        providers = items.filter((p) => p && p.id).sort((a, b) => (a.order || 0) - (b.order || 0));
        return providers;
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function build() {
        if (overlay) return;
        overlay = el('div', 'desktop-search-overlay unified-search-overlay');
        overlay.hidden = true;
        const panel = el('div', 'desktop-search-panel');
        input = el('input', 'desktop-search-input');
        input.type = 'search';
        input.placeholder = T.placeholder;
        input.setAttribute('aria-label', T.placeholder);
        input.autocomplete = 'off';
        status = el('div', 'desktop-search-status', T.hint);
        list = el('div', 'desktop-search-results');
        panel.append(input, status, list);
        overlay.append(panel);
        document.body.append(overlay);

        overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) close(); });
        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(run, 250);
        });
        input.addEventListener('keydown', onInputKey);
        document.addEventListener('keydown', (event) => {
            if (overlay && !overlay.hidden && event.key === 'Escape') close();
        });
    }

    function links() {
        return Array.from(list.querySelectorAll('a.desktop-search-result'));
    }

    function onInputKey(event) {
        const all = links();
        if (!all.length) return;
        const current = all.indexOf(list.querySelector('a.is-active'));
        let next = -1;
        if (event.key === 'ArrowDown') next = Math.min(all.length - 1, current + 1);
        else if (event.key === 'ArrowUp') next = Math.max(0, current - 1);
        else if (event.key === 'Enter') {
            event.preventDefault();
            (all[current] || all[0]).click();
            return;
        }
        if (next < 0) return;
        event.preventDefault();
        all.forEach((a) => a.classList.remove('is-active'));
        all[next].classList.add('is-active');
        all[next].scrollIntoView({ block: 'nearest' });
    }

    function renderEntries(provider, entries) {
        if (!entries.length) return;
        const section = el('section', 'desktop-search-section');
        section.append(el('h4', 'desktop-search-heading', provider.name || provider.id));
        entries.slice(0, MAX_PER_PROVIDER).forEach((entry) => {
            const url = entry.resourceUrl || '';
            if (!url) return;
            const link = el('a', 'desktop-search-result');
            link.href = url;
            if (entry.thumbnailUrl || entry.icon) {
                const thumb = el('img', 'desktop-search-thumb');
                thumb.alt = '';
                thumb.loading = 'lazy';
                const src = entry.thumbnailUrl || (/^(https?:|\/)/.test(entry.icon || '') ? entry.icon : '');
                if (src) { thumb.src = src; link.append(thumb); }
            }
            const text = el('span', 'desktop-search-text');
            text.append(el('span', 'desktop-search-title', entry.title || url));
            if (entry.subline) text.append(el('span', 'desktop-search-subline', entry.subline));
            link.append(text);
            section.append(link);
        });
        if (section.querySelector('a')) list.append(section);
    }

    async function run() {
        const term = input.value.trim();
        const mine = ++serial;
        if (controller) controller.abort();
        list.replaceChildren();
        if (term.length < 2) { status.textContent = T.hint; return; }
        controller = new AbortController();
        const signal = controller.signal;
        status.textContent = T.searching;
        try {
            const all = await loadProviders(signal);
            let found = 0;
            await Promise.all(all.map(async (provider) => {
                try {
                    const url = ocs(`search/providers/${encodeURIComponent(provider.id)}/search?term=${encodeURIComponent(term)}&limit=${MAX_PER_PROVIDER}&format=json`);
                    const data = await getJson(url, signal);
                    if (mine !== serial) return;
                    const entries = (data && data.ocs && data.ocs.data && data.ocs.data.entries) || [];
                    found += entries.length;
                    renderEntries(provider, entries);
                    status.textContent = found ? '' : T.searching;
                } catch (error) {
                    if (error && error.name === 'AbortError') return;
                    /* a single provider can fail without hiding the others */
                }
            }));
            if (mine !== serial) return;
            status.textContent = list.querySelector('a') ? '' : T.none;
            const first = list.querySelector('a');
            if (first) first.classList.add('is-active');
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            if (mine === serial) status.textContent = T.error;
        }
    }

    function open() {
        build();
        overlay.hidden = false;
        input.focus();
        input.select();
    }

    function close() {
        if (!overlay) return;
        overlay.hidden = true;
        if (controller) controller.abort();
    }

    window.DesktopWorkspaceSearch = { open, close };
})();
