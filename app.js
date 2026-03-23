// MAIN DASHBOARD
//==============================================

const BOOKS = [];
const GOALS = {};

// Get the last commit date from GitHub
// ════════════════════════════════════════════════    
async function loadCommitDate() {
    try {
        const res = await fetch('https://api.github.com/repos/lauramarion/dreamteam/commits/main');
        const data = await res.json();
        const d = new Date(data.commit.committer.date);
        const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('commitTag').textContent = 'Dernière mise à jour du site : ' + date + ' à ' + time;
    } catch (e) {
        document.getElementById('commitTag').textContent = 'Dernière mise à jour : inconnue';
    }
}
// ════════════════════════════════════════════════    

function loadData() {
    const btn = document.getElementById('refreshBtn');
    const tag = document.getElementById('updateTag');
    btn.classList.add('loading');
    tag.textContent = 'Chargement…';
    tag.classList.add('loading');

    fetch(APPS_SCRIPT_URL)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => {
            const books = data.books || [];
            const goals = data.goals || {};
            const gen = data.generated || new Date().toISOString();
            const d = new Date(gen);
            const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            tag.textContent = 'Données au ' + label + ' à ' + time;
            tag.classList.remove('loading');
            btn.classList.remove('loading');
            render(books, goals, gen);
        })
        .catch(err => {
            console.error('Erreur de chargement:', err);
            tag.textContent = 'Erreur de chargement ⚠️';
            tag.classList.remove('loading')
            btn.classList.remove('loading');
        });
}

function render(books, goals, gen) {
    // Normalize: pagesLues >= pagesTotales > 0 means the book is finished
    books.forEach(b => {
        if (!b.fini && b.pagesTotales > 0 && b.pagesLues >= b.pagesTotales) b.fini = true;
    });
    const fin = books.filter(b => b.fini);
    const app = document.getElementById('app');
    app.innerHTML = '';
    const main = mk('main');
    const s1 = secStats(fin);       s1.id = 'sec-stats';    main.appendChild(s1);
    const encoursBooks = books.filter(b => !b.fini);
    const s0 = secEnCours(encoursBooks); s0.id = 'sec-encours'; main.appendChild(s0);
    const s2 = secDernieres(books); s2.id = 'sec-dernieres'; main.appendChild(s2);
    const s3 = secReaders(fin, goals); s3.id = 'sec-lectrices'; main.appendChild(s3);
    const s4 = secGenres(fin);      s4.id = 'sec-genres';   main.appendChild(s4);
    const s5 = secAnalyses(books);  s5.id = 'sec-analyses'; main.appendChild(s5);
    const s6 = secEditions(books);  s6.id = 'sec-editions'; main.appendChild(s6);
    const s7 = secTopShared(fin);   s7.id = 'sec-top';      main.appendChild(s7);
    const s8 = secAllBooks(books);  s8.id = 'sec-toutes';   main.appendChild(s8);
    app.appendChild(main);
    setTimeout(() => {
        loadCovers();
        if (window.lucide) lucide.createIcons();
        document.querySelectorAll('.breview').forEach(el => {
            if (el.scrollHeight <= el.clientHeight) return;
            const btn = document.createElement('div');
            btn.className = 'read-more-btn';
            btn.dataset.lucideDown = 'chevron-down';
            btn.dataset.lucideUp = 'chevron-up';
            setReadMoreLabel(btn, false);
            const footer = el.parentNode.querySelector('.dc-footer');
            if (footer) {
                footer.appendChild(btn);
            } else {
                el.parentNode.insertBefore(btn, el.nextSibling);
            }
            btn.addEventListener('click', () => {
                const expanded = el.classList.toggle('expanded');
                setReadMoreLabel(btn, expanded);
                if (window.lucide) lucide.createIcons({ root: btn });
            });
            if (window.lucide) lucide.createIcons({ root: btn });
        });
    }, 0);
    const tp = fin.reduce((s, b) => s + b.pagesTotales, 0);
    const nReaders = READERS.length;
    document.getElementById('footerStats').textContent =
        `${fin.length} livres · ${tp.toLocaleString('fr-FR')} pages`
        + ` · ${nReaders} lectrice${nReaders > 1 ? 's' : ''}`;
    buildHeaderNav();
}

// ── HEADER NAV ─────────────────────────
function buildHeaderNav() {
    const NAV_ITEMS = [
        { id: 'sec-stats',     label: 'Vue d\'ensemble' },
        { id: 'sec-encours',   label: 'En cours de lecture' },
        { id: 'sec-dernieres', label: 'Dernières lectures' },
        { id: 'sec-lectrices', label: 'Lectrices' },
        { id: 'sec-genres',    label: 'Genres' },
        { id: 'sec-analyses',  label: 'Analyses' },
        { id: 'sec-editions',  label: 'Éditions' },
        { id: 'sec-top',       label: 'Top & Commun' },
        { id: 'sec-toutes',    label: 'Toutes les lectures' },
    ];

    const navEl = document.getElementById('headerNavInner');
    if (!navEl) return;
    navEl.innerHTML = '';

    const links = {};
    NAV_ITEMS.forEach(item => {
        const sec = document.getElementById(item.id);
        if (!sec) return;
        const a = document.createElement('a');
        a.href = '#' + item.id;
        a.className = 'hnav-link';
        a.textContent = item.label;
        a.addEventListener('click', e => {
            e.preventDefault();
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        navEl.appendChild(a);
        links[item.id] = a;
    });

    // IntersectionObserver: mark the top-most visible section as active
    if (window._hnavObserver) window._hnavObserver.disconnect();
    const setActive = id => {
        Object.values(links).forEach(a => a.classList.remove('active'));
        if (links[id]) links[id].classList.add('active');
    };
    const visible = new Set();
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) visible.add(e.target.id);
            else visible.delete(e.target.id);
        });
        // Pick the first nav item that's currently visible
        const active = NAV_ITEMS.find(item => visible.has(item.id));
        if (active) setActive(active.id);
    }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 });

    NAV_ITEMS.forEach(item => {
        const sec = document.getElementById(item.id);
        if (sec) obs.observe(sec);
    });
    window._hnavObserver = obs;
    // Activate first by default
    if (NAV_ITEMS[0] && links[NAV_ITEMS[0].id]) links[NAV_ITEMS[0].id].classList.add('active');
}

