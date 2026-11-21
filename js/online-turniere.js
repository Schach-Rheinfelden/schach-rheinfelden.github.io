/**
 * online-turniere.js — Lichess-Turniere als Serie mit Gesamtwertung
 * =========================================================================
 *
 * ══ SO BENUTZT DU ES ══
 * In pages.csv (Spalte "content") steht ein Block wie dieser:
 *
 *   <div class="online-turniere" data-serie="Jans Online-Turniere"
 *        data-punkte="10,8,6,5,4,3,2,1" data-teilnahme="1">
 *     https://lichess.org/swiss/AbCd1234
 *     https://lichess.org/tournament/XyZ98765
 *   </div>
 *   <script src="js/online-turniere.js?v=1"></script>
 *
 * Neues Turnier? Einfach den Lichess-Link in den Block einfuegen - mehr nicht.
 * Ein Link in <!-- … --> zaehlt nicht (voruebergehend aus der Wertung nehmen).
 * Erkannt werden Arena- (lichess.org/tournament/…) und Swiss-Turniere
 * (lichess.org/swiss/…), egal ob als nackter Link oder als <a href>.
 * Mehrere Bloecke auf einer Seite = mehrere unabhaengige Serien.
 *
 *   data-serie      Ueberschrift der Gesamtwertung (optional)
 *   data-punkte     Punkte fuer Platz 1, 2, 3 … (Vorgabe 10,8,6,5,4,3,2,1)
 *   data-teilnahme  Punkte fuer jede gespielte Teilnahme (Vorgabe 1)
 *
 * ══ WOHER DIE DATEN KOMMEN ══
 * Direkt von der oeffentlichen Lichess-Schnittstelle, im Browser des
 * Besuchers. Lichess erlaubt das ausdruecklich (CORS "*"); es braucht also
 * weder Server noch Schluessel noch Upload. Die Seite ist immer aktuell -
 * auch waehrend ein Turnier laeuft.
 *
 * Abgeschlossene Turniere aendern sich nie mehr. Ihre Rangliste wird darum
 * im Browser gemerkt (localStorage) und beim naechsten Besuch nicht neu
 * geladen. Partien werden erst geladen, wenn man ein Turnier aufklappt.
 */
