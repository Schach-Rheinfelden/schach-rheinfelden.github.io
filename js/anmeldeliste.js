/* ═══════════════════════════════════════════════════════════════════════
   Live-Anmeldeliste (z. B. Freizeit-Arena) - liest data/anmeldungen.csv
   ═══════════════════════════════════════════════════════════════════════
 * Frueher stand dieses Skript als <script>-Block IN der pages-Zelle. Der
 * visuelle Editor (TinyMCE) entfernt solche Bloecke beim Speichern - danach
 * blieb die Liste auf "Lade Anmeldungen..." stehen und der Knopf "Zum
 * Anmeldeformular" tat nichts. Jetzt liegt es hier und startet von selbst,
 * sobald eine Seite die Liste enthaelt (<tbody id="turnier-list-tbody">).
 *
 * Die Zelle braucht nur noch das HTML der Liste mit den bekannten Knoepfen:
 *   onclick="window._turnierOpenForm()"            Anmeldeformular oeffnen
 *   onclick="window._turnierSetFilter('Dabei', this)"   Filter
 *   oninput="window._turnierSearch()"              Suche
 *   onclick="window._turnierSortBy('datum')"       Sortierung
 * Optional am Knopf oder an der Liste: data-formular="https://…/viewform"
 * (sonst gilt das Formular unten).
 *
 * Doppelte Anmeldungen (gleiche E-Mail UND gleicher Name) werden
 * zusammengefuehrt - es zaehlt der neueste Eintrag. Geschwister unter
 * derselben Elternadresse bleiben so alle einzeln stehen.
 */