// ── EN COURS DE LECTURE ────────────────
function secEnCours(encoursBooks) {
    const w = sec();
    w.appendChild(slabel('En cours de lecture', 'var(--mint)'));
    if (encoursBooks.length === 0) {
        const empty = mk('div', 'dc-empty');
        empty.textContent = 'Aucun livre en cours de lecture...';
        w.appendChild(empty);
        return w;
    }
    
    // Reverse so the most recently added book is first
    const g = mk('div', 'encours-grid fade');
    [...encoursBooks].reverse().forEach(b => {
        const col = COLORS[b.lectrice] || 'var(--muted)';
        const card = mk('div', 'base-card ecard');
        
        let pct = 0;
        let pTxt = 'Pages non renseignées';
        let pctTxt = '-';
        if (b.pagesTotales > 0) {
            pct = Math.min(100, Math.round((b.pagesLues || 0) / b.pagesTotales * 100));
            pTxt = `${b.pagesLues || 0} / ${b.pagesTotales} p`;
            pctTxt = `${pct}%`;
        }
        
        // Use color-mix for pastel wash background 
        const bgStyle = `background: color-mix(in srgb, ${col} 15%, transparent)`;

        card.innerHTML = `
            <div class="ec-top" style="${bgStyle}">
                <span class="ec-pill">${EMOJI[b.lectrice] || ''} ${b.lectrice}</span>
                <span class="ec-genre">${ge(b.genre) || '📚'}</span>
            </div>
            <div class="ec-bottom">
                <div class="ec-title-wrap">
                    <div class="ec-title" title="${b.titre.replace(/"/g, '&quot;')}">${b.titre}</div>
                    <div class="ec-author">${b.auteur}</div>
                </div>
                <div class="ec-progress">
                    <div class="ec-progress-track">
                        <div class="ec-progress-fill" style="width:${pct}%;background:${col}"></div>
                    </div>
                    <div class="ec-stats">
                        <span class="ec-pc">${pTxt}</span>
                        <span class="ec-pct" style="color:${col}">${pctTxt}</span>
                    </div>
                </div>
            </div>
        `;
        g.appendChild(card);
    });
    
    const wrapper = mk('div', 'encours-wrapper fade');
    wrapper.appendChild(g);
    
    setTimeout(() => {
        const checkScroll = () => {
            if (g.scrollWidth > g.clientWidth) {
                wrapper.classList.add('has-scroll');
            } else {
                wrapper.classList.remove('has-scroll');
            }
        };
        checkScroll();
        g.addEventListener('scroll', () => {
            // Left fade indicator
            if (g.scrollLeft > 5) wrapper.classList.add('is-scrolled');
            else wrapper.classList.remove('is-scrolled');
            
            // Right fade indicator
            if (g.scrollWidth - g.scrollLeft - g.clientWidth < 10) {
                wrapper.classList.remove('has-scroll');
            } else {
                wrapper.classList.add('has-scroll');
            }
        });
        window.addEventListener('resize', checkScroll);
    }, 100);

    w.appendChild(wrapper); 
    return w;
}

