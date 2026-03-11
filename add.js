// ADD BOOKS
//==============================================

let selectedReader = null;
let starValue = 0;
let halfStar = false;
let isFini = false;
let tags = [];
const chips = {};

let allBooks = [];

// Fetch all books on load to populate the title datalist
fetch(APPS_SCRIPT_URL)
    .then(r => r.json())
    .then(data => {
        allBooks = data.books || [];
        if (selectedReader) updateTitleSuggestions();
        updateEditionSuggestions();
    })
    .catch(e => console.error("Erreur chargement livres:", e));

function updateTitleSuggestions() {
    const datalist = document.getElementById('livres-suggestions');
    datalist.innerHTML = '';
    if (!selectedReader) return;

    const seen = new Set();
    // Iterate backwards to get most recent first
    for (let i = allBooks.length - 1; i >= 0; i--) {
        const b = allBooks[i];
        if (b.lectrice === selectedReader && b.titre) {
            const t = b.titre.trim();
            if (!seen.has(t.toLowerCase())) {
                seen.add(t.toLowerCase());
                const opt = document.createElement('option');
                opt.value = t;
                datalist.appendChild(opt);
            }
        }
    }
}

function updateEditionSuggestions() {
    const datalist = document.getElementById('editions-suggestions');
    datalist.innerHTML = '';

    const seen = new Set();
    // Collect frequencies to sort by most popular, or just add all unique
    const counts = {};
    allBooks.forEach(b => {
        if (b.maisonEdition) {
            const m = b.maisonEdition.trim();
            if (m) {
                // standardize capitalization to count properly
                const mc = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
                counts[mc] = (counts[mc] || 0) + 1;
                // also we can store the exact casing if we want, but let's use standardized
            }
        }
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([m, count]) => {
        const opt = document.createElement('option');
        opt.value = m;
        datalist.appendChild(opt);
    });
}

// ── Edit-mode state ──────────────────────────────────────────────
// null   = normal "add" mode
// number = 1-based sheet row of the entry being edited
let editRowIndex = null;
let _lastCheckKey = ''; // avoids firing the same check twice

// ── Reader ───────────────────────────────────────────────────────
function selectReader(el) {
    document.querySelectorAll('.reader-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    selectedReader = el.dataset.reader;
    updateTitleSuggestions();
    // Re-run duplicate check if a title is already typed
    if (document.getElementById('titre').value.trim()) checkDuplicate();
}

// ── Chips ────────────────────────────────────────────────────────
function toggleChip(el) {
    const group = el.dataset.group;
    const wasActive = el.classList.contains('active');
    document.querySelectorAll(`.chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
    if (!wasActive) { el.classList.add('active'); chips[group] = el.dataset.value; }
    else { delete chips[group]; }
}

// ── Fini toggle ──────────────────────────────────────────────────
function toggleFini() {
    isFini = !isFini;
    document.getElementById('finiToggle').classList.toggle('active', isFini);
    document.getElementById('datesArea').classList.toggle('open', isFini);
    if (isFini && !document.getElementById('dateFin').value)
        document.getElementById('dateFin').value = new Date().toISOString().split('T')[0];
}

// ── Stars ────────────────────────────────────────────────────────
function setStar(n) { starValue = n; renderStars(); }
function toggleHalf() {
    halfStar = !halfStar;
    document.getElementById('halfBtn').classList.toggle('active', halfStar);
    renderStars();
}
function renderStars() {
    document.querySelectorAll('.star-btn').forEach((s, i) => s.classList.toggle('on', i < starValue));
    const val = starValue + (halfStar && starValue > 0 ? 0.5 : 0);
    document.getElementById('starDisplay').textContent = val > 0 ? val + ' ★' : '—';
}

// ── Pages hint ───────────────────────────────────────────────────
document.addEventListener('input', e => {
    if (e.target.id === 'pagesLues' || e.target.id === 'pagesTotales') {
        const total = parseInt(document.getElementById('pagesTotales').value) || 0;
        const lues = parseInt(document.getElementById('pagesLues').value) || 0;
        document.getElementById('pagesHint').textContent =
            total > 0 && lues > 0 ? Math.round(lues / total * 100) + '% lu' : '';
    }
});

// ── Tags ─────────────────────────────────────────────────────────
function handleTagKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = e.target.value.trim().replace(/,$/, '');
        if (val) addTag(val);
    } else if (e.key === 'Backspace' && !e.target.value && tags.length) {
        removeTag(tags[tags.length - 1]);
    }
}
function addTag(val) {
    const v = val.trim();
    if (!v || tags.includes(v)) return;
    tags.push(v);
    renderTags();
    document.getElementById('tagInput').value = '';
}
function removeTag(val) { tags = tags.filter(t => t !== val); renderTags(); }
function renderTags() {
    const wrap = document.getElementById('tagsWrap');
    const input = document.getElementById('tagInput');
    wrap.querySelectorAll('.tag-chip').forEach(c => c.remove());
    tags.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${t}<span class="tag-remove" onclick="removeTag('${t.replace(/'/g, "\\'")}')">×</span>`;
        wrap.insertBefore(chip, input);
    });
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => { t.className = 'toast'; }, 3200);
}

