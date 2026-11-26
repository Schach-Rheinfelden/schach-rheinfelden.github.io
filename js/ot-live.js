/* ═══════════════════════════════════════════════════════════════════════
   Live-Event von Lichess (Broadcast) als Seitenreiter - z. B. eine WM
   ═══════════════════════════════════════════════════════════════════════
 * Eingetragen wird in info.csv (zwei Spalten wie immer):
 *     liveevent.link;https://lichess.org/broadcast/<event>/<runde>/<RundenID>
 * Irgendein Link aus dem Event genuegt (Runde oder Partie) - die Seite findet
 * selbst heraus, welche Runde gerade laeuft oder als naechste kommt.
 * Leere oder fehlende Zeile = kein Reiter.
 *
 *  - Schmaler Reiter am rechten Rand (ueber dem Online-Turnier-Reiter):
 *    "● LIVE" waehrend einer Runde, sonst Countdown bis zur naechsten.
 *  - Antippen / Maus darueber: Karte mit Brett 1 live, mit ‹ › durch die
 *    Bretter, Uhren, letzter Zug, Links zum Event und zur Partie auf Lichess.
 *  - Unter dem Brett der letzte Zug in deutscher Notation (aus der PGN der Runde),
 *    beendete Partien leicht abgedunkelt mit Ergebnis-Banderole.
 *  - Sichtbar ab 2 Tagen vor Runde 1 bis 12 Stunden nach der letzten Runde.
 *  - Lichess wird nur bei offener Karte oft gefragt (alle 10 s, solange
 *    gespielt wird); sonst hoechstens alle paar Minuten (Zwischenspeicher).
 */
