/**
 * online-turniere.js — Lichess-Turniere: Rangliste, Kreuztabelle, Partien,
 * Brett zum Nachspielen und Gesamtwertung
 * =========================================================================
 *
 * ══ SO BENUTZT DU ES ══
 * In pages.csv (Spalte "content") steht ein Block wie dieser:
 *
 *   <div class="online-turniere" data-serie="Gesamtwertung"
 *        data-punkte="10,8,6,5,4,3,2,1" data-teilnahme="1" data-streich="0">
 *     https://lichess.org/swiss/AbCd1234
 *     https://lichess.org/tournament/XyZ98765
 *   </div>
 *   <script src="js/online-turniere.js?v=2"></script>
 *
 * Neues Turnier? Einfach den Lichess-Link in den Block einfuegen - mehr nicht.
 * Ein Link in <!-- … --> zaehlt nicht (voruebergehend aus der Wertung nehmen).
 *
 * Zwei Bereiche im Block - Turniere MIT und OHNE Gesamtwertung:
 *     MIT GESAMTWERTUNG:
 *     https://lichess.org/swiss/AbCd1234
 *     https://lichess.org/tournament/XyZ98765
 *     OHNE GESAMTWERTUNG:
 *     https://lichess.org/swiss/QwEr5678
 * Jeder Link gehoert zur letzten Ueberschrift davor (Gross/klein egal,
 * Doppelpunkt egal). Ohne Ueberschrift zaehlt ein Link zur Gesamtwertung.
 * Turniere "ohne" stehen unter "Weitere Turniere", bekommen keine Nummer und
 * zaehlen nicht in Gesamtwertung, Serien-Zahlen und Spielerliste. Gibt es NUR
 * Turniere ohne Gesamtwertung, zeigt die Seite einfach eine Turnier-Uebersicht.
 *
 * ══ AM EINFACHSTEN: ALLES IM BLATT "online-turniere" (data/online-turniere.csv) ══
 * In der pages-Zelle steht dann nur noch der Platzhalter
 *     <div class="online-turniere" data-quelle="data/online-turniere.csv"></div>
 * und das Blatt ist eine Matrix - eine Zeile pro Turnier, dazu wahlweise eine
 * Einstellungszeile pro Serie (Zeile OHNE Link):
 *   serie          Name der Serie. Leer = wie die Zeile darueber.
 *   link           Lichess-Link (swiss/… oder tournament/…). Leer = Einstellungszeile.
 *   gesamtwertung  Einstellungszeile: ja = Serie hat eine Gesamtwertung (alle zaehlen,
 *                  ausser Turniere mit "nein"). Ohne Einstellung zaehlen nur Turniere
 *                  mit "ja" - und nur dann gibt es eine Gesamtwertung.
 *   punkte, teilnahme, streich, kurzname, beschreibung   nur Einstellungszeile
 *   werbung        nein = nie im Countdown-Hinweis auf den anderen Seiten
 *   bild           Bild der Serie (Link oder assets/…-Pfad, wie bei News/Terminen):
 *                  im Kopf der Serie, auf ihrer Karte in der Uebersicht und im
 *                  Countdown-Reiter. Nur Einstellungszeile.
 *   team           Lichess-Team, dem man vorher beitreten muss (Link oder Kurzname,
 *                  z. B. https://lichess.org/team/schach-rheinfelden). In der
 *                  Einstellungszeile fuer alle Turniere der Serie, sonst je Turnier.
 *   anzeigen       nein = Zeile (Turnier oder ganze Serie) ausblenden
 *   notiz          frei, wird nicht angezeigt
 *
 * MEHRERE SERIEN: einfach mehrere Bloecke hintereinander in dieselbe Zelle,
 * jeder mit eigenem Namen und eigenen Einstellungen:
 *     <div class="online-turniere" data-serie="Jans Online-Turniere" …>…</div>
 *     <div class="online-turniere" data-serie="960 Series" data-wertung="nein">…</div>
 * Die Seite zeigt dann zuerst eine Karte pro Serie; ein Klick oeffnet die Serie.
 *
 * DIREKTE LINKS: Die Adresszeile zeigt immer, was gerade offen ist, und laesst
 * sich kopieren (oder per Knopf "🔗 Link"):
 *     ?page=online-turniere&serie=960-series                 Serie
 *     ?page=online-turniere&serie=960-series&bereich=spieler  Bereich (gesamt|turniere|spieler)
 *     ?page=online-turniere&turnier=AbCd1234&reiter=partien   Turnier (+ rangliste|kreuz|partien)
 * "serie" ist der Name klein und mit Bindestrichen (oder data-id="…" am Block).
 * Die Zurueck-Taste des Browsers funktioniert dabei wie gewohnt.
 *
 *   data-serie      Name der Serie (Kopf und Serienkarte)
 *   data-id         Kurzname fuer Links (optional, sonst aus data-serie)
 *   data-punkte     Punkte fuer Platz 1, 2, 3 … (Vorgabe 10,8,6,5,4,3,2,1)
 *   data-teilnahme  Punkte fuer jede gespielte Teilnahme (Vorgabe 1)
 *   data-streich    Streichresultate in der Gesamtwertung (Vorgabe 0)
 *   data-wertung    "nein" = Serie OHNE Gesamtpunkte (Vorgabe "ja")
 *   data-modus      "einzel" = nur dieses eine Turnier zeigen,
 *                   "serie"  = immer als Serie zeigen.
 *                   Ohne Angabe: ein Link = Einzelturnier, mehrere = Serie.
 *
 * ══ WARUM ES SCHNELL BLEIBT ══
 * Lichess liefert Ranglisten und Partien nur gedrosselt aus - etwa 50 Spieler
 * und 20-30 Partien pro Sekunde. Ein grosses oeffentliches Arena-Turnier
 * (455 Spieler, 1177 Partien) braucht damit 10 Sekunden bzw. ueber eine
 * Minute. Die erste Fassung wartete, bis ALLES da war, und zeigte bis dahin
 * nur "wird geladen".
 *
 * Jetzt:
 *   1. Die Eckdaten aller Turniere kommen parallel (je ~50 ms) - die Seite
 *      steht sofort.
 *   2. Ranglisten laufen sichtbar ein, mit Fortschrittsanzeige.
 *   3. Partien werden erst geladen, wenn jemand sie braucht (Kreuztabelle,
 *      Partienliste, Kennzahlen), ebenfalls mit Fortschritt.
 *   4. Abgeschlossene Turniere merkt sich der Browser drei Tage lang.
 * Ein Vereinsturnier mit 15 Spielern ist so in unter einer Sekunde komplett.
 */
