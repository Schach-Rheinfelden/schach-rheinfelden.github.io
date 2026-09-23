/* ===========================================================================
   Bestenliste - die ewige Rangliste des Mannschaftsschachs
   ===========================================================================

   ══ WAS HIER ZUSAMMENKOMMT ══
   data/bestenliste.csv haelt eine Zeile je Spieler, Mannschaft, Liga und
   Saison. Rund achthundert solcher Zeilen ergeben zwanzig Jahre Spielbetrieb.
   Die Seite rechnet daraus alles selbst aus - Summen, Quoten, Serien - statt
   fertige Summen zu erwarten.

   Der Grund: Sobald man filtern koennen will (nur Rhy 2, nur die SGM, nur die
   Saison 25/26), taugt eine vorberechnete Gesamtsumme nicht mehr. Sie waere
   fuer genau eine Ansicht richtig und fuer jede andere falsch. Die Rohzeilen
   sind dagegen fuer jede Auswahl brauchbar.

   ══ DIE ZWEITE QUELLE ══
   data/players.csv liefert Bild, ELO, DWZ und Rolle - aber nur fuer die
   heutigen Mitglieder. Von den gut hundert Personen in der Bestenliste haben
   etwa vierzig ein Profil; die uebrigen haben vor Jahren gespielt und sind
   laengst weitergezogen. Beide Gruppen gehoeren in die Liste. Wer kein Bild
   hat, bekommt seine Initialen.

   ══ NAMENSFORM ══
   Das Statistikblatt schreibt "Bonic, Adam", players.csv schreibt
   "Adam Bonic". Verglichen wird deshalb ueber eine normalisierte Form:
   kleingeschrieben, ohne Akzente, Wortteile sortiert. Damit passt auch
   "Ödül, Ismail Irfan" auf "Ismail Irfan Ödül".
   =========================================================================== */

