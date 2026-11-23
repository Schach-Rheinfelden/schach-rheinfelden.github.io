/* ═══════════════════════════════════════════════════════════════════════
   Online-Turniere: dezenter Countdown-Hinweis auf das NAECHSTE Turnier
   ═══════════════════════════════════════════════════════════════════════
 * Laeuft auf allen Seiten AUSSER der Online-Turniere-Seite selbst (dort gibt
 * es den grossen Countdown schon). Quelle ist dasselbe Blatt wie fuer die
 * Turnierseite: data/online-turniere.csv.
 *
 *  - Es wird immer nur EIN Turnier gezeigt: ein laufendes, sonst das naechste
 *    geplante (Startzeit kommt von Lichess).
 *  - Am rechten Rand ein schmaler Reiter mit Countdown; mit der Maus darueber
 *    (oder antippen) klappt eine Karte mit den Details auf.
 *  - Das x klappt die Karte wieder zu - der schmale Reiter bleibt stehen,
 *    solange ein Turnier angekuendigt ist oder laeuft.
 *  - Spalte "team": Muss man vorher einem Lichess-Team beitreten, steht das in
 *    der Karte, mit Link zum Team.
 *  - Spalte "werbung" = nein (beim Turnier oder in der Einstellungszeile der
 *    Serie) nimmt Turniere aus dem Hinweis.
 *  - Lichess wird hoechstens alle paar Minuten gefragt (Zwischenspeicher im
 *    Browser); beendete Turniere nie wieder.
 */