(function () {
    'use strict';

    const VORGABE = {
        csvUrl: 'data/anmeldungen.csv',
        googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfuBwl3pymhdTr9tJdgjZYfvpew04CWPim2lAtpQ6PLf0fkKA/viewform'
    };
    const cfg = () => Object.assign({}, VORGABE, window.TURNIER_CONFIG || {});

    let alle = [];
    let filter = 'Alle';
    let sortSpalte = 'datum';
    let sortRichtung = 'desc';
    let geladenFuer = null;   // tbody, fuer das schon geladen wurde

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const teilnahme = i => (i['Wie sieht es mit deiner Teilnahme aus?'] || i['Teilnahme'] || '').trim().toLowerCase();
    const istJa = i => teilnahme(i).startsWith('ja');
    const istNein = i => teilnahme(i).startsWith('nein');
    const name = i => ((i['Vorname'] || '') + ' ' + (i['Nachname'] || '')).trim();
    const team = i => i['Team (optional)'] || i['Team'] || '';

    function zeitstempel(s) {
        if (!s) return 0;
        const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
        const d = new Date(s);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    function csvZeilen(text) {
        if (typeof parseCSVShared === 'function') {
            let rows = parseCSVShared(text);
            if (rows.length <= 1 && text.includes(',') && window._convertCommaCsvToSemicolon) rows = parseCSVShared(window._convertCommaCsvToSemicolon(text));
            return rows;
        }
        return String(text || '').split(/\r?\n/).filter(z => z.trim()).map(z => z.split(';'));
    }

    window._turnierOpenForm = function () {
        const quelle = document.querySelector('[data-formular]');
        const url = (quelle && quelle.dataset.formular) || cfg().googleFormUrl;
        window.open(url, '_blank', 'noopener');
    };

    window._turnierLoadData = async function () {
        try {
            const url = cfg().csvUrl;
            const r = window.fetchCSVSource ? await window.fetchCSVSource(url) : await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
            if (!r || !r.ok) { alle = []; window._turnierRender(); return; }
            const text = window.fetchTextWithEncoding ? await window.fetchTextWithEncoding(r) : await r.text();
            const rows = csvZeilen(text);
            if (rows.length <= 1) { alle = []; window._turnierRender(); return; }
            const kopf = rows[0].map(h => (h || '').trim());
            const roh = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 2 || !row.join('').trim()) continue;
                const item = { _zeile: i };
                kopf.forEach((h, k) => { item[h] = (row[k] || '').trim(); });
                roh.push(item);
            }
            /* Schluessel = E-Mail UND Name: Eltern, die mehrere Kinder anmelden,
               ueberschreiben sich so nicht gegenseitig; wer sich mit gleicher
               Adresse und gleichem Namen neu eintraegt, ersetzt nur sich selbst. */
            const personen = new Map(), ohne = [];
            roh.forEach(item => {
                const mail = (item['E-Mail-Adresse'] || item['Email'] || item['E-Mail'] || '').trim().toLowerCase();
                const person = name(item).toLowerCase().replace(/\s+/g, ' ');
                const schluessel = mail || person ? mail + '|' + person : '';
                if (!schluessel) { ohne.push(item); return; }
                const alt = personen.get(schluessel);
                if (!alt || zeitstempel(item['Zeitstempel']) >= zeitstempel(alt['Zeitstempel']) || item._zeile > alt._zeile) personen.set(schluessel, item);
            });
            alle = [...personen.values(), ...ohne];
        } catch (e) {
            if (window.console) console.error('Fehler beim Laden von anmeldungen.csv:', e);
            alle = [];
        }
        window._turnierRender();
    };

    window._turnierSortBy = function (spalte) {
        if (sortSpalte === spalte) sortRichtung = sortRichtung === 'asc' ? 'desc' : 'asc';
        else { sortSpalte = spalte; sortRichtung = spalte === 'datum' ? 'desc' : 'asc'; }
        window._turnierRender();
    };

    window._turnierRender = function () {
        const tbody = document.getElementById('turnier-list-tbody');
        if (!tbody) return;
        const badge = document.getElementById('turnier-count-badge');
        const suchfeld = document.getElementById('turnier-search-input');
        const suche = suchfeld ? suchfeld.value.trim().toLowerCase() : '';

        ['status', 'spieler', 'team', 'datum'].forEach(s => {
            const el = document.getElementById('sort-icon-' + s);
            if (!el) return;
            if (sortSpalte === s) { el.style.opacity = '1'; el.style.color = '#60a5fa'; el.textContent = sortRichtung === 'asc' ? '▲' : '▼'; }
            else el.textContent = '';
        });

        const liste = alle.filter(i => {
            if (filter === 'Dabei' && !istJa(i)) return false;
            if (filter === 'Absage' && !istNein(i)) return false;
            if (suche && !(name(i) + ' ' + team(i)).toLowerCase().includes(suche)) return false;
            return true;
        });
        const richtung = sortRichtung === 'asc' ? 1 : -1;
        const text = (a, b) => (a || 'zzzz').localeCompare(b || 'zzzz', 'de') * richtung;
        liste.sort((a, b) => {
            if (sortSpalte === 'spieler') return text(name(a).toLowerCase(), name(b).toLowerCase());
            if (sortSpalte === 'team') return text(team(a).trim().toLowerCase(), team(b).trim().toLowerCase());
            if (sortSpalte === 'status') {
                const rang = i => istJa(i) ? 1 : istNein(i) ? 3 : 2;
                return (rang(a) - rang(b)) * richtung || name(a).toLowerCase().localeCompare(name(b).toLowerCase(), 'de');
            }
            return ((zeitstempel(a['Zeitstempel']) || a._zeile) - (zeitstempel(b['Zeitstempel']) || b._zeile)) * richtung;
        });

        if (badge) badge.textContent = alle.length ? alle.filter(istJa).length + ' Spieler angemeldet' : 'Noch keine Anmeldungen';
        const leer = t => '<tr style="border-bottom: none;"><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-secondary);">' + t + '</td></tr>';
        if (!alle.length) { tbody.innerHTML = leer('Noch keine Anmeldungen eingegangen. Trage dich jetzt beim Anmeldeformular ein! ⚡'); return; }
        if (!liste.length) { tbody.innerHTML = leer('Keine Anmeldungen für diesen Filter gefunden.'); return; }

        tbody.innerHTML = liste.map(i => {
            const ja = istJa(i), nein = istNein(i);
            const statusText = ja ? '🟢 Dabei' : nein ? '🔴 Absage' : '⚪ Offen';
            const farbe = ja ? '#10b981' : nein ? '#ef4444' : '#64748b';
            const t = team(i);
            const logo = /^https?:\/\//i.test(i['Team-Logo URL (optional)'] || '') ? i['Team-Logo URL (optional)'] : '';
            return '<tr><td style="padding: 14px 20px; white-space: nowrap;"><span style="background: rgba(255,255,255,0.05); color: ' + farbe + '; border: 1px solid ' + farbe
                + '; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700;">' + statusText + '</span></td>'
                + '<td style="padding: 14px 20px; font-weight: 700; color: var(--text-primary); font-size: 1.05rem;">' + esc(name(i) || 'Anonym') + '</td>'
                + '<td style="padding: 14px 20px; color: #60a5fa; font-weight: 600;">' + (t
                    ? '<div style="display: flex; align-items: center; gap: 8px;">' + (logo ? '<img src="' + esc(logo) + '" alt="" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;" onerror="this.style.display=\'none\'">' : '🛡️') + '<span>' + esc(t) + '</span></div>'
                    : '<span style="color: var(--text-secondary); opacity: 0.5;">–</span>') + '</td>'
                + '<td style="padding: 14px 20px; color: var(--text-secondary); font-size: 0.88rem; text-align: right; white-space: nowrap;">' + esc(i['Zeitstempel'] || '–') + '</td></tr>';
        }).join('');
    };

    window._turnierSetFilter = function (name, knopf) {
        filter = name;
        document.querySelectorAll('.turnier-filter-btn').forEach(b => b.classList.remove('active'));
        if (knopf) knopf.classList.add('active');
        window._turnierRender();
    };
    window._turnierSearch = function () { window._turnierRender(); };

    /* Starten, sobald die Liste auf der Seite ist - auch wenn app.js den
       Seiteninhalt erst nach dem Laden einsetzt. */
    function pruefen() {
        const tbody = document.getElementById('turnier-list-tbody');
        if (tbody && tbody !== geladenFuer) { geladenFuer = tbody; window._turnierLoadData(); }
    }
    function los() {
        pruefen();
        if (window.MutationObserver) new MutationObserver(pruefen).observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los);
    else los();
})();