(function () {
    'use strict';

    const API = 'https://lichess.org/api';
    const VORGABE_PUNKTE = [10, 8, 6, 5, 4, 3, 2, 1];
    const VORGABE_TEILNAHME = 1;
    const CACHE_PRAEFIX = 'ot-v3:';
    const CACHE_DAUER = 3 * 24 * 3600 * 1000;      // siehe cacheLesen
    const MAX_PARTIEN = 2000;                        // Obergrenze je Turnier
    const SWISS_LUECKE_MS = 20000;                   // neue Swiss-Runde ab dieser Pause
    const ANZEIGE_PARTIEN = 250;                     // Arena: so viele Partien je Seite
    const REMIS_STATUS = new Set(['draw', 'stalemate', 'threefoldRepetition', 'fiftyMoves', 'insufficientMaterialClaim']);
    const IGNORIERT = new Set(['aborted', 'noStart', 'created', 'started']);
    const TEMPO = [{ t: '0.5x', ms: 1350 }, { t: '1x', ms: 750 }, { t: '2x', ms: 360 }];

    /* ═══════════════════════════════════════════════════════════════════
       KLEINKRAM
       ═══════════════════════════════════════════════════════════════════ */

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    const schluessel = n => String(n == null ? '' : n).trim().toLowerCase();

    /** 3.5 -> "3½", 12 -> "12" */
    function pkt(n) {
        const x = Math.round((Number(n) || 0) * 100) / 100;
        if (Math.abs((x % 1) - 0.5) < 0.001) { const g = Math.floor(x); return g === 0 ? '½' : g + '½'; }
        return Number.isInteger(x) ? String(x) : x.toFixed(1);
    }
    const dez = n => { const r = Math.round((Number(n) || 0) * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };

    function datumText(iso, mitZeit) {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        const tag = d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
        return mitZeit === false ? tag : tag + ' · ' + d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    }
    const kurzDatum = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
    const uhrzeit = ms => { const d = new Date(ms); return isNaN(d) ? '–' : d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }); };

    function bedenkzeit(clock) {
        if (!clock) return '';
        const min = clock.limit / 60;
        return (min >= 1 ? String(Math.round(min * 10) / 10) : clock.limit + 's') + '+' + (clock.increment || 0);
    }

    function medaille(rang) { return rang === 1 ? '🥇' : rang === 2 ? '🥈' : rang === 3 ? '🥉' : String(rang); }
    /** "🥇 1. Platz" - wo die Medaille allein zu wenig sagt. */
    function platzText(rang) { return !isFinite(rang) ? '–' : (rang <= 3 ? medaille(rang) + ' ' : '') + rang + '. Platz'; }
    const titelTag = t => t ? '<span class="ot-titel">' + esc(t) + '</span>' : '';

    const ENDE = {
        mate: 'Matt', resign: 'Aufgabe', outoftime: 'Zeit', timeout: 'Verlassen', draw: 'Remis',
        stalemate: 'Patt', threefoldRepetition: 'Wiederholung', fiftyMoves: '50-Züge-Regel',
        insufficientMaterialClaim: 'Zu wenig Material', cheat: 'Fairplay', variantEnd: 'Variante'
    };

    /* Zwischenspeicher fuer ABGESCHLOSSENE Turniere, drei Tage lang. Ganz
       unveraenderlich sind auch sie nicht: Lichess entfernt Spieler mitunter
       nachtraeglich wegen Regelverstoss. Drei Tage spaeter zieht die Seite nach. */
    function cacheLesen(k) {
        try {
            const e = JSON.parse(localStorage.getItem(CACHE_PRAEFIX + k) || 'null');
            return e && e.zeit && Date.now() - e.zeit < CACHE_DAUER ? e.daten : null;
        } catch (e) { return null; }
    }
    function cacheSchreiben(k, v) {
        try {
            const s = JSON.stringify({ zeit: Date.now(), daten: v });
            // Riesige Arenen sprengen den Speicher des Browsers - dann eben nicht.
            if (s.length < 1500000) localStorage.setItem(CACHE_PRAEFIX + k, s);
        } catch (e) { /* voll oder privat */ }
    }

    /* ═══════════════════════════════════════════════════════════════════
       SCHACH: ZUEGE NACHSPIELEN (ohne Fremdbibliothek)
       Liest die Zugliste in Kurznotation (SAN) und baut daraus Stellung fuer
       Stellung. Rochade, en passant, Umwandlung und Fesselungen inklusive.
       ═══════════════════════════════════════════════════════════════════ */

    const Schach = (function () {
        const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const FILES = 'abcdefgh';
        const farbe = ch => ch ? (ch === ch.toUpperCase() ? 'w' : 'b') : null;
        const drin = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
        const feld = sq => { if (!sq || sq.length !== 2) return null; const c = FILES.indexOf(sq[0]), r = 8 - parseInt(sq[1], 10); return drin(r, c) ? { r, c } : null; };
        const name = (r, c) => drin(r, c) ? FILES[c] + (8 - r) : null;
        const kopie = b => b.map(z => z.slice());

        function fen(f) {
            const t = String(f || START).trim().split(/\s+/);
            const reihen = (t[0] || '').split('/');
            if (reihen.length !== 8) return fen(START);
            const brett = Array.from({ length: 8 }, () => Array(8).fill(null));
            for (let r = 0; r < 8; r++) {
                let c = 0;
                for (const ch of reihen[r]) {
                    if (ch >= '1' && ch <= '8') c += parseInt(ch, 10);
                    else if ('pnbrqkPNBRQK'.includes(ch) && c < 8) brett[r][c++] = ch;
                }
            }
            const ro = t[2] || '-';
            return { brett, zug: t[1] === 'b' ? 'b' : 'w', ro: { K: ro.includes('K'), Q: ro.includes('Q'), k: ro.includes('k'), q: ro.includes('q') }, ep: t[3] && t[3] !== '-' ? feld(t[3]) : null };
        }

        function koenig(b, f) { const z = f === 'w' ? 'K' : 'k'; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] === z) return { r, c }; return null; }

        function angegriffen(b, r, c, von) {
            const P = von === 'w' ? 'P' : 'p', pr = von === 'w' ? r + 1 : r - 1;
            if (drin(pr, c - 1) && b[pr][c - 1] === P) return true;
            if (drin(pr, c + 1) && b[pr][c + 1] === P) return true;
            const N = von === 'w' ? 'N' : 'n';
            for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) if (drin(r + dr, c + dc) && b[r + dr][c + dc] === N) return true;
            const K = von === 'w' ? 'K' : 'k';
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && drin(r + dr, c + dc) && b[r + dr][c + dc] === K) return true;
            const R = von === 'w' ? 'R' : 'r', Q = von === 'w' ? 'Q' : 'q', B = von === 'w' ? 'B' : 'b';
            const strahl = (richt, figuren) => {
                for (const [dr, dc] of richt) {
                    let nr = r + dr, nc = c + dc;
                    while (drin(nr, nc)) { const p = b[nr][nc]; if (p) { if (figuren.includes(p)) return true; break; } nr += dr; nc += dc; }
                }
                return false;
            };
            return strahl([[-1, 0], [1, 0], [0, -1], [0, 1]], [R, Q]) || strahl([[-1, -1], [-1, 1], [1, -1], [1, 1]], [B, Q]);
        }
        const imSchach = (b, f) => { const k = koenig(b, f); return !!k && angegriffen(b, k.r, k.c, f === 'w' ? 'b' : 'w'); };
        function frei(b, r1, c1, r2, c2) { const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1); let r = r1 + dr, c = c1 + dc; while (r !== r2 || c !== c2) { if (b[r][c] !== null) return false; r += dr; c += dc; } return true; }

        function erreicht(pos, fr, fc, tr, tc, typ, schlag) {
            const b = pos.brett, dr = tr - fr, dc = tc - fc, adr = Math.abs(dr), adc = Math.abs(dc), ziel = b[tr][tc];
            if (ziel && farbe(ziel) === pos.zug) return false;
            if (typ === 'P') {
                const dir = pos.zug === 'w' ? -1 : 1, start = pos.zug === 'w' ? 6 : 1;
                if (schlag) return dr === dir && adc === 1 && !!(ziel || (pos.ep && pos.ep.r === tr && pos.ep.c === tc));
                if (dc !== 0 || ziel !== null) return false;
                return dr === dir || (fr === start && dr === 2 * dir && b[fr + dir][fc] === null);
            }
            if (typ === 'N') return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
            if (typ === 'B') return adr === adc && adr > 0 && frei(b, fr, fc, tr, tc);
            if (typ === 'R') return (dr === 0 || dc === 0) && adr + adc > 0 && frei(b, fr, fc, tr, tc);
            if (typ === 'Q') return (adr === adc || dr === 0 || dc === 0) && adr + adc > 0 && frei(b, fr, fc, tr, tc);
            if (typ === 'K') return adr <= 1 && adc <= 1 && adr + adc > 0;
            return false;
        }

        function ziehe(pos, fr, fc, tr, tc, umw, roch) {
            const b = kopie(pos.brett), fig = b[fr][fc], ro = Object.assign({}, pos.ro);
            let ep = null;
            if (roch) {
                const z = pos.zug === 'w' ? 7 : 0;
                if (roch === 'kurz') { b[z][6] = fig; b[z][4] = null; b[z][5] = b[z][7]; b[z][7] = null; }
                else { b[z][2] = fig; b[z][4] = null; b[z][3] = b[z][0]; b[z][0] = null; }
            } else {
                if ((fig === 'P' || fig === 'p') && pos.ep && tr === pos.ep.r && tc === pos.ep.c && b[tr][tc] === null) b[fr][tc] = null;
                b[tr][tc] = umw ? (pos.zug === 'w' ? umw.toUpperCase() : umw.toLowerCase()) : fig;
                b[fr][fc] = null;
                if ((fig === 'P' || fig === 'p') && Math.abs(tr - fr) === 2) ep = { r: (fr + tr) / 2, c: fc };
            }
            if (fig === 'K') { ro.K = ro.Q = false; }
            if (fig === 'k') { ro.k = ro.q = false; }
            if ((fr === 7 && fc === 7) || (tr === 7 && tc === 7)) ro.K = false;
            if ((fr === 7 && fc === 0) || (tr === 7 && tc === 0)) ro.Q = false;
            if ((fr === 0 && fc === 7) || (tr === 0 && tc === 7)) ro.k = false;
            if ((fr === 0 && fc === 0) || (tr === 0 && tc === 0)) ro.q = false;
            return { brett: b, zug: pos.zug === 'w' ? 'b' : 'w', ro, ep };
        }

        function san(pos, roh) {
            const s = String(roh || '').trim().replace(/[+#!?]+$/g, '');
            if (!s) return null;
            const geg = pos.zug === 'w' ? 'b' : 'w', z = pos.zug === 'w' ? 7 : 0;
            const K = pos.zug === 'w' ? 'K' : 'k', R = pos.zug === 'w' ? 'R' : 'r', b = pos.brett;
            if (s === 'O-O' || s === '0-0') {
                if (b[z][4] !== K || b[z][7] !== R || b[z][5] || b[z][6]) return null;
                if ([4, 5, 6].some(c => angegriffen(b, z, c, geg))) return null;
                return { pos: ziehe(pos, z, 4, z, 6, null, 'kurz'), von: name(z, 4), nach: name(z, 6) };
            }
            if (s === 'O-O-O' || s === '0-0-0') {
                if (b[z][4] !== K || b[z][0] !== R || b[z][1] || b[z][2] || b[z][3]) return null;
                if ([4, 3, 2].some(c => angegriffen(b, z, c, geg))) return null;
                return { pos: ziehe(pos, z, 4, z, 2, null, 'lang'), von: name(z, 4), nach: name(z, 2) };
            }
            const m = s.match(/^([NBRQK])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=([NBRQ]))?$/);
            if (!m) return null;
            const typ = m[1] || 'P', df = m[2] ? FILES.indexOf(m[2]) : null, drk = m[3] ? 8 - parseInt(m[3], 10) : null;
            const ziel = feld(m[5]), suche = pos.zug === 'w' ? typ : typ.toLowerCase();
            if (!ziel) return null;
            for (let r = 0; r < 8; r++) {
                if (drk !== null && r !== drk) continue;
                for (let c = 0; c < 8; c++) {
                    if (df !== null && c !== df) continue;
                    if (b[r][c] !== suche || !erreicht(pos, r, c, ziel.r, ziel.c, typ, !!m[4])) continue;
                    const neu = ziehe(pos, r, c, ziel.r, ziel.c, m[6] || null, null);
                    if (!imSchach(neu.brett, pos.zug)) return { pos: neu, von: name(r, c), nach: m[5] };
                }
            }
            return null;
        }

        /** Alle Stellungen einer Partie. Bei unbekannten Zuegen (Varianten) bricht es sauber ab. */
        function nachspielen(zuege, startFen) {
            const tok = String(zuege || '').trim().split(/\s+/).filter(Boolean);
            let pos = fen(startFen || START);
            const bild = p => { const s = imSchach(p.brett, p.zug), k = s ? koenig(p.brett, p.zug) : null; return { schach: s, schachFeld: k ? name(k.r, k.c) : null }; };
            const stellungen = [Object.assign({ brett: kopie(pos.brett), von: null, nach: null }, bild(pos))];
            let hinweis = null, gelesen = 0;
            for (let i = 0; i < tok.length; i++) {
                const e = san(pos, tok[i]);
                if (!e) { hinweis = 'Ab Zug ' + (Math.floor(i / 2) + 1) + ' (' + tok[i] + ') kann das Brett nicht folgen (z. B. Schachvariante). Die Zugliste bleibt vollständig.'; break; }
                pos = e.pos;
                stellungen.push(Object.assign({ brett: kopie(pos.brett), von: e.von, nach: e.nach }, bild(pos)));
                gelesen++;
            }
            return { stellungen, zuege: tok, gelesen, hinweis };
        }
        return { nachspielen };
    })();

    /* Figuren als SVG (Satz im klassischen Turnierstil). */
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

    /* ═══════════════════════════════════════════════════════════════════
       LICHESS: LADEN
       ═══════════════════════════════════════════════════════════════════ */

    async function antwortPruefen(r) {
        if (r.status === 429) throw new Error('Lichess bittet um eine kurze Pause (zu viele Anfragen). Bitte in einer Minute neu laden.');
        if (r.status === 404) throw new Error('Turnier nicht gefunden – stimmt der Link?');
        if (!r.ok) throw new Error('Lichess antwortet nicht (' + r.status + ').');
    }

    /**
     * NDJSON zeilenweise lesen, waehrend es eintrifft - so laesst sich der
     * Fortschritt zeigen, statt stumm zu warten.
     */
    async function streamLesen(url, max, beiZahl) {
        let r;
        try { r = await fetch(url, { headers: { Accept: 'application/x-ndjson' } }); }
        catch (e) { throw new Error('Keine Verbindung zu Lichess.'); }
        await antwortPruefen(r);
        const zeilen = [];
        let gekappt = false;
        const nimm = z => { z = z.trim(); if (!z) return; try { zeilen.push(JSON.parse(z)); } catch (e) { /* kaputte Zeile */ } };

        if (r.body && r.body.getReader && typeof TextDecoder !== 'undefined') {
            const leser = r.body.getReader(), dec = new TextDecoder('utf-8');
            let puffer = '';
            for (;;) {
                const { value, done } = await leser.read();
                if (done) break;
                puffer += dec.decode(value, { stream: true });
                const teile = puffer.split('\n');
                puffer = teile.pop() || '';
                teile.forEach(nimm);
                if (beiZahl) beiZahl(zeilen.length, zeilen);
                if (zeilen.length >= max) { gekappt = true; try { await leser.cancel(); } catch (e) { /* egal */ } break; }
            }
            if (!gekappt) nimm(puffer);
        } else {
            String(await r.text()).split('\n').forEach(nimm);
        }
        if (zeilen.length > max) { zeilen.length = max; gekappt = true; }
        if (beiZahl) beiZahl(zeilen.length, zeilen);
        return { zeilen, gekappt };
    }

    /** Alle Lichess-Turnierlinks im Block, in Reihenfolge, ohne Doppelte, ohne auskommentierte. */
    function linksLesen(block) {
        const quelle = block.innerHTML.replace(/<!--[\s\S]*?-->/g, ' ')
            + ' ' + Array.from(block.querySelectorAll('a[href]')).map(a => a.href).join(' ');
        const muster = /lichess\.org\/(tournament|swiss)\/([A-Za-z0-9]{8})/g;
        const gesehen = new Set(), liste = [], treffer = [];
        let m;
        while ((m = muster.exec(quelle)) !== null) treffer.push({ m, ende: m.index + m[0].length });
        /* Ueberschriften "MIT GESAMTWERTUNG" / "OHNE GESAMTWERTUNG" teilen den Block
           in zwei Bereiche. Jeder Link gehoert zur letzten Ueberschrift davor. */
        const kopf = [], km = /\b(mit|ohne)\s+(?:gesamt\s*)?wertung/gi;
        while ((m = km.exec(quelle)) !== null) kopf.push({ pos: m.index, ohne: m[1].toLowerCase() === 'ohne' });
        treffer.forEach(t => {
            const typ = t.m[1] === 'swiss' ? 'swiss' : 'arena', uid = typ + ':' + t.m[2];
            if (gesehen.has(uid)) return;
            gesehen.add(uid);
            const k = kopf.filter(x => x.pos < t.m.index).pop();
            liste.push({ typ, id: t.m[2], uid, weitere: !!(k && k.ohne) });
        });
        return liste;
    }

    const pfad = t => t.typ === 'swiss' ? '/swiss/' : '/tournament/';

    async function infoLaden(link) {
        let r;
        try { r = await fetch(API + pfad(link) + link.id); } catch (e) { throw new Error('Keine Verbindung zu Lichess.'); }
        await antwortPruefen(r);
        const i = await r.json();
        const status = link.typ === 'swiss'
            ? (i.status === 'finished' ? 'fertig' : i.status === 'started' ? 'laeuft' : 'geplant')
            : (i.isFinished ? 'fertig' : i.secondsToStart > 0 ? 'geplant' : 'laeuft');
        return {
            uid: link.uid, typ: link.typ, id: link.id,
            url: 'https://lichess.org' + pfad(link) + link.id,
            name: i.fullName || i.name || link.id,
            start: i.startsAt,
            bedenkzeit: bedenkzeit(i.clock),
            dauer: link.typ === 'swiss' ? (i.nbRounds || '?') + ' Runden' : (i.minutes || '?') + ' Min.',
            runden: i.nbRounds || null,
            minuten: i.minutes || null,
            spielerZahl: i.nbPlayers || 0,
            partienZahl: i.stats && i.stats.games ? i.stats.games : null,
            status,
            spieler: null, spielerGeladen: 0,     // Rangliste (laeuft nach)
            partien: null, partienGeladen: 0, partienGekappt: false, partienLaeuft: null,
            fehler: null,
            weitere: !!link.weitere
        };
    }

    async function ranglisteLaden(t, beiZahl) {
        const gemerkt = t.status === 'fertig' ? cacheLesen('p:' + t.uid) : null;
        if (gemerkt) { t.spieler = gemerkt; return; }
        const { zeilen } = await streamLesen(API + pfad(t) + t.id + '/results', 100000, (n, roh) => {
            // Schon waehrend des Ladens anzeigbar: Lichess liefert in Rangfolge,
            // die Spitze ist also sofort da.
            t.spielerTeil = roh.map(spielerAusErgebnis(t));
            if (beiZahl) beiZahl(n);
        });
        t.spielerTeil = null;
        t.spieler = zeilen.map(spielerAusErgebnis(t));
        if (t.status === 'fertig') cacheSchreiben('p:' + t.uid, t.spieler);
    }

    function spielerAusErgebnis(t) {
        return (e, i) => ({
            rang: Number(e.rank) || i + 1,
            name: e.username || 'Unbekannt',
            key: schluessel(e.username),
            titel: e.title || '',
            rating: Number(e.rating) || 0,
            punkte: Number(t.typ === 'swiss' ? e.points : e.score) || 0,
            feinwertung: t.typ === 'swiss' && e.tieBreak != null ? Number(e.tieBreak) : null,
            leistung: e.performance ? Number(e.performance) : null
        });
    }

    function partieNormalisieren(g, t) {
        if (IGNORIERT.has(g.status)) return null;
        const w = g.players && g.players.white || {}, s = g.players && g.players.black || {};
        const nameVon = p => (p.user && (p.user.name || p.user.id)) || p.name || (p.aiLevel ? 'Stockfish ' + p.aiLevel : 'Unbekannt');
        let ergebnis = null;
        if (g.winner === 'white') ergebnis = 'white';
        else if (g.winner === 'black') ergebnis = 'black';
        else ergebnis = 'draw';
        const wR = Number(w.rating) || 0, sR = Number(s.rating) || 0;
        let upset = 0;
        if (ergebnis === 'white' && wR && sR > wR) upset = sR - wR;
        if (ergebnis === 'black' && sR && wR > sR) upset = wR - sR;
        const zuege = typeof g.moves === 'string' ? g.moves.trim() : '';
        const halbzuege = zuege ? zuege.split(/\s+/).length : 0;
        return {
            id: String(g.id), zeit: Number(g.createdAt) || 0, status: g.status, ende: ENDE[g.status] || 'Beendet',
            ergebnis, upset, zuege, zugzahl: Math.ceil(halbzuege / 2),
            startFen: g.initialFen && g.initialFen !== 'startpos' ? g.initialFen : null,
            white: { name: nameVon(w), key: schluessel(nameVon(w)), titel: (w.user && w.user.title) || '', rating: wR, diff: typeof w.ratingDiff === 'number' ? w.ratingDiff : null },
            black: { name: nameVon(s), key: schluessel(nameVon(s)), titel: (s.user && s.user.title) || '', rating: sR, diff: typeof s.ratingDiff === 'number' ? s.ratingDiff : null },
            eco: (g.opening && g.opening.eco) || '–', eroeffnung: (g.opening && g.opening.name) || '',
            runde: null, turnier: t.name
        };
    }

    /** Partien erst laden, wenn jemand sie braucht. Mehrfache Anfragen teilen sich denselben Abruf. */
    function partienLaden(t, beiZahl) {
        if (t.partien) return Promise.resolve(t.partien);
        if (t.partienLaeuft) return t.partienLaeuft;
        t.partienLaeuft = (async () => {
            const gemerkt = t.status === 'fertig' ? cacheLesen('g:' + t.uid) : null;
            let roh, gekappt = false;
            if (gemerkt) roh = gemerkt.roh, gekappt = gemerkt.gekappt;
            else {
                const r = await streamLesen(API + pfad(t) + t.id + '/games?moves=true&opening=true&clocks=false&evals=false',
                    MAX_PARTIEN, (n, roh) => { t.partienGeladen = n; t.partienTeilRoh = roh; if (beiZahl) beiZahl(n); });
                // Nur das Noetige merken - die Rohdaten sind sonst viermal so gross.
                roh = r.zeilen.map(g => ({ id: g.id, createdAt: g.createdAt, status: g.status, winner: g.winner, moves: g.moves, initialFen: g.initialFen, opening: g.opening && { eco: g.opening.eco, name: g.opening.name },
                    players: { white: g.players && g.players.white, black: g.players && g.players.black } }));
                gekappt = r.gekappt;
                if (t.status === 'fertig') cacheSchreiben('g:' + t.uid, { roh, gekappt });
            }
            const partien = roh.map(g => partieNormalisieren(g, t)).filter(Boolean);
            if (t.typ === 'swiss') {
                /* Lichess nennt die Swiss-Runde nicht. Alle Partien einer Runde werden
                   aber im selben Augenblick angesetzt - eine Pause von mehr als
                   20 Sekunden ist die naechste Runde. Geprueft an einem echten
                   16-Runden-Turnier: genau 16 Runden, niemand doppelt je Runde. */
                const chrono = partien.slice().sort((a, b) => a.zeit - b.zeit);
                let runde = 0, vorher = -Infinity;
                chrono.forEach(p => { if (p.zeit - vorher > SWISS_LUECKE_MS) runde++; vorher = p.zeit; p.runde = runde; });
            }
            partien.sort((a, b) => b.zeit - a.zeit);
            t.partienTeilRoh = null;
            t.partien = partien;
            t.partienGekappt = gekappt;
            return partien;
        })().catch(e => { t.partienLaeuft = null; throw e; });
        return t.partienLaeuft;
    }

    /* ═══════════════════════════════════════════════════════════════════
       AUSWERTUNG
       ═══════════════════════════════════════════════════════════════════ */

    /** Je Spieler: Bilanz, Farben, Gegner-Schnitt, Partienliste. */
    function spielerStatistik(partien) {
        const map = new Map();
        const hol = p => {
            if (!map.has(p.key)) map.set(p.key, { name: p.name, key: p.key, titel: p.titel, rating: p.rating, s: 0, r: 0, n: 0, wPartien: 0, wPkt: 0, sPartien: 0, sPkt: 0, gegner: [], liste: [] });
            return map.get(p.key);
        };
        partien.slice().sort((a, b) => a.zeit - b.zeit).forEach(g => {
            const w = hol(g.white), s = hol(g.black);
            const wE = g.ergebnis === 'white' ? 'S' : g.ergebnis === 'draw' ? 'R' : 'N';
            const sE = g.ergebnis === 'black' ? 'S' : g.ergebnis === 'draw' ? 'R' : 'N';
            w.liste.push({ g, farbe: 'white', gegner: g.black, e: wE });
            s.liste.push({ g, farbe: 'black', gegner: g.white, e: sE });
            if (g.black.rating) w.gegner.push(g.black.rating);
            if (g.white.rating) s.gegner.push(g.white.rating);
            w.wPartien++; s.sPartien++;
            const zaehl = (x, e, feld) => { if (e === 'S') { x.s++; x[feld] += 1; } else if (e === 'R') { x.r++; x[feld] += 0.5; } else x.n++; };
            zaehl(w, wE, 'wPkt'); zaehl(s, sE, 'sPkt');
        });
        return map;
    }
    const schnitt = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;

    function kreuzMatrix(partien) {
        const m = new Map();
        partien.slice().sort((a, b) => a.zeit - b.zeit).forEach(g => {
            const add = (zeile, spalte, farbe) => {
                const k = zeile + '|' + spalte;
                if (!m.has(k)) m.set(k, { partien: [], pz: 0, ps: 0, punkte: [] });
                const z = m.get(k);
                let e;
                if (g.ergebnis === 'draw') { z.pz += 0.5; z.ps += 0.5; e = 'R'; }
                else if (g.ergebnis === farbe) { z.pz += 1; e = 'S'; }
                else { z.ps += 1; e = 'N'; }
                z.punkte.push(e);
                z.partien.push({ g, farbe, e });
            };
            add(g.white.key, g.black.key, 'white');
            add(g.black.key, g.white.key, 'black');
        });
        return m;
    }

    /**
     * Gesamtwertung ueber alle ABGESCHLOSSENEN Turniere.
     *   modus "platz":  Platzierungspunkte + Teilnahmepunkt
     *   modus "punkte": die im Turnier erzielten Punkte
     * Streichresultate: Es zaehlen die besten (Anzahl - streich) Turniere;
     * ein verpasstes Turnier zaehlt als 0 und ist damit zuerst gestrichen.
     * Wer sich anmeldet und keine Partie spielt, bekommt nichts.
     */
    function gesamtwertung(turniere, cfg, modus, streich) {
        const liste = turniere.filter(t => t.status === 'fertig' && t.spieler && !t.weitere);
        const behalten = Math.max(1, liste.length - Math.min(streich, Math.max(0, liste.length - 1)));
        const map = new Map();
        liste.forEach((t, ti) => {
            t.spieler.forEach(p => {
                if (!(p.leistung || p.punkte > 0)) return;
                if (!map.has(p.key)) map.set(p.key, { name: p.name, key: p.key, titel: p.titel, rating: p.rating, zellen: Array(liste.length).fill(null) });
                const e = map.get(p.key);
                if (p.titel) e.titel = p.titel;
                const wert = modus === 'punkte' ? p.punkte : (cfg.punkte[p.rang - 1] || 0) + cfg.teilnahme;
                e.zellen[ti] = { wert, rang: p.rang, gestrichen: false };
            });
        });
        const zeilen = Array.from(map.values()).map(e => {
            const sortiert = e.zellen.map((z, i) => ({ i, v: z ? z.wert : 0 })).sort((a, b) => b.v - a.v);
            const zaehlt = new Set(sortiert.slice(0, behalten).map(x => x.i));
            let summe = 0, teil = 0, siege = 0, podest = 0;
            e.zellen.forEach((z, i) => {
                if (!z) return;
                teil++;
                if (z.rang === 1) siege++;
                if (z.rang <= 3) podest++;
                if (zaehlt.has(i)) summe += z.wert; else z.gestrichen = true;
            });
            return Object.assign(e, { summe: Math.round(summe * 100) / 100, teil, siege, podest });
        });
        zeilen.sort((a, b) => (b.summe - a.summe) || (b.siege - a.siege) || (b.podest - a.podest) || (b.teil - a.teil) || a.name.localeCompare(b.name, 'de'));
        // Gleichstand teilt sich den Platz.
        zeilen.forEach((z, i) => {
            const v = zeilen[i - 1];
            z.rang = v && v.summe === z.summe && v.siege === z.siege && v.podest === z.podest ? v.rang : i + 1;
        });
        return { zeilen, turniere: liste, gestrichenZahl: liste.length - behalten };
    }

    /* ═══════════════════════════════════════════════════════════════════
       GEMEINSAME BAUSTEINE
       ═══════════════════════════════════════════════════════════════════ */

    function ergebnisText(g) { return g.ergebnis === 'white' ? '1 – 0' : g.ergebnis === 'black' ? '0 – 1' : '½ – ½'; }
    function diffText(d) { if (typeof d !== 'number' || !d) return ''; return '<span class="ot-diff ' + (d > 0 ? 'plus' : 'minus') + '">' + (d > 0 ? '+' : '') + d + '</span>'; }

    function partieZeile(g) {
        const w = g.ergebnis === 'white', s = g.ergebnis === 'black';
        return '<div class="ot-partie">'
            + '<div class="ot-partie-zeit">' + (g.runde ? 'Runde ' + g.runde : uhrzeit(g.zeit)) + '<small>' + g.zugzahl + ' Züge</small></div>'
            + '<div class="ot-partie-spieler">'
            + '<button type="button" class="ot-spielerknopf' + (w ? ' gewinner' : s ? ' verlierer' : '') + '" data-ot-spieler="' + esc(g.white.key) + '">'
            + '<span class="ot-punkt weiss"></span>' + titelTag(g.white.titel) + esc(g.white.name) + ' <small>' + (g.white.rating || '') + '</small>' + diffText(g.white.diff) + '</button>'
            + '<span class="ot-ergebnis-pille ' + (g.ergebnis === 'draw' ? 'remis' : 'entschieden') + '">' + ergebnisText(g) + '</span>'
            + '<button type="button" class="ot-spielerknopf' + (s ? ' gewinner' : w ? ' verlierer' : '') + '" data-ot-spieler="' + esc(g.black.key) + '">'
            + '<span class="ot-punkt schwarz"></span>' + titelTag(g.black.titel) + esc(g.black.name) + ' <small>' + (g.black.rating || '') + '</small>' + diffText(g.black.diff) + '</button>'
            + '</div>'
            + '<div class="ot-partie-eroeffnung"><span><span class="ot-eco">' + esc(g.eco) + '</span> ' + esc(g.eroeffnung) + '</span>'
            + '<small>' + esc(g.ende) + (g.upset >= 100 ? ' · <span class="ot-upset">Überraschung +' + g.upset + '</span>' : '') + '</small></div>'
            + '<div class="ot-partie-knoepfe"><button type="button" class="ot-knopf" data-ot-brett="' + esc(g.id) + '">▶ Nachspielen</button></div>'
            + '</div>';
    }

    function wdlBalken(s, r, n, legende) {
        const sum = s + r + n || 1;
        return '<div class="ot-wdl"><i class="s" style="width:' + (s / sum * 100) + '%"></i><i class="r" style="width:' + (r / sum * 100) + '%"></i><i class="n" style="width:' + (n / sum * 100) + '%"></i></div>'
            + (legende ? '<div class="ot-wdl-legende">' + legende + '</div>' : '');
    }

    function csvHerunterladen(name, zeilen) {
        const zelle = v => { const s = String(v == null ? '' : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        const blob = new Blob(['﻿' + zeilen.map(z => z.map(zelle).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }

    /* ═══════════════════════════════════════════════════════════════════
       FENSTER: BRETT, DIREKTVERGLEICH, SPIELER-DOSSIER
       Einmal fuer die ganze Seite angelegt, von allen Serien benutzt.
       ═══════════════════════════════════════════════════════════════════ */

    const Fenster = (function () {
        let gebaut = false, vorher = null;
        const brett = { partie: null, st: [], zuege: [], gelesen: 0, ply: 0, gedreht: false, laeuft: false, tempo: 1, timer: null };
        const $ = id => document.getElementById(id);

        function bauen() {
            if (gebaut) return;
            gebaut = true;
            const html =
                '<div class="ot-modal" id="ot-brett-modal" role="dialog" aria-modal="true" aria-labelledby="ot-brett-titel" hidden>'
                + '<div class="ot-modal-box ot-brett-box"><div class="ot-modal-kopf"><div class="ot-modal-kopf-text"><span class="ot-eco" id="ot-brett-eco"></span>'
                + '<h3 id="ot-brett-titel">Partie</h3></div><button type="button" class="ot-knopf ot-zu" data-ot-zu aria-label="Schliessen">✕</button></div>'
                + '<div class="ot-modal-inhalt"><div id="ot-brett-hinweis" class="ot-hinweisbox" hidden></div>'
                + '<div class="ot-brett-layout"><div class="ot-brett-spalte">'
                + '<div class="ot-brett-spieler" id="ot-brett-oben"></div><div class="ot-brett" id="ot-brett" aria-label="Schachbrett"></div><div class="ot-brett-spieler" id="ot-brett-unten"></div>'
                + '<div class="ot-brett-steuer"><div>'
                + '<button type="button" class="ot-knopf" data-ot-b="anfang" title="Anfang (Pos1)">|◀</button>'
                + '<button type="button" class="ot-knopf" data-ot-b="zurueck" title="Zurück (←)">◀</button>'
                + '<button type="button" class="ot-knopf ot-knopf-gold" data-ot-b="spielen" id="ot-brett-spielen" title="Abspielen (Leertaste)">Abspielen</button>'
                + '<button type="button" class="ot-knopf" data-ot-b="vor" title="Weiter (→)">▶</button>'
                + '<button type="button" class="ot-knopf" data-ot-b="ende" title="Ende">▶|</button></div><div>'
                + '<button type="button" class="ot-knopf" data-ot-b="tempo" id="ot-brett-tempo" title="Tempo">1x</button>'
                + '<button type="button" class="ot-knopf" data-ot-b="drehen" title="Brett drehen (F)">⇅ Drehen</button></div></div></div>'
                + '<div class="ot-zuege-panel"><div id="ot-brett-meta" class="ot-zuege-meta"></div><div id="ot-zuege" class="ot-zuege"></div>'
                + '<div class="ot-zuege-fuss"><span id="ot-brett-ply">Zug 0 / 0</span><span>'
                + '<button type="button" class="ot-knopf" data-ot-b="pgn">PGN kopieren</button> '
                + '<a id="ot-brett-lichess" target="_blank" rel="noopener">Auf Lichess ↗</a></span></div></div>'
                + '</div></div></div></div>'

                + '<div class="ot-modal" id="ot-h2h-modal" role="dialog" aria-modal="true" aria-labelledby="ot-h2h-titel" hidden>'
                + '<div class="ot-modal-box ot-h2h-box"><div class="ot-modal-kopf"><div class="ot-modal-kopf-text"><small>Direktvergleich</small><h3 id="ot-h2h-titel"></h3></div>'
                + '<button type="button" class="ot-knopf ot-zu" data-ot-zu aria-label="Schliessen">✕</button></div><div class="ot-modal-inhalt" id="ot-h2h-inhalt"></div></div></div>'

                + '<div class="ot-modal ot-schublade" id="ot-dossier" role="dialog" aria-modal="true" aria-labelledby="ot-dossier-titel" hidden>'
                + '<div class="ot-modal-box ot-dossier-box"><div class="ot-modal-kopf"><div class="ot-modal-kopf-text" id="ot-dossier-kopf"></div>'
                + '<button type="button" class="ot-knopf ot-zu" data-ot-zu aria-label="Schliessen">✕</button></div><div class="ot-modal-inhalt" id="ot-dossier-inhalt"></div></div></div>';
            document.body.insertAdjacentHTML('beforeend', html);

            document.querySelectorAll('.ot-modal').forEach(m => {
                m.addEventListener('click', ev => {
                    if (ev.target === m || ev.target.closest('[data-ot-zu]')) zu(m.id);
                });
            });
            $('ot-brett-modal').addEventListener('click', ev => {
                const b = ev.target.closest('[data-ot-b]');
                if (b) brettAktion(b.dataset.otB);
                const z = ev.target.closest('[data-ot-ply]');
                if (z) { stopp(); brett.ply = Number(z.dataset.otPly); zeichneBrett(); }
            });
            document.addEventListener('keydown', ev => {
                const offen = Array.from(document.querySelectorAll('.ot-modal:not([hidden])')).pop();
                if (!offen) return;
                if (ev.key === 'Escape') { zu(offen.id); return; }
                if (offen.id !== 'ot-brett-modal') return;
                const tag = (ev.target.tagName || '').toLowerCase();
                if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
                const k = { ArrowLeft: 'zurueck', ArrowRight: 'vor', Home: 'anfang', End: 'ende', ' ': 'spielen', f: 'drehen', F: 'drehen' }[ev.key];
                if (k) { ev.preventDefault(); brettAktion(k); }
            });
        }

        function auf(id) {
            bauen();
            const m = $(id);
            if (!document.querySelector('.ot-modal:not([hidden])')) vorher = document.activeElement;
            m.hidden = false;
            document.body.classList.add('ot-modal-offen');
            const k = m.querySelector('.ot-zu');
            if (k) k.focus();
        }
        function zu(id) {
            const m = $(id);
            if (!m) return;
            m.hidden = true;
            if (id === 'ot-brett-modal') stopp();
            if (!document.querySelector('.ot-modal:not([hidden])')) {
                document.body.classList.remove('ot-modal-offen');
                if (vorher && vorher.focus) vorher.focus();
            }
        }

        /* ── Brett ─────────────────────────────────────────────────── */
        function spielerLeiste(p, farbe, sieger) {
            return '<span><span class="ot-punkt ' + (farbe === 'white' ? 'weiss' : 'schwarz') + '"></span> ' + titelTag(p.titel) + '<b>' + esc(p.name) + '</b> <small>' + (p.rating || '–') + '</small> ' + diffText(p.diff) + '</span>'
                + (sieger ? '<span class="ot-abzeichen sieg">Sieger</span>' : '');
        }

        function zeichneBrett() {
            const g = brett.partie;
            if (!g) return;
            const max = brett.st.length - 1;
            brett.ply = Math.max(0, Math.min(brett.ply, max));
            const oben = brett.gedreht ? 'white' : 'black', unten = brett.gedreht ? 'black' : 'white';
            $('ot-brett-oben').className = 'ot-brett-spieler' + (g.ergebnis === oben ? ' sieger' : '');
            $('ot-brett-oben').innerHTML = spielerLeiste(g[oben], oben, g.ergebnis === oben);
            $('ot-brett-unten').className = 'ot-brett-spieler' + (g.ergebnis === unten ? ' sieger' : '');
            $('ot-brett-unten').innerHTML = spielerLeiste(g[unten], unten, g.ergebnis === unten);

            const st = brett.st[brett.ply], F = 'abcdefgh';
            let html = '';
            for (let vi = 0; vi < 8; vi++) for (let vj = 0; vj < 8; vj++) {
                const r = brett.gedreht ? 7 - vi : vi, c = brett.gedreht ? 7 - vj : vj, sq = F[c] + (8 - r);
                const kl = ['ot-feld', (r + c) % 2 === 0 ? 'hell' : 'dunkel'];
                if (st.von === sq || st.nach === sq) kl.push('letzter');
                if (st.schach && st.schachFeld === sq) kl.push('schach');
                const p = st.brett[r][c];
                html += '<div class="' + kl.join(' ') + '">'
                    + (vj === 0 ? '<span class="ot-koord reihe">' + (8 - r) + '</span>' : '')
                    + (vi === 7 ? '<span class="ot-koord linie">' + F[c] + '</span>' : '')
                    + (p && FIG[p] ? '<svg class="ot-figur" viewBox="0 0 45 45" aria-hidden="true">' + FIG[p] + '</svg>' : '')
                    + '</div>';
            }
            $('ot-brett').innerHTML = html;
            /* Den aktuellen Zug sichtbar halten - aber NUR die Zugliste scrollen.
               scrollIntoView wuerde das ganze Fenster mitziehen; auf dem Handy
               rutschte dann das Brett nach oben aus dem Blick. */
            const liste = $('ot-zuege');
            liste.querySelectorAll('[data-ot-ply]').forEach(b => {
                const an = Number(b.dataset.otPly) === brett.ply;
                b.classList.toggle('aktiv', an);
                if (an && (b.offsetTop < liste.scrollTop || b.offsetTop + b.offsetHeight > liste.scrollTop + liste.clientHeight)) {
                    liste.scrollTop = b.offsetTop - liste.clientHeight / 2;
                }
            });
            if (brett.ply === 0) liste.scrollTop = 0;
            $('ot-brett-ply').textContent = 'Halbzug ' + brett.ply + ' / ' + max;
            $('ot-brett-spielen').textContent = brett.laeuft ? 'Pause' : 'Abspielen';
            $('ot-brett-tempo').textContent = TEMPO[brett.tempo].t;
        }

        function stopp() { if (brett.timer) clearInterval(brett.timer); brett.timer = null; brett.laeuft = false; const b = $('ot-brett-spielen'); if (b) b.textContent = 'Abspielen'; }

        function brettAktion(a) {
            const max = brett.st.length - 1;
            if (a === 'spielen') {
                if (brett.laeuft) { stopp(); zeichneBrett(); return; }
                if (max <= 0) return;
                if (brett.ply >= max) brett.ply = 0;
                brett.laeuft = true;
                zeichneBrett();
                brett.timer = setInterval(() => { if (brett.ply < brett.st.length - 1) { brett.ply++; zeichneBrett(); } else { stopp(); zeichneBrett(); } }, TEMPO[brett.tempo].ms);
                return;
            }
            if (a === 'tempo') { brett.tempo = (brett.tempo + 1) % TEMPO.length; if (brett.laeuft) { stopp(); brettAktion('spielen'); } else zeichneBrett(); return; }
            if (a === 'drehen') { brett.gedreht = !brett.gedreht; zeichneBrett(); return; }
            if (a === 'pgn') { pgnKopieren(); return; }
            stopp();
            if (a === 'anfang') brett.ply = 0;
            if (a === 'zurueck') brett.ply = Math.max(0, brett.ply - 1);
            if (a === 'vor') brett.ply = Math.min(max, brett.ply + 1);
            if (a === 'ende') brett.ply = max;
            zeichneBrett();
        }

        function pgnKopieren() {
            const g = brett.partie;
            const erg = g.ergebnis === 'white' ? '1-0' : g.ergebnis === 'black' ? '0-1' : '1/2-1/2';
            let koerper = '';
            brett.zuege.forEach((z, i) => { koerper += (i % 2 === 0 ? (i / 2 + 1) + '. ' : '') + z + ' '; });
            const pgn = ['[Event "' + g.turnier + '"]', '[Site "https://lichess.org/' + g.id + '"]', '[White "' + g.white.name + '"]', '[Black "' + g.black.name + '"]',
                '[WhiteElo "' + (g.white.rating || '?') + '"]', '[BlackElo "' + (g.black.rating || '?') + '"]', '[ECO "' + g.eco + '"]', '[Result "' + erg + '"]'].join('\n')
                + '\n\n' + koerper.trim() + ' ' + erg;
            const knopf = document.querySelector('#ot-brett-modal [data-ot-b="pgn"]');
            const fertig = ok => { if (knopf) { const alt = 'PGN kopieren'; knopf.textContent = ok ? '✓ Kopiert' : 'Kopieren fehlgeschlagen'; setTimeout(() => { knopf.textContent = alt; }, 1800); } };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pgn).then(() => fertig(true), () => fertig(false));
            else fertig(false);
        }

        function brettOeffnen(g) {
            bauen();
            stopp();
            const r = Schach.nachspielen(g.zuege, g.startFen);
            Object.assign(brett, { partie: g, st: r.stellungen, zuege: r.zuege, gelesen: r.gelesen, ply: 0, gedreht: false });
            $('ot-brett-eco').textContent = g.eco;
            $('ot-brett-titel').textContent = g.eroeffnung || 'Partie';
            const h = $('ot-brett-hinweis');
            h.hidden = !r.hinweis;
            h.textContent = r.hinweis || '';
            $('ot-brett-meta').innerHTML = '<div><small>Ergebnis</small><b>' + ergebnisText(g) + '</b> <span>(' + esc(g.ende) + ')</span></div>'
                + '<div class="rechts"><span>' + esc(g.turnier) + '</span><span>' + (g.runde ? 'Runde ' + g.runde + ' · ' : '') + g.zugzahl + ' Züge</span></div>';
            $('ot-brett-lichess').href = 'https://lichess.org/' + encodeURIComponent(g.id);
            let z = '';
            if (!r.zuege.length) z = '<p class="ot-leer">Keine Züge vorhanden.</p>';
            for (let i = 0; i < r.zuege.length; i += 2) {
                const ok = n => n <= r.gelesen;
                z += '<div class="ot-zugpaar"><span>' + (i / 2 + 1) + '.</span>'
                    + '<button type="button" data-ot-ply="' + (i + 1) + '"' + (ok(i + 1) ? '' : ' disabled') + '>' + esc(r.zuege[i]) + '</button>'
                    + (r.zuege[i + 1] ? '<button type="button" data-ot-ply="' + (i + 2) + '"' + (ok(i + 2) ? '' : ' disabled') + '>' + esc(r.zuege[i + 1]) + '</button>' : '<span></span>')
                    + '</div>';
            }
            $('ot-zuege').innerHTML = z;
            auf('ot-brett-modal');
            zeichneBrett();
        }

        /* ── Direktvergleich ───────────────────────────────────────── */
        function vergleichKopf(a, b, partien) {
            let sa = 0, r = 0, sb = 0;
            partien.forEach(g => {
                if (g.ergebnis === 'draw') r++;
                else if ((g.ergebnis === 'white' && g.white.key === a.key) || (g.ergebnis === 'black' && g.black.key === a.key)) sa++;
                else sb++;
            });
            return '<div class="ot-h2h-kopf"><span>' + esc(a.name) + '</span><b>' + dez(sa + r / 2) + ' : ' + dez(sb + r / 2) + '</b><span>' + esc(b.name) + '</span></div>'
                + wdlBalken(sa, r, sb, '<span class="s">' + sa + ' Siege</span><span class="r">' + r + ' Remis (' + partien.length + ' ' + (partien.length === 1 ? 'Partie' : 'Partien') + ')</span><span class="n">' + sb + ' Siege</span>');
        }

        function vergleichOeffnen(t, ka, kb) {
            bauen();
            const partien = t.partien.filter(g => (g.white.key === ka && g.black.key === kb) || (g.white.key === kb && g.black.key === ka));
            const finde = k => (t.spieler || []).find(p => p.key === k) || (partien[0] && (partien[0].white.key === k ? partien[0].white : partien[0].black)) || { name: k, key: k };
            const a = finde(ka), b = finde(kb);
            $('ot-h2h-titel').textContent = a.name + ' gegen ' + b.name;
            $('ot-h2h-inhalt').innerHTML = '<div class="ot-karte ot-h2h-zusammen">' + vergleichKopf(a, b, partien) + '</div>'
                + '<div class="ot-partienliste" data-ot-turnier="' + esc(t.uid) + '">' + partien.map(partieZeile).join('') + '</div>';
            Fenster._turnier = t;
            auf('ot-h2h-modal');
        }

        /* ── Spieler-Dossier ───────────────────────────────────────── */
        function dossierOeffnen(t, key, alleImPartienTab) {
            bauen();
            const info = (t.spieler || []).find(p => p.key === key);
            const st = t.partien ? spielerStatistik(t.partien).get(key) : null;
            const name = (info && info.name) || (st && st.name) || key;
            $('ot-dossier-kopf').innerHTML = '<h3 id="ot-dossier-titel">' + titelTag((info && info.titel) || (st && st.titel)) + esc(name)
                + (info ? ' <span class="ot-abzeichen gold">Platz ' + info.rang + '</span>' : '') + '</h3>'
                + '<small>@' + esc(name) + ' · Rating ' + ((info && info.rating) || (st && st.rating) || '–') + (info && info.leistung ? ' · Leistung ' + info.leistung : '') + '</small>';
            const kpi = (l, w) => '<div class="ot-kpi"><small>' + l + '</small><b>' + w + '</b></div>';
            const zeilen = st ? st.liste.map((e, i) => {
                const g = e.g;
                return '<tr><td>' + (g.runde ? 'R' + g.runde : '#' + (i + 1)) + '</td><td><span class="ot-punkt ' + (e.farbe === 'white' ? 'weiss' : 'schwarz') + '"></span></td>'
                    + '<td><b>' + esc(e.gegner.name) + '</b> <small>' + (e.gegner.rating || '–') + '</small></td>'
                    + '<td><span class="ot-abzeichen ' + (e.e === 'S' ? 'sieg' : e.e === 'R' ? 'remis' : 'niederlage') + '">' + (e.e === 'S' ? '1' : e.e === 'R' ? '½' : '0') + '</span></td>'
                    + '<td class="ot-klein"><span class="ot-eco">' + esc(g.eco) + '</span> ' + esc(g.eroeffnung) + '<br><small>' + esc(g.ende) + '</small></td>'
                    + '<td><button type="button" class="ot-knopf" data-ot-brett="' + esc(g.id) + '">▶</button></td></tr>';
            }).join('') : '';
            $('ot-dossier-inhalt').innerHTML =
                '<div class="ot-kpis">'
                + kpi('Punkte', info ? pkt(info.punkte) : '–')
                + kpi('Bilanz S/R/N', st ? st.s + ' / ' + st.r + ' / ' + st.n : '–')
                + kpi('Weiss / Schwarz', st ? pkt(st.wPkt) + '/' + st.wPartien + ' · ' + pkt(st.sPkt) + '/' + st.sPartien : '–')
                + kpi('Ø Gegner', st ? (schnitt(st.gegner) || '–') : '–')
                + '</div>'
                + '<div class="ot-zwischenkopf"><b>Partien im Turnier (' + (st ? st.liste.length : 0) + ')</b>'
                + '<button type="button" class="ot-knopf" data-ot-alle-partien>Im Partien-Tab zeigen →</button></div>'
                + (st ? '<div class="ot-tabelle-wrap"><table class="ot-daten" data-ot-turnier="' + esc(t.uid) + '"><thead><tr><th>Rd.</th><th>Farbe</th><th>Gegner</th><th>Erg.</th><th>Eröffnung</th><th></th></tr></thead><tbody>' + zeilen + '</tbody></table></div>'
                    : '<p class="ot-leer">Partien werden geladen …</p>');
            $('ot-dossier-inhalt').querySelector('[data-ot-alle-partien]').onclick = () => { zu('ot-dossier'); alleImPartienTab(key); };
            Fenster._turnier = t;
            auf('ot-dossier');
        }

        /** Dossier-Fenster mit beliebigem Inhalt (Laufbahn ueber die Serie). */
        function inhaltOeffnen(kopf, inhalt) {
            bauen();
            $('ot-dossier-kopf').innerHTML = kopf;
            $('ot-dossier-inhalt').innerHTML = inhalt;
            Fenster._turnier = null;
            auf('ot-dossier');
        }

        // Klicks in H2H und Dossier: Sprung ins Turnier, Brett oder anderer Spieler
        function klickInFenster(ev, oeffneSpieler) {
            const zt = ev.target.closest('[data-ot-zu-turnier]');
            if (zt) { const teile = zt.dataset.otZuTurnier.split('|'); zu('ot-dossier'); if (Serie._zuTurnier) Serie._zuTurnier(teile[0], teile[1]); return; }
            const b = ev.target.closest('[data-ot-brett]');
            if (b && Fenster._turnier) {
                const g = (Fenster._turnier.partien || []).find(x => x.id === b.dataset.otBrett);
                if (g) brettOeffnen(g);
                return;
            }
            const s = ev.target.closest('[data-ot-spieler]');
            if (s && Fenster._turnier) { zu('ot-h2h-modal'); oeffneSpieler(Fenster._turnier, s.dataset.otSpieler); }
        }

        return { bauen, brettOeffnen, vergleichOeffnen, dossierOeffnen, inhaltOeffnen, klickInFenster, vergleichKopf, _turnier: null, $ };
    })();

    /* ═══════════════════════════════════════════════════════════════════
       COUNTDOWN / LIVE
       ═══════════════════════════════════════════════════════════════════ */

    function zeichneVorschau(ziel, turniere, zeigeOhne) {
        // Wer sich anmeldet, soll vorher wissen, ob es um Punkte fuer die Gesamtwertung geht.
        const ohne = t => zeigeOhne && t.weitere ? ' <small class="ot-leise">· ohne Gesamtwertung</small>' : '';
        const laufend = turniere.filter(t => t.status === 'laeuft');
        const geplant = turniere.filter(t => t.status === 'geplant' && t.start).sort((a, b) => new Date(a.start) - new Date(b.start));
        let html = laufend.map(t => '<div class="glass-card ot-live"><span class="ot-live-punkt" aria-hidden="true"></span>'
            + '<span class="ot-live-text"><b>Läuft gerade:</b> ' + esc(t.name) + ohne(t) + '</span>'
            + (t.team ? '<a class="ot-live-team" href="' + esc(t.team) + '" target="_blank" rel="noopener" title="Mitspielen können nur Mitglieder des Lichess-Teams">👥 Team beitreten ↗</a>' : '')
            + '<a class="btn btn-primary ot-live-knopf" href="' + esc(t.url) + '" target="_blank" rel="noopener">Live verfolgen ↗</a></div>').join('');
        const n = geplant[0];
        if (n) {
            html += '<div class="glass-card ot-countdown" data-ot-start="' + esc(n.start) + '">'
                + '<div class="ot-countdown-kopf">Nächstes Turnier</div><h3 class="ot-countdown-name">' + esc(n.name) + '</h3>'
                + '<div class="ot-countdown-meta">' + esc(datumText(n.start)) + ' · ' + (n.typ === 'swiss' ? 'Swiss' : 'Arena') + ' · ' + esc(n.dauer) + ' · ' + esc(n.bedenkzeit)
                + (n.spielerZahl ? ' · ' + n.spielerZahl + ' angemeldet' : '') + (zeigeOhne && n.weitere ? ' · ohne Gesamtwertung' : '') + '</div>'
                + '<div class="ot-uhr" role="timer" aria-live="off">' + ['tage', 'std', 'min', 'sek'].map(e => '<div class="ot-uhr-feld"><b data-ot-uhr="' + e + '">–</b><span>'
                    + { tage: 'Tage', std: 'Std', min: 'Min', sek: 'Sek' }[e] + '</span></div>').join('') + '</div>'
                + teamHinweis(n, 'mittig')
                + '<a class="btn btn-primary ot-countdown-knopf" href="' + esc(n.url) + '" target="_blank" rel="noopener">Zum Turnier auf Lichess ↗</a></div>';
        }
        ziel.innerHTML = html;
        const box = ziel.querySelector('.ot-countdown');
        if (!box) return;
        const ende = new Date(box.dataset.otStart).getTime();
        const f = k => box.querySelector('[data-ot-uhr="' + k + '"]');
        const zwei = x => String(x).padStart(2, '0');
        function ticken() {
            let rest = Math.max(0, Math.floor((ende - Date.now()) / 1000));
            if (rest === 0) {
                clearInterval(box._uhr);
                const uhr = box.querySelector('.ot-uhr');
                if (uhr) uhr.outerHTML = '<div class="ot-uhr-los">♟️ Es geht los!</div>';
                box.querySelector('.ot-countdown-kopf').textContent = 'Läuft gerade';
                return;
            }
            const tage = Math.floor(rest / 86400); rest %= 86400;
            const std = Math.floor(rest / 3600); rest %= 3600;
            f('tage').textContent = tage; f('std').textContent = zwei(std);
            f('min').textContent = zwei(Math.floor(rest / 60)); f('sek').textContent = zwei(rest % 60);
        }
        ticken();
        box._uhr = setInterval(ticken, 1000);
    }

    /* ═══════════════════════════════════════════════════════════════════
       EINE SERIE (= ein Block auf der Seite)
       ═══════════════════════════════════════════════════════════════════ */

    function Serie(block, hub, id) {
        const cfg = {
            // Name der Serie fuer den Kopf. Frueher hiess die Vorgabe "Gesamtwertung" -
            // als Serienname ergibt das keinen Sinn, also gilt es als nicht gesetzt.
            serie: (block.dataset.serie && block.dataset.serie !== 'Gesamtwertung') ? block.dataset.serie : 'Online-Turniere',
            punkte: (function () { const p = (block.dataset.punkte || '').split(/[,;\s\-–]+/).filter(x => x !== '').map(Number).filter(n => !isNaN(n) && n >= 0); return p.length ? p : VORGABE_PUNKTE; })(),
            teilnahme: block.dataset.teilnahme !== undefined && block.dataset.teilnahme !== '' ? Number(block.dataset.teilnahme) || 0 : VORGABE_TEILNAHME,
            streich: Math.max(0, Number(block.dataset.streich) || 0),
            // Gesamtpunkte ueberhaupt? "nein" = Serie ohne Wertung.
            wertung: !/^(nein|no|0|false|aus)$/i.test(String(block.dataset.wertung || '').trim()),
            modus: String(block.dataset.modus || '').trim().toLowerCase(),
            // Kurzer Text unter dem Seriennamen (aus dem Blatt, darf Formatierung enthalten).
            beschreibung: String(block.dataset.beschreibung || '').trim(),
            team: String(block.dataset.team || '').trim(),
            bild: String(block.dataset.bild || '').trim()
        };
        const z = {
            turniere: [], aktiv: null, tab: 'rangliste',
            bereich: 'gesamt',          // gesamt | turniere | spieler | turnier
            gpSuche: '', gpMehr: false, svSuche: '', svSort: 'gp', svMehr: false,
            ktLimit: 12, ktSuche: '', rlSuche: '',
            f: { a: '', b: '', erg: 'alle', upset: 'alle', suche: '' }, arenaSeite: 1,
            gpModus: 'platz', gpStreich: cfg.streich
        };
        const links = linksLesen(block);
        block.classList.add('ot-bereit');   // ab jetzt keine rohen Links/Ueberschriften mehr zeigen
        // Nur Turniere ohne Gesamtwertung eingetragen? Dann sind das einfach "die Turniere".
        if (links.length && links.every(l => l.weitere)) { links.forEach(l => { l.weitere = false; }); cfg.wertung = false; }
        /* Ein einzelnes Turnier braucht keine Serie drumherum: kein Kopf, keine
           Bereiche, keine Gesamtwertung - nur das Turnier selbst. */
        // Ausdruecklich "Gesamtwertung ja" = eine Serie, auch wenn erst ein Turnier gespielt ist.
        const wertungAusdruecklich = /^(ja|j|yes|1|true|x)$/i.test(String(block.dataset.wertung || '').trim());
        const einzel = cfg.modus === 'einzel' || (cfg.modus !== 'serie' && links.length === 1 && !wertungAusdruecklich);
        if (einzel) block.classList.add('ot-einzel');
        if (!cfg.wertung) z.svSort = 'teil';
        /* Aufbau von oben nach unten:
             Kopf der Serie (Zahlen auf einen Blick)
             Countdown / Live
             Hauptbereiche: Gesamtwertung · Turniere · Spieler
             im Turnier: "← Alle Turniere" und Rangliste · Kreuztabelle · Partien
             die Ansicht selbst */
        block.innerHTML = '<div class="ot-held"></div><div class="ot-vorschau"></div>'
            + '<nav class="ot-reiter-leiste ot-navi" aria-label="Bereiche"></nav><div class="ot-unternavi"></div>'
            + '<div class="ot-ansicht"><p class="ot-leer">Turniere werden geladen …</p></div>';
        block.classList.add('ot-bereit');
        const el = { held: block.querySelector('.ot-held'), vorschau: block.querySelector('.ot-vorschau'), navi: block.querySelector('.ot-navi'),
            unter: block.querySelector('.ot-unternavi'), ansicht: block.querySelector('.ot-ansicht') };

        /* ── Adresse und Serien-Uebersicht ───────────────────────────── */
        let bereit = false, ersterStand = true, wunsch = null;
        const aktiv = () => !hub || hub.aktivId === id;
        (function () {
            const p = Adresse.lesen();
            if ((!hub || p.serie === id) && (p.bereich || p.turnier || p.reiter)) wunsch = p;
        })();
        const api = {
            id, block,
            get bereit() { return bereit; },
            name: () => (block.dataset.serie || !einzel || !z.turniere[0]) ? cfg.serie : z.turniere[0].name,
            beschreibung: () => cfg.beschreibung,
            bild: () => cfg.bild,
            zusammenfassung: () => zusammenfassung(),
            anwenden: p => anwenden(p),
            melde: m => melde(m),
            binden: () => binden()
        };

        if (!links.length) {
            el.ansicht.innerHTML = '<div class="glass-card ot-bald"><div class="ot-bald-symbol" aria-hidden="true">♞</div>'
                + '<h3>Das erste Online-Turnier steht vor der Tür</h3><p>Sobald gespielt wird, findest du hier Ranglisten und alle Partien. Schau bald wieder vorbei!</p></div>';
            if (window.console) console.info('Online-Turniere: Noch keine Lichess-Links im Block eingetragen (pages.csv).');
            return api;
        }

        const aktivesTurnier = () => z.bereich === 'turnier' ? (z.turniere.find(t => t.uid === z.aktiv) || null) : null;
        const sichtbar = () => z.turniere.filter(t => t.status !== 'geplant');
        // Turniere ohne Gesamtwertung: eigener Abschnitt "Weitere Turniere", keine Nummer,
        // keine Serien-Zahlen, keine Gesamtwertung. (Bei einem einzelnen Turnier egal.)
        const istWeitere = t => !einzel && t.weitere;
        const serie = () => z.turniere.filter(t => !istWeitere(t));
        const fertige = () => serie().filter(t => t.status === 'fertig');
        const gewertete = fertige;

        /* ── Fortschritt ohne alles neu zu zeichnen ──────────────────── */
        /* Waehrend etwas eintrifft, die sichtbare Ansicht alle 0,7 s neu zeichnen
           (Rangliste und Arena-Partien zeigen dann schon die ersten Zeilen).
           Ein Suchfeld, in dem gerade getippt wird, behaelt dabei den Fokus. */
        let liveWartet = null, liveZuletzt = 0;
        function liveNeu() {
            const los = () => {
                liveWartet = null;
                const t = aktivesTurnier();
                if (!t || !((z.tab === 'rangliste' && !t.spieler) || (z.tab === 'partien' && t.typ === 'arena' && !t.partien))) return;
                liveZuletzt = Date.now();
                zeichneMitFokus();
            };
            if (liveWartet) return;
            // Das erste Paket sofort zeigen, danach hoechstens alle 0,7 s.
            const seit = Date.now() - liveZuletzt;
            if (seit > 700) los();
            else liveWartet = setTimeout(los, 700 - seit);
        }
        function zeichneMitFokus() {
            const a = document.activeElement;
            const k = a && block.contains(a) && a.dataset ? a.dataset.otFeld : null;
            const pos = k && a.selectionStart;
            zeichne();
            if (k) {
                const neu = block.querySelector('[data-ot-feld="' + k + '"]');
                if (neu) { neu.focus(); try { neu.setSelectionRange(pos, pos); } catch (e) { /* select */ } }
            }
        }

        let fortschrittWartet = null;
        function fortschritt() {
            liveNeu();
            if (fortschrittWartet) return;
            fortschrittWartet = setTimeout(() => {
                fortschrittWartet = null;
                block.querySelectorAll('[data-ot-fortschritt]').forEach(e => {
                    const t = z.turniere.find(x => x.uid === e.dataset.otFortschritt);
                    if (!t) return;
                    const art = e.dataset.otArt;
                    const n = art === 'partien' ? t.partienGeladen : t.spielerGeladen;
                    const g = art === 'partien' ? Math.min(t.partienZahl || 0, MAX_PARTIEN) : t.spielerZahl;
                    e.querySelector('b').textContent = n + (g ? ' / ' + g : '');
                    const bal = e.querySelector('i');
                    if (bal && g) bal.style.width = Math.min(100, n / g * 100) + '%';
                });
            }, 150);
        }
        function fortschrittHTML(t, art) {
            const g = art === 'partien' ? Math.min(t.partienZahl || 0, MAX_PARTIEN) : t.spielerZahl;
            const n = art === 'partien' ? t.partienGeladen : t.spielerGeladen;
            return '<div class="ot-fortschritt" data-ot-fortschritt="' + esc(t.uid) + '" data-ot-art="' + art + '">'
                + '<span>' + (art === 'partien' ? 'Partien' : 'Rangliste') + ' von Lichess werden geladen … <b>' + n + (g ? ' / ' + g : '') + '</b></span>'
                + '<span class="ot-fortschritt-balken"><i style="width:' + (g ? Math.min(100, n / g * 100) : 5) + '%"></i></span>'
                + (art === 'partien' && g > 300 ? '<small>Lichess gibt grosse Turniere nur langsam heraus (etwa 25 Partien pro Sekunde).</small>' : '')
                + '</div>';
        }

        /** Kurzfassung fuer die Serienkarte in der Uebersicht. */
        function zusammenfassung() {
            if (!links.length) return { leer: true, anzahl: 0, einzel };
            const live = z.turniere.find(t => t.status === 'laeuft') || null;
            const naechstes = z.turniere.filter(t => t.status === 'geplant' && t.start).sort((a, b) => new Date(a.start) - new Date(b.start))[0] || null;
            const gw = cfg.wertung && !einzel && bereit ? gesamtwertung(z.turniere, cfg, 'platz', cfg.streich).zeilen : [];
            return { leer: false, einzel, geladen: bereit, anzahl: z.turniere.length || links.length, spieler: einzel ? 0 : alleSpielerKeys().size,
                live, naechstes, fuehrend: gw[0] || null, wertung: cfg.wertung && !einzel };
        }
        function zustandJetzt() {
            const zu = { serie: hub ? id : '', bereich: '', turnier: '', reiter: '' };
            if (z.bereich === 'turnier') {
                const t = aktivesTurnier();
                if (t && !einzel) zu.turnier = t.id;
                if (t && z.tab !== 'rangliste') zu.reiter = z.tab;
                if (!t && !einzel) zu.bereich = 'turniere';
            } else if (!einzel) zu.bereich = z.bereich;
            return zu;
        }
        /** Aktuelle Ansicht in die Adresszeile (nur die sichtbare Serie). */
        function melde(modus) {
            if (!bereit || !aktiv()) return;
            const m = modus || (ersterStand ? 'replace' : 'auto');
            ersterStand = false;
            Adresse.schreiben(zustandJetzt(), m);
        }
        const standardBereich = () => cfg.wertung && gewertete().length ? 'gesamt' : 'turniere';
        /** Ansicht aus einem Link (oder der Zurueck-Taste) herstellen. */
        function anwenden(p) {
            if (!bereit) { wunsch = p; return; }
            const reiter = ['rangliste', 'kreuz', 'partien'].includes(p.reiter) ? p.reiter : 'rangliste';
            const t = p.turnier ? z.turniere.find(x => x.id === p.turnier) : null;
            if (einzel) z.tab = reiter;
            else if (t) {
                if (z.bereich !== 'turnier' || z.aktiv !== t.uid) { z.f = { a: '', b: '', erg: 'alle', upset: 'alle', suche: '' }; z.arenaSeite = 1; }
                z.bereich = 'turnier'; z.aktiv = t.uid; z.tab = reiter;
            } else z.bereich = ['turniere', 'spieler'].includes(p.bereich) || (p.bereich === 'gesamt' && cfg.wertung) ? p.bereich : standardBereich();
            zeichne();
        }
        // Die Fenster (Brett, Spieler) gehoeren immer zur Serie, in der zuletzt geklickt wurde.
        function binden() { Serie._spielerOeffnen = spielerOeffnen; Serie._zuTurnier = zuTurnier; }

        /* ── Kopf der Serie ──────────────────────────────────────────── */
        const turnierTitel = t => (t.nr ? '#' + t.nr + ' · ' : '') + esc(t.name);
        // Nur wer wirklich gespielt hat - Angemeldete ohne Partie zaehlen nicht als Teilnehmer.
        function alleSpielerKeys() { const n = new Set(); serie().filter(t => t.status !== 'geplant').forEach(t => (t.spieler || t.spielerTeil || []).forEach(p => { if (p.leistung || p.punkte > 0) n.add(p.key); })); return n; }

        function zeichneHeld() {
            // Einzelnes Turnier: kein Zahlenkopf - aber Name und Beschreibung der Serie, wenn es welche gibt.
            if (einzel) {
                el.held.innerHTML = block.dataset.serie || cfg.beschreibung || cfg.bild ? '<div class="glass-card ot-held-karte ot-held-schlank' + (cfg.bild ? ' mit-bild' : '') + '">'
                    + (cfg.bild ? '<div class="ot-held-bild" style="' + bildStil(cfg.bild) + '" aria-hidden="true"></div>' : '')
                    + '<div class="ot-held-text"><small>Online-Turniere auf Lichess</small>'
                    + '<h2>' + esc(cfg.serie) + '</h2>' + (cfg.beschreibung ? '<div class="ot-held-beschreibung">' + cfg.beschreibung + '</div>' : '') + '</div></div>' : '';
                return;
            }
            if (!serie().length) { el.held.innerHTML = ''; return; }
            const fertig = fertige(), offen = serie().filter(t => t.status !== 'fertig');
            const namen = alleSpielerKeys();
            const partien = serie().filter(t => t.status !== 'geplant').reduce((s, t) => s + (t.partien ? t.partien.length : (t.partienZahl || 0)), 0);
            const gw = gesamtwertung(z.turniere, cfg, z.gpModus, z.gpStreich).zeilen;
            const zahl = (w, l) => '<div class="ot-held-zahl"><b>' + w + '</b><span>' + l + '</span></div>';
            el.held.innerHTML = '<div class="glass-card ot-held-karte' + (cfg.bild ? ' mit-bild' : '') + '">'
                + (cfg.bild ? '<div class="ot-held-bild" style="' + bildStil(cfg.bild) + '" aria-hidden="true"></div>' : '')
                + '<div class="ot-held-text"><small>Online-Turnierserie auf Lichess</small><h2>' + esc(cfg.serie) + '</h2>'
                + (cfg.beschreibung ? '<div class="ot-held-beschreibung">' + cfg.beschreibung + '</div>' : '') + '</div>'
                + '<div class="ot-held-zahlen">'
                + zahl(fertig.length, fertig.length === 1 ? 'Turnier gespielt' : 'Turniere gespielt')
                + (offen.length ? zahl(offen.length, offen.some(t => t.status === 'laeuft') ? 'läuft / geplant' : 'geplant') : '')
                + zahl(namen.size || '–', 'Teilnehmer')
                + zahl(partien || '–', 'Partien')
                + (cfg.wertung && gw[0] ? '<button type="button" class="ot-held-zahl klickbar" data-ot-serienspieler="' + esc(gw[0].key) + '"><b>' + titelTag(gw[0].titel) + esc(gw[0].name) + '</b><span>Spitzenreiter · ' + pkt(gw[0].summe) + ' Pkt.</span></button>' : '')
                + '</div></div>';
        }

        /* ── Navigation: drei Hauptbereiche, im Turnier zusaetzlich Reiter ── */
        function zeichneNavi() {
            const haupt = z.bereich === 'turnier' ? 'turniere' : z.bereich;
            const chip = x => '<span class="ot-zahl-chip">' + x + '</span>';
            el.navi.hidden = einzel;
            el.navi.innerHTML = einzel ? '' : [['gesamt', '🏆 Gesamtwertung', gewertete().length], ['turniere', '📅 Turniere', z.turniere.length], ['spieler', '👥 Spieler', alleSpielerKeys().size || '…']]
                .filter(([k]) => k !== 'gesamt' || (cfg.wertung && serie().length))
                .map(([k, l, n]) => '<button type="button" class="ot-reiter' + (haupt === k ? ' aktiv' : '') + '" data-ot-bereich="' + k + '">' + l + ' ' + chip(n) + '</button>').join('');

            const t = aktivesTurnier();
            if (!t) { el.unter.innerHTML = ''; return; }
            // Einzelturnier, noch nicht begonnen: Der Countdown oben sagt schon alles.
            if (einzel && t.status === 'geplant') { el.unter.innerHTML = ''; return; }
            // Einzelturnier: keine Pfadzeile - Name und Datum stehen gleich darunter in der Zusammenfassung.
            el.unter.innerHTML = (einzel ? '' : '<div class="ot-pfad"><button type="button" class="ot-knopf" data-ot-bereich="turniere">← Alle Turniere</button>'
                + '<span class="ot-pfad-titel"><b>' + turnierTitel(t) + '</b><small>' + esc(datumText(t.start))
                + (istWeitere(t) && cfg.wertung ? ' · ohne Gesamtwertung' : '') + '</small></span>'
                + (t.status === 'laeuft' ? '<span class="ot-abzeichen live">Läuft</span>' : '')
                + '<button type="button" class="ot-knopf ot-link-knopf" data-ot-link title="Direkten Link auf dieses Turnier kopieren">🔗 Link</button></div>')
                + (t.status === 'geplant' ? '' : '<div class="ot-reiter-leiste ot-unterreiter">' + [['rangliste', 'Rangliste', t.spieler ? t.spieler.length : t.spielerZahl],
                    ['kreuz', 'Kreuztabelle', t.spieler ? t.spieler.length : t.spielerZahl],
                    ['partien', 'Partien & Paarungen', t.partien ? t.partien.length : (t.partienZahl || '…')]]
                    .map(([k, l, n]) => '<button type="button" class="ot-reiter' + (z.tab === k ? ' aktiv' : '') + '" data-ot-tab="' + k + '">' + l + ' ' + chip(n) + '</button>').join('') + '</div>');
        }
        const zeichneSchalter = () => { zeichneHeld(); zeichneNavi(); };

        function zeichne() { zeichneJetzt(); melde(); }
        function zeichneJetzt() {
            zeichneHeld();
            zeichneNavi();
            if (z.bereich === 'gesamt' && !cfg.wertung) z.bereich = 'turniere';
            if (z.bereich === 'gesamt') return zeichneGesamt();
            if (z.bereich === 'turniere') return zeichneTurnierListe();
            if (z.bereich === 'spieler') return zeichneSpielerVerzeichnis();
            const t = aktivesTurnier();
            if (!t) { if (einzel) { el.ansicht.innerHTML = ''; return; } z.bereich = 'turniere'; return zeichne(); }
            if (t.status === 'geplant') { if (einzel) { el.ansicht.innerHTML = ''; return; } return zeichneGeplant(t); }
            if (z.tab === 'kreuz') return zeichneKreuz(t);
            if (z.tab === 'partien') return zeichnePartien(t);
            return zeichneRangliste(t);
        }

        /* ── Turniere: Kartenuebersicht ──────────────────────────────── */
        function bisStart(t) {
            const s = Math.round((new Date(t.start) - Date.now()) / 1000);
            if (s <= 0) return 'beginnt jetzt';
            if (s < 3600) return 'startet in ' + Math.max(1, Math.round(s / 60)) + ' Min.';
            if (s < 86400) return 'startet in ' + Math.round(s / 3600) + ' Std.';
            return 'startet in ' + Math.round(s / 86400) + ' Tagen';
        }

        function zeichneTurnierListe() {
            // Live und Kommendes zuerst, dann Beendete - das neueste oben.
            const rang = x => x.status === 'laeuft' ? 0 : x.status === 'geplant' ? 1 : 2;
            const sortiert = liste => liste.slice().sort((a, b) => (rang(a) - rang(b))
                || (rang(a) === 1 ? new Date(a.start) - new Date(b.start) : new Date(b.start) - new Date(a.start)));
            const karte = t => {
                const sieger = t.status === 'fertig' && t.spieler && t.spieler[0];
                const statusText = t.status === 'fertig' ? 'Beendet' : t.status === 'laeuft' ? 'Läuft gerade' : 'Geplant';
                const fuss = sieger ? '<span>🥇 <b>' + titelTag(sieger.titel) + esc(sieger.name) + '</b> · ' + pkt(sieger.punkte) + ' Pkt.</span>'
                    : t.status === 'geplant' ? '<span class="ot-gold">⏳ ' + bisStart(t) + '</span>'
                    : t.status === 'laeuft' ? '<span class="ot-gruen">● Live – Rangliste ansehen</span>'
                    : '<span class="ot-leise">Rangliste wird geladen …</span>';
                return '<article class="glass-card ot-tkarte ' + t.status + '">'
                    + '<button type="button" class="ot-tkarte-flaeche" data-ot-wahl="' + esc(t.uid) + '" aria-label="' + esc((t.nr ? 'Turnier #' + t.nr : t.name) + ' öffnen') + '">'
                    + '<span class="ot-tkarte-kopf"><span class="ot-tkarte-nr">' + (t.nr ? '#' + t.nr : '') + '</span>'
                    + '<span class="ot-abzeichen ' + (t.status === 'laeuft' ? 'live' : t.status === 'geplant' ? 'gold' : '') + '">' + statusText + '</span></span>'
                    + '<span class="ot-tkarte-name">' + esc(t.name) + '</span>'
                    + '<span class="ot-tkarte-datum">' + esc(datumText(t.start)) + '</span>'
                    + '<span class="ot-tkarte-meta"><span>' + (t.typ === 'swiss' ? 'Swiss' : 'Arena') + ' · ' + esc(t.dauer) + '</span><span>' + esc(t.bedenkzeit) + '</span><span>'
                    + (t.spielerZahl || 0) + ' ' + (t.status === 'geplant' ? 'angemeldet' : 'Spieler') + '</span></span>'
                    + '<span class="ot-tkarte-fuss">' + fuss + '<span aria-hidden="true">→</span></span>'
                    + '</button>'
                    + (t.status !== 'fertig' ? '<div class="ot-tkarte-links"><a class="ot-tkarte-lichess" href="' + esc(t.url) + '" target="_blank" rel="noopener">' + (t.status === 'geplant' ? 'Auf Lichess beitreten ↗' : 'Live auf Lichess ↗') + '</a>'
                        + (t.team ? '<a class="ot-tkarte-lichess ot-tkarte-team" href="' + esc(t.team) + '" target="_blank" rel="noopener" title="Mitspielen können nur Mitglieder des Lichess-Teams">👥 Zuerst Team beitreten ↗</a>' : '') + '</div>' : '')
                    + '</article>';
            };
            const weitere = z.turniere.filter(istWeitere), haupt = serie();
            const abschnitt = (titel, text) => '<div class="ot-abschnitt"><h3>' + titel + '</h3>' + (text ? '<span>' + text + '</span>' : '') + '</div>';
            const gruppe = l => '<div class="ot-turnier-karten">' + sortiert(l).map(karte).join('') + '</div>';
            // Nur wenn es beide Arten gibt, braucht es Ueberschriften.
            el.ansicht.innerHTML = !weitere.length ? gruppe(haupt)
                : (haupt.length ? abschnitt(cfg.wertung ? '🏆 Mit Gesamtwertung' : '🏆 ' + esc(cfg.serie), cfg.wertung ? 'Turniere der Serie «' + esc(cfg.serie) + '»' : '') + gruppe(haupt) : '')
                + abschnitt('♟️ Weitere Turniere', cfg.wertung ? 'Ohne Gesamtwertung' : '') + gruppe(weitere);
        }

        function zeichneGeplant(t) {
            el.ansicht.innerHTML = '<div class="ot-karte ot-mittig-karte"><div class="ot-bald-symbol" aria-hidden="true">⏳</div>'
                + '<h3 class="ot-mittel">Dieses Turnier hat noch nicht begonnen</h3>'
                + '<p>' + esc(datumText(t.start)) + ' · ' + bisStart(t) + ' · ' + (t.spielerZahl || 0) + ' angemeldet</p>'
                + teamHinweis(t, 'mittig')
                + '<a class="btn btn-primary" href="' + esc(t.url) + '" target="_blank" rel="noopener">Auf Lichess beitreten ↗</a></div>';
        }

        /* ── Spieler der ganzen Serie ────────────────────────────────── */
        function serienSpieler() {
            const gw = new Map(gesamtwertung(z.turniere, cfg, z.gpModus, z.gpStreich).zeilen.map(r => [r.key, r]));
            const map = new Map();
            serie().filter(t => t.spieler && t.status !== 'geplant').forEach(t => t.spieler.forEach(p => {
                if (!(p.leistung || p.punkte > 0)) return;
                if (!map.has(p.key)) map.set(p.key, { key: p.key, name: p.name, titel: p.titel, rating: p.rating, teil: 0, bester: Infinity, siege: 0, podest: 0, punkte: 0, liste: [] });
                const e = map.get(p.key);
                e.teil++; e.bester = Math.min(e.bester, p.rang); e.punkte += p.punkte;
                if (t.status === 'fertig' && p.rang === 1) e.siege++;
                if (t.status === 'fertig' && p.rang <= 3) e.podest++;
                if (p.rating) e.rating = p.rating;
                if (p.titel) e.titel = p.titel;
                e.liste.push({ t, p });
            }));
            map.forEach(e => { const g = gw.get(e.key); e.gp = g ? g.summe : 0; e.gpRang = g ? g.rang : null; });
            return map;
        }

        function zeichneSpielerVerzeichnis() {
            const alle = Array.from(serienSpieler().values());
            const q = z.svSuche.trim().toLowerCase();
            const sortierer = {
                gp: (a, b) => (b.gp - a.gp) || (a.bester - b.bester) || a.name.localeCompare(b.name, 'de'),
                teil: (a, b) => (b.teil - a.teil) || (b.gp - a.gp),
                bester: (a, b) => (a.bester - b.bester) || (b.gp - a.gp),
                rating: (a, b) => (b.rating - a.rating),
                name: (a, b) => a.name.localeCompare(b.name, 'de'),
                punkte: (a, b) => (b.punkte - a.punkte) || (b.teil - a.teil)
            }[z.svSort];
            const liste = alle.filter(e => !q || e.name.toLowerCase().includes(q)).sort(sortierer);
            const zeig = z.svMehr || q ? liste : liste.slice(0, 50);
            el.ansicht.innerHTML = '<div class="ot-karte ot-ohne-polster"><div class="ot-werkzeug"><div><h3 class="ot-mittel">👥 Spieler der Serie</h3></div>'
                + '<div class="ot-werkzeug-rechts"><input type="search" class="search-bar ot-suche" data-ot-feld="svSuche" placeholder="Spieler suchen …" value="' + esc(z.svSuche) + '">'
                + '<select class="search-bar ot-klein-select" data-ot-feld="svSort" aria-label="Sortierung">'
                + [['gp', 'Nach Gesamtwertung'], ['teil', 'Nach Teilnahmen'], ['punkte', 'Nach Turnierpunkten'], ['bester', 'Nach bester Platzierung'], ['rating', 'Nach Rating'], ['name', 'Nach Name']]
                    .filter(([v]) => v !== 'gp' || cfg.wertung)
                    .map(([v, l]) => '<option value="' + v + '"' + (z.svSort === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div></div>'
                + '<div class="ot-tabelle-wrap"><table class="ot-daten"><thead><tr><th>Spieler</th><th class="r">Teilnahmen</th><th class="r">Beste Platzierung</th><th class="r">Siege</th><th class="r">Podest</th><th class="r">Turnierpunkte</th>'
                + (cfg.wertung ? '<th class="r gold">Gesamtwertung</th>' : '') + '</tr></thead><tbody>'
                + (zeig.map(e => '<tr class="klickbar" data-ot-serienspieler="' + esc(e.key) + '"><td><b>' + titelTag(e.titel) + esc(e.name) + '</b> <small>' + (e.rating || '') + '</small></td>'
                    + '<td class="r">' + e.teil + '</td><td class="r">' + platzText(e.bester) + '</td><td class="r">' + (e.siege || '–') + '</td><td class="r">' + (e.podest || '–') + '</td>'
                    + '<td class="r">' + pkt(e.punkte) + '</td>' + (cfg.wertung ? '<td class="r gold">' + (e.gpRang ? pkt(e.gp) + ' <small>(' + e.gpRang + '.)</small>' : '–') + '</td>' : '') + '</tr>').join('')
                    || '<tr><td colspan="' + (cfg.wertung ? 7 : 6) + '" class="ot-leer">' + (alle.length ? 'Kein Spieler gefunden.' : 'Ranglisten werden geladen …') + '</td></tr>')
                + '</tbody></table></div>'
                + (zeig.length < liste.length ? '<div class="ot-mittig"><button type="button" class="ot-knopf" data-ot-mehr="svMehr">Alle ' + liste.length + ' Spieler anzeigen</button></div>' : '')
                + '</div>';
        }

        /** Laufbahn eines Spielers ueber alle Turniere der Serie. */
        function serienSpielerOeffnen(key) {
            const e = serienSpieler().get(key);
            if (!e) return;
            const kpi = (l, w) => '<div class="ot-kpi"><small>' + l + '</small><b>' + w + '</b></div>';
            const zeilen = e.liste.slice().sort((a, b) => new Date(b.t.start) - new Date(a.t.start)).map(({ t, p }) => {
                const wert = cfg.wertung && t.status === 'fertig' ? (z.gpModus === 'punkte' ? p.punkte : (cfg.punkte[p.rang - 1] || 0) + cfg.teilnahme) : null;
                return '<tr><td><b>#' + t.nr + '</b> ' + esc(t.name) + '<br><small>' + esc(datumText(t.start)) + '</small></td>'
                    + '<td class="r">' + (t.status === 'fertig' ? medaille(p.rang) : p.rang) + ' <small>von ' + (t.spieler ? t.spieler.length : '?') + '</small></td>'
                    + '<td class="r">' + pkt(p.punkte) + '</td>' + (cfg.wertung ? '<td class="r gold">' + (wert == null ? '<small>läuft</small>' : '+' + pkt(wert)) + '</td>' : '')
                    + '<td><button type="button" class="ot-knopf" data-ot-zu-turnier="' + esc(t.uid) + '|' + esc(key) + '">Partien →</button></td></tr>';
            }).join('');
            Fenster.inhaltOeffnen(
                '<h3 id="ot-dossier-titel">' + titelTag(e.titel) + esc(e.name) + (cfg.wertung && e.gpRang ? ' <span class="ot-abzeichen gold">' + e.gpRang + '. der Gesamtwertung</span>' : '') + '</h3>'
                + '<small>Rating ' + (e.rating || '–') + ' · <a href="https://lichess.org/@/' + encodeURIComponent(e.name) + '" target="_blank" rel="noopener">Profil auf Lichess ↗</a></small>',
                '<div class="ot-kpis">' + (cfg.wertung ? kpi('Gesamtwertung', e.gpRang ? pkt(e.gp) + ' Pkt.' : '–') : kpi('Turnierpunkte', pkt(e.punkte))) + kpi('Teilnahmen', e.teil)
                + kpi('Beste Platzierung', platzText(e.bester)) + kpi('Siege / Podest', e.siege + ' / ' + e.podest) + '</div>'
                + '<div class="ot-zwischenkopf"><b>Alle Turniere (' + e.liste.length + ')</b></div>'
                + '<div class="ot-tabelle-wrap"><table class="ot-daten"><thead><tr><th>Turnier</th><th class="r">Platz</th><th class="r">Punkte</th>' + (cfg.wertung ? '<th class="r">Wertung</th>' : '') + '<th></th></tr></thead><tbody>' + zeilen + '</tbody></table></div>');
        }

        /** Aus der Laufbahn direkt in die Partien eines Turniers - gefiltert auf den Spieler. */
        function zuTurnier(uid, key) {
            z.bereich = 'turnier'; z.aktiv = uid; z.tab = 'partien';
            z.f = { a: key || '', b: '', erg: 'alle', upset: 'alle', suche: '' }; z.arenaSeite = 1;
            zeichne();
            if (el.navi.scrollIntoView) el.navi.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }

        /** Partien sicherstellen, dann neu zeichnen - mit Fortschritt dazwischen. */
        function mitPartien(t, weiter) {
            if (t.partien) return true;
            if (t.status === 'geplant') return true;
            partienLaden(t, fortschritt).then(() => { if (aktivesTurnier() === t) zeichneMitFokus(); if (weiter) weiter(); })
                .catch(e => { t.fehler = e.message; if (aktivesTurnier() === t) zeichne(); });
            return false;
        }

        /* ── Rangliste ───────────────────────────────────────────────── */
        function zeichneRangliste(t) {
            // Waehrend Lichess die Rangliste liefert: schon anzeigen, was da ist.
            const teil = !t.spieler;
            const spieler = t.spieler || t.spielerTeil || [];
            if (!spieler.length) { el.ansicht.innerHTML = '<div class="ot-karte">' + fortschrittHTML(t, 'spieler') + '</div>'; return; }
            // Partien erst nach der Rangliste anfordern - zwei Abrufe zugleich
            // mag Lichess nicht und bremst dann beide.
            const da = teil ? false : mitPartien(t);
            const g = t.partien || [];
            const st = t.partien ? spielerStatistik(g) : null;
            const ws = g.filter(x => x.ergebnis === 'white').length, rs = g.filter(x => x.ergebnis === 'draw').length, bs = g.filter(x => x.ergebnis === 'black').length;
            const pz = n => g.length ? Math.round(n / g.length * 100) : 0;

            // Kennzahlen (brauchen die Partien)
            const sieger = t.status === 'fertig' ? spieler[0] : null;
            const upset = g.filter(x => x.upset > 0).sort((a, b) => b.upset - a.upset)[0];
            const lang = g.filter(x => x.zugzahl > 0).sort((a, b) => b.zugzahl - a.zugzahl)[0];
            const schnittZuege = g.length ? Math.round(g.reduce((s, x) => s + x.zugzahl, 0) / g.length) : 0;
            const kpi = (l, w, sub, attr) => '<' + (attr ? 'button type="button" ' + attr + ' class="ot-kpi klickbar"' : 'div class="ot-kpi"') + '><small>' + l + '</small><b>' + w + '</b><span>' + sub + '</span></' + (attr ? 'button' : 'div') + '>';
            const warte = '<span class="ot-leise">wird berechnet …</span>';

            const q = z.rlSuche.trim().toLowerCase();
            const liste = spieler.filter(p => !q || p.name.toLowerCase().includes(q));

            el.ansicht.innerHTML =
                '<div class="ot-karte ot-zusammenfassung"><div>'
                + '<div class="ot-abzeichen-reihe"><span class="ot-abzeichen">' + (t.typ === 'swiss' ? 'Schweizer System' : 'Arena') + '</span><span class="ot-abzeichen">' + esc(t.bedenkzeit) + '</span><span class="ot-abzeichen">' + esc(t.dauer) + '</span>'
                + (t.status === 'laeuft' ? '<span class="ot-abzeichen live">Läuft</span>' : '') + '</div>'
                + '<h3 class="ot-gross">' + esc(t.name) + '</h3>'
                + '<div class="ot-meta"><span><b>' + spieler.length + '</b> Spieler</span><span><b>' + (t.partien ? g.length : (t.partienZahl || '…')) + '</b> Partien</span><span>' + esc(datumText(t.start)) + '</span>'
                + '<a href="' + esc(t.url) + '" target="_blank" rel="noopener">Auf Lichess ↗</a></div></div>'
                + '<div>' + (t.partien ? '<div class="ot-meta-klein"><span>Ergebnisverteilung</span><span>' + g.length + ' Partien</span></div>'
                    + '<div class="ot-wdl farben"><i class="w" style="width:' + pz(ws) + '%"></i><i class="r" style="width:' + pz(rs) + '%"></i><i class="b" style="width:' + pz(bs) + '%"></i></div>'
                    + '<div class="ot-wdl-legende"><span>Weiss ' + pz(ws) + ' % (' + ws + ')</span><span>Remis ' + pz(rs) + ' % (' + rs + ')</span><span>Schwarz ' + pz(bs) + ' % (' + bs + ')</span></div>'
                    : fortschrittHTML(t, teil ? 'spieler' : 'partien')) + '</div></div>'

                + '<div class="ot-kpis">'
                + (sieger ? kpi('Turniersieger', titelTag(sieger.titel) + esc(sieger.name), pkt(sieger.punkte) + ' Punkte · Leistung ' + (sieger.leistung || '–'), 'data-ot-spieler="' + esc(sieger.key) + '"')
                    : kpi('Spitze', spieler[0] ? esc(spieler[0].name) : '–', t.status === 'laeuft' ? 'Turnier läuft noch' : '', spieler[0] ? 'data-ot-spieler="' + esc(spieler[0].key) + '"' : ''))
                + (!da ? kpi('Grösste Überraschung', '…', warte) : upset ? kpi('Grösste Überraschung', '+' + upset.upset + ' Elo',
                    esc((upset.ergebnis === 'white' ? upset.white : upset.black).name) + ' schlägt ' + esc((upset.ergebnis === 'white' ? upset.black : upset.white).name), 'data-ot-brett="' + esc(upset.id) + '"') : kpi('Grösste Überraschung', '–', 'keine'))
                + (!da ? kpi('Längste Partie', '…', warte) : lang ? kpi('Längste Partie', lang.zugzahl + ' Züge', esc(lang.white.name) + ' – ' + esc(lang.black.name), 'data-ot-brett="' + esc(lang.id) + '"') : kpi('Längste Partie', '–', ''))
                + (!da ? kpi('Remis-Quote', '…', warte) : kpi('Remis-Quote', pz(rs) + ' %', 'Ø ' + schnittZuege + ' Züge pro Partie'))
                + '</div>'

                + '<div class="ot-karte ot-ohne-polster"><div class="ot-werkzeug"><div><h3 class="ot-mittel">Rangliste</h3><small>Klick auf eine Zeile öffnet das Spieler-Dossier.</small></div>'
                + '<div class="ot-werkzeug-rechts"><input type="search" class="search-bar ot-suche" data-ot-feld="rlSuche" placeholder="Spieler filtern …" value="' + esc(z.rlSuche) + '">'
                + '<button type="button" class="ot-knopf" data-ot-csv="rangliste">CSV</button></div></div>'
                + '<div class="ot-tabelle-wrap"><table class="ot-daten"><thead><tr><th>Rang</th><th>Spieler</th><th class="r">Punkte</th><th class="r">Partien</th><th class="m">S / R / N</th><th class="r">Sieg-%</th>'
                + '<th class="r">' + (t.typ === 'swiss' ? 'Feinw. / Leist.' : 'Leistung') + '</th><th class="r">Ø Gegner</th></tr></thead><tbody>'
                + (liste.map(p => {
                    const s = st && st.get(p.key), gs = s ? s.s + s.r + s.n : null;
                    return '<tr class="klickbar' + (p.rang <= 3 && t.status === 'fertig' ? ' podest' : '') + '" data-ot-spieler="' + esc(p.key) + '">'
                        + '<td class="ot-rangzelle">' + (t.status === 'fertig' ? medaille(p.rang) : p.rang) + '</td>'
                        + '<td><b>' + titelTag(p.titel) + esc(p.name) + '</b> <small>' + (p.rating || '') + '</small></td>'
                        + '<td class="r gold">' + pkt(p.punkte) + '</td>'
                        + '<td class="r">' + (gs == null ? '…' : gs) + '</td>'
                        + '<td class="m">' + (s ? s.s + ' / ' + s.r + ' / ' + s.n : st ? '0 / 0 / 0' : '…') + '</td>'
                        + '<td class="r">' + (gs ? Math.round(s.s / gs * 100) + ' %' : '–') + '</td>'
                        + '<td class="r">' + (t.typ === 'swiss' ? (p.feinwertung != null ? dez(p.feinwertung) : '–') + ' <small>/ ' + (p.leistung || '–') + '</small>' : (p.leistung || '–')) + '</td>'
                        + '<td class="r">' + (s ? (schnitt(s.gegner) || '–') : '…') + '</td></tr>';
                }).join('') || '<tr><td colspan="8" class="ot-leer">Keine Spieler gefunden.</td></tr>')
                + '</tbody></table></div></div>';
        }

        /* ── Kreuztabelle ────────────────────────────────────────────── */
        function zeichneKreuz(t) {
            if (!t.spieler) { el.ansicht.innerHTML = '<div class="ot-karte">' + fortschrittHTML(t, 'spieler') + '</div>'; return; }
            const kopf = '<div class="ot-werkzeug"><div><h3 class="ot-mittel">Kreuztabelle</h3><small>Klick auf eine gespielte Zelle: Direktvergleich. Klick auf einen Namen: Spieler-Dossier.</small></div>'
                + '<div class="ot-werkzeug-rechts"><div class="ot-segment">' + [[12, 'Top 12'], [20, 'Top 20'], [0, 'Alle']].map(([n, l]) => '<button type="button" data-ot-limit="' + n + '" class="' + (z.ktLimit === n ? 'aktiv' : '') + '">' + l + '</button>').join('') + '</div>'
                + '<input type="search" class="search-bar ot-suche" data-ot-feld="ktSuche" placeholder="Spieler markieren …" value="' + esc(z.ktSuche) + '"></div></div>'
                + '<div class="ot-legende"><span><span class="ot-punkt weiss"></span> mit Weiss</span><span><span class="ot-punkt schwarz"></span> mit Schwarz</span>'
                + '<span><b class="s">1</b> Sieg</span><span><b class="r">½</b> Remis</span><span><b class="n">0</b> Niederlage</span>'
                + (t.typ === 'arena' ? '<span>Mehrfache Begegnungen (Arena): Gesamtpunkte und je Partie ein Punkt.</span>' : '') + '</div>';
            if (!mitPartien(t)) { el.ansicht.innerHTML = '<div class="ot-karte ot-ohne-polster">' + kopf + '<div class="ot-polster">' + fortschrittHTML(t, 'partien') + '</div></div>'; return; }

            let liste = z.ktLimit > 0 ? t.spieler.slice(0, z.ktLimit) : t.spieler.slice();
            const q = z.ktSuche.trim().toLowerCase(), treffer = new Set();
            if (q) {
                t.spieler.forEach(p => { if (p.name.toLowerCase().includes(q)) treffer.add(p.key); });
                const drin = new Set(liste.map(p => p.key));
                t.spieler.forEach(p => { if (treffer.has(p.key) && !drin.has(p.key)) liste.push(p); });
            }
            const m = kreuzMatrix(t.partien);
            let h = '<div class="ot-kreuz-scroll"><table class="ot-kreuz"><thead><tr><th class="ecke">Spieler</th>';
            liste.forEach((p, ci) => {
                h += '<th class="spalte' + (treffer.has(p.key) ? ' treffer' : '') + '" data-ot-c="' + ci + '" data-ot-spieler="' + esc(p.key) + '" title="' + esc('#' + p.rang + ' ' + p.name + ' (' + (p.rating || '–') + ')') + '">'
                    + '<small>#' + p.rang + '</small><span>' + esc(p.name.slice(0, 10)) + '</span><small>' + (p.rating || '–') + '</small></th>';
            });
            h += '<th class="pkt">Pkt.</th></tr></thead><tbody>';
            liste.forEach((zp, ri) => {
                h += '<tr data-ot-r="' + ri + '"><th class="zeile' + (treffer.has(zp.key) ? ' treffer' : '') + '" data-ot-rk="' + ri + '" data-ot-spieler="' + esc(zp.key) + '">'
                    + '<span class="r">' + zp.rang + '.</span><span class="n">' + titelTag(zp.titel) + esc(zp.name) + '</span><small>' + (zp.rating || '–') + '</small></th>';
                liste.forEach((sp, ci) => {
                    if (zp.key === sp.key) { h += '<td class="zelle diag" data-ot-r="' + ri + '" data-ot-c="' + ci + '"></td>'; return; }
                    const c = m.get(zp.key + '|' + sp.key);
                    if (!c) { h += '<td class="zelle leer" data-ot-r="' + ri + '" data-ot-c="' + ci + '">·</td>'; return; }
                    const kl = c.pz > c.ps ? 's' : c.pz < c.ps ? 'n' : 'r';
                    const inhalt = c.partien.length === 1
                        ? '<span class="eins"><span class="ot-punkt ' + (c.partien[0].farbe === 'white' ? 'weiss' : 'schwarz') + '"></span>' + (c.partien[0].e === 'S' ? '1' : c.partien[0].e === 'R' ? '½' : '0') + '</span>'
                        : '<span class="mehr">' + dez(c.pz) + '/' + c.partien.length + '</span><span class="pips">' + c.punkte.slice(0, 8).map(e => '<i class="' + e + '"></i>').join('') + '</span>';
                    h += '<td class="zelle gespielt ' + kl + '" data-ot-r="' + ri + '" data-ot-c="' + ci + '" data-ot-h2h="' + esc(zp.key) + '|' + esc(sp.key) + '" title="'
                        + esc(zp.name + ' gegen ' + sp.name + ': ' + dez(c.pz) + ' : ' + dez(c.ps)) + '">' + inhalt + '</td>';
                });
                h += '<td class="pkt">' + pkt(zp.punkte) + '</td></tr>';
            });
            h += '</tbody></table></div>';
            el.ansicht.innerHTML = '<div class="ot-karte ot-ohne-polster">' + kopf + h + '</div>';

            // Fadenkreuz: Zeile und Spalte unter der Maus hervorheben.
            const tab = el.ansicht.querySelector('.ot-kreuz');
            let lr = -1, lc = -1;
            const weg = () => { tab.querySelectorAll('.hl, .hl-kopf, .fokus').forEach(x => x.classList.remove('hl', 'hl-kopf', 'fokus')); lr = lc = -1; };
            tab.addEventListener('mouseover', ev => {
                const td = ev.target.closest('td[data-ot-r]');
                if (!td) return;
                const r = td.dataset.otR, c = td.dataset.otC;
                if (r === lr && c === lc) return;
                weg(); lr = r; lc = c;
                tab.querySelectorAll('td[data-ot-r="' + r + '"], td[data-ot-c="' + c + '"]').forEach(x => x.classList.add('hl'));
                const a = tab.querySelector('th[data-ot-rk="' + r + '"]'), b = tab.querySelector('th[data-ot-c="' + c + '"]');
                if (a) a.classList.add('hl-kopf');
                if (b) b.classList.add('hl-kopf');
                td.classList.add('fokus');
            });
            tab.addEventListener('mouseleave', weg);
        }

        /* ── Partien & Paarungen ─────────────────────────────────────── */
        function zeichnePartien(t) {
            const f = z.f;
            const kopf = '<div class="ot-werkzeug"><div><h3 class="ot-mittel">Partien &amp; Paarungen</h3><small>Alle Begegnungen – jede Partie lässt sich direkt nachspielen.</small></div></div>';
            if (t.fehler && !t.partien && !t.partienLaeuft) { el.ansicht.innerHTML = '<div class="ot-karte ot-fehler">' + esc(t.fehler) + '</div>'; return; }
            const fertigGeladen = mitPartien(t);
            /* Arena: Partien schon zeigen, waehrend sie eintreffen. Bei Swiss
               nicht - die Runden lassen sich erst aus allen Partien bestimmen. */
            const teilPartien = !fertigGeladen && t.typ === 'arena' && t.partienTeilRoh && t.partienTeilRoh.length
                ? t.partienTeilRoh.map(g => partieNormalisieren(g, t)).filter(Boolean) : null;
            if (!fertigGeladen && !teilPartien) { el.ansicht.innerHTML = '<div class="ot-karte ot-ohne-polster">' + kopf + '<div class="ot-polster">' + fortschrittHTML(t, 'partien') + '</div></div>'; return; }
            const allePartien = t.partien || teilPartien;

            const spieler = new Map();
            allePartien.forEach(g => { spieler.set(g.white.key, g.white); spieler.set(g.black.key, g.black); });
            const sortiert = Array.from(spieler.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
            const optionen = (leer, wert) => '<option value="">' + leer + '</option>' + sortiert.map(p => '<option value="' + esc(p.key) + '"' + (wert === p.key ? ' selected' : '') + '>' + esc(p.name) + (p.rating ? ' (' + p.rating + ')' : '') + '</option>').join('');

            const liste = allePartien.filter(g => {
                const w = g.white.key, b = g.black.key;
                if (f.a && f.b) { if (!((w === f.a && b === f.b) || (w === f.b && b === f.a))) return false; }
                else if (f.a) { if (w !== f.a && b !== f.a) return false; }
                else if (f.b) { if (w !== f.b && b !== f.b) return false; }
                if (f.erg === 'white' && g.ergebnis !== 'white') return false;
                if (f.erg === 'black' && g.ergebnis !== 'black') return false;
                if (f.erg === 'draw' && g.ergebnis !== 'draw') return false;
                if (f.upset !== 'alle' && g.upset < Number(f.upset)) return false;
                if (f.suche.trim()) {
                    const q = f.suche.trim().toLowerCase();
                    if (![g.white.name, g.black.name, g.eco, g.eroeffnung, g.ende].join(' ').toLowerCase().includes(q)) return false;
                }
                return true;
            });
            const gefiltert = !!(f.a || f.b || f.erg !== 'alle' || f.upset !== 'alle' || f.suche.trim());

            let liste_html;
            if (!liste.length) liste_html = '<div class="ot-karte ot-leer">Keine Partien für diese Filter.</div>';
            else if (t.typ === 'swiss') {
                const runden = new Map();
                liste.forEach(g => { const r = g.runde || 1; if (!runden.has(r)) runden.set(r, []); runden.get(r).push(g); });
                liste_html = Array.from(runden.keys()).sort((a, b) => a - b).map(r => '<div class="ot-runde"><div class="ot-runde-kopf"><h4>Runde ' + r + '</h4><small>'
                    + runden.get(r).length + ' ' + (runden.get(r).length === 1 ? 'Partie' : 'Partien') + '</small></div><div class="ot-partienliste">' + runden.get(r).map(partieZeile).join('') + '</div></div>').join('');
            } else {
                const bis = z.arenaSeite * ANZEIGE_PARTIEN;
                liste_html = '<div class="ot-partienliste">' + liste.slice(0, bis).map(partieZeile).join('') + '</div>'
                    + (liste.length > bis ? '<div class="ot-mittig"><button type="button" class="ot-knopf" data-ot-mehr-partien>Weitere ' + Math.min(ANZEIGE_PARTIEN, liste.length - bis) + ' von ' + (liste.length - bis) + ' Partien anzeigen</button></div>' : '');
            }

            const a = f.a && spieler.get(f.a), b = f.b && spieler.get(f.b);
            el.ansicht.innerHTML = '<div class="ot-karte ot-ohne-polster">' + kopf
                + (teilPartien ? '<div class="ot-polster">' + fortschrittHTML(t, 'partien') + '</div>' : '')
                + '<div class="ot-filter-raster">'
                + '<label><small>Spieler A</small><select class="search-bar" data-ot-feld="f.a">' + optionen('Alle Spieler', f.a) + '</select></label>'
                + '<label><small>Gegen Spieler B</small><select class="search-bar" data-ot-feld="f.b">' + optionen('Alle Gegner', f.b) + '</select></label>'
                + '<label><small>Ergebnis</small><select class="search-bar" data-ot-feld="f.erg">' + [['alle', 'Alle Ergebnisse'], ['white', 'Weiss gewinnt (1–0)'], ['black', 'Schwarz gewinnt (0–1)'], ['draw', 'Remis (½–½)']]
                    .map(([v, l]) => '<option value="' + v + '"' + (f.erg === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>'
                + '<label><small>Überraschungen</small><select class="search-bar" data-ot-feld="f.upset">' + [['alle', 'Alle Partien'], ['100', 'Nur Überraschungen (≥ 100 Elo)'], ['200', 'Grosse (≥ 200 Elo)']]
                    .map(([v, l]) => '<option value="' + v + '"' + (f.upset === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>'
                + '<label><small>Suche (Spieler / Eröffnung)</small><input type="search" class="search-bar" data-ot-feld="f.suche" placeholder="z. B. Sizilianisch, B90 …" value="' + esc(f.suche) + '"></label>'
                + '</div><div class="ot-fussleiste"><span>' + liste.length + ' von ' + allePartien.length + ' Partien'
                + (t.partienGekappt ? ' (Lichess-Abruf bei ' + MAX_PARTIEN + ' begrenzt)' : '') + '</span><span>'
                + (t.typ === 'swiss' ? '<small class="ot-leise">Runden aus den Ansetzungszeiten ermittelt</small> ' : '')
                + (gefiltert ? '<button type="button" class="ot-knopf" data-ot-filter-weg>Filter zurücksetzen</button>' : '') + '</span></div></div>'
                + (a && b && f.a !== f.b ? '<div class="ot-karte ot-h2h-zusammen">' + Fenster.vergleichKopf(a, b, liste) + '</div>' : '')
                + liste_html;
        }

        /* ── Gesamtwertung ───────────────────────────────────────────── */
        function zeichneGesamt() {
            if (!gewertete().length) {
                el.ansicht.innerHTML = '<div class="ot-karte ot-mittig-karte"><div class="ot-bald-symbol" aria-hidden="true">🏆</div><h3 class="ot-mittel">Noch kein Turnier beendet</h3>'
                    + '<p>Die Gesamtwertung beginnt mit dem ersten abgeschlossenen Turnier der Serie.</p><button type="button" class="ot-knopf" data-ot-bereich="turniere">Zu den Turnieren →</button></div>';
                return;
            }
            const fehlt = gewertete().filter(t => !t.spieler);
            const { zeilen, turniere, gestrichenZahl } = gesamtwertung(z.turniere, cfg, z.gpModus, z.gpStreich);
            const q = z.gpSuche.trim().toLowerCase();
            const gefiltert = zeilen.filter(r => !q || r.name.toLowerCase().includes(q));
            const zeig = z.gpMehr || q ? gefiltert : gefiltert.slice(0, 50);
            /* Kopf: Titel und Bedienung in einer Zeile, darunter die Regeln als
               kleine Kaertchen - statt eines langen Satzes, den niemand liest. */
            const schluessel = z.gpModus === 'platz'
                ? '<span class="ot-info ot-schluessel" title="Punkte je Platz"><small>Punkte je Platz</small>'
                    + cfg.punkte.map((pk, i) => '<span><i>' + (i + 1) + '.</i>' + pk + '</span>').join('') + '</span>'
                    + (cfg.teilnahme ? '<span class="ot-info"><b>+' + cfg.teilnahme + '</b> je Teilnahme</span>' : '')
                : '<span class="ot-info">Gewertet werden die <b>erzielten Turnierpunkte</b></span>';
            let h = '<div class="ot-karte ot-ohne-polster"><div class="ot-werkzeug">'
                + '<h3 class="ot-mittel">🏆 Gesamtwertung</h3>'
                + '<div class="ot-werkzeug-rechts"><input type="search" class="search-bar ot-suche" data-ot-feld="gpSuche" placeholder="Spieler suchen …" value="' + esc(z.gpSuche) + '">'
                + '<div class="ot-segment"><button type="button" data-ot-gp="platz" class="' + (z.gpModus === 'platz' ? 'aktiv' : '') + '">Platzierung</button>'
                + '<button type="button" data-ot-gp="punkte" class="' + (z.gpModus === 'punkte' ? 'aktiv' : '') + '">Turnierpunkte</button></div>'
                // Streichresultate ergeben erst ab zwei Turnieren Sinn.
                + (turniere.length > 1 ? '<select class="search-bar ot-klein-select" data-ot-feld="gpStreich" aria-label="Streichresultate">' + [0, 1, 2, 3].filter(n => n < turniere.length)
                    .map(n => '<option value="' + n + '"' + (z.gpStreich === n ? ' selected' : '') + '>' + (n === 0 ? 'Keine Streichresultate' : n + ' Streichresultat' + (n > 1 ? 'e' : '')) + '</option>').join('') + '</select>' : '')
                + '<button type="button" class="ot-knopf" data-ot-csv="gesamt">CSV</button></div></div>'
                + '<div class="ot-infoleiste"><span class="ot-info"><b>' + turniere.length + '</b> ' + (turniere.length === 1 ? 'Turnier' : 'Turniere') + ' gewertet</span>'
                + schluessel
                + (gestrichenZahl ? '<span class="ot-info"><b>' + gestrichenZahl + '</b> Streichresultat' + (gestrichenZahl > 1 ? 'e' : '') + '</span>' : '')
                + '</div>';
            if (fehlt.length) h += '<div class="ot-polster">' + fehlt.map(t => fortschrittHTML(t, 'spieler')).join('') + '</div>';
            h += '<div class="ot-tabelle-wrap"><table class="ot-daten"><thead><tr><th>Rang</th><th>Spieler</th><th class="r">Teiln.</th>'
                + turniere.map(t => '<th class="r" title="' + esc('#' + t.nr + ' ' + t.name + ' · ' + datumText(t.start)) + '">#' + t.nr + '<br><small>' + kurzDatum(t.start) + '</small></th>').join('')
                + '<th class="r gold">Gesamt</th></tr></thead><tbody>'
                + (zeig.map(r => '<tr class="klickbar' + (r.rang <= 3 ? ' podest' : '') + '" data-ot-serienspieler="' + esc(r.key) + '" title="Laufbahn von ' + esc(r.name) + ' anzeigen"><td class="ot-rangzelle">' + medaille(r.rang) + '</td>'
                    + '<td><b>' + titelTag(r.titel) + esc(r.name) + '</b>' + (r.siege ? ' <small>' + r.siege + '× Sieg</small>' : '') + '</td>'
                    + '<td class="r">' + r.teil + '/' + turniere.length + '</td>'
                    + r.zellen.map(c => c ? '<td class="r' + (c.gestrichen ? ' gestrichen' : '') + '" title="Platz ' + c.rang + (c.gestrichen ? ' (gestrichen)' : '') + '">' + pkt(c.wert) + '<small> · ' + c.rang + '.</small></td>' : '<td class="r ot-leise">–</td>').join('')
                    + '<td class="r gold gross">' + pkt(r.summe) + '</td></tr>').join('')
                    || '<tr><td colspan="' + (turniere.length + 4) + '" class="ot-leer">' + (q ? 'Kein Spieler gefunden.' : 'Ranglisten werden geladen …') + '</td></tr>')
                + '</tbody></table></div>'
                + (zeig.length < gefiltert.length ? '<div class="ot-mittig"><button type="button" class="ot-knopf" data-ot-mehr="gpMehr">Alle ' + gefiltert.length + ' Spieler anzeigen</button></div>' : '')
                + '<div class="ot-fussleiste"><span>' + turniere.map(t => '#' + t.nr + ' = ' + esc(t.name) + ', ' + kurzDatum(t.start)).join(' · ') + '</span></div></div>';
            el.ansicht.innerHTML = h;
        }

        /* ── CSV ─────────────────────────────────────────────────────── */
        function csv(art) {
            if (art === 'gesamt') {
                const { zeilen, turniere } = gesamtwertung(z.turniere, cfg, z.gpModus, z.gpStreich);
                csvHerunterladen('gesamtwertung.csv', [['Rang', 'Spieler', 'Teilnahmen'].concat(turniere.map(t => t.name), ['Gesamt'])]
                    .concat(zeilen.map(r => [r.rang, r.name, r.teil].concat(r.zellen.map(c => c ? c.wert : ''), [r.summe]))));
                return;
            }
            const t = aktivesTurnier();
            if (!t || !t.spieler) return;
            const st = t.partien ? spielerStatistik(t.partien) : new Map();
            csvHerunterladen(t.id + '_rangliste.csv', [['Rang', 'Spieler', 'Rating', 'Punkte', 'Partien', 'Siege', 'Remis', 'Niederlagen', 'Leistung', 'Ø Gegner']]
                .concat(t.spieler.map(p => { const s = st.get(p.key); return [p.rang, p.name, p.rating, p.punkte, s ? s.s + s.r + s.n : '', s ? s.s : '', s ? s.r : '', s ? s.n : '', p.leistung || '', s ? schnitt(s.gegner) || '' : '']; })));
        }

        /* ── Bedienung ───────────────────────────────────────────────── */
        function spielerOeffnen(t, key) {
            if (!t) return;
            Fenster.dossierOeffnen(t, key, k => { z.f = { a: k, b: '', erg: 'alle', upset: 'alle', suche: '' }; z.tab = 'partien'; z.aktiv = t.uid; zeichne(); el.ansicht.scrollIntoView({ block: 'start' }); });
            if (!t.partien) partienLaden(t, fortschritt).then(() => { const d = document.getElementById('ot-dossier'); if (d && !d.hidden) Fenster.dossierOeffnen(t, key, k => { z.f = { a: k, b: '', erg: 'alle', upset: 'alle', suche: '' }; z.tab = 'partien'; z.aktiv = t.uid; zeichne(); }); }).catch(() => {});
        }

        block.addEventListener('click', ev => {
            const x = ev.target;
            binden();
            const lk = x.closest('[data-ot-link]');
            if (lk) { linkKopieren(lk); return; }
            const ber = x.closest('[data-ot-bereich]');
            if (ber) { z.bereich = ber.dataset.otBereich; zeichne(); return; }
            const wahl = x.closest('[data-ot-wahl]');
            if (wahl) {
                z.bereich = 'turnier'; z.aktiv = wahl.dataset.otWahl; z.tab = 'rangliste';
                z.f = { a: '', b: '', erg: 'alle', upset: 'alle', suche: '' }; z.arenaSeite = 1;
                zeichne();
                if (el.navi.scrollIntoView) el.navi.scrollIntoView({ block: 'start', behavior: 'smooth' });
                return;
            }
            const mehr = x.closest('[data-ot-mehr]');
            if (mehr) { z[mehr.dataset.otMehr] = true; zeichne(); return; }
            const ssp = x.closest('[data-ot-serienspieler]');
            if (ssp) { serienSpielerOeffnen(ssp.dataset.otSerienspieler); return; }
            const tab = x.closest('[data-ot-tab]');
            if (tab) { z.tab = tab.dataset.otTab; zeichne(); return; }
            const lim = x.closest('[data-ot-limit]');
            if (lim) { z.ktLimit = Number(lim.dataset.otLimit); zeichne(); return; }
            const gp = x.closest('[data-ot-gp]');
            if (gp) { z.gpModus = gp.dataset.otGp; zeichne(); return; }
            const c = x.closest('[data-ot-csv]');
            if (c) { csv(c.dataset.otCsv); return; }
            if (x.closest('[data-ot-filter-weg]')) { z.f = { a: '', b: '', erg: 'alle', upset: 'alle', suche: '' }; zeichne(); return; }
            if (x.closest('[data-ot-mehr-partien]')) { z.arenaSeite++; zeichne(); return; }
            const t = aktivesTurnier();
            const brett = x.closest('[data-ot-brett]');
            if (brett && t) { const g = (t.partien || (t.partienTeilRoh || []).map(r => partieNormalisieren(r, t)).filter(Boolean)).find(p => p.id === brett.dataset.otBrett); if (g) Fenster.brettOeffnen(g); return; }
            const h2h = x.closest('[data-ot-h2h]');
            if (h2h && t && t.partien) { const [a, b] = h2h.dataset.otH2h.split('|'); Fenster.vergleichOeffnen(t, a, b); return; }
            const sp = x.closest('[data-ot-spieler]');
            if (sp && t) { spielerOeffnen(t, sp.dataset.otSpieler); }
        });

        // Felder: Suchfelder zeichnen beim Tippen neu - der Fokus bleibt dabei im Feld.
        function feldGeaendert(ev) {
            const feld = ev.target.closest('[data-ot-feld]');
            if (!feld) return;
            const k = feld.dataset.otFeld, v = feld.value;
            if (k.indexOf('f.') === 0) { z.f[k.slice(2)] = v; z.arenaSeite = 1; }
            else if (k === 'gpStreich') z.gpStreich = Number(v) || 0;
            else z[k] = v;
            const pos = feld.selectionStart;
            zeichne();
            if (feld.tagName === 'INPUT') {
                const neu = el.ansicht.querySelector('[data-ot-feld="' + k + '"]');
                if (neu) { neu.focus(); try { neu.setSelectionRange(pos, pos); } catch (e) { /* type=search */ } }
            }
        }
        let tippen = null;
        block.addEventListener('input', ev => {
            if (!ev.target.matches('input[data-ot-feld]')) return;
            clearTimeout(tippen);
            tippen = setTimeout(() => feldGeaendert(ev), 180);
        });
        block.addEventListener('change', ev => { if (ev.target.matches('select[data-ot-feld]')) feldGeaendert(ev); });

        // Klicks in den Fenstern (Brett, Spieler) - an diese Serie gebunden.
        Fenster.bauen();
        ['ot-h2h-modal', 'ot-dossier'].forEach(id => {
            const m = document.getElementById(id);
            if (m && !m._otGebunden) {
                m._otGebunden = true;
                m.addEventListener('click', ev => Fenster.klickInFenster(ev, (tt, k) => Serie._spielerOeffnen && Serie._spielerOeffnen(tt, k)));
            }
        });
        Serie._spielerOeffnen = spielerOeffnen;
        Serie._zuTurnier = zuTurnier;

        /* ── Start: Eckdaten parallel, Ranglisten nacheinander ─────────── */
        (async function () {
            const ergebnisse = await Promise.all(links.map(l => infoLaden(l).then(t => ({ t }), e => ({ fehler: e.message, l }))));
            z.turniere = ergebnisse.filter(e => e.t).map(e => e.t).sort((a, b) => new Date(b.start) - new Date(a.start));
            z.turniere.forEach(t => { t.team = teamUrl((block._otTeams && block._otTeams.get(t.id)) || cfg.team); });
            const fehler = ergebnisse.filter(e => e.fehler);
            /* Nummern in zeitlicher Reihenfolge: #1 ist das erste Turnier der Serie.
               So lassen sich auch gleich heissende Turniere auseinanderhalten -
               etwa zwei "Stuendliche Bullet-Arenen". */
            serie().slice().sort((a, b) => new Date(a.start) - new Date(b.start)).forEach((t, i) => { t.nr = i + 1; });
            zeichneVorschau(el.vorschau, z.turniere, !einzel && cfg.wertung);
            const ts = sichtbar();
            // Mit einem beendeten Turnier gibt es schon eine Gesamtwertung.
            if (einzel) { z.bereich = 'turnier'; z.aktiv = z.turniere[0] ? z.turniere[0].uid : null; }
            else z.bereich = standardBereich();
            bereit = true;
            if (wunsch) { const w = wunsch; wunsch = null; anwenden(w); } else zeichne();
            if (hub) hub.melden();
            if (fehler.length) el.vorschau.insertAdjacentHTML('beforeend', fehler.map(f => '<div class="glass-card ot-fehler">Turnier ' + esc(f.l.id) + ': ' + esc(f.fehler) + '</div>').join(''));

            // Ranglisten: zuerst die gerade sichtbare, dann der Rest.
            const reihenfolge = ts.slice().sort((a, b) => (b.uid === z.aktiv) - (a.uid === z.aktiv));
            for (const t of reihenfolge) {
                try {
                    await ranglisteLaden(t, n => { t.spielerGeladen = n; fortschritt(); });
                } catch (e) { t.fehler = e.message; t.spieler = []; }
                if (z.bereich !== 'turnier' || z.aktiv === t.uid) zeichneMitFokus(); else zeichneSchalter();
                if (hub) hub.melden();
            }
        })();
        return api;
    }

    /* ═══════════════════════════════════════════════════════════════════
       QUELLE: BLATT "online-turniere" (data/online-turniere.csv)
       ═══════════════════════════════════════════════════════════════════ */

    async function csvTextLaden(url) {
        const r = window.fetchCSVSource ? await window.fetchCSVSource(url)
            : await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return window.fetchTextWithEncoding ? window.fetchTextWithEncoding(r) : r.text();
    }

    /** Semikolon-CSV (wie der GitHub-Upload sie schreibt) -> Zeilen als Objekte, Spaltennamen klein. */
    function csvObjekte(text) {
        text = String(text || '').replace(/^\uFEFF/, '');
        const zeilen = [];
        let zeile = [], feld = '', inQ = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (inQ) {
                if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i++; } else inQ = false; }
                else feld += c;
            } else if (c === '"') inQ = true;
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

    /** ja / nein / leer (null) - grosszuegig gelesen. */
    function jaNein(v) {
        v = String(v == null ? '' : v).trim().toLowerCase();
        if (/^(ja|j|yes|y|x|1|true|wahr|✓|✔)$/.test(v)) return true;
        if (/^(nein|n|no|0|false|falsch|-)$/.test(v)) return false;
        return null;
    }

    /** Bild-Adresse -> sicheres style-Attribut (Pfade wie bei News: assets/…, Links). */
    function bildStil(url) {
        let u = String(url || '').trim();
        if (!u) return '';
        u = window.formatImageUrl ? window.formatImageUrl(u) : u;
        return 'background-image:url(&quot;' + esc(u.replace(/["'()\\\s]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))) + '&quot;)';
    }

    /** Lichess-Team aus Link oder Kurzname -> Team-Adresse (oder ''). */
    function teamUrl(wert) {
        const v = String(wert || '').trim();
        const m = v.match(/lichess\.org\/team\/([A-Za-z0-9_-]+)/);
        if (m) return 'https://lichess.org/team/' + m[1];
        return /^[A-Za-z0-9_-]{2,}$/.test(v) ? 'https://lichess.org/team/' + v.toLowerCase() : '';
    }
    /** Hinweis "erst dem Team beitreten" - ueberall gleich formuliert. */
    function teamHinweis(t, klasse) {
        if (!t || !t.team || t.status === 'fertig') return '';
        return '<div class="ot-team-hinweis' + (klasse ? ' ' + klasse : '') + '"><span aria-hidden="true">👥</span> <span>Mitspielen können nur Mitglieder des Lichess-Teams.</span> '
            + '<a href="' + esc(t.team) + '" target="_blank" rel="noopener">Zuerst dem Team beitreten ↗</a></div>';
    }

    /** Die Matrix des Blatts -> Serien mit ihren Turnieren und Einstellungen. */
    function serienAusMatrix(objekte) {
        const serien = [], nachName = new Map();
        let letzte = '';
        objekte.forEach(o => {
            const name = String(o.serie || o.serienname || '').trim() || letzte;
            const link = String(o.link || o['lichess-link'] || o.lichess || o.turnier || '').trim();
            if (!name || (!link && !String(o.serie || '').trim())) { if (name) letzte = name; return; }
            letzte = name;
            let s = nachName.get(name.toLowerCase());
            if (!s) {
                s = { name, kurzname: '', wertung: null, punkte: '', teilnahme: '', streich: '', beschreibung: '', bild: '', team: '', werbung: null, anzeigen: true, turniere: [] };
                nachName.set(name.toLowerCase(), s);
                serien.push(s);
            }
            const zeigen = jaNein(o.anzeigen) !== false;
            if (!link) {                                   // Einstellungszeile der Serie
                if (!zeigen) s.anzeigen = false;
                if (o.kurzname) s.kurzname = o.kurzname;
                if (jaNein(o.gesamtwertung) !== null) s.wertung = jaNein(o.gesamtwertung);
                ['punkte', 'teilnahme', 'streich', 'beschreibung', 'team', 'bild'].forEach(k => { if (o[k]) s[k] = o[k]; });
                if (!s.bild && (o.image || o.bildlink)) s.bild = o.image || o.bildlink;
                if (jaNein(o.werbung) !== null) s.werbung = jaNein(o.werbung);
                return;
            }
            if (zeigen) s.turniere.push({ link, wertung: jaNein(o.gesamtwertung), werbung: jaNein(o.werbung), team: o.team || '' });
        });
        return serien.filter(s => s.anzeigen).map(s => {
            const mitWertung = s.wertung === true || (s.wertung === null && s.turniere.some(t => t.wertung === true));
            const zaehlt = t => mitWertung && (s.wertung === true ? t.wertung !== false : t.wertung === true);
            s.mitWertung = mitWertung;
            s.mit = s.turniere.filter(zaehlt).map(t => t.link);
            s.ohne = s.turniere.filter(t => !zaehlt(t)).map(t => t.link);
            return s;
        });
    }

    /** Aus jeder Serie einen gewoehnlichen Block machen - der Rest laeuft wie gehabt. */
    function bloeckeAusSerien(serien) {
        return serien.map(s => {
            const b = document.createElement('div');
            b.className = 'online-turniere';
            b.dataset.serie = s.name;
            if (s.kurzname) b.dataset.id = s.kurzname;
            b.dataset.wertung = s.mitWertung ? 'ja' : 'nein';
            if (s.punkte) b.dataset.punkte = s.punkte;
            if (s.teilnahme) b.dataset.teilnahme = s.teilnahme;
            if (s.streich) b.dataset.streich = s.streich;
            if (s.beschreibung) b.dataset.beschreibung = s.beschreibung;
            if (s.team) b.dataset.team = s.team;
            if (s.bild) b.dataset.bild = s.bild;
            // Team je Turnier (ueberschreibt das der Serie) - als Eigenschaft, nicht im Text.
            b._otTeams = new Map(s.turniere.filter(t => t.team).map(t => [(t.link.match(/\/([A-Za-z0-9]{8})(?![A-Za-z0-9])/) || [])[1], t.team]));
            b.textContent = s.mitWertung ? 'MIT GESAMTWERTUNG: ' + s.mit.join(' ') + ' OHNE GESAMTWERTUNG: ' + s.ohne.join(' ')
                : s.turniere.map(t => t.link).join(' ');
            return b;
        });
    }

    /* ═══════════════════════════════════════════════════════════════════
       DIREKTE LINKS UND MEHRERE SERIEN
       ═══════════════════════════════════════════════════════════════════ */

    function nurText(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); }

    function slug(text) {
        return String(text || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'serie';
    }

    function bisStartText(start) {
        const s = Math.round((new Date(start) - Date.now()) / 1000);
        if (s <= 0) return 'beginnt jetzt';
        if (s < 3600) return 'startet in ' + Math.max(1, Math.round(s / 60)) + ' Min.';
        if (s < 86400) return 'startet in ' + Math.round(s / 3600) + ' Std.';
        const tage = Math.round(s / 86400);
        return 'startet in ' + tage + (tage === 1 ? ' Tag' : ' Tagen');
    }

    /** Die Adresszeile spiegelt, was offen ist: serie, bereich, turnier, reiter.
        Wechsel von Serie/Bereich/Turnier gibt einen neuen Verlaufseintrag (Zurueck-Taste),
        ein Reiterwechsel ersetzt nur den aktuellen. "page" & Co. bleiben unberuehrt. */
    const Adresse = {
        still: false,
        SCHLUESSEL: ['serie', 'bereich', 'turnier', 'reiter'],
        lesen() {
            const p = new URLSearchParams(location.search);
            return { serie: p.get('serie') || '', bereich: p.get('bereich') || '', turnier: p.get('turnier') || '', reiter: p.get('reiter') || '' };
        },
        schreiben(zu, modus) {
            try {
                const jetzt = Adresse.lesen();
                if (Adresse.SCHLUESSEL.every(k => jetzt[k] === (zu[k] || ''))) return;
                const wichtig = ['serie', 'bereich', 'turnier'].some(k => jetzt[k] !== (zu[k] || ''));
                const url = new URL(location.href);
                Adresse.SCHLUESSEL.forEach(k => { if (zu[k]) url.searchParams.set(k, zu[k]); else url.searchParams.delete(k); });
                const push = !Adresse.still && (modus === 'push' || (modus === 'auto' && wichtig));
                history[push ? 'pushState' : 'replaceState']({ ot: 1 }, '', url.pathname + url.search + url.hash);
            } catch (e) { /* Die Adresszeile ist eine Zugabe - nie ein Grund zum Abbrechen. */ }
        }
    };

    function linkKopieren(knopf) {
        const url = location.href, alt = knopf.innerHTML;
        const zeig = text => { knopf.innerHTML = text; clearTimeout(knopf._ot); knopf._ot = setTimeout(() => { knopf.innerHTML = alt; }, 1800); };
        const notfall = () => { try { window.prompt('Link zum Kopieren:', url); } catch (e) { /* kein Dialog */ } };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => zeig('✓ Kopiert'), notfall);
        else notfall();
    }

    /** Mehrere Bloecke auf einer Seite: zuerst eine Karte pro Serie, ein Klick oeffnet sie. */
    function Hub(bloecke) {
        const kopf = document.createElement('div');
        kopf.className = 'ot-hub';
        bloecke[0].parentNode.insertBefore(kopf, bloecke[0]);
        const hub = { aktivId: null, serien: [], melden };
        const ids = new Set();
        bloecke.forEach(b => {
            const basis = slug(b.dataset.id || b.dataset.serie);
            let id = basis, n = 2;
            while (ids.has(id)) id = basis + '-' + n++;
            ids.add(id);
            b.hidden = true;
            hub.serien.push(Serie(b, hub, id));
        });

        let wartet = null;
        function melden() {
            if (wartet) return;
            wartet = setTimeout(() => { wartet = null; if (!hub.aktivId) zeichneUebersicht(); }, 150);
        }

        function karte(s) {
            const d = s.zusammenfassung();
            const infos = [];
            if (d.live) infos.push('<span class="ot-gruen">● Läuft gerade: ' + esc(d.live.name) + '</span>');
            if (d.naechstes) infos.push('<span class="ot-gold">⏳ Nächstes: ' + esc(kurzDatum(d.naechstes.start)) + ' · ' + bisStartText(d.naechstes.start) + '</span>');
            if (d.fuehrend) infos.push('<span>🏆 Spitzenreiter: <b>' + titelTag(d.fuehrend.titel) + esc(d.fuehrend.name) + '</b> · ' + pkt(d.fuehrend.summe) + ' Pkt.</span>');
            const art = d.einzel ? 'Turnier' : d.wertung ? 'Serie mit Gesamtwertung' : 'Turnierserie';
            return '<button type="button" class="glass-card ot-serienkarte' + (d.live ? ' live' : '') + (s.bild() ? ' mit-bild' : '') + '" data-ot-hub="' + esc(s.id) + '">'
                + (s.bild() ? '<span class="ot-serienkarte-bild" style="' + bildStil(s.bild()) + '" aria-hidden="true"></span>' : '')
                + '<span class="ot-serienkarte-art">' + art + '</span>'
                + '<span class="ot-serienkarte-name">' + esc(s.name()) + '</span>'
                + (s.beschreibung() ? '<span class="ot-serienkarte-text">' + esc(nurText(s.beschreibung())) + '</span>' : '')
                + '<span class="ot-serienkarte-zahlen">' + (d.leer ? '<span>Noch keine Turniere eingetragen</span>'
                    : '<span><b>' + d.anzahl + '</b> ' + (d.anzahl === 1 ? 'Turnier' : 'Turniere') + '</span>'
                    + (d.spieler ? '<span><b>' + d.spieler + '</b> Spieler</span>' : '')) + '</span>'
                + (infos.length ? '<span class="ot-serienkarte-infos">' + infos.join('') + '</span>' : (d.geladen || d.leer ? '' : '<span class="ot-leise">Wird geladen …</span>'))
                + '<span class="ot-serienkarte-fuss"><span>' + (d.einzel ? 'Zum Turnier' : 'Zur Serie') + '</span><span aria-hidden="true">→</span></span></button>';
        }
        function zeichneUebersicht() {
            kopf.innerHTML = '<div class="ot-serien-karten">' + hub.serien.map(karte).join('') + '</div>';
        }
        function zeichneLeiste() {
            kopf.innerHTML = '<div class="ot-hub-leiste"><button type="button" class="ot-knopf" data-ot-hub="">← Alle Serien</button>'
                + '<div class="ot-hub-serien">' + hub.serien.map(s => '<button type="button" class="ot-pille' + (s.id === hub.aktivId ? ' aktiv' : '')
                    + '" data-ot-hub="' + esc(s.id) + '">' + esc(s.name()) + '</button>').join('') + '</div>'
                + '<button type="button" class="ot-knopf ot-link-knopf" data-ot-link title="Direkten Link auf diese Ansicht kopieren">🔗 Link</button></div>';
        }
        function uebersicht(modus) {
            hub.aktivId = null;
            hub.serien.forEach(s => { s.block.hidden = true; });
            zeichneUebersicht();
            if (modus) Adresse.schreiben({}, modus);
        }
        function zeigen(s, modus) {
            hub.aktivId = s.id;
            hub.serien.forEach(x => { x.block.hidden = x !== s; });
            zeichneLeiste();
            s.binden();
            if (modus) { if (s.bereit) s.melde(modus); else Adresse.schreiben({ serie: s.id }, modus); }
        }
        hub.ausAdresse = function (p, modus, nachZurueck) {
            const s = p.serie ? hub.serien.find(x => x.id === p.serie) : null;
            if (!s) return uebersicht(modus);
            zeigen(s, modus);
            if (nachZurueck) s.anwenden(p);
        };
        kopf.addEventListener('click', ev => {
            const lk = ev.target.closest('[data-ot-link]');
            if (lk) { linkKopieren(lk); return; }
            const h = ev.target.closest('[data-ot-hub]');
            if (!h) return;
            const s = hub.serien.find(x => x.id === h.dataset.otHub);
            if (s) zeigen(s, 'push'); else uebersicht('push');
            if (kopf.scrollIntoView) kopf.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
        hub.ausAdresse(Adresse.lesen(), null);
        return hub;
    }

    let hubInstanz = null;
    const einzelneSerien = [];
    function start() {
        // Platzhalter <div class="online-turniere" data-quelle="data/online-turniere.csv">:
        // erst das Blatt laden, daraus die Serien-Bloecke bauen, dann normal starten.
        const quellen = Array.from(document.querySelectorAll('.online-turniere[data-quelle]')).filter(q => !q.dataset.otGestartet);
        if (quellen.length) {
            quellen.forEach(q => { q.dataset.otGestartet = '1'; q.classList.add('ot-bereit'); q.innerHTML = '<p class="ot-leer">Turniere werden geladen …</p>'; });
            Promise.all(quellen.map(q => csvTextLaden(q.dataset.quelle).then(csvObjekte).then(serienAusMatrix).then(serien => {
                if (!serien.length) {
                    q.innerHTML = '<div class="glass-card ot-bald"><div class="ot-bald-symbol" aria-hidden="true">♞</div>'
                        + '<h3>Das erste Online-Turnier steht vor der Tür</h3><p>Sobald gespielt wird, findest du hier Ranglisten und alle Partien. Schau bald wieder vorbei!</p></div>';
                    return;
                }
                bloeckeAusSerien(serien).forEach(b => q.parentNode.insertBefore(b, q));
                q.remove();
            }).catch(e => {
                q.innerHTML = '<div class="glass-card ot-fehler">Die Liste der Online-Turniere konnte nicht geladen werden (' + esc(e.message) + ').</div>';
            }))).then(start);
            return;
        }
        const neu = Array.from(document.querySelectorAll('.online-turniere')).filter(b => !b.dataset.otGestartet);
        neu.forEach(b => { b.dataset.otGestartet = '1'; });
        if (neu.length > 1 && !hubInstanz) hubInstanz = Hub(neu);
        else neu.forEach(b => einzelneSerien.push(Serie(b, null, slug(b.dataset.id || b.dataset.serie))));
        if (!start._zurueck) {
            start._zurueck = true;
            // Zurueck-/Vor-Taste: Ansicht aus der Adresse wiederherstellen, ohne neue Eintraege.
            window.addEventListener('popstate', () => {
                Adresse.still = true;
                try {
                    const p = Adresse.lesen();
                    if (hubInstanz) hubInstanz.ausAdresse(p, null, true);
                    else einzelneSerien.forEach(s => s.anwenden(p));
                } finally { Adresse.still = false; }
            });
        }
    }

    // Fuer Tests und fuer Seiten, die den Block erst spaeter einsetzen.
    window.OnlineTurniere = { start, gesamtwertung, linksLesen, Schach, kreuzMatrix, spielerStatistik, slug, csvObjekte, serienAusMatrix, teamUrl, bildStil };

    // pages.csv laedt dieses Skript erst, NACHDEM der Inhalt eingesetzt ist.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