(function () {
    'use strict';
    if (window.__otHinweis) return;
    window.__otHinweis = true;

    const QUELLE = 'data/online-turniere.csv';
    const API = 'https://lichess.org/api/';
    const SPEICHER = 'ot-hinweis-v1';
    const MIN = 60000;

    try { if (new URLSearchParams(location.search).get('page') === 'online-turniere') return; } catch (e) { /* weiter */ }

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const slug = t => String(t || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'serie';
    const jaNein = v => {
        v = String(v == null ? '' : v).trim().toLowerCase();
        return /^(ja|j|yes|y|x|1|true|wahr)$/.test(v) ? true : /^(nein|n|no|0|false|falsch|-)$/.test(v) ? false : null;
    };
    const lesen = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    const schreiben = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* voll/gesperrt */ } };

    /* ── Blatt lesen ─────────────────────────────────────────────────── */
    async function csvText() {
        const r = window.fetchCSVSource ? await window.fetchCSVSource(QUELLE) : await fetch(QUELLE + '?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return window.fetchTextWithEncoding ? window.fetchTextWithEncoding(r) : r.text();
    }
    function csvObjekte(text) {
        text = String(text || '').replace(/^﻿/, '');
        const zeilen = [];
        let zeile = [], feld = '', inQ = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (inQ) { if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i++; } else inQ = false; } else feld += c; }
            else if (c === '"') inQ = true;
            else if (c === ';') { zeile.push(feld); feld = ''; }
            else if (c === '\n' || c === '\r') {
                if (c === '\r' && text[i + 1] === '\n') i++;
                zeile.push(feld); feld = '';
                if (zeile.some(f => f.trim())) zeilen.push(zeile);
                zeile = [];
            } else feld += c;
        }
        zeile.push(feld);
        if (zeile.some(f => f.trim())) zeilen.push(zeile);
        if (zeilen.length < 2) return [];
        const kopf = zeilen[0].map(h => String(h || '').trim().toLowerCase());
        return zeilen.slice(1).map(r => { const o = {}; kopf.forEach((k, i) => { o[k] = String(r[i] == null ? '' : r[i]).trim(); }); return o; });
    }
    /** Welche Turniere duerfen beworben werden? (gleiche Regeln wie die Turnierseite) */
    function kandidaten(objekte) {
        const serien = new Map(), turniere = [];
        let letzte = '';
        objekte.forEach(o => {
            const name = String(o.serie || o.serienname || '').trim() || letzte;
            const link = String(o.link || o['lichess-link'] || o.lichess || o.turnier || '').trim();
            if (!name || (!link && !String(o.serie || '').trim())) { if (name) letzte = name; return; }
            letzte = name;
            const k = name.toLowerCase();
            if (!serien.has(k)) serien.set(k, { name, kurzname: '', werbung: null, anzeigen: true, team: '' });
            const s = serien.get(k);
            if (!link) {
                if (jaNein(o.anzeigen) === false) s.anzeigen = false;
                if (o.kurzname) s.kurzname = o.kurzname;
                if (o.team) s.team = o.team;
                if (jaNein(o.werbung) !== null) s.werbung = jaNein(o.werbung);
                return;
            }
            const m = link.match(/lichess\.org\/(tournament|swiss)\/([A-Za-z0-9]{8})/);
            if (!m || jaNein(o.anzeigen) === false) return;
            turniere.push({ serie: s, typ: m[1] === 'swiss' ? 'swiss' : 'arena', id: m[2], werbung: jaNein(o.werbung), team: o.team || '' });
        });
        const gesehen = new Set();
        return turniere.filter(t => {
            const uid = t.typ + ':' + t.id;
            if (gesehen.has(uid) || !t.serie.anzeigen) return false;
            gesehen.add(uid);
            return (t.werbung !== null ? t.werbung : t.serie.werbung) !== false;
        });
    }

    function teamUrl(wert) {
        const v = String(wert || '').trim();
        const m = v.match(/lichess\.org\/team\/([A-Za-z0-9_-]+)/);
        if (m) return 'https://lichess.org/team/' + m[1];
        return /^[A-Za-z0-9_-]{2,}$/.test(v) ? 'https://lichess.org/team/' + v.toLowerCase() : '';
    }

    /* ── Lichess (mit Zwischenspeicher) ──────────────────────────────── */
    function bedenkzeit(clock) {
        if (!clock) return '';
        const min = clock.limit / 60;
        return (min >= 1 ? String(Math.round(min * 10) / 10) : clock.limit + 's') + '+' + (clock.increment || 0);
    }
    function veraltet(e, jetzt) {
        if (!e) return true;
        if (e.status === 'fertig') return false;
        const alter = jetzt - (e.zeit || 0);
        const bisStart = new Date(e.start).getTime() - jetzt;
        return e.status === 'geplant' && bisStart > 60 * MIN ? alter > 15 * MIN : alter > 2 * MIN;
    }
    async function infos(liste) {
        const jetzt = Date.now();
        const speicher = lesen(SPEICHER) || {};
        await Promise.all(liste.map(async t => {
            const uid = t.typ + ':' + t.id;
            if (!veraltet(speicher[uid], jetzt)) return;
            try {
                const r = await fetch(API + (t.typ === 'swiss' ? 'swiss/' : 'tournament/') + t.id);
                if (!r.ok) return;
                const i = await r.json();
                const status = t.typ === 'swiss'
                    ? (i.status === 'finished' ? 'fertig' : i.status === 'started' ? 'laeuft' : 'geplant')
                    : (i.isFinished ? 'fertig' : i.secondsToStart > 0 ? 'geplant' : 'laeuft');
                speicher[uid] = {
                    name: i.fullName || i.name || t.id, start: i.startsAt, status,
                    art: t.typ === 'swiss' ? 'Swiss' : 'Arena', bedenkzeit: bedenkzeit(i.clock),
                    dauer: t.typ === 'swiss' ? (i.nbRounds ? i.nbRounds + ' Runden' : '') : (i.minutes ? i.minutes + ' Min.' : ''),
                    spieler: i.nbPlayers || 0, zeit: jetzt
                };
            } catch (e) { /* Lichess nicht erreichbar - dann eben ohne Hinweis */ }
        }));
        // Alte Eintraege (nicht mehr im Blatt) aufraeumen.
        const behalten = new Set(liste.map(t => t.typ + ':' + t.id));
        Object.keys(speicher).forEach(k => { if (!behalten.has(k)) delete speicher[k]; });
        schreiben(SPEICHER, speicher);
        return speicher;
    }

    /** Genau EIN Turnier: ein laufendes, sonst das naechste geplante. */
    function naechstes(liste, speicher) {
        const jetzt = Date.now();
        const mit = liste.map(t => Object.assign({ uid: t.typ + ':' + t.id, typ: t.typ, id: t.id, serie: t.serie, team: teamUrl(t.team || t.serie.team) }, speicher[t.typ + ':' + t.id] || {}))
            .filter(t => t.start && t.status);
        const live = mit.filter(t => t.status === 'laeuft').sort((a, b) => new Date(a.start) - new Date(b.start));
        if (live.length) return live[0];
        return mit.filter(t => t.status === 'geplant' && new Date(t.start).getTime() > jetzt - 10 * MIN)
            .sort((a, b) => new Date(a.start) - new Date(b.start))[0] || null;
    }

    /* ── Anzeige ─────────────────────────────────────────────────────── */
    const datum = iso => {
        const d = new Date(iso);
        return d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' · ' + d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    };
    const zwei = n => String(n).padStart(2, '0');

    function zeigen(t) {
        const live = t.status === 'laeuft';
        const lichess = 'https://lichess.org/' + (t.typ === 'swiss' ? 'swiss/' : 'tournament/') + t.id;
        const mehr = 'index.html?page=online-turniere&serie=' + encodeURIComponent(t.serie.kurzname || slug(t.serie.name)) + '&turnier=' + encodeURIComponent(t.id);
        const meta = [t.art, t.dauer, t.bedenkzeit].filter(Boolean).join(' · ');

        const el = document.createElement('aside');
        el.className = 'ot-hinweis' + (live ? ' live' : '');
        el.setAttribute('aria-label', live ? 'Online-Turnier läuft gerade' : 'Nächstes Online-Turnier');
        el.innerHTML = '<button type="button" class="ot-hinweis-griff" aria-expanded="false" aria-controls="ot-hinweis-karte">'
            + '<span class="ot-hinweis-symbol" aria-hidden="true">♞</span>'
            + '<span class="ot-hinweis-etikett">' + (live ? '<i class="ot-hinweis-punkt"></i>Live' : 'Turnier') + '</span>'
            + '<span class="ot-hinweis-kurz" data-ot-kurz>' + (live ? 'jetzt' : '…') + '</span></button>'
            + '<div class="ot-hinweis-karte glass-card" id="ot-hinweis-karte">'
            + '<button type="button" class="ot-hinweis-zu" aria-label="Details schliessen" title="Schliessen">×</button>'
            + '<small class="ot-hinweis-kopf">' + (live ? 'Läuft gerade' : 'Nächstes Online-Turnier') + ' · ' + esc(t.serie.name) + '</small>'
            + '<b class="ot-hinweis-name">' + esc(t.name) + '</b>'
            + '<span class="ot-hinweis-meta">' + esc(datum(t.start)) + (meta ? '<br>' + esc(meta) : '') + (t.spieler ? ' · ' + t.spieler + (live ? ' Spieler' : ' angemeldet') : '') + '</span>'
            + (live ? '' : '<div class="ot-hinweis-uhr" role="timer" aria-live="off">' + ['T', 'Std', 'Min', 'Sek'].map(e => '<span><b data-ot-uhr="' + e + '">–</b><small>' + (e === 'T' ? 'Tage' : e) + '</small></span>').join('') + '</div>')
            + (t.team ? '<span class="ot-hinweis-team">👥 Nur für Mitglieder des Lichess-Teams – <a href="' + esc(t.team) + '" target="_blank" rel="noopener">zuerst beitreten ↗</a></span>' : '')
            + '<div class="ot-hinweis-knoepfe"><a class="btn btn-primary" href="' + esc(lichess) + '" target="_blank" rel="noopener">' + (live ? 'Live verfolgen ↗' : 'Auf Lichess beitreten ↗') + '</a>'
            + '<a class="ot-hinweis-mehr" href="' + esc(mehr) + '">Mehr erfahren →</a></div></div>';
        document.body.appendChild(el);

        const griff = el.querySelector('.ot-hinweis-griff');
        const setzen = offen => { el.classList.toggle('offen', offen); griff.setAttribute('aria-expanded', offen ? 'true' : 'false'); };
        griff.addEventListener('click', () => { el.classList.remove('ruhe'); setzen(!el.classList.contains('offen')); });
        /* x: nur die Karte schliessen, der Reiter bleibt. "ruhe" sperrt das Aufklappen
           per Maus/Fokus, bis man den Reiter wieder ansteuert. (Nicht schon beim
           Verlassen der Karte freigeben: Die verschwindet ja gerade unter der Maus -
           sonst klappte sie sofort wieder auf.) */
        el.querySelector('.ot-hinweis-zu').addEventListener('click', ev => {
            ev.stopPropagation();
            setzen(false);
            el.classList.add('ruhe');
            griff.focus({ preventScroll: true });
        });
        griff.addEventListener('mouseenter', () => el.classList.remove('ruhe'));
        el.addEventListener('focusout', ev => { if (!el.contains(ev.relatedTarget)) el.classList.remove('ruhe'); });
        document.addEventListener('keydown', ev => { if (ev.key === 'Escape') setzen(false); });
        document.addEventListener('click', ev => { if (!el.contains(ev.target)) setzen(false); });

        if (!live) {
            const ziel = new Date(t.start).getTime();
            const kurz = el.querySelector('[data-ot-kurz]');
            const f = k => el.querySelector('[data-ot-uhr="' + k + '"]');
            const ticken = () => {
                const rest = Math.max(0, Math.floor((ziel - Date.now()) / 1000));
                const tg = Math.floor(rest / 86400), h = Math.floor(rest % 86400 / 3600), m = Math.floor(rest % 3600 / 60), s = rest % 60;
                f('T').textContent = tg; f('Std').textContent = zwei(h); f('Min').textContent = zwei(m); f('Sek').textContent = zwei(s);
                kurz.textContent = rest === 0 ? 'jetzt' : tg ? tg + 'T ' + zwei(h) + 'h' : zwei(h) + ':' + zwei(m) + ':' + zwei(s);
                griff.setAttribute('aria-label', 'Nächstes Online-Turnier: ' + t.name + (rest ? ', startet in ' + (tg ? tg + ' Tagen ' : '') + h + ' Stunden ' + m + ' Minuten' : ', beginnt jetzt'));
                if (!rest) clearInterval(el._uhr);
            };
            ticken();
            el._uhr = setInterval(ticken, 1000);
        } else griff.setAttribute('aria-label', 'Online-Turnier läuft gerade: ' + t.name);

        // Erst nach einem Moment hereingleiten - die Seite soll zuerst da sein.
        setTimeout(() => el.classList.add('sichtbar'), 1200);
    }

    async function los() {
        try {
            const liste = kandidaten(csvObjekte(await csvText()));
            if (!liste.length) return;
            const t = naechstes(liste, await infos(liste));
            if (t) zeigen(t);
        } catch (e) { /* Der Hinweis ist eine Zugabe - nie ein Fehler fuer die Seite. */ }
    }

    window.OtHinweis = { kandidaten, naechstes, csvObjekte, los };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los);
    else los();
})();