// ── STATS ──────────────────────────────
function animateCount(el, endValue, { duration = 900, decimals = 0, suffix = '', delay = 0 } = {}) {
    setTimeout(() => {
        const startTime = performance.now();
        function step(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const value = eased * endValue;
            el.textContent = (decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('fr-FR')) + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }, delay);
}

function secStats(books) {
    const w = sec();
    w.appendChild(slabel('Vue d\'ensemble', 'var(--navy)'));
    const g = mk('div', 'stats-row fade');
    const total = books.length, pages = books.reduce((s, b) => s + b.pagesTotales, 0);
    const rated = books.filter(b => b.note && b.note > 0);
    const avgN = rated.length ? (rated.reduce((s, b) => s + b.note, 0) / rated.length) : null;
    const avgP = total ? Math.round(pages / total) : 0;
    const wd = books.filter(b => b.jours > 0 && b.jours < 365);
    const avgJ = wd.length ? (wd.reduce((s, b) => s + b.jours, 0) / wd.length) : null;
    [
        { i: 'book', l: 'Livres lus', v: total, animate: { end: total, decimals: 0 }, s: 'depuis janvier 2026', dark: true, c: 'var(--white)' },
        { i: 'file-text', l: 'Pages lues', v: pages, animate: { end: pages, decimals: 0 }, s: 'pages', dark: false, c: 'var(--teal)' },
        { i: 'star', l: 'Note moyenne', v: avgN, animate: avgN ? { end: avgN, decimals: 1 } : null, s: '/5', dark: false, c: 'var(--gold)' },
        { i: 'book-open', l: 'Pages / livre', v: avgP, animate: { end: avgP, decimals: 0 }, s: 'moyenne par livre', dark: false, c: 'var(--mint)' },
        { i: 'timer', l: 'Jours / livre', v: avgJ, animate: avgJ ? { end: avgJ, decimals: 1 } : null, s: 'moyenne par livre', dark: false, c: 'var(--coral)' },
    ].forEach((t, idx) => {
        const tile = mk('div', `base-card stat-tile${t.dark ? ' dark' : ''}`);
        const displayVal = t.v == null ? '—' : (t.animate ? '0' : t.v);
        const stvEl = mk('div', 'stv');
        stvEl.textContent = displayVal;
        const stiWrap = mk('div', 'sti-wrap');
        const icon = document.createElement('i');
        icon.dataset.lucide = t.i;
        // Pass accent color via CSS variable instead of inline stroke
        icon.style.setProperty('--stat-icon-color', t.c);
        stiWrap.appendChild(icon);
        const stl = mk('div', 'stl');
        stl.textContent = t.l;
        tile.appendChild(stiWrap);
        tile.appendChild(stl);
        tile.appendChild(stvEl);
        const sts = mk('div', 'sts');
        sts.textContent = t.s;
        const accent = mk('div', 'st-accent');
        accent.style.background = t.c;
        sts.appendChild(accent);
        tile.appendChild(sts);
        if (t.animate && t.v != null) {
            animateCount(stvEl, t.animate.end, {
                decimals: t.animate.decimals || 0,
                suffix: t.animate.suffix || '',
                delay: idx * 80,
            });
        }
        g.appendChild(tile);
    });
    w.appendChild(g); return w;
}

// ── DERNIÈRES LECTURES ─────────────────
function secDernieres(books) {
    const w = sec();
    w.appendChild(slabel('Dernières lectures', 'var(--coral)'));
    const fin = books.filter(b => b.fini);
    // build map: last finished book per reader
    const last = {};
    fin.forEach(b => { last[b.lectrice] = b; });
    const g = mk('div', 'dernieres-grid fade');

    READERS.forEach(r => {
        const b = last[r];
        const col = COLORS[r] || 'var(--muted)';
        const card = mk('div', 'base-card derniere-card');
        card.style.borderTop = `3px solid ${col}`;
        if (!b) {
            card.innerHTML = `<span class="rtag" style="background:${col};position:absolute;top:10px;right:10px">${EMOJI[r] || ''} ${r}</span><div class="dc-empty">Rien encore… 📚</div>`;
        } else {
            const tags = b.motsCles ? b.motsCles.split(',').slice(0, 3).map(t => `<span class="btag">${t.trim()}</span>`).join('') : '';
            card.innerHTML = `
            <span class="rtag" style="background:${col};position:absolute;top:10px;right:10px">${EMOJI[r] || ''} ${r}</span>
            <div class="dc-cover-row">
              <div class="bcover sm js-cover" data-title="${b.titre.replace(/"/g, '&quot;')}" data-author="${b.auteur.replace(/"/g, '&quot;')}" data-emoji="${ge(b.genre)}">${ge(b.genre)}</div>
              <div class="dc-info">
                <div class="dc-title"><a href="${getGoodreadsLink(b.titre, b.auteur)}" target="_blank" class="book-title-link">${b.titre}</a></div>
                <div class="bauthor"><i data-lucide="user"></i> ${b.auteur}</div>
                <div class="dc-meta">
                  ${b.note > 0 ? `<span class="dc-stars"><span class="rating-star">★</span> ${b.note}/5</span>` : ''}
                  ${b.pagesTotales ? `<span>${b.pagesTotales}p</span>` : ''}
                  ${b.genre ? `<span style="color:${gc(b.genre)}">${b.genre}</span>` : ''}
                </div>
              </div>
            </div>
            ${b.avis ? `<div class="breview">« ${b.avis} »</div>` : ''}
            <div class="dc-footer">
              ${tags ? `<div class="btags">${tags}</div>` : ''}
            </div>
          `;
        }
        g.appendChild(card);
    });

    w.appendChild(g); return w;
}

// ── READER CARDS ───────────────────────
function secReaders(books, goals) {
    const w = sec();
    w.appendChild(slabel('Les Lectrices', 'var(--teal)'));
    const g = mk('div', 'readers-grid fade');
    const totalBooks = books.length;
    READERS.forEach(r => {
        const rb = books.filter(b => b.lectrice === r);
        const pages = rb.reduce((s, b) => s + b.pagesTotales, 0);
        const rated = rb.filter(b => b.note && b.note > 0);
        const avgN = rated.length ? (rated.reduce((s, b) => s + b.note, 0) / rated.length).toFixed(1) : '—';
        const avgP = rb.length ? Math.round(pages / rb.length) : 0;
        const pctG = totalBooks ? Math.round(rb.length / totalBooks * 100) : 0;
        const col = COLORS[r], goal = goals?.[r] || 100;
        const pctC = Math.min(100, Math.round(rb.length / goal * 100));
        const link = goals?.[r + '_link'] || '#';
        const card = mk('div', 'base-card reader-card');
        card.style.borderTop = `4px solid ${col}`;
        card.innerHTML = `
          <div class="rc-header">
            <div class="rc-name">${EMOJI[r]} ${r}</div>
            <a href="${link}" target="_blank" class="rc-link" title="Goodreads">↗</a>
          </div>
          <div class="rc-rows">
            <div class="rc-row"><span>Livres</span><strong>${rb.length}</strong></div>
            <div class="rc-row"><span>Pages</span><strong>${pages.toLocaleString('fr-FR')}</strong></div>
            <div class="rc-row">
              <span>Note moy.</span>
              <strong>${avgN !== '—' ? '<span class="rating-star">★</span> ' : ''}${avgN}</strong>
            </div>
            <div class="rc-row"><span>Pages / livre</span><strong>${avgP}</strong></div>
          </div>
          <div class="rc-progress">
            <div>
              <div class="prow-label"><span>Part du groupe</span><span>${pctG}%</span></div>
              <div class="pbar"><div class="pbar-f" style="width:${pctG}%;background:${col}"></div></div>
            </div>
            <div>
              <div class="prow-label"><span>Objectif · ${rb.length}/${goal}</span><span>${pctC}%</span></div>
              <div class="pbar"><div class="pbar-f" style="width:${pctC}%;background:${col}88"></div></div>
            </div>
          </div>
        `;
        g.appendChild(card);
    });
    w.appendChild(g); return w;
}

// ── GENRE MULTIPLES ────────────────────
function secGenres(books) {
    const w = sec();
    w.appendChild(slabel('Genres lus par lectrice', 'var(--teal)'));
    const g = mk('div', 'gm-grid fade');
    READERS.forEach(r => {
        const rb = books.filter(b => b.lectrice === r);
        const counts = {}; rb.forEach(b => { if (b.genre) counts[b.genre] = (counts[b.genre] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const max = sorted[0]?.[1] || 1, col = COLORS[r];
        const col_el = mk('div', 'gm-col');
        const rows = sorted.map(([g, n]) => `<div class="gr-row"><span class="gr-name">${g}</span><div class="gr-bar"><div class="gr-fill" style="width:${Math.round(n / max * 100)}%;background:${gc(g)}"></div></div><span class="gr-n">${n}</span></div>`).join('');
        col_el.innerHTML = `
          <div class="gm-head" style="border-color:${col}40">
            <div class="gm-name">${EMOJI[r]} ${r}</div>
            <span class="gm-cnt">${rb.length} livres</span>
          </div>
          ${rows}
        `;
        g.appendChild(col_el);
    });
    w.appendChild(g); return w;
}

// ── ANALYSES ───────────────────────────
function secAnalyses(books) {
    const w = sec();
    w.appendChild(slabel('Analyses', 'var(--teal)'));
    const g = mk('div', 'analyses-grid fade');

    const fin = books.filter(b => b.fini);

    // genre donut
    const gc2 = {}; fin.forEach(b => { if (b.genre) gc2[b.genre] = (gc2[b.genre] || 0) + 1; });
    g.appendChild(donutCard('Genres littéraires', gc2, fin.length, 'var(--teal)'));

    // auteur donut
    const ga = {}; fin.forEach(b => { if (b.genreAuteur) ga[b.genreAuteur] = (ga[b.genreAuteur] || 0) + 1; });
    const gaC = { 'Femme': 'var(--teal)', 'Homme': 'var(--navy)', 'Mixte': 'var(--coral)', 'Non-binaire': 'var(--gold)', 'Femmes': 'var(--teal)', 'Hommes': 'var(--navy)' };
    g.appendChild(donutCard('Genre des auteur·ices', ga, fin.length, 'var(--mint)', gaC));

    // monthly bar
    const byM = {}; MONTHS.forEach(m => byM[m] = 0);
    fin.forEach(b => { if (b.mois && byM[b.mois] !== undefined) byM[b.mois]++; });
    const vals = MONTHS.map(m => byM[m]), maxM = Math.max(...vals, 1);
    const bc = mk('div', 'base-card acard');
    bc.innerHTML = `<div class="acard-title"><span style="width:8px;height:8px;border-radius:50%;background:var(--coral);display:inline-block"></span>Livres par mois</div>`;
    const bw = mk('div', 'monthly-bars');
    MONTHS.forEach((m, i) => {
        const v = vals[i], pct = Math.round(v / maxM * 100);
        const c = mk('div', 'mbc');
        c.innerHTML = `${v > 0 ? `<span class="mb-val">${v}</span>` : '<span class="mb-val" style="opacity:0">0</span>'}<div class="mb-bar" style="height:${Math.max(pct, v > 0 ? 4 : 1)}%;background:${v > 0 ? 'var(--navy)' : 'var(--border)'}"></div><span class="mb-lbl">${MSHORT[i]}</span>`;
        bw.appendChild(c);
    });
    bc.appendChild(bw); g.appendChild(bc);

    // format horizontal bar
    const fCounts = {}; fin.forEach(b => { if (b.format) fCounts[b.format] = (fCounts[b.format] || 0) + 1; });
    const fSorted = Object.entries(fCounts).sort((a, b) => b[1] - a[1]), fMax = fSorted[0]?.[1] || 1;
    const fc = mk('div', 'base-card acard ac-full');
    fc.innerHTML = `<div class="acard-title"><span style="width:8px;height:8px;border-radius:50%;background:var(--text-light);display:inline-block"></span>FORMATS</div>`;
    fSorted.forEach(([f, n]) => {
        const row = mk('div', 'hb-row');
        row.innerHTML = `<span class="hb-label">${f}</span><div class="hb-track"><div class="hb-fill" style="width:${Math.round(n / fMax * 100)}%"></div></div><span class="hb-val">${n}</span>`;
        fc.appendChild(row);
    });
    g.appendChild(fc);

    // keywords cloud
    const kwCounts = {};
    books.forEach(b => { if (!b.motsCles) return; b.motsCles.split(',').forEach(k => { const t = k.trim().toLowerCase(); if (t) kwCounts[t] = (kwCounts[t] || 0) + 1; }); });
    const kwSorted = Object.entries(kwCounts).sort((a, b) => b[1] - a[1]), maxC = kwSorted[0]?.[1] || 1;
    const kwCard = mk('div', 'base-card acard ac-full');
    kwCard.innerHTML = `<div class="acard-title"><span style="width:8px;height:8px;border-radius:50%;background:var(--coral);display:inline-block"></span>MOTS-CLÉS POPULAIRES</div>`;
    const cloud = mk('div', 'kcloud');
    kwSorted.forEach(([k, n]) => {
        const tag = mk('span', 'ktag');
        tag.style.fontSize = (11 + Math.round(n / maxC * 5)) + 'px';
        tag.style.opacity = (0.55 + n / maxC * 0.45) + '';
        tag.textContent = `${k} (${n})`;
        cloud.appendChild(tag);
    });
    kwCard.appendChild(cloud); g.appendChild(kwCard);

    // pages bubbles
    const bbCard = mk('div', 'base-card acard ac-full');
    bbCard.innerHTML = `<div class="acard-title"><span style="width:8px;height:8px;border-radius:50%;background:var(--navy);display:inline-block"></span>PAGES PAR LIVRE</div>`;
    const bbWrap = mk('div', 'bubble-wrap');
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.classList.add('bubble-svg'); svgEl.setAttribute('height', '380'); // Increased height
    bbWrap.appendChild(svgEl); bbCard.appendChild(bbWrap);

    // Add Size Legend
    const legend = mk('div', 'sz-legend');
    legend.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:24px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);';
    [200, 500, 1000].forEach(p => {
        const item = mk('div', 'sz-item');
        item.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:11px;font-family:Space Grotesk,sans-serif;font-weight:700;color:var(--text-light);';
        // Mock radius for legend
        const sampleMax = 1200; // Reference for legend
        const r = 3 + Math.pow(Math.max(0, (p - 40)) / (sampleMax - 40), 0.6) * 39;
        item.innerHTML = `<div style="width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:var(--navy-pale);border:1.5px solid var(--border)"></div><span>${p} pages</span>`;
        legend.appendChild(item);
    });
    bbCard.appendChild(legend);

    const tip = document.getElementById('tooltip');
    setTimeout(() => {
        const W = bbWrap.clientWidth - 8, H = 340; // Increased H for more vertical space
        svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`); svgEl.setAttribute('width', W);
        const allP = books.filter(b => b.pagesTotales > 0).map(b => b.pagesTotales), maxP = Math.max(...allP, 1);
        const rad = p => 3 + Math.pow(Math.max(0, (p - 40)) / (maxP - 40), 0.6) * 39;
        const slotW = W / READERS.length;

        READERS.forEach((r, ri) => {
            const rb = books.filter(b => b.lectrice === r && b.pagesTotales > 0), col = COLORS[r], cx0 = slotW * ri + slotW / 2;
            const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            lbl.setAttribute('x', cx0); lbl.setAttribute('y', H - 6); lbl.setAttribute('text-anchor', 'middle');
            lbl.setAttribute('font-size', '12'); lbl.setAttribute('fill', 'var(--text-mid)'); lbl.setAttribute('font-family', 'Space Grotesk,sans-serif'); lbl.setAttribute('font-weight', '700'); lbl.textContent = `${EMOJI[r]} ${r}`; svgEl.appendChild(lbl);

            const placed = [];
            [...rb].sort((a, b) => b.pagesTotales - a.pagesTotales).forEach(b => {
                const rr = rad(b.pagesTotales);
                // Beeswarm vertical placement: start at center, try to pack
                let cx = cx0;
                let cy = (H - 40) / 2;

                // Random jitter for natural look
                cx += (Math.random() - 0.5) * 10;
                cy += (Math.random() - 0.5) * (H * 0.4);

                const cx_ = () => { cx = Math.max(slotW * ri + rr + 2, Math.min(slotW * (ri + 1) - rr - 2, cx)); };
                const cy_ = () => { cy = Math.max(rr + 10, Math.min(H - 30 - rr, cy)); };

                cx_(); cy_();
                // Collision resolution
                for (let i = 0; i < 120; i++) {
                    placed.forEach(p => {
                        const dx = cx - p.cx, dy = cy - p.cy, d = Math.sqrt(dx * dx + dy * dy), mn = rr + p.r + 3;
                        if (d < mn && d > 0.01) {
                            const push = (mn - d) * 0.6;
                            cx += (dx / d || 0) * push;
                            cy += (dy / d || 0) * push;
                        }
                    });
                    cx_(); cy_();
                }
                placed.push({ cx, cy, r: rr });

                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.style.transition = 'transform 0.2s';
                g.style.cursor = 'pointer';

                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', rr); c.setAttribute('fill', col); c.setAttribute('fill-opacity', '0.75'); c.setAttribute('stroke', col); c.setAttribute('stroke-width', '1.5');

                g.appendChild(c);

                g.addEventListener('mouseenter', () => {
                    tip.style.opacity = 1;
                    tip.innerHTML = `<strong>${b.titre}</strong><br>${b.lectrice} · ${b.pagesTotales}p${b.note && b.note > 0 ? ' · <span class="rating-star">★</span> ' + b.note : ''}`;
                    c.setAttribute('fill-opacity', '1');
                    c.setAttribute('stroke-width', '2.5');
                });
                g.addEventListener('mousemove', e => { tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY - 40) + 'px'; });
                g.addEventListener('mouseleave', () => {
                    tip.style.opacity = 0;
                    c.setAttribute('fill-opacity', '0.75');
                    c.setAttribute('stroke-width', '1.5');
                });

                svgEl.appendChild(g);

                if (rr >= 24) {
                    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    t.setAttribute('x', cx); t.setAttribute('y', cy + 3); t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '9'); t.setAttribute('fill', 'var(--white)'); t.setAttribute('font-family', 'Space Grotesk,sans-serif'); t.setAttribute('font-weight', '700'); t.setAttribute('pointer-events', 'none');
                    t.textContent = b.titre.length > 14 ? b.titre.slice(0, 12) + '…' : b.titre; svgEl.appendChild(t);
                }
            });
        });
    }, 100);
    g.appendChild(bbCard);
    w.appendChild(g); return w;
}

function donutCard(title, counts, total, dotColor, colorMap) {
    const card = mk('div', 'base-card acard');
    card.innerHTML = `<div class="acard-title"><span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block"></span>${title.toUpperCase()}</div>`;
    const localTotal = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const sumUsed = sorted.reduce((s, v) => s + v[1], 0);
    const r = 38, cx = 50, cy = 50, circ = 2 * Math.PI * r;
    let off = 0;
    const segs = sorted.map(([k, n]) => {
        const pct = n / localTotal, arc = circ * pct;
        const s = { k, n, pct, arc, off, color: (colorMap && colorMap[k]) || gc(k) }; off += arc; return s;
    });

    if (sumUsed < localTotal) {
        const n = localTotal - sumUsed;
        const pct = n / localTotal, arc = circ * pct;
        segs.push({ k: 'Autres', n, pct, arc, off, color: 'var(--donut-other)' });
        off += arc;
    }

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '145'); svgEl.setAttribute('height', '145'); svgEl.setAttribute('viewBox', '0 0 100 100');
    svgEl.style.transform = 'rotate(-90deg)'; svgEl.style.flexShrink = '0';
    segs.forEach(s => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
        c.setAttribute('fill', 'none'); c.setAttribute('stroke', s.color); c.setAttribute('stroke-width', '24');
        c.setAttribute('stroke-dasharray', `${s.arc} ${circ - s.arc}`);
        c.setAttribute('stroke-dashoffset', `-${s.off}`);
        svgEl.appendChild(c);
    });

    const leg = mk('div', 'donut-legend');
    const frag = document.createDocumentFragment();
    segs.forEach(s => {
        const pct = Math.round(s.pct * 100);
        const item = mk('div', 'dl-item');
        const dot = mk('div', 'dl-dot');
        dot.style.background = s.color;
        const name = mk('span', 'dl-name');
        name.title = s.k;
        name.textContent = s.k;
        const pctEl = mk('span', 'dl-pct');
        pctEl.textContent = pct + '%';
        item.appendChild(dot);
        item.appendChild(name);
        item.appendChild(pctEl);
        frag.appendChild(item);
    });
    leg.appendChild(frag);
    const wrap = mk('div', 'donut-wrap');
    wrap.appendChild(svgEl);
    wrap.appendChild(leg);
    card.appendChild(wrap);
    return card;
}


// ── MAISONS D'ÉDITION ──────────────────
function secEditions(books) {
    const w = sec();
    w.appendChild(slabel("Maisons d'édition", 'var(--pink)'));
    const g = mk('div', 'two-col fade');

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    // TOP 20 MAISONS
    const meCounts = {};
    books.forEach(b => {
        if (b.maisonEdition) {
            const v = b.maisonEdition.trim();
            if (v) {
                const nv = capitalize(v);
                if (!meCounts[nv]) meCounts[nv] = { total: 0, genres: new Set() };
                meCounts[nv].total += 1;
                if (b.genre) meCounts[nv].genres.add(b.genre);
            }
        }
    });
    const meSorted = Object.entries(meCounts).sort((a, b) => b[1].total - a[1].total).slice(0, 20);
    const meMax = meSorted[0]?.[1].total || 1;

    const p1 = mk('div', 'base-card panel');
    p1.innerHTML = `<div class="panel-title"><span style="width:8px;height:8px;border-radius:50%;background:var(--pink);display:inline-block"></span>TOP 20 MAISONS D'ÉDITION</div>`;
    const w1 = mk('div', '');
    if (meSorted.length === 0) {
        w1.innerHTML = '<div style="color:var(--text-light);font-size:12px;font-style:italic">Aucune donnée trouvée</div>';
    } else {
        meSorted.forEach(([f, info]) => {
            const n = info.total;
            const emojis = Array.from(info.genres).map(g => ge(g)).join('');
            const row = mk('div', 'hb-row');
            row.style.marginBottom = '12px';
            row.innerHTML = `<span class="hb-label" style="text-transform:none;width:160px;text-align:left;font-size:12px;color:var(--text);display:flex;align-items:center;justify-content:space-between;gap:5px"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${f}">${f}</span><span style="font-size:11px;flex-shrink:0;letter-spacing:-1px">${emojis}</span></span><div class="hb-track"><div class="hb-fill" style="width:${Math.round(n / meMax * 100)}%;background:var(--pink)"></div></div><span class="hb-val">${n}</span>`;
            w1.appendChild(row);
        });
    }
    p1.appendChild(w1);
    g.appendChild(p1);

    // MOST COMMON PER GENRE
    const byGenre = {};
    books.forEach(b => {
        if (b.genre && b.maisonEdition) {
            const gn = b.genre;
            const m = b.maisonEdition.trim();
            if (m) {
                const nv = capitalize(m);
                if (!byGenre[gn]) byGenre[gn] = {};
                byGenre[gn][nv] = (byGenre[gn][nv] || 0) + 1;
            }
        }
    });

    const p2 = mk('div', 'base-card panel');
    p2.innerHTML = `<div class="panel-title"><span style="width:8px;height:8px;border-radius:50%;background:var(--teal);display:inline-block"></span>ÉDITEURS FAVORIS PAR GENRE</div>`;

    const gSorted = Object.keys(byGenre).sort((a, b) => Object.values(byGenre[b]).reduce((x, y) => x + y, 0) - Object.values(byGenre[a]).reduce((x, y) => x + y, 0));
    const w2 = mk('div', '');

    if (gSorted.length === 0) {
        w2.innerHTML = '<div style="color:var(--text-light);font-size:12px;font-style:italic">Aucune donnée trouvée</div>';
    } else {
        gSorted.forEach(genre => {
            const gc_res = byGenre[genre];
            const topM = Object.entries(gc_res).sort((a, b) => b[1] - a[1])[0];

            const row = mk('div', 'top-row');
            row.style.cssText = "padding:12px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between";
            row.innerHTML = `
            <div style="font-size:13px;font-weight:700;color:${gc(genre)};display:flex;align-items:center;gap:10px">
              <span style="font-size:18px">${ge(genre)}</span> <span>${genre}</span>
            </div>
            <div style="font-size:13px;color:var(--text);font-weight:700;text-align:right">
              ${topM[0]} <span style="background:var(--bg);color:var(--text-mid);padding:3px 8px;border-radius:99px;font-size:11px;margin-left:8px;border:1px solid var(--border)">${topM[1]} livres</span>
            </div>
          `;
            w2.appendChild(row);
        });
        if (w2.lastChild) w2.lastChild.style.borderBottom = 'none';
    }
    p2.appendChild(w2);
    g.appendChild(p2);

    w.appendChild(g);
    return w;
}

// ── TOP + SHARED ───────────────────────
function secTopShared(books) {
    const w = sec();
    const g = mk('div', 'two-col fade');

    // TOP
    const tp = mk('div', 'base-card panel');
    tp.innerHTML = `<div class="panel-title"><span style="width:8px;height:8px;border-radius:50%;background:var(--gold);display:inline-block"></span>TOP LECTURES NOTÉES</div>`;
    [...books].filter(b => b.note && b.note > 0).sort((a, b) => b.note - a.note).slice(0, 5).forEach((b, i) => {
        const row = mk('div', 'top-row');
        const col = COLORS[b.lectrice] || 'var(--muted)';
        row.innerHTML = `
          <span class="top-rank">#${i + 1}</span>
          <div class="tcover js-cover" data-title="${b.titre.replace(/"/g, '&quot;')}" data-author="${b.auteur.replace(/"/g, '&quot;')}" data-emoji="${ge(b.genre)}">${ge(b.genre)}</div>
          <div class="top-content">
            <div class="top-title"><a href="${getGoodreadsLink(b.titre, b.auteur)}" target="_blank" class="book-title-link">${b.titre}</a></div>
            <div class="top-author">${b.auteur}</div>
            <div class="dc-meta">
              <span class="rtag" style="background:${col};font-size:10px;padding:2px 7px">${EMOJI[b.lectrice] || ''} ${b.lectrice}</span>
              ${b.note > 0 ? `<span class="dc-stars"><span class="rating-star">★</span> ${b.note}/5</span>` : ''}
            </div>
          </div>
        `;
        tp.appendChild(row);
    });

    // SHARED
    const sp = mk('div', 'base-card panel');
    sp.innerHTML = `<div class="panel-title"><span style="width:8px;height:8px;border-radius:50%;background:var(--mint);display:inline-block"></span>LECTURES EN COMMUN</div>`;
    const byT = {};
    books.forEach(b => {
        const k = b.titre.toLowerCase().replace(/[^a-zàâéèêëîïôùûü]/g, '').slice(0, 22);
        if (!byT[k]) byT[k] = { titre: b.titre, genre: b.genre, entries: [] }; byT[k].entries.push(b);
    });
    Object.values(byT).filter(g => new Set(g.entries.map(e => e.lectrice)).size >= 2)
        .sort((a, b) => new Set(b.entries.map(e => e.lectrice)).size - new Set(a.entries.map(e => e.lectrice)).size)
        .forEach(g => {
            const byR = {}; g.entries.forEach(e => { if (!byR[e.lectrice]) byR[e.lectrice] = e; });
            const chips = READERS.filter(r => byR[r]).map(r => {
                const e = byR[r], col = COLORS[r];
                const rate = e.note && e.note > 0 ? `<span class="crate"><span class="rating-star">★</span> ${e.note}</span>` : `<span class="cnone">—</span>`;
                return `<div class="sh-chip" style="border-color:${col}30"><span class="cname" style="background:${col}">${EMOJI[r]} ${r}</span>${rate}</div>`;
            }).join('');
            const row = mk('div', 'sh-row');
            const _e = g.entries[0]; row.innerHTML = `<div class="sh-cover js-cover" data-title="${g.titre.replace(/"/g, '&quot;')}" data-author="${(_e?.auteur || '').replace(/"/g, '&quot;')}" data-emoji="${ge(g.genre)}">${ge(g.genre)}</div><div class="sh-content"><div class="sh-title"><a href="${getGoodreadsLink(g.titre, _e?.auteur)}" target="_blank" class="book-title-link">${g.titre}</a></div><div class="sh-chips">${chips}</div></div>`;
            sp.appendChild(row);
        });

    g.appendChild(tp); g.appendChild(sp); w.appendChild(g); return w;
}



// ── ALL BOOKS ──────────────────────────
function secAllBooks(books) {
    const w = sec();
    w.appendChild(slabel('Toutes les lectures 2026', 'var(--navy)'));
    const card = mk('div', 'card fade');
    card.style.padding = '20px';
    const fin = books.filter(b => b.fini);
    let activeF = 'Toutes';
    let activeM = 'Tous';

    const header = mk('div', 'ab-header');

    // Reader Tabs
    const tabs = mk('div', 'filter-tabs');
    ['Toutes', ...READERS].forEach(r => {
        const tab = mk('div', `ftab${r === 'Toutes' ? ' active' : ''}`);
        if (r !== 'Toutes') tab.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${COLORS[r]};display:inline-block"></span>${r}`;
        else tab.textContent = 'Toutes';
        tab.addEventListener('click', () => {
            tabs.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active'); activeF = r; renderBList();
        });
        tabs.appendChild(tab);
    });
    header.appendChild(tabs);

    // Month Filter
    const mWrap = mk('div', 'mfilter-wrap');
    const mSelect = mk('select', 'm-select');
    const optAll = mk('option'); optAll.value = 'Tous'; optAll.textContent = 'Tous les mois';
    mSelect.appendChild(optAll);
    MONTHS.forEach(m => {
        const opt = mk('option'); opt.value = m; opt.textContent = m;
        mSelect.appendChild(opt);
    });
    mSelect.addEventListener('change', (e) => {
        activeM = e.target.value;
        renderBList();
    });
    mWrap.appendChild(mSelect);
    header.appendChild(mWrap);

    card.appendChild(header);

    const listEl = mk('div', 'blist');
    card.appendChild(listEl);
    const countEl = mk('div', 'blist-count');
    card.appendChild(countEl);

    function renderBList() {
        listEl.innerHTML = '';
        const filtered = fin.filter(b => {
            const matchF = activeF === 'Toutes' || b.lectrice === activeF;
            const matchM = activeM === 'Tous' || b.mois === activeM;
            return matchF && matchM;
        });
        filtered.forEach(b => {
            const col = COLORS[b.lectrice] || 'var(--muted)';
            const row = mk('div', 'brow');
            row.innerHTML = `<div class="bstripe" style="background:${col}"></div><div class="brow-inner"><div class="brow-cover js-cover" data-title="${b.titre.replace(/"/g, '&quot;')}" data-author="${b.auteur.replace(/"/g, '&quot;')}" data-emoji="${ge(b.genre)}">${ge(b.genre)}</div><div class="brow-content"><div class="brow-title"><a href="${getGoodreadsLink(b.titre, b.auteur)}" target="_blank" class="book-title-link">${b.titre}</a></div><div class="brow-meta">${b.auteur}${b.pagesTotales ? ' · ' + b.pagesTotales + 'p' : ''}<span class="gtext">${b.genre ? ` · <span style="color:${gc(b.genre)}">${b.genre}</span>` : ''}</span></div>${b.avis ? `<div class="brow-review">« ${b.avis} »</div>` : ''}</div><div class="brow-right">${b.note && b.note > 0 ? `<span class="bstar"><span class="rating-star">★</span> ${b.note}</span>` : ''}${b.mois ? `<span class="mbadge">${b.mois}</span>` : ''}</div></div>`;
            listEl.appendChild(row);
        });
        countEl.textContent = `${filtered.length} lecture${filtered.length > 1 ? 's' : ''}`;
        setTimeout(() => loadCovers(listEl), 50);
    }
    renderBList();
    w.appendChild(card); return w;
}



// ── HELPERS ────────────────────────────
function mk(tag, cls = '') {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
}
function sec() { return mk('div', 'sec'); }
function slabel(text, dotColor) {
    const d = mk('div', 'section-label');
    const dot = mk('span', 'sdot');
    dot.style.background = dotColor;
    d.appendChild(dot);
    d.appendChild(document.createTextNode(text.toUpperCase()));
    return d;
}
function getGoodreadsLink(titre, auteur) {
    const q = encodeURIComponent(
        titre + (auteur ? ' ' + auteur : '')
    );
    return `https://www.goodreads.com/search?q=${q}`;
}
function setReadMoreLabel(btn, expanded) {
    const icon = expanded ? 'chevron-up' : 'chevron-down';
    const label = expanded ? 'Réduire' : 'Lire la suite';
    const i = document.createElement('i');
    i.dataset.lucide = icon;
    i.style.cssText =
        'width:12px;height:12px;stroke-width:3px;vertical-align:-2px';
    btn.textContent = label + ' ';
    btn.appendChild(i);
}

// ── GOOGLE BOOKS COVERS ────────────────
const _coverCache = new Map();
async function fetchCover(titre, auteur) {
    const key = titre + '|' + auteur;
    if (_coverCache.has(key)) return _coverCache.get(key);
    try {
        const q = encodeURIComponent('intitle:' + titre + (auteur ? ' inauthor:' + auteur : ''));
        const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&fields=items/volumeInfo/imageLinks&langRestrict=fr`);
        if (!r.ok) { _coverCache.set(key, null); return null; }
        const d = await r.json();
        const links = d?.items?.[0]?.volumeInfo?.imageLinks;
        const url = (links?.thumbnail || links?.smallThumbnail || null)?.replace(/^http:/, 'https:') || null;
        _coverCache.set(key, url);
        return url;
    } catch { _coverCache.set(key, null); return null; }
}

function loadCovers(root) {
    const scope = root || document;
    scope.querySelectorAll('.js-cover[data-title]').forEach(async el => {
        if (el.dataset.loaded) return;
        el.dataset.loaded = '1';
        const url = await fetchCover(el.dataset.title, el.dataset.author || '');
        if (!url) return;
        const img = document.createElement('img');
        img.src = url;
        img.alt = el.dataset.title;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:5px;display:block';
        img.onerror = () => { el.innerHTML = el.dataset.emoji || '📚'; img.remove(); };
        el.innerHTML = '';
        el.style.background = 'transparent';
        el.style.border = 'none';
        el.style.padding = '0';
        el.style.overflow = 'hidden';
        el.appendChild(img);
    });
}

// ── INIT ────────────────────────────────
// Attach the refresh button listener unobtrustively,
// then kick off the initial data load.
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('refreshBtn')
        .addEventListener('click', loadData);

    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            backToTop.classList.toggle('visible', window.scrollY > 400);
        }, { passive: true });
    }
});

loadData();
loadCommitDate();