(function () {
    'use strict';
    if (window.__otLive) return;
    window.__otLive = true;

    const API = 'https://lichess.org/api/broadcast/';
    const SPEICHER = 'ot-ev-v1';
    const MIN = 60000, STD = 3600000;
    const VORLAUF = 2 * 24 * STD, NACHLAUF = 12 * STD;

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const zwei = n => String(n).padStart(2, '0');
    const lesen = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    const schreiben = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* voll/gesperrt */ } };

    /* Figuren wie auf der Online-Turnierseite (klassischer Turnierstil). */
    const FIG = {
        K: '<g fill="none" stroke="#1F1E1C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#FFFFFF"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#FFFFFF"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g>',
        Q: '<g fill="#FFFFFF" stroke="#1F1E1C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.5"/><circle cx="14" cy="9" r="2.5"/><circle cx="22.5" cy="8" r="2.5"/><circle cx="31" cy="9" r="2.5"/><circle cx="39" cy="12" r="2.5"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/></g>',
        R: '<g fill="#FFFFFF" stroke="#1F1E1C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/><path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23" fill="none"/></g>',
        B: '<g fill="none" stroke="#1F1E1C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#FFFFFF"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><circle cx="22.5" cy="8" r="2.5"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g>',
        N: '<g fill="none" stroke="#1F1E1C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#FFFFFF"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.99-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.99 2.5-3c1 0 1 3 1 3" fill="#FFFFFF"/><circle cx="9.5" cy="25.5" r=".7" fill="#1F1E1C"/><ellipse cx="15" cy="15.5" rx=".6" ry="1.4" transform="rotate(30 15 15.5)" fill="#1F1E1C"/></g>',
        P: '<path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#FFFFFF" stroke="#1F1E1C" stroke-width="1.5" stroke-linecap="round"/>',
        k: '<g fill="none" stroke="#161513" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#2A2825"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#2A2825"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#DDD8CE" stroke-width="1.1"/></g>',
        q: '<g fill="#2A2825" stroke="#161513" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.5"/><circle cx="14" cy="9" r="2.5"/><circle cx="22.5" cy="8" r="2.5"/><circle cx="31" cy="9" r="2.5"/><circle cx="39" cy="12" r="2.5"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path d="M11 30c4-1 19-1 23 0M11.5 33.5c6-1 16-1 22 0" fill="none" stroke="#DDD8CE" stroke-width="1.1"/></g>',
        r: '<g fill="#2A2825" stroke="#161513" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/><path d="M14 29.5v-13h17v13H14z"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/><path d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23" fill="none" stroke="#DDD8CE" stroke-width="1"/></g>',
        b: '<g fill="none" stroke="#161513" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#2A2825"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><circle cx="22.5" cy="8" r="2.5"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#DDD8CE" stroke-width="1.1"/></g>',
        n: '<g fill="none" stroke="#161513" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#2A2825"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.99-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.99 2.5-3c1 0 1 3 1 3" fill="#2A2825"/><circle cx="9.5" cy="25.5" r=".7" fill="#DDD8CE" stroke="#DDD8CE"/><ellipse cx="15" cy="15.5" rx=".6" ry="1.4" transform="rotate(30 15 15.5)" fill="#DDD8CE" stroke="#DDD8CE"/><path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39h2.2c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.46-.1z" fill="#DDD8CE" stroke="none"/></g>',
        p: '<path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#2A2825" stroke="#DDD8CE" stroke-width="1.2" stroke-linecap="round"/>'
    };

    /* ── Link aus info.csv ───────────────────────────────────────────── */
    async function linkLesen() {
        const url = 'data/info.csv';
        const r = window.fetchCSVSource ? await window.fetchCSVSource(url) : await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) return '';
        const text = window.fetchTextWithEncoding ? await window.fetchTextWithEncoding(r) : await r.text();
        const zeilen = typeof parseCSVShared === 'function' ? parseCSVShared(text) : String(text).split(/\r?\n/).map(z => z.split(';'));
        const z = zeilen.find(x => String(x[0] || '').trim().toLowerCase() === 'liveevent.link');
        return z ? String(z[1] || '').trim() : '';
    }

    /** Runden-ID oder Event-ID aus dem Lichess-Link. */
    function kennung(link) {
        const m = String(link || '').match(/lichess\.org\/broadcast\/([^/?#\s]+)\/([^/?#\s]+)(?:\/([A-Za-z0-9]{8}))?/);
        if (!m) return null;
        if (m[3]) return { runde: m[3] };                              // /event/runde/RUNDE[/partie]
        if (/^[A-Za-z0-9]{8}$/.test(m[2])) return { event: m[2] };      // /event/EVENT
        return null;
    }

    async function json(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    }

    /** Event mit allen Runden - im Browser zwischengespeichert. */
    async function eventLaden(link) {
        const jetzt = Date.now();
        const s = lesen(SPEICHER);
        if (s && s.link === link && s.daten) {
            const offen = s.daten.rounds.some(r => r.ongoing || (r.startsAt && Math.abs(r.startsAt - jetzt) < 10 * MIN));
            if (jetzt - s.zeit < (offen ? MIN : 5 * MIN)) return s.daten;
        }
        const k = kennung(link);
        if (!k) return null;
        let eventId = k.event;
        if (!eventId) eventId = (await json(API + '-/-/' + k.runde)).tour.id;
        const daten = await json(API + eventId);
        schreiben(SPEICHER, { link, zeit: jetzt, daten: { tour: daten.tour, rounds: daten.rounds || [] } });
        return { tour: daten.tour, rounds: daten.rounds || [] };
    }

    /** Was ist gerade los? live / naechste Runde / zuletzt beendete. */
    function lage(ev) {
        const jetzt = Date.now(), r = ev.rounds;
        const live = r.find(x => x.ongoing);
        const fertig = r.filter(x => x.finishedAt || x.finished).sort((a, b) => (b.finishedAt || b.startsAt || 0) - (a.finishedAt || a.startsAt || 0));
        const kommend = r.filter(x => !x.ongoing && !x.finishedAt && !x.finished);
        const naechste = kommend.filter(x => x.startsAt).sort((a, b) => a.startsAt - b.startsAt)[0]
            || kommend.find(x => x.startsAfterPrevious) || null;
        let zeigen = false;
        if (live) zeigen = true;
        else if (naechste) zeigen = fertig.length > 0 || (naechste.startsAt && naechste.startsAt - jetzt <= VORLAUF);
        else if (fertig.length) zeigen = jetzt - (fertig[0].finishedAt || 0) <= NACHLAUF;
        // Brett-Runde: laufende, sonst die zuletzt beendete, sonst die naechste.
        const brettRunde = live || fertig[0] || naechste;
        return { live, naechste, fertig, zeigen, brettRunde, nr: x => r.indexOf(x) + 1, anzahl: r.length };
    }

    /* ── Brett aus FEN ───────────────────────────────────────────────── */
    function brettHtml(spiel) {
        const zeilen = String(spiel.fen || '8/8/8/8/8/8/8/8').split(' ')[0].split('/');
        const amZug = (String(spiel.fen || '').split(' ')[1] || 'w');
        const von = spiel.lastMove ? spiel.lastMove.slice(0, 2) : '', nach = spiel.lastMove ? spiel.lastMove.slice(2, 4) : '';
        const F = 'abcdefgh';
        let html = '';
        zeilen.forEach((z, r) => {
            let c = 0;
            for (const ch of z) {
                if (/\d/.test(ch)) {
                    for (let i = 0; i < +ch; i++) { html += feld(r, c, ''); c++; }
                } else { html += feld(r, c, ch); c++; }
            }
        });
        function feld(r, c, p) {
            const sq = F[c] + (8 - r);
            const kl = ['ot-feld', (r + c) % 2 === 0 ? 'hell' : 'dunkel'];
            if (sq === von || sq === nach) kl.push('letzter');
            if (spiel.check && p === (amZug === 'w' ? 'K' : 'k')) kl.push('schach');
            return '<div class="' + kl.join(' ') + '">' + (p && FIG[p] ? '<svg class="ot-figur" viewBox="0 0 45 45" aria-hidden="true">' + FIG[p] + '</svg>' : '') + '</div>';
        }
        return html;
    }

    /** Letzter Zug je Partie aus der PGN der Runde: Map Partie-ID -> "38… Kg8". */
    const DEUTSCH = { K: 'K', Q: 'D', R: 'T', B: 'L', N: 'S' };
    function letzteZuege(pgn) {
        const map = new Map();
        String(pgn || '').split(/\n\s*\n(?=\[Event )/).forEach(teil => {
            const id = (teil.match(/\[GameURL "[^"]*\/([A-Za-z0-9]{8})"\]/) || [])[1];
            if (!id) return;
            let text = teil.replace(/^\s*(\[[^\]]*\]\s*)+/, ' ').replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
            for (let i = 0; i < 5 && /\([^()]*\)/.test(text); i++) text = text.replace(/\([^()]*\)/g, ' ');
            /* Zugnummern aus der PGN selbst lesen ("38." Weiss, "38..." Schwarz) - so
               stimmt die Nummer auch bei Partien, die nicht bei Zug 1 beginnen. */
            let nr = 1, weiss = true, letzter = null;
            text.replace(/\$\d+/g, ' ').split(/\s+/).forEach(t => {
                if (!t || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)) return;
                const m = t.match(/^(\d+)(\.+)(.*)$/);
                if (m) { nr = +m[1]; weiss = m[2].length === 1; t = m[3]; if (!t) return; }
                letzter = { nr, weiss, san: t };
                if (weiss) weiss = false; else { weiss = true; nr++; }
            });
            if (!letzter) return;
            const san = letzter.san.replace(/^[KQRBN]/, b => DEUTSCH[b]).replace(/=([QRBN])/, (_, b) => '=' + DEUTSCH[b]);
            map.set(id, letzter.nr + (letzter.weiss ? '. ' : '… ') + san);
        });
        return map;
    }
    const nachname = n => String(n || '').split(',')[0].trim() || n;
    function ergebnisText(spiel) {
        const p = spiel.players || [];
        if (spiel.status === '1-0') return '1–0 · ' + nachname(p[0] && p[0].name) + ' gewinnt';
        if (spiel.status === '0-1') return '0–1 · ' + nachname(p[1] && p[1].name) + ' gewinnt';
        if (spiel.status === '½-½' || spiel.status === '1/2-1/2') return '½–½ · Remis';
        return '';
    }

    function uhrText(sek) {
        if (sek == null || isNaN(sek)) return '';
        sek = Math.max(0, Math.round(sek));
        const h = Math.floor(sek / 3600), m = Math.floor(sek % 3600 / 60), s = sek % 60;
        return (h ? h + ':' + zwei(m) : m) + ':' + zwei(s);
    }


    /* Karte immer ganz im Fenster halten: Auf niedrigen Bildschirmen ragte sie
       unten (oder oben unter die Navigation) hinaus. Verschoben wird ueber
       margin-top, die Animation (transform) bleibt unberuehrt. */
    function einpassen(el, anteil) {
        const karte = el.querySelector('.ot-hinweis-karte');
        if (!karte) return;
        if (window.innerWidth <= 600) { karte.style.marginTop = ''; karte.style.maxHeight = ''; return; }
        const nav = document.querySelector('.navbar');
        const oben = (nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0) + 10;
        const unten = window.innerHeight - 10;
        karte.style.maxHeight = Math.max(200, unten - oben) + 'px';
        const r = el.getBoundingClientRect(), h = karte.offsetHeight;
        const anfang = r.top + r.height / 2 - anteil * h;
        let versatz = 0;
        if (anfang + h > unten) versatz = unten - (anfang + h);
        if (anfang + versatz < oben) versatz = oben - anfang;
        karte.style.marginTop = Math.round(versatz) + 'px';
    }

    /* ── Anzeige ─────────────────────────────────────────────────────── */
    function bauen(link, ev) {
        const el = document.createElement('aside');
        el.className = 'ot-hinweis ot-event';
        el.setAttribute('aria-label', 'Live-Event auf Lichess');
        el.innerHTML = '<button type="button" class="ot-hinweis-griff" aria-expanded="false" aria-controls="ot-ev-karte">'
            + '<span class="ot-hinweis-symbol" aria-hidden="true">♛</span>'
            + '<span class="ot-hinweis-etikett" data-ot-l="etikett">Event</span>'
            + '<span class="ot-hinweis-kurz" data-ot-l="kurz">…</span></button>'
            + '<div class="ot-hinweis-karte ot-ev-karte" id="ot-ev-karte">'
            + '<button type="button" class="ot-hinweis-zu" aria-label="Schliessen" title="Schliessen">×</button>'
            + '<small class="ot-hinweis-kopf" data-ot-l="kopf"></small>'
            + '<a class="ot-hinweis-name ot-ev-titel" data-ot-l="titel" target="_blank" rel="noopener"></a>'
            + '<div data-ot-l="inhalt"></div></div>';
        (function () {
            // Gemeinsamer Stapel fuer alle Seitenreiter (Live-Event oben, Online-Turnier darunter).
            let s = document.getElementById('ot-reiter-stapel');
            if (!s) { s = document.createElement('div'); s.id = 'ot-reiter-stapel'; s.className = 'ot-reiter-stapel'; document.body.appendChild(s); }
            return s;
        })().appendChild(el);

        const $ = k => el.querySelector('[data-ot-l="' + k + '"]');
        const griff = el.querySelector('.ot-hinweis-griff');
        // frei: Partien, bei denen jemand die Banderole weggetippt hat (bleibt beim Auffrischen so).
        const zustand = { ev, l: lage(ev), runde: null, spiele: [], zuege: new Map(), frei: new Set(), brett: 0, geholt: 0, holen: null, uhr: null };

        /* Auf-/Zuklappen wie beim Online-Turnier-Reiter (x schliesst nur die Karte). */
        const passen = () => einpassen(el, 0.35);
        el.addEventListener('mouseenter', passen);
        el.addEventListener('focusin', passen);
        window.addEventListener('resize', passen);
        const setzen = offen => {
            if (offen) passen();
            el.classList.toggle('offen', offen);
            griff.setAttribute('aria-expanded', offen ? 'true' : 'false');
            if (offen) rundeHolen();
        };
        griff.addEventListener('click', () => { el.classList.remove('ruhe'); setzen(!el.classList.contains('offen')); });
        el.querySelector('.ot-hinweis-zu').addEventListener('click', ev2 => { ev2.stopPropagation(); setzen(false); el.classList.add('ruhe'); griff.focus({ preventScroll: true }); });
        griff.addEventListener('mouseenter', () => { el.classList.remove('ruhe'); rundeHolen(); });
        el.addEventListener('focusout', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('ruhe'); });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') setzen(false);
            const sichtbar = el.classList.contains('offen') || el.matches(':hover');
            if (sichtbar && zustand.spiele.length > 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { blaettern(e.key === 'ArrowLeft' ? -1 : 1); e.preventDefault(); }
        });
        // composedPath: Die Pfeile zeichnen die Karte neu - der angeklickte Knopf ist danach
        // nicht mehr im Dokument und galt sonst als "Klick daneben" (Karte ging zu).
        document.addEventListener('click', e => { const pfad = e.composedPath ? e.composedPath() : []; if (!pfad.includes(el) && !el.contains(e.target)) setzen(false); });
        el.addEventListener('click', e => {
            const b = e.target.closest('[data-ot-blatt]');
            if (b) blaettern(Number(b.dataset.otBlatt));
            const f = e.target.closest('[data-ot-frei]');
            if (f) freiSchalten(f);
        });
        el.addEventListener('keydown', e => {
            const f = e.target.closest && e.target.closest('[data-ot-frei]');
            if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); freiSchalten(f); }
        });
        /* Banderole weg / wieder da - ohne die Karte neu zu zeichnen (Fokus bleibt). */
        function freiSchalten(f) {
            const id = f.dataset.otFrei, an = !zustand.frei.has(id);
            if (an) zustand.frei.add(id); else zustand.frei.delete(id);
            f.classList.toggle('frei', an);
            f.setAttribute('aria-pressed', String(an));
        }

        function blaettern(d) {
            const n = zustand.spiele.length;
            if (!n) return;
            zustand.brett = (zustand.brett + d + n) % n;
            zeichneInhalt();
        }

        /* Runde mit allen Brettern holen - nur bei Bedarf, waehrend Live alle 10 s. */
        async function rundeHolen(erzwingen) {
            const r = zustand.l.brettRunde;
            if (!r) return;
            const alt = Date.now() - zustand.geholt;
            const frisch = zustand.runde && zustand.runde.id === r.id && alt < (zustand.l.live ? 10000 : 5 * MIN);
            if (!erzwingen && frisch) return;
            if (zustand.holen) return zustand.holen;
            const pgn = fetch(API + 'round/' + r.id + '.pgn').then(x => x.ok ? x.text() : '').catch(() => '');
            zustand.holen = Promise.all([json(API + '-/-/' + r.id), pgn]).then(([d, p]) => {
                zustand.runde = d.round; zustand.spiele = d.games || []; zustand.geholt = Date.now();
                zustand.zuege = letzteZuege(p);
                if (zustand.brett >= zustand.spiele.length) zustand.brett = 0;
                zeichneInhalt();
            }).catch(() => { /* Lichess nicht erreichbar - naechster Versuch spaeter */ }).finally(() => { zustand.holen = null; });
            return zustand.holen;
        }

        function zeichneKopf() {
            const l = zustand.l, t = zustand.ev.tour;
            el.classList.toggle('live', !!l.live);
            $('etikett').innerHTML = l.live ? '<i class="ot-hinweis-punkt"></i>Live' : 'Event';
            const ziel = l.live ? l.live : l.naechste || l.fertig[0];
            $('kopf').textContent = l.live ? '● Live · ' + l.live.name
                : l.naechste ? 'Nächste Runde · ' + l.naechste.name + ' (' + l.nr(l.naechste) + '/' + l.anzahl + ')'
                : 'Beendet';
            const titel = $('titel');
            titel.textContent = t.name;
            titel.href = (ziel && ziel.url) || t.url;
        }

        function spielerZeile(p, seite, spiel, amZug) {
            p = p || {};
            const lauf = amZug && spiel.status === '*' && zustand.l.live;
            const sek = p.clock != null ? p.clock / 100 - (lauf ? (spiel.thinkTime || 0) + (Date.now() - zustand.geholt) / 1000 : 0) : null;
            const erg = spiel.status && spiel.status !== '*' ? (seite === 'w' ? spiel.status.split('-')[0] : spiel.status.split('-')[1]) : '';
            return '<div class="ot-ev-spieler' + (lauf ? ' am-zug' : '') + '">'
                + '<span class="ot-ev-farbe ' + seite + '" aria-hidden="true"></span>'
                + (p.title ? '<span class="ot-titel">' + esc(p.title) + '</span>' : '')
                + '<b>' + esc(p.name || '?') + '</b>'
                + (p.rating ? '<small>' + p.rating + '</small>' : '')
                + (p.fed ? '<small class="ot-ev-fed">' + esc(p.fed) + '</small>' : '')
                + (erg ? '<span class="ot-ev-erg">' + esc(erg) + '</span>' : '')
                + (sek != null ? '<span class="ot-ev-uhr"' + (lauf ? ' data-ot-tick="' + (sek + Date.now() / 1000) + '"' : '') + '>' + uhrText(sek) + '</span>' : '')
                + '</div>';
        }

        function countdownHtml(r) {
            if (!r) return '';
            if (!r.startsAt) return '<div class="ot-ev-folgt">' + esc(r.name) + ' beginnt direkt nach der laufenden Runde.</div>';
            const d = new Date(r.startsAt);
            return '<div class="ot-ev-naechste"><span>' + esc(r.name) + ' · ' + esc(d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' }))
                + ' · ' + esc(d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })) + '</span>'
                + '<div class="ot-hinweis-uhr" role="timer" aria-live="off">' + ['T', 'Std', 'Min', 'Sek'].map(e => '<span><b data-ot-cd="' + e + '">–</b><small>' + (e === 'T' ? 'Tage' : e) + '</small></span>').join('') + '</div></div>';
        }

        function zeichneInhalt() {
            const l = zustand.l, sp = zustand.spiele, g = sp[zustand.brett];
            let html = '';
            if (!l.live && l.naechste) html += countdownHtml(l.naechste);
            if (g) {
                const amZug = (String(g.fen || '').split(' ')[1] || 'w');
                const erg = ergebnisText(g), zug = zustand.zuege && zustand.zuege.get(g.id);
                const rundeName = zustand.runde ? zustand.runde.name : '';
                html += '<div class="ot-ev-leiste">'
                    + (sp.length > 1 ? '<button type="button" class="ot-ev-pfeil" data-ot-blatt="-1" aria-label="Vorheriges Brett">‹</button>' : '<span></span>')
                    + '<span>' + (l.live ? '' : esc(rundeName) + ' · ') + (l.live && g.status === '*' ? '<i class="ot-hinweis-punkt"></i> ' : '') + (sp.length > 1 ? 'Brett ' + (zustand.brett + 1) + ' von ' + sp.length : (l.live ? (g.status === '*' ? 'Live' : 'Beendet') : 'Schlussstellung')) + '</span>'
                    + (sp.length > 1 ? '<button type="button" class="ot-ev-pfeil" data-ot-blatt="1" aria-label="Nächstes Brett">›</button>' : '<span></span>')
                    + '</div>'
                    + spielerZeile(g.players && g.players[1], 'b', g, amZug === 'b')
                    + '<div class="ot-ev-rahmen' + (erg ? ' beendet' + (zustand.frei.has(g.id) ? ' frei' : '') : '') + '"'
                    + (erg ? ' data-ot-frei="' + esc(g.id) + '" role="button" tabindex="0" title="Antippen: Ergebnis aus-/einblenden" aria-pressed="' + zustand.frei.has(g.id) + '"' : '')
                    + '><div class="ot-ev-brett" aria-label="' + esc(g.name || 'Brett') + '">' + brettHtml(g) + '</div>'
                    + (erg ? '<div class="ot-ev-banderole">' + esc(erg) + '</div>' : '') + '</div>'
                    + spielerZeile(g.players && g.players[0], 'w', g, amZug === 'w')
                    + (zug ? '<div class="ot-ev-zug">Letzter Zug <b>' + esc(zug) + (g.check === '#' && !/#$/.test(zug) ? '#' : '') + '</b></div>' : '');
            } else if (l.brettRunde && !zustand.geholt) html += '<p class="ot-ev-laden">Bretter werden geladen …</p>';
            const partie = g && zustand.runde ? zustand.runde.url + '/' + g.id : null;
            html += '<div class="ot-hinweis-knoepfe">'
                + '<a class="btn btn-primary" href="' + esc((l.live && l.live.url) || zustand.ev.tour.url) + '" target="_blank" rel="noopener">Event auf Lichess ↗</a>'
                + (partie ? '<a class="ot-hinweis-mehr" href="' + esc(partie) + '" target="_blank" rel="noopener">Partie ↗</a>' : '') + '</div>';
            $('inhalt').innerHTML = html;
            passen();   // Inhalt (z. B. Brett) ist da - Hoehe neu, Lage pruefen
            ticken();
        }

        /* Sekundentakt: Countdown am Reiter und in der Karte, laufende Uhr. */
        function ticken() {
            const l = zustand.l, jetzt = Date.now();
            const kurz = $('kurz');
            if (l.live) kurz.textContent = 'jetzt';
            else if (l.naechste && l.naechste.startsAt) {
                const rest = Math.max(0, Math.floor((l.naechste.startsAt - jetzt) / 1000));
                const tg = Math.floor(rest / 86400), h = Math.floor(rest % 86400 / 3600), m = Math.floor(rest % 3600 / 60), s = rest % 60;
                kurz.textContent = rest === 0 ? 'gleich' : tg ? tg + 'T ' + zwei(h) + 'h' : zwei(h) + ':' + zwei(m) + ':' + zwei(s);
                const f = k => el.querySelector('[data-ot-cd="' + k + '"]');
                if (f('T')) { f('T').textContent = tg; f('Std').textContent = zwei(h); f('Min').textContent = zwei(m); f('Sek').textContent = zwei(s); }
                griff.setAttribute('aria-label', zustand.ev.tour.name + ': ' + l.naechste.name + (rest ? ' in ' + (tg ? tg + ' Tagen ' : '') + h + ' Std. ' + m + ' Min.' : ' beginnt gleich'));
            } else kurz.textContent = l.naechste ? 'folgt' : 'Ende';
            if (l.live) griff.setAttribute('aria-label', zustand.ev.tour.name + ': ' + l.live.name + ' läuft gerade');
            el.querySelectorAll('[data-ot-tick]').forEach(u => { u.textContent = uhrText(Number(u.dataset.otTick) - jetzt / 1000); });
        }

        async function auffrischen() {
            try {
                const ev2 = await eventLaden(link);
                if (!ev2) return;
                const vorher = zustand.l.brettRunde && zustand.l.brettRunde.id;
                zustand.ev = ev2; zustand.l = lage(ev2);
                if (!zustand.l.zeigen) { el.remove(); clearInterval(zustand.uhr); return; }
                zeichneKopf();
                if (zustand.l.brettRunde && zustand.l.brettRunde.id !== vorher) { zustand.runde = null; zustand.geholt = 0; }
                zeichneInhalt();
                if (el.classList.contains('offen') || el.matches(':hover')) rundeHolen();
            } catch (e) { /* naechster Versuch */ }
        }

        zeichneKopf();
        zeichneInhalt();
        zustand.uhr = setInterval(() => {
            ticken();
            const offen = el.classList.contains('offen') || el.matches(':hover');
            // Offen und live: Bretter alle 10 s; Countdown abgelaufen: Event neu pruefen.
            if (offen && zustand.l.live && Date.now() - zustand.geholt > 10000) rundeHolen(true);
            // Startzeit erreicht: Event jede Minute neu pruefen, bis Lichess die Runde als laufend meldet.
            if (zustand.l.naechste && zustand.l.naechste.startsAt && Date.now() > zustand.l.naechste.startsAt && Date.now() - (zustand.geprueft || 0) > MIN) { zustand.geprueft = Date.now(); auffrischen(); }
        }, 1000);
        setInterval(auffrischen, 5 * MIN);
        setTimeout(() => el.classList.add('sichtbar'), 1400);
        return { el, zustand, blaettern, rundeHolen, setzen };
    }

    async function los() {
        try {
            const link = await linkLesen();
            if (!link || !kennung(link)) return;
            const ev = await eventLaden(link);
            if (!ev || !lage(ev).zeigen) return;
            window.OtLive.anzeige = bauen(link, ev);
        } catch (e) { /* Der Reiter ist eine Zugabe - nie ein Fehler fuer die Seite. */ }
    }

    window.OtLive = { kennung, lage, brettHtml, uhrText, letzteZuege, ergebnisText, los };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los);
    else los();
})();