(function () {
    'use strict';

    /* ─── Zustand ─────────────────────────────────────────────────────── */

    let ZEILEN = [];          // alle Saison-Zeilen aus der CSV
    let SPIELER = [];         // je Person eine Sammlung ihrer Zeilen
    let PROFILE = new Map();  // normalisierter Name -> Zeile aus players.csv
    let SAISONINFO = new Map();   // "Team|Liga|Saison" -> Jahr und Nummer je Runde

    /* Die Jahresliste, die der Schieberegler gerade abbildet. Er arbeitet mit
       Positionen darin, nicht mit Jahreszahlen - beim Ziehen muss sich also
       jemand merken, welche Position welches Jahr meint. */
    let LETZTE_JAHRE = [];

    /* ══ ZEITRAUM ══
       zeitModus entscheidet, was "2024" ueberhaupt bedeutet:

         'saison'   - das Saisonjahr, also alles mit dem Etikett 25/26 bzw. 26.
                      Wettbewerbe bleiben ganz, Meisterschaften werden nicht
                      zerschnitten.
         'kalender' - das echte Kalenderjahr der einzelnen Runde. Dann zaehlen
                      von einer Saison nur die Partien, die tatsaechlich in
                      diesem Jahr gespielt wurden.

       Der Unterschied ist erheblich: 2026 sind es 226 Partien nach Saisonjahr,
       aber 163 nach Kalenderjahr. Beides ist richtig, nur eben etwas anderes.

       jahrVon / jahrBis: 'alle' heisst "keine Grenze". */
    const filter = {
        suche: '',
        team: 'alle',
        liga: 'alle',
        zeitModus: 'saison',
        jahrVon: 'alle',
        jahrBis: 'alle',
        minPartien: 0,
        nurMitglieder: false
    };

    let sortSpalte = 'punkte';
    let sortAb = true;   // absteigend

    /* Reihenfolge der Wettbewerbe innerhalb eines Jahres - so, wie sie im
       Statistikblatt nebeneinander stehen. */
    /**
     * Reihenfolge der Wettbewerbe INNERHALB eines Saisonjahres.
     *
     * Nicht alphabetisch und nicht nach Land, sondern nach dem Spielkalender:
     *
     *   SGM und BMM  laufen von Oktober bis Maerz
     *   SMM          laeuft von Maerz bis September
     *
     * Die SMM eines Jahrgangs endet also ZULETZT und steht in der absteigenden
     * Liste ganz oben. Die SMM 26 gehoert ueber die SGM 25/26 und die
     * BMM 25/26 - auch wenn ihr Etikett nach weniger aussieht.
     *
     * Zwischen SGM und BMM ist die Reihenfolge willkuerlich; sie laufen
     * parallel. Unbekannte Wettbewerbe landen hinten (Rueckfallwert 9), bis
     * sie hier eingeordnet werden.
     */
    const LIGA_ORDNUNG = { SGM: 0, BMM: 1, SMM: 2 };

    /**
     * Ab wie vielen Partien eine Saison als "staerkste" in Frage kommt.
     *
     * Ohne eine solche Schwelle gewinnt die Quote immer die kuerzeste Saison:
     * Wer in einem Jahr eine einzige Partie spielte und gewann, stuende mit
     * 100 % da. Fuer 28 der 80 Spieler mit mehr als einer Saison waere die
     * "beste Saison" dann eine mit hoechstens zwei Partien - eine Aussage, die
     * niemand so meint.
     *
     * DREI und nicht fuenf: Bei fuenf bekamen nur 53 der 103 Spieler ueberhaupt
     * eine staerkste Bilanz - die halbe Mannschaft blieb ohne, obwohl drei
     * Partien schon etwas aussagen. Mit drei sind es 76.
     */
    const SAISON_MINDESTPARTIEN = 3;

    const LIGA_NAME = {
        SGM: 'Schweizer Gruppenmeisterschaft',
        SMM: 'Schweizer Mannschaftsmeisterschaft',
        BMM: 'Bezirksmannschaftsmeisterschaft'
    };

    /* ─── Kleinkram ───────────────────────────────────────────────────── */

    /** "Bonic, Adam" -> "Adam Bonic". Ohne Komma bleibt alles, wie es ist. */
    function anzeigeName(name) {
        const i = name.indexOf(',');
        if (i < 0) return name.trim();
        return (name.slice(i + 1).trim() + ' ' + name.slice(0, i).trim()).trim();
    }

    /** Vergleichsform: kleingeschrieben, ohne Akzente, Wortteile sortiert. */
    function schluessel(name) {
        return (name || '')
            .replace(/,/g, ' ')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/).filter(Boolean).sort().join(' ');
    }

    /**
     * Saisonjahr 2026 -> "2025/26".
     *
     * ══ WAS EIN SAISONJAHR IST ══
     * Der Jahrgang, in dem eine Saison ENDET. SGM 25/26, BMM 25/26 und SMM 26
     * gehoeren damit alle zum Saisonjahr 2026.
     *
     * Das ist kein Kunstgriff, sondern folgt dem Spielkalender: SGM und BMM
     * beginnen im Herbst 2025 und enden im Fruehjahr 2026, die SMM 26 wird im
     * Lauf des Jahres 2026 gespielt. Zusammen ergeben sie einen
     * zusammenhaengenden Zeitraum von Herbst bis Herbst.
     *
     * Nach KALENDERJAHR zu gruppieren waere die naheliegende Alternative - und
     * die schlechtere: Sie zerschnitte SGM und BMM mitten in der Saison.
     */
    function saisonEtikett(jahr) {
        return String(jahr - 1).slice(2) + '/' + String(jahr).slice(2);
    }

    /** "SGM 25/26" - ein einzelner Wettbewerb, wie ihn das Statistikblatt nennt. */
    function wettbewerbEtikett(z) {
        return z.liga + ' ' + z.saison;
    }

    /**
     * Welche Wettbewerbe stecken in welchem Saisonjahr?
     *
     * Ohne diese Auflistung bleibt "2025/26" fuer die SMM missverstaendlich:
     * Wer die SMM 26 sucht, erwartet sie unter 2026 und nicht unter 2025/26.
     * Die Gruppierung stimmt - nur sagen muss man es.
     */
    function wettbewerbeJeJahr_(zeilen) {
        const gesammelt = new Map();
        zeilen.forEach(z => {
            if (!gesammelt.has(z.jahr)) gesammelt.set(z.jahr, new Set());
            gesammelt.get(z.jahr).add(wettbewerbEtikett(z));
        });

        const ordnung = l => (LIGA_ORDNUNG[l] !== undefined ? LIGA_ORDNUNG[l] : 9);
        const fertig = new Map();
        gesammelt.forEach((menge, jahr) => {
            fertig.set(jahr, [...menge].sort((a, b) =>
                (ordnung(a.split(' ')[0]) - ordnung(b.split(' ')[0])) || a.localeCompare(b, 'de')));
        });
        return fertig;
    }

    function zahl(x) {
        const n = parseFloat(String(x).replace(',', '.'));
        return isNaN(n) ? 0 : n;
    }

    /** Punkte huebsch: 12.5 -> "12½", 12 -> "12". */
    function punkteText(p) {
        const ganz = Math.floor(p);
        return (p - ganz >= 0.5) ? (ganz === 0 ? '½' : ganz + '½') : String(ganz);
    }

    function entschaerfe(s) {
        return String(s === undefined || s === null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function initialen(anzeige) {
        return anzeige.split(/\s+/).filter(Boolean)
            .map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    /**
     * Fuellt die Resultate auf die volle Rundenzahl der Saison auf.
     *
     * In bestenliste.csv sind leere Runden am ENDE weggeschnitten - sie tragen
     * nichts zur Bilanz bei und blaehen die Datei auf. Fuer die Anzeige ist das
     * aber falsch: Wer in einer Saison mit fuenf Runden nur in Runde 4 spielte,
     * saehe vier Kreise statt fuenf, und es sieht aus, als haette die Saison
     * eine Runde weniger gehabt.
     *
     * Die wahre Rundenzahl steht in saisons.csv. Fehlt sie, bleibt es beim
     * Bestand - lieber zu wenig Kreise als erfundene.
     */
    function rundenAuffuellen_(resultate, info) {
        const soll = info.jahre.length || info.nummern.length;
        const voll = resultate.slice();
        while (voll.length < soll) voll.push('');
        return voll;
    }

    /* ─── Laden ───────────────────────────────────────────────────────── */

    async function holeCSV(pfad) {
        const antwort = await (window.fetchCSVSource ? window.fetchCSVSource(pfad) : fetch(pfad));
        if (!antwort || !antwort.ok) throw new Error('HTTP ' + (antwort && antwort.status));
        const text = await window.fetchTextWithEncoding(antwort);
        const rohzeilen = parseCSVShared(text);
        if (rohzeilen.length < 2) return [];

        const kopf = rohzeilen[0].map(h => (h || '').trim().replace(/^"|"$/g, '').toLowerCase());
        return rohzeilen.slice(1).map(zeile => {
            const o = {};
            kopf.forEach((h, i) => {
                let v = zeile[i] !== undefined ? zeile[i].trim().replace(/^"|"$/g, '') : '';
                o[h] = window.cleanMojibake ? window.cleanMojibake(v) : v;
            });
            return o;
        }).filter(o => Object.values(o).some(v => v !== ''));
    }

    async function laden() {
        const [bl, pl, sa] = await Promise.all([
            holeCSV('data/bestenliste.csv'),
            holeCSV('data/players.csv').catch(() => []),
            holeCSV('data/saisons.csv').catch(() => [])
        ]);

        /* Rundenjahre: Team + Liga + Saison → Jahr je Runde.
           Die Mannschaft gehoert in den Schluessel, weil Rhy 1 und Rhy 2
           dieselbe SGM-Saison in verschiedenen Gruppen und damit an
           verschiedenen Terminen spielen - Runde 3 der SGM 09/10 fiel fuer die
           eine ins Jahr 2009, fuer die andere ins Jahr 2010. */
        sa.forEach(r => {
            SAISONINFO.set(r.team + '|' + r.liga + '|' + r.saison, {
                jahre: (r.jahre || '').split(',').map(j => parseInt(j, 10) || 0),
                /* Rundennummern sind NICHT einfach 1 bis n: Hat eine Mannschaft
                   spielfrei, fehlt die Spalte im Statistikblatt ganz. Die
                   SGM 21/22 von Rhy 1 besteht aus den Runden 2 bis 6. */
                nummern: (r.rundennummern || '').split(',').map(n => n.trim()).filter(Boolean)
            });
        });

        /* players.csv traegt in Zeile 2 eine Steuerzeile ("ja;ja;ja;…"), die
           keine Person ist. Sie faellt heraus, weil ihr Name in keiner
           Bestenliste auftaucht - aber sicherheitshalber ausdruecklich. */
        pl.forEach(p => {
            const n = (p.name || '').trim();
            if (!n || n.toLowerCase() === 'ja' || n.toLowerCase() === 'nein') return;
            PROFILE.set(schluessel(n), p);
        });

        ZEILEN = bl.map(r => {
            const jahr = parseInt(r.jahr, 10) || 0;
            const info = SAISONINFO.get(r.team + '|' + r.liga + '|' + r.saison)
                || { jahre: [], nummern: [] };
            return {
                name: r.name,
                anzeige: anzeigeName(r.name),
                schluessel: schluessel(r.name),
                team: r.team,
                liga: r.liga,
                saison: r.saison,
                jahr: jahr,
                ordnung: jahr * 10 + (LIGA_ORDNUNG[r.liga] !== undefined ? LIGA_ORDNUNG[r.liga] : 9),
                punkte: zahl(r.punkte),
                partien: parseInt(r.partien, 10) || 0,
                siege: parseInt(r.siege, 10) || 0,
                remis: parseInt(r.remis, 10) || 0,
                niederlagen: parseInt(r.niederlagen, 10) || 0,
                resultate: rundenAuffuellen_((r.resultate || '').split(','), info),
                rundenJahre: info.jahre,
                rundenNummern: info.nummern
            };
        }).filter(r => r.name && r.partien > 0);

        const nachPerson = new Map();
        ZEILEN.forEach(z => {
            if (!nachPerson.has(z.schluessel)) {
                nachPerson.set(z.schluessel, {
                    schluessel: z.schluessel,
                    name: z.name,
                    anzeige: z.anzeige,
                    profil: PROFILE.get(z.schluessel) || null,
                    zeilen: []
                });
            }
            nachPerson.get(z.schluessel).zeilen.push(z);
        });
        SPIELER = [...nachPerson.values()];
        SPIELER.forEach(s => s.zeilen.sort((a, b) => a.ordnung - b.ordnung));
    }

    /* ─── Rechnen ─────────────────────────────────────────────────────── */

    /** Fasst beliebig viele Saison-Zeilen zu einer Bilanz zusammen. */
    function bilanz(zeilen) {
        const b = {
            partien: 0, punkte: 0, siege: 0, remis: 0, niederlagen: 0,
            teams: new Set(), ligen: new Set(), jahre: new Set(),
            von: Infinity, bis: -Infinity
        };
        zeilen.forEach(z => {
            b.partien += z.partien; b.punkte += z.punkte;
            b.siege += z.siege; b.remis += z.remis; b.niederlagen += z.niederlagen;
            b.teams.add(z.team); b.ligen.add(z.liga); b.jahre.add(z.jahr);

            /* "Aktiv von - bis" meint die KALENDERJAHRE, in denen wirklich
               gespielt wurde, nicht die Saison-Etiketten.
               Der Unterschied ist kein Randfall: Bei 48 der 103 Spieler weicht
               er ab. Wer im Herbst 2011 seine erste Partie in der Saison 11/12
               spielte, war ab 2011 aktiv - die Seite behauptete 2012.
               Gezaehlt werden nur GESPIELTE Runden; eine Saison, in der jemand
               nur auf dem Papier stand, verlaengert seine Laufbahn nicht. */
            const jahre = z.rundenJahre || [];
            z.resultate.forEach((v, i) => {
                if (v === '') return;
                const j = jahre[i] || z.jahr;
                if (j < b.von) b.von = j;
                if (j > b.bis) b.bis = j;
            });
        });
        b.quote = b.partien ? (b.punkte / b.partien * 100) : 0;
        return b;
    }

    /**
     * Laengste Siegesserie und laengste Serie ohne Niederlage.
     *
     * ══ JE WETTBEWERB, NICHT UEBER ALLES ══
     * Gezaehlt wird innerhalb EINES Wettbewerbs, dort aber ueber die Jahre
     * hinweg: Runde 7 der SGM 24/25 und Runde 1 der SGM 25/26 folgen
     * tatsaechlich aufeinander. Von den drei Wettbewerben gilt der beste Wert.
     *
     * Warum nicht alles in eine Kette? Weil SGM und BMM PARALLEL laufen, von
     * Oktober bis Maerz. Haengt man sie hintereinander, entsteht eine
     * Reihenfolge, die es nie gab - und die Zahl haengt davon ab, welchen
     * Wettbewerb man zuerst einsortiert.
     *
     * Das ist nicht bloss unsauber, es erzeugt falsche Werte in BEIDE
     * Richtungen: Bei einem Spieler zerriss eine Niederlage aus dem parallel
     * laufenden Wettbewerb eine echte Serie von 15 ungeschlagenen Partien und
     * machte 12 daraus. Bei anderen verband sie zwei getrennte Laeufe zu einem
     * zu langen.
     *
     * Runden ohne Einsatz unterbrechen nicht: Wer aussetzt, verliert nichts.
     */
    function serien(zeilen) {
        const nachWettbewerb = new Map();
        zeilen.slice().sort((a, b) => a.ordnung - b.ordnung).forEach(z => {
            if (!nachWettbewerb.has(z.liga)) nachWettbewerb.set(z.liga, []);
            const folge = nachWettbewerb.get(z.liga);
            z.resultate.forEach(v => { if (v !== '') folge.push(zahl(v)); });
        });

        let siegBest = 0, ungBest = 0, anzahl = 0, siegeIn = '', ungIn = '';
        nachWettbewerb.forEach((folge, liga) => {
            let siegLauf = 0, ungLauf = 0;
            anzahl += folge.length;
            folge.forEach(v => {
                siegLauf = (v === 1) ? siegLauf + 1 : 0;
                ungLauf = (v > 0) ? ungLauf + 1 : 0;
                if (siegLauf > siegBest) { siegBest = siegLauf; siegeIn = liga; }
                if (ungLauf > ungBest) { ungBest = ungLauf; ungIn = liga; }
            });
        });

        /* Der Wettbewerb wird mitgeliefert und auch angezeigt. Er ist nicht
           Beiwerk, sondern erklaert die Zahl: Eine Serie gilt innerhalb eines
           Wettbewerbs, und wer das weiss, wundert sich nicht, warum ein Sieg
           aus der SMM die SGM-Serie nicht verlaengert hat. */
        return {
            siege: siegBest, siegeIn: siegeIn,
            ungeschlagen: ungBest, ungeschlagenIn: ungIn,
            anzahl: anzahl
        };
    }

    /** Liegt ein Jahr im eingestellten Zeitraum? */
    function imZeitraum(jahr) {
        if (filter.jahrVon !== 'alle' && jahr < filter.jahrVon) return false;
        if (filter.jahrBis !== 'alle' && jahr > filter.jahrBis) return false;
        return true;
    }

    /**
     * Schneidet eine Saisonzeile auf die Runden zu, die im gewaehlten
     * Kalenderzeitraum liegen - und rechnet ihre Bilanz neu.
     *
     * Das ist der eigentliche Unterschied zwischen den beiden Zeitmodi: Nach
     * Saison faellt eine Zeile ganz rein oder ganz raus. Nach Kalenderjahr
     * kann eine Saison auch halb zaehlen, weil ihre Runden auf zwei Jahre
     * verteilt sind. Die gespeicherten Summen taugen dann nicht mehr; sie
     * werden aus den Einzelresultaten neu gebildet.
     *
     * Gibt null zurueck, wenn keine einzige Runde im Zeitraum liegt.
     */
    function zeileZuschneiden_(z) {
        let punkte = 0, partien = 0, siege = 0, remis = 0, niederlagen = 0;
        const behalten = [], behaltenJahre = [], behaltenNummern = [];

        for (let i = 0; i < z.resultate.length; i++) {
            const v = z.resultate[i];
            if (v === '') continue;

            /* Fehlt zu einer Runde das Jahr - etwa weil saisons.csv noch nicht
               nachgezogen wurde -, gilt ersatzweise das Saisonjahr. Lieber ein
               grober Treffer als eine stillschweigend verschwundene Partie. */
            const jahr = z.rundenJahre[i] || z.jahr;
            if (!imZeitraum(jahr)) continue;

            const wert = zahl(v);
            behalten.push(v);
            /* Jahr und Rundennummer muessen MITWANDERN. Bliebe hier die
               vollstaendige Liste stehen, zeigte Index 0 der gekuerzten
               Resultate auf das Jahr der ersten Runde - und der Aktiv-Zeitraum
               waere im Kalendermodus verschoben. */
            behaltenJahre.push(jahr);
            behaltenNummern.push((z.rundenNummern || [])[i] || '');
            partien++; punkte += wert;
            if (wert === 1) siege++; else if (wert === 0.5) remis++; else niederlagen++;
        }

        if (!partien) return null;
        return {
            name: z.name, anzeige: z.anzeige, schluessel: z.schluessel,
            team: z.team, liga: z.liga, saison: z.saison,
            jahr: z.jahr, ordnung: z.ordnung,
            punkte: punkte, partien: partien,
            siege: siege, remis: remis, niederlagen: niederlagen,
            resultate: behalten, rundenJahre: behaltenJahre, rundenNummern: behaltenNummern
        };
    }

    /** Wendet die Filterleiste auf die Rohzeilen an. */
    function gefilterteZeilen() {
        const kalender = filter.zeitModus === 'kalender';
        const raus = [];

        ZEILEN.forEach(z => {
            if (filter.team !== 'alle' && z.team !== filter.team) return;
            if (filter.liga !== 'alle' && z.liga !== filter.liga) return;

            if (!kalender) {
                if (imZeitraum(z.jahr)) raus.push(z);
                return;
            }
            const zugeschnitten = zeileZuschneiden_(z);
            if (zugeschnitten) raus.push(zugeschnitten);
        });

        return raus;
    }

    /** Alle Jahre, die im aktuellen Modus als Grenze taugen. */
    function verfuegbareJahre(zeilen) {
        const menge = new Set();
        if (filter.zeitModus === 'kalender') {
            zeilen.forEach(z => z.resultate.forEach((v, i) => {
                if (v !== '') menge.add(z.rundenJahre[i] || z.jahr);
            }));
        } else {
            zeilen.forEach(z => menge.add(z.jahr));
        }
        return [...menge].filter(j => j > 0).sort((a, b) => a - b);
    }

    /**
     * Baut die Rangliste zur aktuellen Auswahl.
     *
     * Wichtig ist die Reihenfolge: Erst filtern, dann summieren, dann die
     * Mindestzahl an Partien pruefen. Andersherum fiele jemand heraus, der
     * insgesamt genug Partien hat, in der gewaehlten Liga aber wenige - und
     * genau das will die Mindestzahl ja aussagen.
     */
    function rangliste() {
        const nachPerson = new Map();
        gefilterteZeilen().forEach(z => {
            if (!nachPerson.has(z.schluessel)) nachPerson.set(z.schluessel, []);
            nachPerson.get(z.schluessel).push(z);
        });

        const liste = [];
        nachPerson.forEach((zeilen, sch) => {
            const person = SPIELER.find(s => s.schluessel === sch);
            if (!person) return;
            if (filter.nurMitglieder && !person.profil) return;

            const b = bilanz(zeilen);
            if (b.partien < filter.minPartien) return;
            liste.push({ person: person, zeilen: zeilen, b: b });
        });

        const richtung = sortAb ? -1 : 1;
        liste.sort((x, y) => {
            let d = 0;

            /* ══ GLEICHSTAND ══
               Jede Spalte braucht ihren eigenen zweiten Massstab, und zwar den,
               der in ihrem Sinn "besser" heisst:

                 Punkte gleich  -> WENIGER Partien ist besser. Wer 30 Punkte aus
                                   40 Partien holt, hat mehr geleistet als wer
                                   dafuer 60 gebraucht hat.
                 Partien gleich -> mehr Punkte ist besser.
                 Quote gleich   -> MEHR Partien ist besser: 75 % aus 40 Partien
                                   wiegen schwerer als 75 % aus 4.
                 Siege gleich   -> weniger Partien ist besser.

               Ein einziger gemeinsamer Massstab kann das nicht leisten - er
               waere fuer eine Spalte richtig und fuer die naechste verkehrt. */
            switch (sortSpalte) {
                case 'partien': d = (x.b.partien - y.b.partien) || (x.b.punkte - y.b.punkte); break;
                case 'quote':   d = (x.b.quote - y.b.quote) || (x.b.partien - y.b.partien); break;
                case 'siege':   d = (x.b.siege - y.b.siege) || (y.b.partien - x.b.partien); break;
                case 'name':    return x.person.anzeige.localeCompare(y.person.anzeige, 'de') * richtung;
                default:        d = (x.b.punkte - y.b.punkte) || (y.b.partien - x.b.partien);
            }

            // Die Richtung gilt auch fuer den zweiten Massstab: Dreht man die
            // Liste um, soll sie wirklich umgedreht sein und nicht halb.
            if (d !== 0) return d * richtung;

            // Letzte Instanz, bewusst NICHT umgedreht: Sie sorgt nur dafuer,
            // dass bei voelliger Gleichheit jeder Aufbau dieselbe Reihenfolge
            // ergibt - die Liste soll beim Filtern nicht zappeln.
            return x.person.anzeige.localeCompare(y.person.anzeige, 'de');
        });

        /* Der Rang wird HIER vergeben, vor der Suche. Sonst stuende beim
           Suchen des eigenen Namens "1. Platz" - man saehe den einzigen
           Treffer und nicht die eigene Platzierung. */
        liste.forEach((e, i) => { e.rang = i + 1; });
        return liste;
    }

    /**
     * Die Suche schraenkt die ANZEIGE ein, nicht die Wertung.
     *
     * Deshalb ist sie von rangliste() getrennt: Filter wie Mannschaft oder
     * Mindestpartien bestimmen, wer ueberhaupt gewertet wird - die Suche sagt
     * nur, wen man gerade sehen will.
     */
    function suchtreffer(liste) {
        const suche = filter.suche.trim().toLowerCase();
        if (!suche) return liste;
        return liste.filter(e =>
            e.person.anzeige.toLowerCase().indexOf(suche) >= 0
            || e.person.name.toLowerCase().indexOf(suche) >= 0);
    }

    /* ─── Bausteine fuer die Anzeige ──────────────────────────────────── */

    /* aria-hidden, weil das Bild nichts sagt, was der Name daneben nicht schon
       sagt. Ohne das liest eine Sprachausgabe bei fehlendem Bild erst die
       Initialen und dann denselben Namen noch einmal aus: "T H Tapio Hyötylä". */
    function avatarHTML(person, groesse) {
        const bild = person.profil && (person.profil.avatar || '').trim();
        const stil = 'width:' + groesse + 'px;height:' + groesse + 'px;';
        if (bild) {
            return '<span class="bl-avatar" aria-hidden="true" style="' + stil + 'background-image:url(\'' + entschaerfe(bild) + '\')"></span>';
        }
        return '<span class="bl-avatar bl-avatar-leer" aria-hidden="true" style="' + stil + 'font-size:' + Math.round(groesse * 0.38) + 'px">'
            + entschaerfe(initialen(person.anzeige)) + '</span>';
    }

    function teamBadges(teams) {
        return [...teams].sort().map(t =>
            '<span class="bl-team-badge" data-team="' + entschaerfe(t) + '">' + entschaerfe(t) + '</span>'
        ).join('');
    }

    /** Waagrechter Balken aus Sieg / Remis / Niederlage. */
    function bilanzBalken(b) {
        if (!b.partien) return '';
        const p = n => (n / b.partien * 100).toFixed(2) + '%';
        return '<span class="bl-bilanzbalken" title="' + b.siege + ' Siege · ' + b.remis + ' Remis · ' + b.niederlagen + ' Niederlagen">'
            + '<i class="bl-s" style="width:' + p(b.siege) + '"></i>'
            + '<i class="bl-r" style="width:' + p(b.remis) + '"></i>'
            + '<i class="bl-n" style="width:' + p(b.niederlagen) + '"></i>'
            + '</span>';
    }

    function zeitraumText(b) {
        if (!isFinite(b.von)) return '–';
        return b.von === b.bis ? String(b.von) : b.von + '–' + b.bis;
    }

    /* ─── Vereinsbilanz ───────────────────────────────────────────────── */

    function zeichneBilanz(liste) {
        /* Gerechnet wird aus den Zeilen DER GEWERTETEN PERSONEN, nicht aus
           allen gefilterten Zeilen.
           Der Unterschied sind die Filter, die je Person greifen statt je
           Zeile: "nur heutige Mitglieder" und die Mindestzahl an Partien.
           Zuvor stand hier die Summe aller Zeilen - die Spielerzahl sank beim
           Umschalten also, die Partien und Punkte blieben stehen. Vier Zahlen
           nebeneinander, von denen eine etwas anderes meint als die drei
           anderen: Das laedt zum Fehlschluss ein. */
        const zeilen = [];
        liste.forEach(e => e.zeilen.forEach(z => zeilen.push(z)));

        const gesamt = bilanz(zeilen);
        const kacheln = [
            { wert: liste.length, titel: 'Spielerinnen & Spieler', zeichen: '♟️' },
            { wert: gesamt.partien.toLocaleString('de-CH'), titel: 'Einzelpartien', zeichen: '⚔️' },
            { wert: punkteText(gesamt.punkte), titel: 'Brettpunkte', zeichen: '🏅' },
            { wert: gesamt.jahre.size, titel: 'Saisons', zeichen: '📅' }
        ];
        document.getElementById('bl-bilanz').innerHTML = kacheln.map(k =>
            '<div class="glass-card bl-bilanz-kachel">'
            + '<span class="bl-bilanz-zeichen">' + k.zeichen + '</span>'
            + '<span class="bl-bilanz-wert">' + k.wert + '</span>'
            + '<span class="bl-bilanz-titel">' + k.titel + '</span>'
            + '</div>').join('');
    }

    /* ─── Podest ──────────────────────────────────────────────────────── */

    function zeichnePodest(liste) {
        const ziel = document.getElementById('bl-podest');
        if (liste.length < 3) { ziel.innerHTML = ''; return; }

        /* Die Anordnung 2 – 1 – 3 ist die eines echten Siegerpodests: Der
           Erste steht in der Mitte und hoeher. Auf dem Handy wird daraus eine
           Spalte in der Reihenfolge 1 – 2 – 3 (siehe Stylesheet). */
        const platz = [liste[1], liste[0], liste[2]];
        const rang = [2, 1, 3];
        const medaille = { 1: '🥇', 2: '🥈', 3: '🥉' };

        ziel.innerHTML = platz.map((e, i) => {
            const r = rang[i];
            const q = e.b.quote.toFixed(0);
            return '<button type="button" class="glass-card bl-podest-platz bl-podest-' + r + '" data-spieler="' + entschaerfe(e.person.schluessel) + '">'
                + '<span class="bl-podest-medaille">' + medaille[r] + '</span>'
                + avatarHTML(e.person, r === 1 ? 104 : 80)
                + '<span class="bl-podest-name">' + entschaerfe(e.person.anzeige) + '</span>'
                + '<span class="bl-podest-punkte">' + punkteText(e.b.punkte) + ' <small>aus ' + e.b.partien + '</small></span>'
                + '<span class="bl-podest-quote">' + q + '&thinsp;%</span>'
                + '</button>';
        }).join('');
    }

    /* ─── Steuerung ───────────────────────────────────────────────────── */

    function knopfReihe(name, werte, aktiv, beschriftung) {
        return '<div class="bl-feld">'
            + '<span class="bl-feld-titel">' + beschriftung + '</span>'
            + '<div class="bl-knopfreihe" role="group" aria-label="' + beschriftung + '">'
            + werte.map(w =>
                '<button type="button" class="filter-btn' + (w.wert === aktiv ? ' active' : '') + '"'
                + ' data-filter="' + name + '" data-wert="' + entschaerfe(w.wert) + '">'
                + entschaerfe(w.text) + '</button>').join('')
            + '</div></div>';
    }

    function istZeitraumGesetzt() {
        return filter.jahrVon !== 'alle' || filter.jahrBis !== 'alle';
    }

    function zeichneSteuerung() {
        const teams = [...new Set(ZEILEN.map(z => z.team))].sort();
        const ligen = [...new Set(ZEILEN.map(z => z.liga))]
            .sort((a, b) => (LIGA_ORDNUNG[a] || 9) - (LIGA_ORDNUNG[b] || 9));

        /* Die Jahresliste richtet sich nach Mannschaft und Wettbewerb, aber
           NICHT nach dem Zeitraum selbst - sonst bliebe nach der ersten Wahl
           nur noch das eine Jahr uebrig und man saesse fest. */
        const basis = ZEILEN.filter(z =>
            (filter.team === 'alle' || z.team === filter.team) &&
            (filter.liga === 'alle' || z.liga === filter.liga));
        const jahrKarte = wettbewerbeJeJahr_(basis);
        const jahre = verfuegbareJahre(basis);           // aufsteigend
        const erstes = jahre.length ? jahre[0] : 0;
        const letztes = jahre.length ? jahre[jahre.length - 1] : 0;

        /* Wer erst 2007 waehlt und dann auf BMM umschaltet, haette sonst eine
           leere Liste vor sich und keinen sichtbaren Grund dafuer: Das gewaehlte
           Jahr gaebe es dort gar nicht.

           Statt stumpf auf 'alle' zurueckzufallen wird auf das naechstgelegene
           vorhandene Jahr gerueckt - die Absicht "ungefaehr dieser Zeitraum"
           bleibt damit erhalten. */
        const naechstes = (jahr, richtung) => {
            if (jahr === 'alle' || jahre.indexOf(jahr) >= 0) return jahr;
            if (!jahre.length) return 'alle';
            const passend = jahre.filter(j => richtung > 0 ? j >= jahr : j <= jahr);
            if (!passend.length) return 'alle';
            return richtung > 0 ? Math.min.apply(null, passend) : Math.max.apply(null, passend);
        };
        filter.jahrVon = naechstes(filter.jahrVon, 1);
        filter.jahrBis = naechstes(filter.jahrBis, -1);

        // Verdrehte Grenzen: still geraderuecken statt eine leere Liste zeigen.
        if (filter.jahrVon !== 'alle' && filter.jahrBis !== 'alle'
            && filter.jahrVon > filter.jahrBis) {
            const h = filter.jahrVon; filter.jahrVon = filter.jahrBis; filter.jahrBis = h;
        }

        LETZTE_JAHRE = jahre;

        const kalender = filter.zeitModus === 'kalender';
        const vonJahr = filter.jahrVon === 'alle' ? erstes : filter.jahrVon;
        const bisJahr = filter.jahrBis === 'alle' ? letztes : filter.jahrBis;
        const etikett = j => kalender ? String(j) : saisonEtikett(j);

        /* Der Regler arbeitet mit Positionen in der Jahresliste, nicht mit
           Jahreszahlen. Fehlt ein Jahr - 2020 hat wegen Corona keine SMM -,
           bliebe sonst eine tote Stelle in der Spur, an der der Griff haengt
           und nichts passiert. */
        const vonIdx = Math.max(0, jahre.indexOf(vonJahr));
        const bisIdx = Math.max(0, jahre.indexOf(bisJahr));
        const maxIdx = Math.max(0, jahre.length - 1);
        const prozent = i => maxIdx > 0 ? (i / maxIdx * 100) : 0;

        const spanneText = (vonJahr === bisJahr)
            ? etikett(vonJahr) + (kalender ? '' : ' · ' + (jahrKarte.get(vonJahr) || []).join(' · '))
            : etikett(vonJahr) + ' – ' + etikett(bisJahr)
              + '  (' + (bisIdx - vonIdx + 1) + (kalender ? ' Jahre' : ' Saisons') + ')';

        const mitglieder = SPIELER.filter(s => s.profil).length;

        const html =
            '<div class="bl-steuerung-oben">'
            + '<input type="search" id="bl-suche" class="bl-suche" placeholder="🔍 Name suchen…" value="' + entschaerfe(filter.suche) + '" aria-label="Spieler suchen">'
            + '<button type="button" id="bl-mitglieder" class="filter-btn bl-schalter' + (filter.nurMitglieder ? ' active' : '') + '"'
            + ' aria-pressed="' + (filter.nurMitglieder ? 'true' : 'false') + '"'
            + ' title="Blendet Spieler aus, die heute nicht mehr im Verein sind">'
            + '👥 Nur heutige Mitglieder <small>(' + mitglieder + ')</small></button>'
            + '</div>'

            + knopfReihe('team', [{ wert: 'alle', text: 'Alle Mannschaften' }]
                .concat(teams.map(t => ({ wert: t, text: t }))), filter.team, 'Mannschaft')

            + knopfReihe('liga', [{ wert: 'alle', text: 'Alle Wettbewerbe' }]
                .concat(ligen.map(l => ({ wert: l, text: l }))), filter.liga, 'Wettbewerb')

            + '<div class="bl-feld">'
            + '<div class="bl-zeit-kopf">'
            + '<span class="bl-feld-titel">Zeitraum</span>'
            + '<div class="bl-knopfreihe" role="group" aria-label="Zeitrechnung">'
            + '<button type="button" class="filter-btn bl-klein-knopf' + (kalender ? '' : ' active') + '"'
            + ' data-zeit="saison" title="Ganze Saisons. SGM 25/26, BMM 25/26 und SMM 26 gehören zusammen.">Saison</button>'
            + '<button type="button" class="filter-btn bl-klein-knopf' + (kalender ? ' active' : '') + '"'
            + ' data-zeit="kalender" title="Kalenderjahr der einzelnen Runde. Saisons werden dabei geteilt.">Kalenderjahr</button>'
            + '</div>'
            + (istZeitraumGesetzt()
                ? '<button type="button" class="bl-textknopf" id="bl-zeitraum-weg">zurücksetzen</button>' : '')
            + '</div>'

            + '<div class="bl-regler">'
            + '<span class="bl-regler-rand">' + entschaerfe(etikett(erstes)) + '</span>'
            /* Die Jahresliste steht am Element. Der Regler kennt nur
               Positionen; ohne diese Angabe waere von aussen - beim Prüfen
               oder beim Nachschauen in den Entwicklerwerkzeugen - nicht zu
               erkennen, welche Position welches Jahr meint. */
            + '<div class="bl-regler-spur" data-jahre="' + jahre.join(',') + '">'
            + '<span class="bl-regler-grund"></span>'
            + '<span class="bl-regler-aktiv" style="left:' + prozent(vonIdx).toFixed(2) + '%;'
            + 'width:' + (prozent(bisIdx) - prozent(vonIdx)).toFixed(2) + '%"></span>'
            + '<input type="range" id="bl-regler-von" class="bl-regler-griff" min="0" max="' + maxIdx + '" step="1"'
            + ' value="' + vonIdx + '" aria-label="Zeitraum ab">'
            + '<input type="range" id="bl-regler-bis" class="bl-regler-griff" min="0" max="' + maxIdx + '" step="1"'
            + ' value="' + bisIdx + '" aria-label="Zeitraum bis">'
            + '</div>'
            + '<span class="bl-regler-rand">' + entschaerfe(etikett(letztes)) + '</span>'
            + '</div>'
            + '<div class="bl-regler-abzeichen" id="bl-regler-abzeichen">' + entschaerfe(spanneText) + '</div>'

            + '<small class="bl-hinweis">'
            + (kalender
                ? 'Gezählt wird, was in diesen Kalenderjahren gespielt wurde – eine Saison kann dabei geteilt werden.'
                : 'Ein Saisonjahr endet im zweitgenannten Jahr; SGM, BMM und die SMM desselben Jahrgangs stehen zusammen.')
            + ' Beide Griffe aufeinander ergeben ein einzelnes Jahr.</small>'
            + '</div>'

            + '<div class="bl-feld bl-feld-schmal">'
            + '<label class="bl-unterfeld"><span class="bl-feld-titel">Mindestens</span>'
            + '<select id="bl-min" class="bl-select">'
            + [0, 5, 10, 25, 50, 100].map(m => '<option value="' + m + '"' + (filter.minPartien === m ? ' selected' : '') + '>'
                + (m === 0 ? 'Keine Mindestzahl' : 'ab ' + m + ' Partien') + '</option>').join('')
            + '</select></label>'
            + '</div>';

        document.getElementById('bl-steuerung').innerHTML = html;
    }

    /* ─── Rangliste ───────────────────────────────────────────────────── */

    const SPALTEN = [
        { id: 'punkte', text: 'Punkte' },
        { id: 'partien', text: 'Partien' },
        { id: 'quote', text: 'Erfolg' },
        { id: 'siege', text: 'Siege' },
        { id: 'name', text: 'Name' }
    ];

    function zeichneListe(sichtbar, volleListe) {
        const ziel = document.getElementById('bl-liste');
        const gesucht = filter.suche.trim() !== '';

        const zaehler = gesucht
            ? sichtbar.length + ' von ' + volleListe.length
            : volleListe.length + (volleListe.length === 1 ? ' Eintrag' : ' Einträge');

        const kopf = '<div class="bl-sortierleiste">'
            + '<span class="bl-feld-titel">Sortieren nach</span>'
            + SPALTEN.map(s =>
                '<button type="button" class="filter-btn' + (sortSpalte === s.id ? ' active' : '') + '" data-sort="' + s.id + '">'
                + s.text + (sortSpalte === s.id ? ' <span class="bl-pfeil">' + (sortAb ? '▼' : '▲') + '</span>' : '')
                + '</button>').join('')
            + '<span class="bl-treffer">' + zaehler + '</span>'
            + '</div>';

        if (!sichtbar.length) {
            ziel.innerHTML = kopf + '<div class="glass-card bl-leer">'
                + (gesucht ? 'Kein Name passt zu „' + entschaerfe(filter.suche.trim()) + '". '
                           : 'Für diese Auswahl gibt es keine Partien. ')
                + '<button type="button" class="bl-textknopf" id="bl-zuruecksetzen">Filter zurücksetzen</button></div>';
            return;
        }

        /* Der Massstab des Hintergrundbalkens kommt aus der GANZEN Liste.
           Waere er der Grösste der Suchtreffer, sähe jeder gesuchte Spieler
           aus wie der Spitzenreiter. */
        const maxPunkte = Math.max.apply(null, volleListe.map(e => e.b.punkte).concat([1]));
        const medaille = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const rangZaehlt = sortSpalte !== 'name';

        const zeilenHTML = sichtbar.map(e => {
            const r = e.rang;
            const b = e.b;
            /* Der Punkt hinter der Zahl macht aus "12" ein "12." - eine
               Platzierung statt irgendeiner Zahl. Beim Suchen ist das der
               eigentliche Zweck der Spalte. */
            const rangText = rangZaehlt ? (medaille[r] || (r + '.')) : '·';
            return '<button type="button" class="bl-zeile" data-spieler="' + entschaerfe(e.person.schluessel) + '">'
                + '<span class="bl-rang' + (rangZaehlt && r <= 3 ? ' bl-rang-podest' : '') + '"'
                + (rangZaehlt ? ' title="Platz ' + r + ' von ' + volleListe.length + '"' : '') + '>'
                + rangText + '</span>'
                + '<span class="bl-person">'
                + avatarHTML(e.person, 46)
                + '<span class="bl-person-text">'
                + '<span class="bl-name">' + entschaerfe(e.person.anzeige)
                + (e.person.profil ? '' : '<span class="bl-ehemalig" title="Kein aktuelles Profil - vermutlich ehemaliges Mitglied">·</span>')
                + '</span>'
                + '<span class="bl-teams">' + teamBadges(b.teams) + '</span>'
                + '</span></span>'
                + '<span class="bl-wert bl-wert-punkte"><b>' + punkteText(b.punkte) + '</b><small>Punkte</small></span>'
                + '<span class="bl-wert"><b>' + b.partien + '</b><small>Partien</small></span>'
                + '<span class="bl-quote">'
                + '<span class="bl-quote-zahl">' + b.quote.toFixed(0) + '&thinsp;%</span>'
                + '<span class="bl-quote-spur"><i style="width:' + b.quote.toFixed(2) + '%"></i></span>'
                + bilanzBalken(b)
                + '</span>'
                + '<span class="bl-zeitraum">' + zeitraumText(b) + '</span>'
                + '<span class="bl-sparklinie" aria-hidden="true" style="--anteil:'
                + (maxPunkte ? (b.punkte / maxPunkte * 100).toFixed(1) : 0) + '%"></span>'
                + '</button>';
        }).join('');

        ziel.innerHTML = kopf + '<div class="bl-tabelle">' + zeilenHTML + '</div>';
    }

    /* ─── Rekordtafel ─────────────────────────────────────────────────── */

    function zeichneRekorde(liste) {
        const ziel = document.getElementById('bl-rekorde');
        if (liste.length < 3) { ziel.innerHTML = ''; return; }

        const mitSerie = liste.map(e => ({ e: e, s: serien(e.zeilen) }));
        const quotenGrenze = Math.max(filter.minPartien, 20);
        const fuerQuote = liste.filter(e => e.b.partien >= quotenGrenze);

        const best = (arr, wert) => arr.slice().sort((a, b) => wert(b) - wert(a))[0];

        const rekorde = [];
        const punkteK = best(liste, e => e.b.punkte);
        if (punkteK) rekorde.push({ zeichen: '🏅', titel: 'Meiste Punkte', e: punkteK,
            wert: punkteText(punkteK.b.punkte), zusatz: 'aus ' + punkteK.b.partien + ' Partien' });

        const partienK = best(liste, e => e.b.partien);
        if (partienK) rekorde.push({ zeichen: '⚔️', titel: 'Meiste Partien', e: partienK,
            wert: String(partienK.b.partien), zusatz: zeitraumText(partienK.b) });

        const quoteK = best(fuerQuote, e => e.b.quote);
        if (quoteK) rekorde.push({ zeichen: '🎯', titel: 'Beste Quote', e: quoteK,
            wert: quoteK.b.quote.toFixed(0) + ' %', zusatz: 'ab ' + quotenGrenze + ' Partien gewertet' });

        const serieK = best(mitSerie, x => x.s.siege);
        if (serieK && serieK.s.siege > 1) rekorde.push({ zeichen: '🔥', titel: 'Längste Siegesserie', e: serieK.e,
            wert: serieK.s.siege + ' Siege', zusatz: 'in Folge in der ' + serieK.s.siegeIn });

        const treueK = best(liste, e => e.b.jahre.size);
        if (treueK) rekorde.push({ zeichen: '⏳', titel: 'Meiste Saisons', e: treueK,
            wert: treueK.b.jahre.size + ' Saisons', zusatz: zeitraumText(treueK.b) });

        ziel.innerHTML = '<h2 class="bl-abschnitt">Rekorde dieser Auswahl</h2>'
            + '<div class="bl-rekord-gitter">'
            + rekorde.map(r =>
                '<button type="button" class="glass-card bl-rekord" data-spieler="' + entschaerfe(r.e.person.schluessel) + '">'
                + '<span class="bl-rekord-kopf"><span class="bl-rekord-zeichen">' + r.zeichen + '</span>' + r.titel + '</span>'
                + '<span class="bl-rekord-wert">' + r.wert + '</span>'
                + '<span class="bl-rekord-person">' + avatarHTML(r.e.person, 30)
                + '<span class="bl-rekord-name">' + entschaerfe(r.e.person.anzeige) + '</span></span>'
                + '<span class="bl-rekord-zusatz">' + entschaerfe(r.zusatz) + '</span>'
                + '</button>').join('')
            + '</div>';
    }

    /* ─── Spielerfenster ──────────────────────────────────────────────── */

    /**
     * Beschriftet die Runden einer Saison.
     *
     * Zwei Eigenheiten stecken in den Rundennummern, und beide sehen wie
     * Fehler aus, wenn man sie nicht kennt:
     *
     *   Luecken   - Hat eine Mannschaft spielfrei, fehlt die Spalte ganz. Die
     *               SGM 21/22 von Rhy 1 besteht aus den Runden 2 bis 6.
     *   Doppelte  - In den frueheren BMM-Saisons wurde mit RUECKSPIEL gespielt.
     *               Runde 1 gibt es dann zweimal, Runde 2 zweimal und so fort.
     *
     * Die zweite wird hier ausgeschrieben: Aus zwei Kreisen mit "Runde 1" wird
     * "Runde 1 · Hinrunde" und "Runde 1 · Rückrunde". Die Reihenfolge der
     * Spalten ist die zeitliche, also ist die erste Nennung das Hinspiel.
     */
    function rundenEtiketten_(nummern) {
        const gesamt = {};
        nummern.forEach(n => { gesamt[n] = (gesamt[n] || 0) + 1; });

        const lauf = {};
        return nummern.map(n => {
            lauf[n] = (lauf[n] || 0) + 1;
            if (gesamt[n] < 2) return 'Runde ' + n;
            if (gesamt[n] === 2) return 'Runde ' + n + ' · ' + (lauf[n] === 1 ? 'Hinrunde' : 'Rückrunde');
            return 'Runde ' + n + ' · ' + lauf[n] + '. Begegnung';
        });
    }

    /**
     * Die Runden einer Saison als farbige Punkte.
     *
     * Die Rundennummer kommt aus saisons.csv, nicht aus der Position:
     * "Der vierte Punkt" kann Runde 5 sein.
     */
    function resultatPunkte(z) {
        const etiketten = rundenEtiketten_(z.rundenNummern || []);
        return z.resultate.map((v, i) => {
            const runde = etiketten[i] || ((i + 1) + '. Runde');
            if (v === '') {
                return '<i class="bl-punkt bl-punkt-frei" title="' + runde + ' · nicht gespielt"></i>';
            }
            const n = zahl(v);
            const k = n === 1 ? 'bl-punkt-s' : (n === 0.5 ? 'bl-punkt-r' : 'bl-punkt-n');
            const t = n === 1 ? 'Sieg' : (n === 0.5 ? 'Remis' : 'Niederlage');
            return '<i class="bl-punkt ' + k + '" title="' + runde + ' · ' + t + '"></i>';
        }).join('');
    }

    /* Das Fenster bringt seinen EIGENEN Filter mit, unabhaengig von dem der
       Seite. Wer auf einen Namen klickt, will die Person sehen - nicht noch
       einmal die Auswahl, die er draussen getroffen hat. Drinnen kann er dann
       nach Wettbewerb und Mannschaft einschraenken, und zwar so, dass ALLES
       mitgeht: Kennzahlen, Bestmarken, Verlauf und Tabelle. */
    let MODAL_SPIELER = null;
    const modalFilter = { liga: 'alle', team: 'alle' };

    window.openSpielerModal = function (sch) {
        const person = SPIELER.find(s => s.schluessel === sch);
        if (!person) return;

        MODAL_SPIELER = person;
        modalFilter.liga = 'alle';
        modalFilter.team = 'alle';
        zeichneSpielerModal_();

        const fenster = document.getElementById('spieler-modal');
        fenster.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        const zu = fenster.querySelector('.close-btn');
        if (zu) zu.focus();
    };

    function zeichneSpielerModal_() {
        const person = MODAL_SPIELER;
        if (!person) return;

        const ganzeLaufbahn = person.zeilen;

        /* Die Auswahlmoeglichkeiten haengen voneinander ab: Unter den
           Wettbewerben stehen nur die, die zur gewaehlten Mannschaft passen,
           und umgekehrt. Sonst koennte man "SGM" und "Rhf 1" zugleich waehlen
           - eine Mannschaft, die nie SGM gespielt hat - und saesse vor einer
           leeren Tabelle ohne erkennbaren Grund. */
        const passtTeam = z => modalFilter.team === 'alle' || z.team === modalFilter.team;
        const passtLiga = z => modalFilter.liga === 'alle' || z.liga === modalFilter.liga;

        /* Die Knoepfe entstehen aus der GANZEN Laufbahn, nicht aus dem gerade
           sichtbaren Ausschnitt.
           Zuvor wurden sie aus dem Ausschnitt gebaut - mit der Folge, dass die
           Mannschaftsreihe verschwand, sobald ein Wettbewerb gewaehlt war, in
           dem die Person nur fuer eine Mannschaft spielte. Die Leiste sprang,
           und wer zurueckwollte, suchte einen Knopf, den es nicht mehr gab.
           Jetzt steht die Reihe still; unmoegliche Kombinationen sind
           abgeblendet statt entfernt. */
        const ligen = [...new Set(ganzeLaufbahn.map(z => z.liga))]
            .sort((a, b2) => (LIGA_ORDNUNG[a] === undefined ? 9 : LIGA_ORDNUNG[a])
                           - (LIGA_ORDNUNG[b2] === undefined ? 9 : LIGA_ORDNUNG[b2]));
        const teams = [...new Set(ganzeLaufbahn.map(z => z.team))].sort();

        /* Waehlbar ist, was zusammen mit der ANDEREN Auswahl noch Zeilen
           uebrig laesst. Die gerade aktive Wahl bleibt immer waehlbar, sonst
           koennte man sie nicht mehr verlassen. */
        const ligaMoeglich = l => l === modalFilter.liga
            || ganzeLaufbahn.some(z => z.liga === l && passtTeam(z));
        const teamMoeglich = t => t === modalFilter.team
            || ganzeLaufbahn.some(z => z.team === t && passtLiga(z));

        const alle = ganzeLaufbahn.filter(z => passtLiga(z) && passtTeam(z));
        const eingeschraenkt = alle.length !== ganzeLaufbahn.length;

        const b = bilanz(alle);
        const s = serien(alle);
        const p = person.profil || {};

        const nachJahr = new Map();
        alle.forEach(z => {
            if (!nachJahr.has(z.jahr)) nachJahr.set(z.jahr, []);
            nachJahr.get(z.jahr).push(z);
        });
        const jahre = [...nachJahr.keys()].sort((a, b2) => a - b2);
        const jahrBilanz = jahre.map(j => ({ jahr: j, b: bilanz(nachJahr.get(j)) }));
        const maxJahrPunkte = Math.max.apply(null, jahrBilanz.map(x => x.b.punkte).concat([1]));

        /* ZWEI Bestmarken statt einer, weil "beste Saison" zwei verschiedene
           Dinge heissen kann und beide berechtigt sind:

             Ertragreichste - die groesste Ausbeute. Misst aber zu einem guten
                              Teil, wann jemand am meisten Zeit hatte.
             Staerkste      - die beste Quote. Misst die Leistung, braucht aber
                              eine Mindestzahl an Partien, um nicht zur
                              Zufallsanzeige zu werden.

           Sie zu einer Zahl zu verrechnen hiesse, sich fuer eine Aussage zu
           entscheiden und die andere stillschweigend zu verlieren. Nennen sie
           dieselbe Saison, faellt die zweite Angabe ohnehin weg. */
        const ertragreichste = jahrBilanz.slice()
            .sort((x, y) => (y.b.punkte - x.b.punkte) || (y.b.quote - x.b.quote))[0];

        const staerkste = jahrBilanz
            .filter(x => x.b.partien >= SAISON_MINDESTPARTIEN)
            .sort((x, y) => (y.b.quote - x.b.quote) || (y.b.partien - x.b.partien))[0];

        /* Und eine dritte Ebene darunter: die beste EINZELNE Wettbewerbssaison.
           "Staerkste Saison" zaehlt SGM, SMM und BMM eines Jahrgangs zusammen -
           ein starker Lauf in einem Wettbewerb kann dort von einem schwachen
           im anderen aufgezehrt werden. Diese Marke zeigt ihn trotzdem. */
        const einzel = alle
            .filter(z => z.partien >= SAISON_MINDESTPARTIEN)
            .map(z => ({ z: z, quote: z.punkte / z.partien * 100 }))
            .sort((x, y) => (y.quote - x.quote) || (y.z.partien - x.z.partien))[0];

        /* Nur zeigen, wenn sie etwas Neues sagt: Hatte ein Saisonjahr ohnehin
           nur einen Wettbewerb, ist die Einzelbilanz dieselbe Zahl unter
           anderem Namen. */
        const einzelLohnt = !!einzel && !(staerkste
            && einzel.z.jahr === staerkste.jahr
            && einzel.z.partien === staerkste.b.partien
            && einzel.z.punkte === staerkste.b.punkte);

        const saisonText = x => saisonEtikett(x.jahr) + ' · ' + punkteText(x.b.punkte)
            + ' aus ' + x.b.partien + ' (' + x.b.quote.toFixed(0) + ' %)';

        /* Welche Wettbewerbe DIESE Person in dem Jahr gespielt hat - nicht,
           welche es gab. "11½ aus 19" erklaert sich damit von selbst. */
        const wettbewerbeDesJahres = jahr => {
            const zs = (nachJahr.get(jahr) || []).slice().sort((x, y) => x.ordnung - y.ordnung);
            return [...new Set(zs.map(wettbewerbEtikett))].join(' · ');
        };

        const merkmale = [];
        if ((p.elo || '').trim()) merkmale.push('ELO ' + entschaerfe(p.elo));
        if ((p.dwz || '').trim()) merkmale.push('DWZ ' + entschaerfe(p.dwz));
        if ((p.rolle || '').trim()) merkmale.push(entschaerfe(p.rolle));

        const kennzahl = (wert, titel) =>
            '<div class="bl-kennzahl"><b>' + wert + '</b><span>' + titel + '</span></div>';

        const verlauf = '<div class="bl-verlauf" role="img" aria-label="Punkte je Saison">'
            + jahrBilanz.map(x =>
                '<span class="bl-verlauf-saeule" title="' + saisonEtikett(x.jahr) + ': '
                + punkteText(x.b.punkte) + ' aus ' + x.b.partien + ' (' + x.b.quote.toFixed(0) + ' %)'
                + '&#10;' + entschaerfe(wettbewerbeDesJahres(x.jahr)) + '">'
                + '<i style="height:' + Math.max(4, x.b.punkte / maxJahrPunkte * 100).toFixed(1) + '%"></i>'
                + '<small>' + String(x.jahr).slice(2) + '</small></span>').join('')
            + '</div>';

        const saisonZeilen = alle.slice().sort((x, y) => y.ordnung - x.ordnung).map(z =>
            '<tr>'
            + '<td class="bl-td-saison">' + entschaerfe(z.liga) + ' ' + entschaerfe(z.saison) + '</td>'
            + '<td>' + entschaerfe(z.team) + '</td>'
            + '<td class="bl-td-zahl bl-td-stark">' + punkteText(z.punkte) + '</td>'
            + '<td class="bl-td-zahl bl-td-leise">' + z.partien + '</td>'
            + '<td class="bl-td-zahl">' + (z.partien ? Math.round(z.punkte / z.partien * 100) : 0) + '&thinsp;%</td>'
            + '<td><span class="bl-punkte-reihe">' + resultatPunkte(z) + '</span></td>'
            + '</tr>').join('');

        document.getElementById('spieler-modal-body').innerHTML =
            '<div class="bl-modal-kopf">'
            + avatarHTML(person, 96)
            + '<div>'
            + '<h2 class="bl-modal-name">' + entschaerfe(person.anzeige) + '</h2>'
            + (merkmale.length ? '<p class="bl-modal-merkmale">' + merkmale.join(' · ') + '</p>' : '')
            + '<p class="bl-modal-teams">' + teamBadges(b.teams) + '</p>'
            + '</div></div>'

            + modalFilterLeiste_(
                { werte: ligen, aktiv: modalFilter.liga, moeglich: ligaMoeglich },
                { werte: teams, aktiv: modalFilter.team, moeglich: teamMoeglich },
                eingeschraenkt, alle.length, ganzeLaufbahn.length)

            + '<div class="bl-kennzahlen">'
            + kennzahl(punkteText(b.punkte), 'Punkte')
            + kennzahl(b.partien, 'Partien')
            + kennzahl(b.quote.toFixed(0) + ' %', 'Erfolg')
            + kennzahl(b.jahre.size, 'Saisons')
            + '</div>'

            + '<div class="bl-modal-bilanz">'
            + '<span class="bl-modal-bilanz-text">' + b.siege + ' Siege · ' + b.remis + ' Remis · ' + b.niederlagen + ' Niederlagen</span>'
            + bilanzBalken(b) + '</div>'

            + '<div class="bl-modal-fakten">'
            + '<span>🗓️ Aktiv ' + zeitraumText(b) + '</span>'
            + (ertragreichste ? '<span title="Grösste Punktausbeute · ' + entschaerfe(wettbewerbeDesJahres(ertragreichste.jahr)) + '">'
                + '⭐ Ertragreichste Saison ' + saisonText(ertragreichste)
                + '<small class="bl-chip-zusatz">' + entschaerfe(wettbewerbeDesJahres(ertragreichste.jahr)) + '</small></span>' : '')
            + (staerkste && ertragreichste && staerkste.jahr !== ertragreichste.jahr
                ? '<span title="Beste Quote eines Saisonjahres – alle Wettbewerbe zusammen, ab '
                  + SAISON_MINDESTPARTIEN + ' Partien · ' + entschaerfe(wettbewerbeDesJahres(staerkste.jahr)) + '">'
                  + '🎯 Stärkste Saison ' + saisonText(staerkste)
                  + '<small class="bl-chip-zusatz">' + entschaerfe(wettbewerbeDesJahres(staerkste.jahr)) + '</small></span>' : '')
            + (einzelLohnt ? '<span title="Beste Quote in EINEM Wettbewerb einer Saison, ab '
                  + SAISON_MINDESTPARTIEN + ' Partien. Die stärkste Saison zählt dagegen alle Wettbewerbe eines Jahrgangs zusammen.">'
                  + '🏆 Stärkste Bilanz ' + entschaerfe(wettbewerbEtikett(einzel.z))
                  + ' · ' + punkteText(einzel.z.punkte) + ' aus ' + einzel.z.partien
                  + ' (' + einzel.quote.toFixed(0) + '\u2009%)'
                  + '<small class="bl-chip-zusatz">' + entschaerfe(einzel.z.team) + '</small></span>' : '')
            + (s.siege > 1 ? '<span title="Aufeinanderfolgende Runden im selben Wettbewerb, über die Saisons hinweg">'
                + '🔥 ' + s.siege + ' Siege in Folge'
                + '<small class="bl-chip-zusatz">in der ' + entschaerfe(s.siegeIn) + '</small></span>' : '')
            + (s.ungeschlagen > 2 ? '<span title="Ohne Niederlage – Remis zählen mit. Innerhalb eines Wettbewerbs, über die Saisons hinweg">'
                + '🛡️ ' + s.ungeschlagen + ' Partien ungeschlagen'
                + '<small class="bl-chip-zusatz">in der ' + entschaerfe(s.ungeschlagenIn) + '</small></span>' : '')
            + '</div>'

            + '<h3 class="bl-modal-unterschrift">Punkte je Saison</h3>'
            + verlauf

            + '<h3 class="bl-modal-unterschrift">'
            + (eingeschraenkt ? 'Ausgewählte Saisons (' + alle.length + ' von ' + ganzeLaufbahn.length + ')'
                              : 'Alle Saisons')
            + '</h3>'
            + '<div class="bl-modal-tabelle-rahmen"><table class="bl-modal-tabelle">'
            /* Punkte und Partien als ZWEI Spalten, nicht als "3½ / 7".
               Der Schrägstrich sah kompakter aus, stand aber in jeder Zeile
               woanders: Jede Zelle richtete sich für sich aus, und "3½" ist
               breiter als "1". Zwei Spalten richtet die Tabelle selbst aus -
               das kann gar nicht verrutschen. */
            + '<thead><tr><th>Wettbewerb</th><th>Team</th>'
            + '<th class="bl-td-zahl">Punkte</th><th class="bl-td-zahl">Partien</th>'
            + '<th class="bl-td-zahl">Quote</th><th>Runden</th></tr></thead>'
            + '<tbody>' + saisonZeilen + '</tbody></table></div>';
    }

    /**
     * Die Knopfreihen im Spielerfenster.
     *
     * Ein fester Aufbau, damit nichts springt: links die Beschriftung, rechts
     * die Knoepfe. Werden es mehr Mannschaften, umbrechen sie innerhalb ihrer
     * eigenen Spalte - die Beschriftung bleibt stehen und die zweite Reihe
     * rutscht nicht neben die erste.
     *
     * Eine Reihe mit einem einzigen Knopf entfaellt ganz: Wer nie fuer eine
     * zweite Mannschaft gespielt hat, braucht keine Mannschaftswahl. Das ist
     * eine Eigenschaft der Person und aendert sich waehrend des Filterns
     * nicht - die Leiste bleibt also trotzdem still.
     */
    function modalFilterLeiste_(liga, team, eingeschraenkt, sichtbar, gesamt) {
        const reihe = (name, feld, beschriftung) => {
            if (feld.werte.length < 2) return '';

            const knopf = (wert, text) => {
                const aktiv = wert === feld.aktiv;
                const geht = wert === 'alle' || feld.moeglich(wert);
                return '<button type="button" class="filter-btn bl-klein-knopf'
                    + (aktiv ? ' active' : '') + (geht ? '' : ' bl-knopf-blass') + '"'
                    + ' data-mfilter="' + name + '" data-wert="' + entschaerfe(wert) + '"'
                    + (geht ? '' : ' disabled title="Diese Auswahl gibt es nicht zusammen mit der anderen"')
                    + '>' + entschaerfe(text) + '</button>';
            };

            return '<div class="bl-mf-reihe" role="group" aria-label="' + beschriftung + '">'
                + '<span class="bl-mf-titel">' + beschriftung + '</span>'
                + '<div class="bl-mf-knoepfe">'
                + knopf('alle', 'Alle')
                + feld.werte.map(x => knopf(x, x)).join('')
                + '</div></div>';
        };

        const inhalt = reihe('liga', liga, 'Wettbewerb') + reihe('team', team, 'Mannschaft');
        if (!inhalt) return '';

        return '<div class="bl-modal-filter">' + inhalt
            + (eingeschraenkt
                ? '<div class="bl-mf-fuss"><button type="button" class="bl-textknopf" data-mfilter="weg" data-wert="alle">'
                  + 'alles zeigen (' + sichtbar + ' von ' + gesamt + ')</button></div>'
                : '')
            + '</div>';
    }

    window.closeSpielerModal = function () {
        document.getElementById('spieler-modal').classList.add('hidden');
        document.body.style.overflow = '';
    };

    /* ─── Alles neu zeichnen ──────────────────────────────────────────── */

    /**
     * Die Suche betrifft NUR die Rangliste.
     *
     * Podest, Vereinsbilanz und Rekordtafel beschreiben die gewaehlte Wertung
     * als Ganzes. Wuerden sie sich mit jedem Tastendruck im Suchfeld
     * mitaendern, stuende beim Suchen des eigenen Namens die eigene Person auf
     * dem Podest und haette jeden Rekord inne - eine Aussage, die niemand so
     * gemeint hat.
     */
    function zeichne() {
        const volle = rangliste();
        const sichtbar = suchtreffer(volle);
        zeichneBilanz(volle);
        zeichnePodest(volle);
        zeichneListe(sichtbar, volle);
        zeichneRekorde(volle);
    }

    function zeichneAlles() {
        zeichneSteuerung();
        zeichne();
    }

    /* ─── Bedienung ───────────────────────────────────────────────────── */

    /**
     * Ein Griff des Schiebereglers wurde bewegt.
     *
     * Zwei Regler liegen uebereinander. Zieht man den linken ueber den rechten
     * hinaus, wird der andere mitgenommen statt die Bewegung zu blockieren -
     * sonst fuehlt sich der Regler an, als klemme er.
     *
     * Neu gezeichnet wird hier NUR die Liste, nicht die Bedienleiste: Baute
     * man sie mitten in der Bewegung neu auf, verlöre der Griff den Kontakt
     * zum Finger. Der vollstaendige Aufbau folgt beim Loslassen (change).
     */
    function reglerBewegt_(ausloeser) {
        const von = document.getElementById('bl-regler-von');
        const bis = document.getElementById('bl-regler-bis');
        if (!von || !bis) return;

        let a = parseInt(von.value, 10);
        let b = parseInt(bis.value, 10);
        if (a > b) {
            if (ausloeser === von) { b = a; bis.value = String(b); }
            else { a = b; von.value = String(a); }
        }

        const jahre = LETZTE_JAHRE;
        if (!jahre.length) return;

        /* Ein Griff ganz aussen heisst "keine Grenze", nicht "genau dieses
           Jahr". Der Unterschied faellt erst spaeter auf: Merkte sich die
           Seite hier die konkrete Jahreszahl, dann rueckte die Grenze beim
           Wechsel auf eine Mannschaft, die spaeter anfaengt, mit nach vorn -
           und kehrte nicht mehr zurueck, wenn man wieder alle Mannschaften
           waehlte. Die Liste blieb dann ohne erkennbaren Grund beschnitten. */
        filter.jahrVon = (a <= 0) ? 'alle' : jahre[Math.min(a, jahre.length - 1)];
        filter.jahrBis = (b >= jahre.length - 1) ? 'alle' : jahre[Math.min(b, jahre.length - 1)];

        const maxIdx = Math.max(1, jahre.length - 1);
        const balken = document.getElementById('bl-regler-aktiv');
        if (balken) {
            balken.style.left = (a / maxIdx * 100).toFixed(2) + '%';
            balken.style.width = ((b - a) / maxIdx * 100).toFixed(2) + '%';
        }

        const kalender = filter.zeitModus === 'kalender';
        const etikett = j => kalender ? String(j) : saisonEtikett(j);
        const abzeichen = document.getElementById('bl-regler-abzeichen');
        if (abzeichen) {
            abzeichen.textContent = (a === b)
                ? etikett(jahre[a])
                : etikett(jahre[a]) + ' – ' + etikett(jahre[b])
                  + '  (' + (b - a + 1) + (kalender ? ' Jahre' : ' Saisons') + ')';
        }

        zeichne();
    }

    function hoereZu() {
        /* Ein Zuhoerer statt einer Handvoll: Die Inhalte werden staendig neu
           aufgebaut, einzeln angehaengte Zuhoerer waeren nach jedem Filter
           wieder weg. */
        document.addEventListener('click', function (ev) {
            const ziel = ev.target;

            const filterKnopf = ziel.closest && ziel.closest('[data-filter]');
            if (filterKnopf) {
                const feld = filterKnopf.getAttribute('data-filter');
                filter[feld] = filterKnopf.getAttribute('data-wert');
                zeichneAlles();
                return;
            }

            const sortKnopf = ziel.closest && ziel.closest('[data-sort]');
            if (sortKnopf) {
                const sp = sortKnopf.getAttribute('data-sort');
                /* Derselbe Knopf noch einmal dreht die Richtung um. Ein neuer
                   Knopf beginnt mit der Richtung, die man erwartet: Zahlen
                   absteigend (die Besten oben), Namen aufsteigend. */
                if (sortSpalte === sp) sortAb = !sortAb;
                else { sortSpalte = sp; sortAb = sp !== 'name'; }
                zeichne();
                return;
            }

            const teamBadge = ziel.closest && ziel.closest('.bl-team-badge');
            if (teamBadge && !ziel.closest('#spieler-modal')) {
                ev.preventDefault();
                ev.stopPropagation();
                filter.team = teamBadge.getAttribute('data-team');
                zeichneAlles();
                window.scrollTo({ top: document.getElementById('bl-liste').offsetTop - 120, behavior: 'smooth' });
                return;
            }

            /* Vor dem Spielerknopf pruefen: Die Filterknoepfe liegen IM
               Fenster, und dort darf ein Klick nicht als "Person oeffnen"
               durchgehen. */
            const modalKnopf = ziel.closest && ziel.closest('[data-mfilter]');
            if (modalKnopf) {
                /* Browser unterdruecken den Klick auf ein disabled-Element von
                   selbst. Darauf zu bauen genuegt hier nicht: Der Zuhoerer
                   haengt am Dokument, und ein Klick, der auf anderem Weg
                   hereinkommt, faende sonst eine Auswahl vor, die es gar nicht
                   gibt - die Tabelle waere leer ohne erkennbaren Grund. */
                if (modalKnopf.disabled) return;

                const feld = modalKnopf.getAttribute('data-mfilter');
                if (feld === 'weg') { modalFilter.liga = 'alle'; modalFilter.team = 'alle'; }
                else modalFilter[feld] = modalKnopf.getAttribute('data-wert');
                zeichneSpielerModal_();
                return;
            }

            const person = ziel.closest && ziel.closest('[data-spieler]');
            if (person) { window.openSpielerModal(person.getAttribute('data-spieler')); return; }

            if (ziel.id === 'bl-mitglieder' || (ziel.closest && ziel.closest('#bl-mitglieder'))) {
                filter.nurMitglieder = !filter.nurMitglieder;
                zeichneAlles();
                return;
            }

            const zeitKnopf = ziel.closest && ziel.closest('[data-zeit]');
            if (zeitKnopf) {
                const modus = zeitKnopf.getAttribute('data-zeit');
                if (modus !== filter.zeitModus) {
                    filter.zeitModus = modus;
                    /* Die Grenzen bleiben stehen: 2020 heisst in beiden Modi
                       2020, nur die Zuordnung der Partien aendert sich. Wer
                       "2023 bis 2025" eingestellt hat und umschaltet, will
                       genau diese Jahre anders gerechnet sehen. */
                    zeichneAlles();
                }
                return;
            }

            if (ziel.id === 'bl-zeitraum-weg') {
                filter.jahrVon = 'alle'; filter.jahrBis = 'alle';
                zeichneAlles();
                return;
            }

            if (ziel.id === 'bl-zuruecksetzen') {
                filter.suche = ''; filter.team = 'alle'; filter.liga = 'alle';
                filter.jahrVon = 'alle'; filter.jahrBis = 'alle';
                filter.minPartien = 0; filter.nurMitglieder = false;
                zeichneAlles();
            }
        });

        document.addEventListener('input', function (ev) {
            if (ev.target.id === 'bl-suche') {
                filter.suche = ev.target.value;
                zeichne();   // die Steuerung bleibt stehen, sonst verliert das Feld den Fokus
                return;
            }
            if (ev.target.id === 'bl-regler-von' || ev.target.id === 'bl-regler-bis') {
                reglerBewegt_(ev.target);
            }
        });

        document.addEventListener('change', function (ev) {
            if (ev.target.id === 'bl-min') {
                filter.minPartien = parseInt(ev.target.value, 10) || 0;
                zeichne();
            } else if (ev.target.id === 'bl-regler-von' || ev.target.id === 'bl-regler-bis') {
                /* Erst wenn der Griff losgelassen wird, wird die Leiste neu
                   aufgebaut. Waehrend des Ziehens wuerde das den Griff unter
                   dem Finger wegziehen. */
                zeichneAlles();
            }
        });

        document.addEventListener('keydown', function (ev) {
            if (ev.key !== 'Escape') return;
            const f = document.getElementById('spieler-modal');
            if (f && !f.classList.contains('hidden')) window.closeSpielerModal();
        });
    }

    /** "a, b und c" - eine Aufzaehlung, wie man sie spricht. */
    function aufzaehlung_(teile) {
        if (teile.length <= 1) return teile.join('');
        return teile.slice(0, -1).join(', ') + ' und ' + teile[teile.length - 1];
    }

    /**
     * Der Untertitel nennt die Mannschaften - und zwar die, die WIRKLICH in
     * den Daten stehen.
     *
     * Fest im HTML stand dort "für Rhy 1, Rhy 2, Rhf 1 und Rhf 2". Das stimmt
     * genau so lange, bis eine dritte Mannschaft dazukommt, und dann stimmt es
     * still nicht mehr: Die Seite zeigt die neue Mannschaft in jeder Liste,
     * behauptet oben aber weiter, es gaebe sie nicht.
     *
     * Ab fuenf Mannschaften wird aus der Aufzaehlung eine Zahl - sonst
     * verdraengt sie den Rest des Satzes.
     */
    function zeichneUntertitel_() {
        const ziel = document.getElementById('bl-untertitel');
        if (!ziel) return;

        const teams = [...new Set(ZEILEN.map(z => z.team))].sort();
        if (!teams.length) return;

        const wer = teams.length <= 4
            ? 'für ' + aufzaehlung_(teams)
            : 'für unsere ' + teams.length + ' Mannschaften';

        const g = bilanz(ZEILEN);
        ziel.textContent = 'Jede Partie, die ' + wer + ' gespielt wurde – '
            + 'zusammengezählt über ' + g.jahre.size + ' Saisons seit ' + g.von + '.';
    }

    /* ─── Start ───────────────────────────────────────────────────────── */

    /* Einmal ist genug.
       Ein zweites DOMContentLoaded - etwa weil die Datei doppelt eingebunden
       wird - haette sonst alle Daten ein zweites Mal geladen UND die Zuhoerer
       ein zweites Mal angehaengt. Jeder Klick auf "sortieren" zaehlte dann
       doppelt und drehte die Richtung sofort wieder zurueck. */
    let gestartet = false;

    document.addEventListener('DOMContentLoaded', async function () {
        if (gestartet) return;
        gestartet = true;

        const liste = document.getElementById('bl-liste');
        liste.innerHTML = '<div class="glass-card bl-leer">Lade Bestenliste…</div>';
        try {
            await laden();
        } catch (e) {
            console.error('Bestenliste konnte nicht geladen werden:', e);
            liste.innerHTML = '<div class="glass-card bl-leer">Die Bestenliste konnte nicht geladen werden. '
                + 'Bitte später erneut versuchen.</div>';
            return;
        }

        if (!ZEILEN.length) {
            liste.innerHTML = '<div class="glass-card bl-leer">Es liegen noch keine Ergebnisse vor.</div>';
            return;
        }

        zeichneAlles();
        hoereZu();
        zeichneUntertitel_();

        const g = bilanz(ZEILEN);
        document.getElementById('bl-quelle').textContent =
            'Grundlage: ' + ZEILEN.length + ' Saisonbilanzen aus den Mannschaftsmeisterschaften '
            + zeitraumText(g) + '. Ein Sieg zählt 1 Punkt, ein Remis ½.';
    });

})();