// ── Duplicate check ───────────────────────────────────────────────
// Triggered on title blur and on reader selection (if title is already set).
// Calls Apps Script GET with action=check. Fails silently on network error.
async function checkDuplicate() {
    const titre = document.getElementById('titre').value.trim();
    const lectrice = selectedReader;

    if (!titre || !lectrice) return;

    // Skip identical repeated checks
    const key = `${lectrice}::${titre.toLowerCase()}`;
    if (key === _lastCheckKey) return;
    _lastCheckKey = key;

    hideDupeBanner();

    try {
        const url = `${APPS_SCRIPT_URL}?action=check&lectrice=${encodeURIComponent(lectrice)}&titre=${encodeURIComponent(titre)}`;
        const json = await fetch(url).then(r => r.json());

        if (json.result === 'found') {
            // Stash existing data on the banner so enterEditMode() can read it
            document.getElementById('dupeBanner').dataset.existing = JSON.stringify(json.book);
            document.getElementById('dupeTitle').textContent = `"${json.book.titre}" — ${lectrice}`;
            document.getElementById('dupeBanner').classList.add('visible');
            document.getElementById('dupeBanner').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    } catch (_) { /* silent — check is a convenience, not a blocker */ }
}

function hideDupeBanner() {
    const b = document.getElementById('dupeBanner');
    b.classList.remove('visible');
    b.dataset.existing = '';
}

// "Modifier la ligne existante" — pre-fill form, switch to edit mode
function enterEditMode() {
    const existing = JSON.parse(document.getElementById('dupeBanner').dataset.existing || 'null');
    if (!existing) return;

    hideDupeBanner();
    editRowIndex = existing.rowIndex;
    fillForm(existing);

    document.getElementById('submitBtn').classList.add('edit-mode');
    document.querySelector('#submitBtn .btn-text').textContent = '💾 Mettre à jour';

    showToast('✏️ Mode modification — modifie puis valide', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// "Ajouter quand même" — dismiss banner, stay in add mode
function dismissDupe() {
    hideDupeBanner();
    editRowIndex = null;
    _lastCheckKey = ''; // allow re-check if the title is later changed
}

// Pre-fill every form field from an existing book object
function fillForm(b) {
    // Reader button
    const btn = document.querySelector(`.reader-btn[data-reader="${b.lectrice}"]`);
    if (btn) {
        document.querySelectorAll('.reader-btn').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        selectedReader = b.lectrice;
    }

    // Plain text fields
    document.getElementById('titre').value = b.titre || '';
    document.getElementById('auteur').value = b.auteur || '';
    document.getElementById('maisonEdition').value = b.maisonEdition || '';
    document.getElementById('avis').value = b.avis || '';
    document.getElementById('pagesTotales').value = b.pagesTotales || '';
    document.getElementById('pagesLues').value = b.pagesLues || '';

    // Pages hint
    const total = parseInt(b.pagesTotales) || 0;
    const lues = parseInt(b.pagesLues) || 0;
    document.getElementById('pagesHint').textContent =
        total > 0 && lues > 0 ? Math.round(lues / total * 100) + '% lu' : '';

    // Chips
    ['genreAuteur', 'genre', 'format'].forEach(group => {
        document.querySelectorAll(`.chip[data-group="${group}"]`).forEach(c => {
            const on = c.dataset.value === b[group];
            c.classList.toggle('active', on);
            if (on) chips[group] = b[group]; else delete chips[group];
        });
    });

    // Fini + dates
    isFini = !!b.fini;
    document.getElementById('finiToggle').classList.toggle('active', isFini);
    document.getElementById('datesArea').classList.toggle('open', isFini);
    document.getElementById('dateDebut').value = b.commence || '';
    document.getElementById('dateFin').value = b.termine || '';

    // Stars
    starValue = b.note ? Math.floor(b.note) : 0;
    halfStar = b.note ? (b.note % 1) >= 0.5 : false;
    document.getElementById('halfBtn').classList.toggle('active', halfStar);
    renderStars();

    // Tags
    tags = b.motsCles ? b.motsCles.split(',').map(t => t.trim()).filter(Boolean) : [];
    renderTags();
}

// ── Submit ────────────────────────────────────────────────────────
async function submitForm() {
    if (!selectedReader) { showToast('⚠️ Choisis une lectrice !', 'error'); return; }
    const titre = document.getElementById('titre').value.trim();
    const auteur = document.getElementById('auteur').value.trim();
    if (!titre) { showToast('⚠️ Le titre est requis !', 'error'); return; }
    if (!auteur) { showToast("⚠️ L'auteur·ice est requis·e !", 'error'); return; }

    const dateDebut = document.getElementById('dateDebut').value;
    const dateFin = document.getElementById('dateFin').value;
    const pagesTotales = parseInt(document.getElementById('pagesTotales').value) || 0;
    const pagesLues = parseInt(document.getElementById('pagesLues').value) || pagesTotales;
    const note = starValue > 0 ? starValue + (halfStar ? 0.5 : 0) : null;

    let jours = null;
    if (dateDebut && dateFin)
        jours = Math.max(1, Math.round((new Date(dateFin) - new Date(dateDebut)) / 86400000));

    const mois = dateFin
        ? MONTHS[parseInt(dateFin.split('-')[1]) - 1]
        : MONTHS[new Date().getMonth()];

    const payload = {
        // action tells Apps Script to append (add) or overwrite (update)
        action: editRowIndex !== null ? 'update' : 'add',
        rowIndex: editRowIndex,               // null for add, row number for update
        lectrice: selectedReader,
        titre, auteur,
        genreAuteur: chips['genreAuteur'] || '',
        maisonEdition: document.getElementById('maisonEdition').value.trim(),
        format: chips['format'] || '',
        pagesTotales,
        pagesLues: isFini ? pagesTotales : pagesLues,
        genre: chips['genre'] || '',
        motsCles: tags.join(', '),
        commence: dateDebut || null,
        termine: isFini && dateFin ? dateFin : null,
        jours, mois, note,
        avis: document.getElementById('avis').value.trim(),
        fini: isFini,
    };

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const json = await res.json();
        if (json.result === 'success') {
            const msg = editRowIndex !== null
                ? '✅ Mis à jour ! Merci ' + selectedReader + ' 🎉'
                : '📚 Livre ajouté ! Merci ' + selectedReader + ' 🎉';
            showToast(msg, 'success');

            document.getElementById('successTitle').textContent = editRowIndex !== null ? 'Lecture mise à jour !' : 'Nouvelle lecture ajoutée !';
            document.getElementById('successDesc').textContent = 'Merci ' + selectedReader + ' pour ta contribution ✨';

            document.getElementById('formContainer').style.display = 'none';
            document.getElementById('successContainer').style.display = 'block';

            resetForm();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            throw new Error(json.error || 'Erreur inconnue');
        }
    } catch (err) {
        showToast('❌ Erreur : ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

// ── Reset ─────────────────────────────────────────────────────────
function resetForm() {
    document.querySelectorAll('.reader-btn, .chip').forEach(el => el.classList.remove('active'));
    ['titre', 'auteur', 'maisonEdition', 'avis', 'pagesTotales', 'pagesLues', 'dateDebut', 'dateFin']
        .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('pagesHint').textContent = '';
    selectedReader = null; starValue = 0; halfStar = false; isFini = false; tags = [];
    editRowIndex = null; _lastCheckKey = '';
    for (const k in chips) delete chips[k];
    renderStars();
    document.getElementById('halfBtn').classList.remove('active');
    document.getElementById('finiToggle').classList.remove('active');
    document.getElementById('datesArea').classList.remove('open');
    hideDupeBanner();
    renderTags();
    // Restore submit button to add-mode appearance
    const btn = document.getElementById('submitBtn');
    btn.classList.remove('edit-mode');
    btn.querySelector('.btn-text').textContent = '📚 Ajouter à la liste';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('dateFin').value = new Date().toISOString().split('T')[0];

// ── Navigation ───────────────────────────────────────────────────
function showForm() {
    document.getElementById('successContainer').style.display = 'none';
    document.getElementById('formContainer').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