(function () {
    'use strict';

    const API = 'https://lichess.org/api';
    const VORGABE_PUNKTE = [10, 8, 6, 5, 4, 3, 2, 1];
    const VORGABE_TEILNAHME = 1;
    const CACHE_PRAEFIX = 'ot-v2:';

    /* ─── Kleinkram ───────────────────────────────────────────────────── */

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function punkteText(p) {
        const n = Number(p) || 0;
        const ganz = Math.floor(n);
        return (n - ganz >= 0.5) ? (ganz === 0 ? '½' : ganz + '½') : String(ganz);
    }

    function datumText(iso) {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' · ' + d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    }

    function bedenkzeit(clock) {
        if (!clock) return '';
        const min = clock.limit / 60;
        const t = min >= 1 ? String(Math.round(min * 10) / 10) : (clock.limit + 's');
        return t + '+' + (clock.increment || 0);
    }

    function ndjson(text) {
        return String(text || '').split('\n').map(z => z.trim()).filter(Boolean).map(z => {
            try { return JSON.parse(z); } catch (e) { return null; }
        }).filter(Boolean);
    }

    /* Zwischenspeicher fuer ABGESCHLOSSENE Turniere - mit Ablauf nach drei
       Tagen. Ganz unveraenderlich sind auch sie nicht: Lichess entfernt
       Spieler mitunter nachtraeglich wegen Regelverstoss, dann rutschen alle
       dahinter einen Platz auf. Drei Tage spaeter zieht die Seite das nach. */
    const CACHE_DAUER = 3 * 24 * 3600 * 1000;

    function cacheLesen(k) {
        try {
            const e = JSON.parse(localStorage.getItem(CACHE_PRAEFIX + k) || 'null');
            return e && e.zeit && Date.now() - e.zeit < CACHE_DAUER ? e.daten : null;
        } catch (e) { return null; }
    }
    function cacheSchreiben(k, v) {
        try { localStorage.setItem(CACHE_PRAEFIX + k, JSON.stringify({ zeit: Date.now(), daten: v })); } catch (e) { /* voll/privat */ }
    }

    async function holen(url, alsText, accept) {
        const r = await fetch(url, { headers: accept ? { Accept: accept } : {} });
        if (r.status === 429) throw new Error('Lichess bittet um eine kurze Pause (zu viele Anfragen). Bitte in einer Minute neu laden.');
        if (r.status === 404) throw new Error('Turnier nicht gefunden – stimmt der Link?');
        if (!r.ok) throw new Error('Lichess antwortet nicht (' + r.status + ').');
        return alsText ? r.text() : r.json();
    }

    /* ─── Links lesen ─────────────────────────────────────────────────── */

    /** Alle Lichess-Turnierlinks im Block, in der eingetragenen Reihenfolge, ohne Doppelte. */
    function linksLesen(block) {
        // Auskommentierte Links (<!-- … -->) zaehlen nicht. So laesst sich ein
        // Turnier voruebergehend aus der Wertung nehmen, ohne den Link zu loeschen.
        const quelle = block.innerHTML.replace(/<!--[\s\S]*?-->/g, ' ')
            + ' ' + Array.from(block.querySelectorAll('a[href]')).map(a => a.href).join(' ');
        const muster = /lichess\.org\/(tournament|swiss)\/([A-Za-z0-9]{8})/g;
        const gesehen = new Set();
        const liste = [];
        let m;
        while ((m = muster.exec(quelle)) !== null) {
            const typ = m[1] === 'swiss' ? 'swiss' : 'arena';
            const key = typ + ':' + m[2];
            if (gesehen.has(key)) continue;
            gesehen.add(key);
            liste.push({ typ: typ, id: m[2], key: key });
        }
        return liste;
    }

    /* ─── Laden ───────────────────────────────────────────────────────── */

    /**
     * Turnier in eine einheitliche Form bringen - Arena und Swiss liefern
     * unterschiedliche Felder.
     */
    async function turnierLaden(t) {
        const gemerkt = cacheLesen(t.key);
        if (gemerkt) return gemerkt;

        const pfad = t.typ === 'swiss' ? '/swiss/' : '/tournament/';
        const info = await holen(API + pfad + t.id);
        const ergebnisse = ndjson(await holen(API + pfad + t.id + '/results', true));

        let status;
        if (t.typ === 'swiss') status = info.status === 'finished' ? 'fertig' : (info.status === 'started' ? 'laeuft' : 'geplant');
        else status = info.isFinished ? 'fertig' : (info.secondsToStart > 0 ? 'geplant' : 'laeuft');

        const daten = {
            key: t.key, typ: t.typ, id: t.id,
            url: 'https://lichess.org' + pfad + t.id,
            name: info.fullName || info.name || t.id,
            start: info.startsAt,
            bedenkzeit: bedenkzeit(info.clock),
            runden: t.typ === 'swiss' ? info.nbRounds : null,
            minuten: t.typ === 'arena' ? info.minutes : null,
            spielerZahl: info.nbPlayers,
            status: status,
            rangliste: ergebnisse.map(e => ({
                rang: e.rank,
                name: e.username,
                titel: e.title || '',
                punkte: t.typ === 'swiss' ? e.points : e.score,
                feinwertung: t.typ === 'swiss' ? e.tieBreak : null,
                rating: e.rating,
                leistung: e.performance || null
            }))
        };

        // Nur Abgeschlossenes merken - eine laufende Rangliste veraltet sofort.
        if (status === 'fertig') cacheSchreiben(t.key, daten);
        return daten;
    }

    const partienSpeicher = {};

    async function partienLaden(t) {
        if (partienSpeicher[t.key]) return partienSpeicher[t.key];
        const pfad = t.typ === 'swiss' ? '/swiss/' : '/tournament/';
        const roh = ndjson(await holen(API + pfad + t.id + '/games?moves=false&opening=true', true, 'application/x-ndjson'));
        const partien = roh.map(g => ({
            id: g.id,
            zeit: g.createdAt,
            weiss: (g.players.white.user || {}).name || 'Anonym',
            schwarz: (g.players.black.user || {}).name || 'Anonym',
            ratingW: g.players.white.rating,
            ratingS: g.players.black.rating,
            sieger: g.winner || null,
            status: g.status,
            eroeffnung: g.opening ? g.opening.name : ''
        })).sort((a, b) => a.zeit - b.zeit);

        /* Swiss: Lichess nennt die Runde einer Partie nicht. Alle Partien
           einer Runde werden aber im selben Augenblick angesetzt - eine Luecke
           von mehr als 20 Sekunden zwischen zwei Ansetzungen ist die naechste
           Runde. */
        if (t.typ === 'swiss') {
            let runde = 0, vorher = -Infinity;
            partien.forEach(p => {
                if (p.zeit - vorher > 20000) runde++;
                vorher = p.zeit;
                p.runde = runde;
            });
        }
        partienSpeicher[t.key] = partien;
        return partien;
    }

    /* ─── Gesamtwertung ───────────────────────────────────────────────── */

    /**
     * Platzierungspunkte ueber alle ABGESCHLOSSENEN Turniere.
     * Gezaehlt wird nur, wer wirklich gespielt hat: Wer sich anmeldet und
     * keine Partie bestreitet, steht bei Lichess trotzdem in der Rangliste
     * (mit 0 Punkten, ohne Leistungszahl) - fuer ihn gibt es nichts.
     */
    function gesamtwertung(turniere, punkteTabelle, teilnahmePunkte) {
        const spieler = new Map();
        turniere.filter(t => t.status === 'fertig').forEach(t => {
            t.rangliste.forEach(e => {
                const gespielt = e.leistung || e.punkte > 0;
                if (!gespielt) return;
                const k = e.name.toLowerCase();
                if (!spieler.has(k)) spieler.set(k, { name: e.name, titel: e.titel, punkte: 0, turniere: 0, siege: 0, podest: 0, bester: Infinity, details: [] });
                const s = spieler.get(k);
                const platzPunkte = punkteTabelle[e.rang - 1] || 0;
                const plus = platzPunkte + teilnahmePunkte;
                s.punkte += plus;
                s.turniere++;
                if (e.rang === 1) s.siege++;
                if (e.rang <= 3) s.podest++;
                s.bester = Math.min(s.bester, e.rang);
                s.details.push({ turnier: t.name, start: t.start, rang: e.rang, von: t.rangliste.length, plus: plus });
            });
        });
        return Array.from(spieler.values()).sort((a, b) =>
            (b.punkte - a.punkte) || (b.siege - a.siege) || (b.podest - a.podest)
            || (a.bester - b.bester) || a.name.localeCompare(b.name, 'de'));
    }

    /* ─── Darstellung ─────────────────────────────────────────────────── */

    const STATUS_TEXT = { fertig: 'Beendet', laeuft: 'Läuft gerade', geplant: 'Geplant' };
    const ENDE_TEXT = {
        mate: 'Matt', resign: 'Aufgabe', outoftime: 'Zeit', timeout: 'Verlassen', draw: 'Remis',
        stalemate: 'Patt', insufficientMaterial: 'Remis', cheat: 'Regelverstoss', noStart: 'Nicht angetreten',
        aborted: 'Abgebrochen', variantEnd: 'Variante'
    };

    function spielerLink(name, titel) {
        return '<a class="ot-spieler" href="https://lichess.org/@/' + encodeURIComponent(name) + '" target="_blank" rel="noopener">'
            + (titel ? '<span class="ot-titel">' + esc(titel) + '</span> ' : '') + esc(name) + '</a>';
    }

    function medaille(rang) {
        return rang === 1 ? '🥇' : rang === 2 ? '🥈' : rang === 3 ? '🥉' : String(rang);
    }

    function zeichneGesamt(ziel, wertung, serie, punkteTabelle, teilnahme, anzahlFertig) {
        if (!anzahlFertig) {
            ziel.innerHTML = '';
            return;
        }
        const max = wertung.length ? wertung[0].punkte : 1;
        ziel.innerHTML =
            '<div class="glass-card ot-gesamt">'
            + '<div class="ot-kopf"><h2 class="ot-titel-h">🏆 ' + esc(serie || 'Gesamtwertung') + '</h2>'
            + '<span class="ot-hinweis">' + anzahlFertig + ' ' + (anzahlFertig === 1 ? 'Turnier' : 'Turniere') + ' gewertet · '
            + 'Platz 1–' + punkteTabelle.length + ': ' + punkteTabelle.join('-') + ' Punkte'
            + (teilnahme ? ' · +' + teilnahme + ' je Teilnahme' : '') + '</span></div>'
            + '<div class="ot-tabelle" role="table">'
            + '<div class="ot-zeile ot-zeile-kopf" role="row"><span>#</span><span>Spieler</span><span>Punkte</span><span>Turniere</span><span>Siege</span><span>Podest</span></div>'
            + wertung.map((s, i) => {
                const rang = i > 0 && s.punkte === wertung[i - 1].punkte && s.siege === wertung[i - 1].siege
                    && s.podest === wertung[i - 1].podest && s.bester === wertung[i - 1].bester ? '' : medaille(i + 1);
                // Ab Platz 16 zunaechst verborgen - siehe Knopf "Alle anzeigen".
                const mehr = i >= SICHTBAR ? ' ot-mehr hidden' : '';
                return '<button type="button" class="ot-zeile ot-gesamt-zeile' + mehr + '" role="row" aria-expanded="false" data-ot-details="' + i + '">'
                    + '<i class="ot-balken" style="--anteil:' + (s.punkte / max * 100).toFixed(1) + '%"></i>'
                    + '<span class="ot-rang">' + rang + '</span>'
                    + '<span class="ot-name">' + (s.titel ? '<span class="ot-titel">' + esc(s.titel) + '</span> ' : '') + esc(s.name) + '</span>'
                    + '<span class="ot-zahl ot-stark">' + s.punkte + '</span>'
                    + '<span class="ot-zahl">' + s.turniere + '</span>'
                    + '<span class="ot-zahl">' + (s.siege || '–') + '</span>'
                    + '<span class="ot-zahl">' + (s.podest || '–') + '</span>'
                    + '</button>'
                    + '<div class="ot-details hidden" data-ot-details-fuer="' + i + '">'
                    + s.details.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).map(d =>
                        '<div class="ot-detail"><span>' + esc(d.turnier) + '</span><span>Platz ' + d.rang + ' von ' + d.von
                        + '</span><span class="ot-stark">+' + d.plus + '</span></div>').join('')
                    + '</div>';
            }).join('')
            + '</div>'
            + (wertung.length > SICHTBAR
                ? '<button type="button" class="filter-btn ot-alle" data-ot-alle>Alle ' + wertung.length + ' Spieler anzeigen ▾</button>'
                : '')
            + '</div>';
    }

    /** So viele Zeilen zeigt die Gesamtwertung, bevor "Alle anzeigen" kommt. */
    const SICHTBAR = 15;

    function zeichneTurnierKarte(t, offen) {
        const sieger = t.status === 'fertig' && t.rangliste[0] ? t.rangliste[0] : null;
        const modus = t.typ === 'swiss'
            ? 'Swiss · ' + (t.runden || '?') + ' Runden'
            : 'Arena · ' + (t.minuten || '?') + ' Min.';
        return '<div class="glass-card ot-turnier" data-ot-turnier="' + esc(t.key) + '">'
            + '<button type="button" class="ot-turnier-kopf" aria-expanded="' + (offen ? 'true' : 'false') + '">'
            + '<span class="ot-turnier-text">'
            + '<span class="ot-turnier-name">' + esc(t.name) + '</span>'
            + '<span class="ot-turnier-meta">' + esc(datumText(t.start)) + ' · ' + esc(modus) + ' · ' + esc(t.bedenkzeit)
            + ' · ' + (t.spielerZahl || 0) + ' Spieler</span>'
            + '</span>'
            + '<span class="ot-turnier-rechts">'
            + (sieger ? '<span class="ot-sieger">🥇 ' + esc(sieger.name) + '</span>' : '')
            + '<span class="ot-status ot-status-' + t.status + '">' + STATUS_TEXT[t.status] + '</span>'
            + '<span class="ot-pfeil" aria-hidden="true">▾</span>'
            + '</span></button>'
            + '<div class="ot-turnier-body' + (offen ? '' : ' hidden') + '"></div>'
            + '</div>';
    }

    function zeichneRangliste(t) {
        if (!t.rangliste.length) return '<p class="ot-leer">Noch keine Teilnehmer.</p>';
        const swiss = t.typ === 'swiss';
        return '<div class="ot-scroll"><table class="ot-rangliste">'
            + '<thead><tr><th>#</th><th>Spieler</th><th>Punkte</th>' + (swiss ? '<th>Feinw.</th>' : '')
            + '<th>Rating</th><th>Leistung</th></tr></thead><tbody>'
            + t.rangliste.map(e => '<tr' + (e.rang <= 3 && t.status === 'fertig' ? ' class="ot-podest"' : '') + '>'
                + '<td class="ot-zahl">' + (t.status === 'fertig' ? medaille(e.rang) : e.rang) + '</td>'
                + '<td>' + spielerLink(e.name, e.titel) + '</td>'
                + '<td class="ot-zahl ot-stark">' + punkteText(e.punkte) + '</td>'
                + (swiss ? '<td class="ot-zahl">' + (e.feinwertung != null ? e.feinwertung : '–') + '</td>' : '')
                + '<td class="ot-zahl">' + (e.rating || '–') + '</td>'
                + '<td class="ot-zahl">' + (e.leistung || '–') + '</td>'
                + '</tr>').join('')
            + '</tbody></table></div>';
    }

    function ergebnis(p) {
        if (p.sieger === 'white') return '1 – 0';
        if (p.sieger === 'black') return '0 – 1';
        if (p.status === 'aborted' || p.status === 'noStart') return '–';
        return '½ – ½';
    }

    function zeichneBegegnungen(t, partien, filterName) {
        const liste = filterName
            ? partien.filter(p => p.weiss.toLowerCase() === filterName || p.schwarz.toLowerCase() === filterName)
            : partien;
        if (!liste.length) return '<p class="ot-leer">Keine Partien.</p>';

        const zeile = p => {
            const w = p.sieger === 'white', s = p.sieger === 'black';
            return '<tr>'
                + '<td class="' + (w ? 'ot-gewinner' : '') + '">' + spielerLink(p.weiss) + ' <small>' + (p.ratingW || '') + '</small></td>'
                + '<td class="ot-ergebnis"><a href="https://lichess.org/' + esc(p.id) + '" target="_blank" rel="noopener" title="Partie auf Lichess ansehen">'
                + ergebnis(p) + '</a></td>'
                + '<td class="' + (s ? 'ot-gewinner' : '') + '">' + spielerLink(p.schwarz) + ' <small>' + (p.ratingS || '') + '</small></td>'
                + '<td class="ot-leise">' + esc(ENDE_TEXT[p.status] || p.status) + '</td>'
                + '<td class="ot-leise ot-eroeffnung">' + esc(p.eroeffnung) + '</td>'
                + '</tr>';
        };
        const kopf = '<thead><tr><th>Weiss</th><th>Ergebnis</th><th>Schwarz</th><th>Ende</th><th>Eröffnung</th></tr></thead>';

        if (t.typ === 'swiss') {
            const runden = new Map();
            liste.forEach(p => { if (!runden.has(p.runde)) runden.set(p.runde, []); runden.get(p.runde).push(p); });
            return Array.from(runden.entries()).map(([r, ps]) =>
                '<h4 class="ot-runde">Runde ' + r + '</h4><div class="ot-scroll"><table class="ot-partien">' + kopf
                + '<tbody>' + ps.map(zeile).join('') + '</tbody></table></div>').join('');
        }
        return '<div class="ot-scroll"><table class="ot-partien">' + kopf + '<tbody>'
            + liste.slice().reverse().map(zeile).join('') + '</tbody></table></div>';
    }

    async function zeichneTurnierInhalt(body, t) {
        const reiter = body.dataset.reiter || 'rangliste';
        const knoepfe = '<div class="ot-reiter" role="tablist">'
            + ['rangliste', 'begegnungen'].map(r => '<button type="button" class="filter-btn' + (r === reiter ? ' active' : '')
                + '" data-ot-reiter="' + r + '">' + (r === 'rangliste' ? 'Rangliste' : 'Begegnungen') + '</button>').join('')
            + '<a class="ot-extern" href="' + esc(t.url) + '" target="_blank" rel="noopener">Auf Lichess öffnen ↗</a>'
            + '</div>';

        if (reiter === 'rangliste') {
            body.innerHTML = knoepfe + zeichneRangliste(t);
            return;
        }

        body.innerHTML = knoepfe + '<p class="ot-leer">Partien werden geladen …</p>';
        try {
            const partien = await partienLaden(t);
            const namen = Array.from(new Set(partien.flatMap(p => [p.weiss, p.schwarz]))).sort((a, b) => a.localeCompare(b, 'de'));
            const filter = body.dataset.filter || '';
            body.innerHTML = knoepfe
                + '<label class="ot-filter">Spieler: <select class="search-bar" data-ot-filter>'
                + '<option value="">Alle (' + partien.length + ' Partien)</option>'
                + namen.map(n => '<option value="' + esc(n.toLowerCase()) + '"' + (n.toLowerCase() === filter ? ' selected' : '') + '>' + esc(n) + '</option>').join('')
                + '</select></label>'
                + zeichneBegegnungen(t, partien, filter);
        } catch (e) {
            body.innerHTML = knoepfe + '<p class="ot-fehler">' + esc(e.message) + '</p>';
        }
    }

    /* ─── Countdown / Live-Hinweis ────────────────────────────────────── */

    /**
     * Ganz oben: das naechste angesetzte Turnier mit laufendem Countdown -
     * oder, wenn gerade eines laeuft, ein Live-Hinweis. Beides fuehrt mit
     * einem Klick zu Lichess, wo man beitritt bzw. zuschaut.
     */
    function zeichneVorschau(ziel, turniere) {
        const laufend = turniere.filter(t => t.status === 'laeuft');
        const geplant = turniere.filter(t => t.status === 'geplant' && t.start)
            .sort((a, b) => new Date(a.start) - new Date(b.start));

        let html = laufend.map(t =>
            '<div class="glass-card ot-live">'
            + '<span class="ot-live-punkt" aria-hidden="true"></span>'
            + '<span class="ot-live-text"><b>Läuft gerade:</b> ' + esc(t.name) + '</span>'
            + '<a class="btn btn-primary ot-live-knopf" href="' + esc(t.url) + '" target="_blank" rel="noopener">Live verfolgen ↗</a>'
            + '</div>').join('');

        const n = geplant[0];
        if (n) {
            const modus = n.typ === 'swiss' ? 'Swiss · ' + (n.runden || '?') + ' Runden' : 'Arena · ' + (n.minuten || '?') + ' Min.';
            html += '<div class="glass-card ot-countdown" data-ot-start="' + esc(n.start) + '">'
                + '<div class="ot-countdown-kopf">Nächstes Turnier</div>'
                + '<h3 class="ot-countdown-name">' + esc(n.name) + '</h3>'
                + '<div class="ot-countdown-meta">' + esc(datumText(n.start)) + ' · ' + esc(modus) + ' · ' + esc(n.bedenkzeit)
                + (n.spielerZahl ? ' · ' + n.spielerZahl + ' angemeldet' : '') + '</div>'
                + '<div class="ot-uhr" role="timer" aria-live="off">'
                + ['tage', 'std', 'min', 'sek'].map(e => '<div class="ot-uhr-feld"><b data-ot-uhr="' + e + '">–</b><span>'
                    + { tage: 'Tage', std: 'Std', min: 'Min', sek: 'Sek' }[e] + '</span></div>').join('')
                + '</div>'
                + '<a class="btn btn-primary ot-countdown-knopf" href="' + esc(n.url) + '" target="_blank" rel="noopener">Zum Turnier auf Lichess ↗</a>'
                + '</div>';
        }
        ziel.innerHTML = html;

        const box = ziel.querySelector('.ot-countdown');
        if (!box) return;
        const ziele = new Date(box.dataset.otStart).getTime();
        const feld = k => box.querySelector('[data-ot-uhr="' + k + '"]');
        const zwei = x => String(x).padStart(2, '0');

        function ticken() {
            let rest = Math.max(0, Math.floor((ziele - Date.now()) / 1000));
            if (rest === 0) {
                // Start erreicht: Uhr durch einen Hinweis ersetzen. Die Rangliste
                // kommt beim naechsten Aufruf der Seite von Lichess.
                clearInterval(box._uhr);
                box.querySelector('.ot-uhr').outerHTML = '<div class="ot-uhr-los">♟️ Es geht los!</div>';
                box.querySelector('.ot-countdown-kopf').textContent = 'Läuft gerade';
                return;
            }
            const tage = Math.floor(rest / 86400); rest %= 86400;
            const std = Math.floor(rest / 3600); rest %= 3600;
            feld('tage').textContent = tage;
            feld('std').textContent = zwei(std);
            feld('min').textContent = zwei(Math.floor(rest / 60));
            feld('sek').textContent = zwei(rest % 60);
        }
        ticken();
        box._uhr = setInterval(ticken, 1000);
    }

    /* ─── Ein Block = eine Serie ──────────────────────────────────────── */

    async function serieStarten(block) {
        if (block.dataset.otGestartet) return;
        block.dataset.otGestartet = '1';

        const links = linksLesen(block);
        const serie = block.dataset.serie || '';
        const punkteTabelle = (block.dataset.punkte || '').split(/[,;\s]+/).map(Number).filter(n => !isNaN(n) && n >= 0);
        const tabelle = punkteTabelle.length ? punkteTabelle : VORGABE_PUNKTE;
        const teilnahme = block.dataset.teilnahme !== undefined && block.dataset.teilnahme !== ''
            ? Number(block.dataset.teilnahme) || 0 : VORGABE_TEILNAHME;

        // Die eingetragenen Links verschwinden - an ihre Stelle tritt die Seite.
        block.innerHTML = '<div class="ot-vorschau-ziel"></div><div class="ot-gesamt-ziel"></div><div class="ot-liste"><p class="ot-leer">Turniere werden geladen …</p></div>';
        block.classList.add('ot-bereit');
        const vorschauZiel = block.querySelector('.ot-vorschau-ziel');
        const gesamtZiel = block.querySelector('.ot-gesamt-ziel');
        const listeZiel = block.querySelector('.ot-liste');

        if (!links.length) {
            /* Diese Meldung sehen BESUCHER - darum keine Anleitung, sondern eine
               Einladung. Der Hinweis fuer die Redaktion steht in der Konsole. */
            listeZiel.innerHTML = '<div class="glass-card ot-bald">'
                + '<div class="ot-bald-symbol" aria-hidden="true">♞</div>'
                + '<h3>Das erste Online-Turnier steht vor der Tür</h3>'
                + '<p>Sobald gespielt wird, findest du hier Ranglisten, alle Partien und die Gesamtwertung. '
                + 'Schau bald wieder vorbei!</p>'
                + '</div>';
            if (window.console) console.info('Online-Turniere: Noch keine Lichess-Links im Block eingetragen (pages.csv).');
            return;
        }

        // Nacheinander statt alle auf einmal - schont die Lichess-Schnittstelle.
        const turniere = [], fehler = [];
        for (const l of links) {
            try { turniere.push(await turnierLaden(l)); }
            catch (e) { fehler.push({ link: l, text: e.message }); }
        }

        turniere.sort((a, b) => new Date(b.start) - new Date(a.start));   // neueste zuerst
        const fertig = turniere.filter(t => t.status === 'fertig');
        const wertung = gesamtwertung(turniere, tabelle, teilnahme);
        zeichneVorschau(vorschauZiel, turniere);
        zeichneGesamt(gesamtZiel, wertung, serie, tabelle, teilnahme, fertig.length);

        listeZiel.innerHTML = '<h2 class="ot-titel-h ot-abschnitt">♟️ Turniere</h2>'
            + turniere.map(t => zeichneTurnierKarte(t, false)).join('')
            + fehler.map(f => '<div class="glass-card ot-fehler">Turnier ' + esc(f.link.id) + ': ' + esc(f.text) + '</div>').join('');

        const nachKey = new Map(turniere.map(t => [t.key, t]));

        block.addEventListener('click', function (ev) {
            const kopf = ev.target.closest('.ot-turnier-kopf');
            if (kopf) {
                const karte = kopf.closest('.ot-turnier');
                const body = karte.querySelector('.ot-turnier-body');
                const auf = body.classList.toggle('hidden') === false;
                kopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
                if (auf && !body.dataset.gezeichnet) {
                    body.dataset.gezeichnet = '1';
                    zeichneTurnierInhalt(body, nachKey.get(karte.dataset.otTurnier));
                }
                return;
            }
            const reiter = ev.target.closest('[data-ot-reiter]');
            if (reiter) {
                const body = reiter.closest('.ot-turnier-body');
                body.dataset.reiter = reiter.dataset.otReiter;
                zeichneTurnierInhalt(body, nachKey.get(reiter.closest('.ot-turnier').dataset.otTurnier));
                return;
            }
            const alle = ev.target.closest('[data-ot-alle]');
            if (alle) {
                const offen = alle.dataset.offen === '1';
                block.querySelectorAll('.ot-mehr').forEach(z => z.classList.toggle('hidden', offen));
                // Eingeklappt: auch offene Details der verborgenen Zeilen schliessen.
                if (offen) block.querySelectorAll('.ot-mehr + .ot-details').forEach(d => d.classList.add('hidden'));
                alle.dataset.offen = offen ? '' : '1';
                alle.textContent = offen
                    ? 'Alle ' + block.querySelectorAll('.ot-gesamt-zeile').length + ' Spieler anzeigen ▾'
                    : 'Nur Top ' + SICHTBAR + ' anzeigen ▴';
                return;
            }
            const zeile = ev.target.closest('[data-ot-details]');
            if (zeile) {
                const d = block.querySelector('[data-ot-details-fuer="' + zeile.dataset.otDetails + '"]');
                const auf = d.classList.toggle('hidden') === false;
                zeile.setAttribute('aria-expanded', auf ? 'true' : 'false');
            }
        });

        block.addEventListener('change', function (ev) {
            const sel = ev.target.closest('[data-ot-filter]');
            if (!sel) return;
            const body = sel.closest('.ot-turnier-body');
            body.dataset.filter = sel.value;
            zeichneTurnierInhalt(body, nachKey.get(sel.closest('.ot-turnier').dataset.otTurnier));
        });
    }

    function start() {
        document.querySelectorAll('.online-turniere').forEach(serieStarten);
    }

    // Fuer Tests und fuer Seiten, die den Block erst spaeter einsetzen.
    window.OnlineTurniere = { start: start, gesamtwertung: gesamtwertung, linksLesen: linksLesen };

    // pages.csv laedt dieses Skript erst, NACHDEM der Inhalt eingesetzt ist -
    // DOMContentLoaded ist dann laengst vorbei.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
