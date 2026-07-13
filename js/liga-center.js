/**
 * ssb-liga-center.js
 * Vanilla JS Logik für das SSB Liga-Center
 * Unterstützt hierarchische Filterung nach Turnier, Saison und Liga aus ssb_spiele.csv und ssb_brett_details.csv
 */

let rawSpieleRows = [];
let rawBrettRows = [];
let aktuelleSpiele = [];
let aktuelleBretter = [];
let showAllTopscorers = false;

let ligaRunden = {};
let teamSpielerDaten = {};
const rundenNamen = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R12"];
let maxAnzahlRunden = 7;
let maxGespielteRunden = 0;

let chartTeamsInstance = null;
let chartPlayerInstance = null;

let isFirstLoad = true;

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function getRowVal(row, ...cols) {
    if (!row) return "";
    for (let c of cols) {
        if (row[c] !== undefined && row[c] !== null && row[c].toString().trim() !== '') return row[c];
    }
    const rowKeys = Object.keys(row);
    for (let c of cols) {
        const targetClean = String(c).toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
        for (let key of rowKeys) {
            const keyClean = String(key).toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
            if (keyClean === targetClean) {
                const val = row[key];
                if (val !== undefined && val !== null && val.toString().trim() !== '') return val;
            }
        }
    }
    return "";
}

function parseCleanNumber(val) {
    if (!val || val === '-') return 0;
    const cleaned = val.toString().replace(/[="]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function parsePlayerResult(resStr, isHeim) {
    if (!resStr || resStr === '-') return null;
    let cleaned = resStr.toString().replace(/[=" ]/g, '').replace(/½/g, '0.5').replace(/,/g, '.').trim();
    if (cleaned === '1-0') return { punkte: isHeim ? 1.0 : 0, isForfait: false };
    if (cleaned === '0-1') return { punkte: isHeim ? 0 : 1.0, isForfait: false };
    if (cleaned === '0.5-0.5') return { punkte: 0.5, isForfait: false };
    if (cleaned === '+--' || cleaned === '+-+') return { punkte: isHeim ? 1.0 : 0, isForfait: true };
    if (cleaned === '--+' || cleaned === '--+') return { punkte: isHeim ? 0 : 1.0, isForfait: true };

    const parts = cleaned.split('-');
    if (parts.length !== 2) return null;

    let wRaw = parseInt(parts[0]);
    let bRaw = parseInt(parts[1]);
    let isForfait = false;

    if (wRaw === 6 && bRaw === 4) { wRaw = 2; bRaw = 0; isForfait = true; }
    else if (wRaw === 4 && bRaw === 6) { wRaw = 0; bRaw = 2; isForfait = true; }

    let meinErgebnisRaw = isHeim ? wRaw : bRaw;
    
    let punkte = 0;
    if (meinErgebnisRaw === 2) punkte = 1.0;
    else if (meinErgebnisRaw === 1) punkte = 0.5;

    return {
        punkte: punkte,
        isForfait: isForfait
    };
}

function getChartColors() {
    const isLight = document.body.classList.contains('light-theme');
    return {
        textColor: isLight ? '#0f172a' : '#f8fafc',
        secondaryText: isLight ? '#475569' : '#94a3b8',
        gridColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'
    };
}

async function ladeDaten() {
    try {
        const timestamp = new Date().getTime();
        const fetcher = window.fetchCSVSource || fetch;
        const [resSsbSpiele, resSsbBretter, resBsvSpiele, resBsvBretter] = await Promise.all([
            fetcher('data/ssb_spiele.csv').catch(() => null),
            fetcher('data/ssb_brett_details.csv').catch(() => null),
            fetcher('data/bsv_spiele.csv').catch(() => null),
            fetcher('data/bsv_brett_details.csv').catch(() => null)
        ]);

        rawSpieleRows = [];
        rawBrettRows = [];

        const spieleResponses = [resSsbSpiele, resBsvSpiele].filter(r => r && r.ok);
        const bretterResponses = [resSsbBretter, resBsvBretter].filter(r => r && r.ok);

        if (spieleResponses.length === 0 || bretterResponses.length === 0) {
            throw new Error("Keine CSV-Dateien gefunden");
        }

        for (const res of spieleResponses) {
            const csvText = await (window.fetchTextWithEncoding ? window.fetchTextWithEncoding(res) : res.text());
            await new Promise((resolve) => {
                Papa.parse(csvText, {
                    header: true,
                    delimiter: "",
                    skipEmptyLines: true,
                    complete: function(results) {
                        const validRows = results.data.filter(r => getRowVal(r, 'Heimteam', 'Heim', 'Team_Heim') !== '' || getRowVal(r, 'Gastteam', 'Gast', 'Team_Gast') !== '');
                        rawSpieleRows = rawSpieleRows.concat(validRows);
                        resolve();
                    }
                });
            });
        }

        for (const res of bretterResponses) {
            const csvText = await (window.fetchTextWithEncoding ? window.fetchTextWithEncoding(res) : res.text());
            await new Promise((resolve) => {
                Papa.parse(csvText, {
                    header: true,
                    delimiter: "",
                    skipEmptyLines: true,
                    complete: function(results) {
                        const validRows = results.data.filter(r => getRowVal(r, 'Weiß', 'Weiss', 'Schwarz') !== '' || getRowVal(r, 'Team_Weiss', 'Team Weiß', 'Team_Weiß', 'Team Weiss', 'Heimteam', 'Team_Schwarz', 'Team Schwarz', 'Gastteam') !== '');
                        rawBrettRows = rawBrettRows.concat(validRows);
                        resolve();
                    }
                });
            });
        }

        initHierarchischeFilter();
    } catch (error) {
        console.error("Fehler beim Laden der CSV-Dateien:", error);
    }
}

function initHierarchischeFilter() {
    const elTurnierSelect = document.getElementById("turnierSelect");
    if (!elTurnierSelect) return;

    const turniere = Array.from(new Set(rawSpieleRows.map(r => (r.Turnier || "SSB").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'de'));
    elTurnierSelect.innerHTML = "";

    if (turniere.length === 0) {
        elTurnierSelect.innerHTML = "<option>Keine Daten</option>";
        return;
    }

    turniere.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        elTurnierSelect.appendChild(opt);
    });

    if (isFirstLoad) {
        const urlTurnier = getUrlParameter('turnier');
        if (urlTurnier && turniere.includes(urlTurnier)) {
            elTurnierSelect.value = urlTurnier;
        }
    }

    updateSaisonSelect();
}

function updateSaisonSelect() {
    const elTurnierSelect = document.getElementById("turnierSelect");
    const elSaisonSelect = document.getElementById("saisonSelect");
    if (!elTurnierSelect || !elSaisonSelect) return;

    const selectedTurnier = elTurnierSelect.value;
    const saisondaten = rawSpieleRows
        .filter(r => (r.Turnier || "SSB").trim() === selectedTurnier)
        .map(r => (r.Saison || "Aktuell").trim())
        .filter(Boolean);
    
    const saisons = Array.from(new Set(saisondaten)).sort((a, b) => b.localeCompare(a, 'de'));
    elSaisonSelect.innerHTML = "";

    saisons.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        elSaisonSelect.appendChild(opt);
    });

    if (isFirstLoad) {
        const urlSaison = getUrlParameter('saison');
        if (urlSaison && saisons.includes(urlSaison)) {
            elSaisonSelect.value = urlSaison;
        }
    }

    updateLigaSelect();
}

function updateLigaSelect() {
    const elTurnierSelect = document.getElementById("turnierSelect");
    const elSaisonSelect = document.getElementById("saisonSelect");
    const elLigaSelect = document.getElementById("ligaSelect");
    if (!elTurnierSelect || !elSaisonSelect || !elLigaSelect) return;

    const selectedTurnier = elTurnierSelect.value;
    const selectedSaison = elSaisonSelect.value;

    const ligadaten = rawSpieleRows
        .filter(r => (r.Turnier || "SSB").trim() === selectedTurnier && (r.Saison || "Aktuell").trim() === selectedSaison)
        .map(r => (r.Liga || "Standard").trim())
        .filter(Boolean);
    
    const ligen = Array.from(new Set(ligadaten)).sort((a, b) => a.localeCompare(b, 'de'));
    elLigaSelect.innerHTML = "";

    ligen.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l;
        opt.textContent = l;
        elLigaSelect.appendChild(opt);
    });

    if (isFirstLoad) {
        const urlLiga = getUrlParameter('liga');
        if (urlLiga && ligen.includes(urlLiga)) {
            elLigaSelect.value = urlLiga;
        }
        isFirstLoad = false;
    }

    anwendenFilterUndBerechnen();
}

function anwendenFilterUndBerechnen() {
    const elTurnierSelect = document.getElementById("turnierSelect");
    const elSaisonSelect = document.getElementById("saisonSelect");
    const elLigaSelect = document.getElementById("ligaSelect");
    
    if (!elTurnierSelect || !elSaisonSelect || !elLigaSelect) return;

    const selectedTurnier = elTurnierSelect.value;
    const selectedSaison = elSaisonSelect.value;
    const selectedLiga = elLigaSelect.value;

    ligaRunden = {};
    teamSpielerDaten = {};
    let maxRundeGefunden = 0;

    const filteredSpiele = rawSpieleRows.filter(r => 
        (r.Turnier || "SSB").trim() === selectedTurnier && 
        (r.Saison || "Aktuell").trim() === selectedSaison && 
        (r.Liga || "Standard").trim() === selectedLiga
    );
    aktuelleSpiele = filteredSpiele;

    let maxGespielteRunde = 0;

    filteredSpiele.forEach(row => {
        const heim = getRowVal(row, 'Heimteam', 'Heim', 'Team_Heim').toString().trim();
        const gast = getRowVal(row, 'Gastteam', 'Gast', 'Team_Gast').toString().trim();
        if (!heim || !gast || heim === 'Freilos' || gast === 'Freilos') return;

        if (!ligaRunden[heim]) ligaRunden[heim] = [];
        if (!ligaRunden[gast]) ligaRunden[gast] = [];

        const rNum = parseInt(row.Runde) - 1;
        
        if (!isNaN(rNum) && rNum >= 0) {
            if (rNum + 1 > maxRundeGefunden) maxRundeGefunden = rNum + 1;

            // Check if this round has actually been played (MP is not '-' or empty)
            const mpHeimRaw = getRowVal(row, 'MP Heim', 'MP_Heim').toString().replace(/[="]/g, '').trim();
            const mpGastRaw = getRowVal(row, 'MP Gast', 'MP_Gast').toString().replace(/[="]/g, '').trim();
            const isPlayed = mpHeimRaw !== '' && mpHeimRaw !== '-' && mpGastRaw !== '' && mpGastRaw !== '-';

            if (isPlayed) {
                if (rNum + 1 > maxGespielteRunde) maxGespielteRunde = rNum + 1;
                ligaRunden[heim][rNum] = { 
                    mp: parseCleanNumber(getRowVal(row, 'MP Heim', 'MP_Heim')), 
                    bp: parseCleanNumber(getRowVal(row, 'EP Heim', 'EP_Heim')) 
                };
                ligaRunden[gast][rNum] = { 
                    mp: parseCleanNumber(getRowVal(row, 'MP Gast', 'MP_Gast')), 
                    bp: parseCleanNumber(getRowVal(row, 'EP Gast', 'EP_Gast')) 
                };
            }
        }
    });

    maxAnzahlRunden = maxRundeGefunden > 0 ? maxRundeGefunden : 7;
    maxGespielteRunden = maxGespielteRunde > 0 ? maxGespielteRunde : maxAnzahlRunden;
    updateRundeSelect(maxGespielteRunden);

    const filteredBretter = rawBrettRows.filter(r => 
        (r.Turnier || "SSB").trim() === selectedTurnier && 
        (r.Saison || "Aktuell").trim() === selectedSaison && 
        (r.Liga || "Standard").trim() === selectedLiga
    );
    aktuelleBretter = filteredBretter;

    filteredBretter.forEach(row => {
        const teamW = getRowVal(row, 'Team_Weiss', 'Team Weiß', 'Team_Weiß', 'Team Weiss', 'Heimteam').toString().trim();
        const teamS = getRowVal(row, 'Team_Schwarz', 'Team Schwarz', 'Gastteam').toString().trim();
        const rNum = parseInt(row.Runde) - 1;
        
        if (isNaN(rNum) || rNum < 0 || teamW === 'Freilos' || teamS === 'Freilos' || (!teamW && !teamS)) return;

        if (teamW && !teamSpielerDaten[teamW]) teamSpielerDaten[teamW] = {};
        if (teamS && !teamSpielerDaten[teamS]) teamSpielerDaten[teamS] = {};

        const spielerWeiss = getRowVal(row, 'Weiß', 'Weiss').toString().trim();
        const spielerSchwarz = getRowVal(row, 'Schwarz').toString().trim();
        
        const eloWeissVal = getRowVal(row, 'Elo Weiß', 'Elo_Weiss', 'Elo_Weiß', 'Elo Weiss');
        const eloSchwarzVal = getRowVal(row, 'Elo Schwarz', 'Elo_Schwarz');
        const eloWeiss = (eloWeissVal && eloWeissVal.toString().trim() !== '') ? eloWeissVal.toString().trim() : "-";
        const eloSchwarz = (eloSchwarzVal && eloSchwarzVal.toString().trim() !== '') ? eloSchwarzVal.toString().trim() : "-";
        
        const parsedResWeiss = parsePlayerResult(row.Ergebnis, true);
        const parsedResSchwarz = parsePlayerResult(row.Ergebnis, false);

        if (teamW && spielerWeiss) {
            if (!teamSpielerDaten[teamW][spielerWeiss]) teamSpielerDaten[teamW][spielerWeiss] = { runden: [] };
            teamSpielerDaten[teamW][spielerWeiss].runden[rNum] = {
                res: parsedResWeiss ? parsedResWeiss.punkte : null,
                isForfait: parsedResWeiss ? parsedResWeiss.isForfait : false,
                color: "W",
                ownElo: eloWeiss,
                gegner: spielerSchwarz || "Unbekannt",
                oppTeam: teamS || "",
                oppElo: eloSchwarz
            };
        }

        if (teamS && spielerSchwarz) {
            if (!teamSpielerDaten[teamS][spielerSchwarz]) teamSpielerDaten[teamS][spielerSchwarz] = { runden: [] };
            teamSpielerDaten[teamS][spielerSchwarz].runden[rNum] = {
                res: parsedResSchwarz ? parsedResSchwarz.punkte : null,
                isForfait: parsedResSchwarz ? parsedResSchwarz.isForfait : false,
                color: "S",
                ownElo: eloSchwarz,
                gegner: spielerWeiss || "Unbekannt",
                oppTeam: teamW || "",
                oppElo: eloWeiss
            };
        }
    });

    initTeamsDropdown();
    updateGesamtAnsicht();
    initBegegnungenFilter();
    initBestenlisteFilter();
}

function updateRundeSelect(maxFound) {
    const elRundeSelect = document.getElementById("rundeSelect");
    if (!elRundeSelect || maxFound <= 0) return;
    const currentVal = elRundeSelect.value;
    elRundeSelect.innerHTML = '<option value="alle">Aktueller Stand</option>';
    for (let i = 0; i < maxFound; i++) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `Stand nach Runde ${i + 1}`;
        elRundeSelect.appendChild(opt);
    }
    if (currentVal && Array.from(elRundeSelect.options).some(o => o.value === currentVal)) {
        elRundeSelect.value = currentVal;
    }
}

function initTeamsDropdown() {
    const elTeamSelect = document.getElementById("teamSelect");
    if (!elTeamSelect) return;
    elTeamSelect.innerHTML = "";
    const teams = Array.from(new Set([...Object.keys(ligaRunden), ...Object.keys(teamSpielerDaten)])).filter(Boolean).sort((a, b) => a.localeCompare(b, 'de'));
    
    if (teams.length === 0) {
        elTeamSelect.innerHTML = "<option>Keine Teams in dieser Liga</option>";
        ladeSpielerFuerTeam("");
        return;
    }

    teams.forEach(team => {
        const opt = document.createElement("option");
        opt.value = team;
        opt.textContent = team;
        if (!teamSpielerDaten[team] || Object.keys(teamSpielerDaten[team]).length === 0) {
            opt.textContent += " (Nur Ligadaten)";
        }
        elTeamSelect.appendChild(opt);
    });
    let defaultTeam = teams[0];
    const urlTeam = typeof getUrlParameter === 'function' ? getUrlParameter('team') : '';
    if (typeof isFirstLoad !== 'undefined' && isFirstLoad && urlTeam && teams.includes(urlTeam)) {
        defaultTeam = urlTeam;
    } else {
        const rhyTeam = teams.find(t => t.toLowerCase().includes("rhy"));
        const rheinfeldenTeam = teams.find(t => t.toLowerCase().includes("rheinfelden"));
        if (rhyTeam) {
            defaultTeam = rhyTeam;
        } else if (rheinfeldenTeam) {
            defaultTeam = rheinfeldenTeam;
        }
    }

    elTeamSelect.value = defaultTeam;
    ladeSpielerFuerTeam(defaultTeam);
}

function ladeSpielerFuerTeam(teamName) {
    const elSpielerSelect = document.getElementById("spielerSelect");
    if (!elSpielerSelect) return;
    elSpielerSelect.innerHTML = "";
    const spielerDesTeams = teamSpielerDaten[teamName];
    if (spielerDesTeams && Object.keys(spielerDesTeams).length > 0) {
        elSpielerSelect.disabled = false;
        Object.keys(spielerDesTeams).sort((a, b) => a.localeCompare(b, 'de')).forEach(name => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            elSpielerSelect.appendChild(opt);
        });
    } else {
        elSpielerSelect.disabled = true;
        elSpielerSelect.innerHTML = "<option>Keine Spielerdaten hinterlegt</option>";
    }
    updateSpielerBereich();
}

function berechneLigaStand(rundenLimit) {
    let ligaLive = [];
    Object.keys(ligaRunden).forEach(team => {
        let mpTotal = 0;
        let bpTotal = 0;
        let spieleAnzahl = 0;
        const runden = ligaRunden[team];
        const anzahlRunden = runden.length;
        const maxRunde = rundenLimit === "alle" ? anzahlRunden : parseInt(rundenLimit) + 1;
        
        for (let i = 0; i < maxRunde; i++) {
            if (runden[i]) {
                mpTotal += runden[i].mp;
                bpTotal += runden[i].bp;
                spieleAnzahl++;
            }
        }
        ligaLive.push({ mannschaft: team, spiele: spieleAnzahl, mp: mpTotal, bp: bpTotal });
    });
    
    ligaLive.sort((a, b) => {
        if (b.mp !== a.mp) return b.mp - a.mp;
        if (b.bp !== a.bp) return b.bp - a.bp;
        if (a.spiele !== b.spiele) return a.spiele - b.spiele;
        return a.mannschaft.localeCompare(b.mannschaft, 'de');
    });
    
    ligaLive.forEach((t, i) => t.rang = i + 1);
    return ligaLive;
}

function updateGesamtAnsicht() {
    const tbody = document.getElementById("ligaTbody");
    const canvas = document.getElementById('teamsChart');
    if (!tbody || !canvas) return;

    if (Object.keys(ligaRunden).length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Keine Tabellendaten für diese Liga-Auswahl vorhanden.</td></tr>`;
        if (chartTeamsInstance) { chartTeamsInstance.destroy(); chartTeamsInstance = null; }
        updateSpielerBereich();
        return;
    }

    const elRundeSelect = document.getElementById("rundeSelect");
    const elTeamSelect = document.getElementById("teamSelect");
    if (!elRundeSelect || !elTeamSelect) return;

    const limit = elRundeSelect.value;
    const titelText = limit === "alle" ? "Aktueller Stand" : `Stand nach Runde ${parseInt(limit) + 1}`;
    const tabellenTitel = document.getElementById("tabellenTitel");
    if (tabellenTitel) tabellenTitel.textContent = `Ligatabelle (${titelText})`;

    const ligaDaten = berechneLigaStand(limit);
    const aktivesTeam = elTeamSelect.value;
    tbody.innerHTML = "";
    
    const labels = [];
    const dataMP = [];
    const dataEP = [];
    const bgColorsMP = [];
    const bgColorsEP = [];

    ligaDaten.forEach(team => {
        labels.push(team.mannschaft);
        dataMP.push(team.mp);
        dataEP.push(team.bp);
        
        const isAktiv = team.mannschaft === aktivesTeam;
        
        bgColorsMP.push(isAktiv ? '#d4af37' : 'rgba(212, 175, 55, 0.35)'); 
        bgColorsEP.push(isAktiv ? '#10b981' : 'rgba(16, 185, 129, 0.35)'); 

        const tr = document.createElement("tr");
        if (isAktiv) tr.className = "active-team";
        tr.innerHTML = `
            <td style="text-align: center; font-weight: 700; color: var(--text-secondary);">${team.rang}</td>
            <td style="font-weight: 600; color: var(--text-primary);">${team.mannschaft}</td>
            <td style="text-align: center; font-weight: 600; color: var(--text-secondary);">${team.spiele}</td>
            <td style="text-align: center; font-weight: 700; color: ${isAktiv ? '#d4af37' : 'var(--text-primary)'};">${team.mp}</td>
            <td style="text-align: center; font-weight: 600; color: ${isAktiv ? '#10b981' : 'var(--text-secondary)'};">${team.bp}</td>
        `;
        tbody.appendChild(tr);
    });

    const ctx = canvas.getContext('2d');
    if (chartTeamsInstance) chartTeamsInstance.destroy();
    
    const colors = getChartColors();
    
    chartTeamsInstance = new Chart(ctx, {
        type: 'bar',
        data: { 
            labels: labels, 
            datasets: [
                { label: 'Matchpunkte (MP)', data: dataMP, backgroundColor: bgColorsMP, borderRadius: 4 },
                { label: 'Einzelpunkte (EP)', data: dataEP, backgroundColor: bgColorsEP, borderRadius: 4 }
            ] 
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { 
                    display: true,
                    position: 'top',
                    labels: { color: colors.textColor, font: { family: 'Outfit, sans-serif', size: 12, weight: '600' } }
                } 
            },
            scales: { 
                y: { grid: { color: colors.gridColor }, ticks: { color: colors.secondaryText, font: { family: 'Outfit, sans-serif' } } },
                x: { grid: { display: false }, ticks: { color: colors.textColor, font: { family: 'Outfit, sans-serif', size: 11, weight: '600' } } }
            }
        }
    });

    updateSpielerBereich();
}

function updateSpielerBereich() {
    const elTeamSelect = document.getElementById("teamSelect");
    const elSpielerSelect = document.getElementById("spielerSelect");
    const elRundeSelect = document.getElementById("rundeSelect");
    const tbody = document.getElementById("spielerTbody");
    const spielerTitel = document.getElementById("spielerTitel");
    if (!elTeamSelect || !elSpielerSelect || !elRundeSelect || !tbody || !spielerTitel) return;

    const teamName = elTeamSelect.value;
    const spielerName = elSpielerSelect.value;
    const limit = elRundeSelect.value;
    const maxRunde = limit === "alle" ? maxGespielteRunden : parseInt(limit) + 1;
    
    tbody.innerHTML = "";
    let kumuliertArray = [];

    if (!teamName || !spielerName || !teamSpielerDaten[teamName] || !teamSpielerDaten[teamName][spielerName]) {
        spielerTitel.textContent = "Spieler-Analyse (Keine Daten vorhanden)";
        if (chartPlayerInstance) { chartPlayerInstance.destroy(); chartPlayerInstance = null; }
        return;
    }

    const daten = teamSpielerDaten[teamName][spielerName];
    spielerTitel.textContent = `Detailansicht: ${spielerName}`;

    let summe = 0;

    for (let i = 0; i < maxGespielteRunden; i++) {
        const tr = document.createElement("tr");
        
        if (i >= maxRunde) {
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--text-secondary);">${rundenNamen[i] || 'R'+(i+1)}</td>
                <td style="text-align: center; color: var(--text-secondary);">-</td>
                <td style="text-align: center; color: var(--text-secondary);">-</td>
                <td style="color: var(--text-secondary);">-</td>
                <td style="text-align: center; color: var(--text-secondary);">-</td>
                <td style="text-align: center;"><span style="color: var(--text-secondary);">-</span></td>
                <td style="text-align: right; color: var(--text-secondary);">-</td>
            `;
            kumuliertArray.push(null);
        } else {
            const rundeDaten = (daten.runden && daten.runden.length > i) ? daten.runden[i] : null;
            
            if (rundeDaten && rundeDaten.res !== null && rundeDaten.res !== undefined) {
                const pkt = rundeDaten.res;
                const isForfait = rundeDaten.isForfait;
                const farbe = rundeDaten.color;
                const ownElo = rundeDaten.ownElo || "-";
                const gegner = rundeDaten.gegner || "Unbekannt";
                const oppTeam = rundeDaten.oppTeam || "";
                const oppElo = rundeDaten.oppElo || "-";
                
                summe += pkt;
                kumuliertArray.push(summe);
                
                const colorDot = farbe === "W" 
                    ? `<span class="color-dot-w" title="Weiß"></span>` 
                    : `<span class="color-dot-s" title="Schwarz"></span>`;
                
                let badgeCls = "badge-res badge-draw";
                let text = "0.5";
                if (pkt === 1.0) { badgeCls = "badge-res badge-win"; text = "1"; }
                if (pkt === 0.0) { badgeCls = "badge-res badge-loss"; text = "0"; }
                if (isForfait) { text += " (F)"; }

                const safeOppTeam = oppTeam.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                const safeGegner = gegner.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

                tr.innerHTML = `
                    <td style="font-weight: 600; color: var(--text-primary);">${rundenNamen[i] || 'R'+(i+1)}</td>
                    <td style="text-align: center;">${colorDot}</td>
                    <td style="text-align: center; color: var(--accent-color); font-weight: 600;">${ownElo}</td>
                    <td style="font-weight: 600; color: var(--text-primary); max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; transition: color 0.2s;"
                        onclick="analysiereSpielerAusBestenliste('${safeOppTeam}', '${safeGegner}')"
                        onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-primary)'"
                        title="Klicken für Detailansicht von ${gegner}">${gegner}</td>
                    <td style="text-align: center; color: var(--text-secondary);">${oppElo}</td>
                    <td style="text-align: center;"><span class="${badgeCls}">${text}</span></td>
                    <td style="text-align: right; font-weight: 700; color: var(--accent-color); font-size: 1.05rem;">${summe}</td>
                `;
            } else {
                kumuliertArray.push(null);
                tr.innerHTML = `
                    <td style="font-weight: 600; color: var(--text-secondary);">${rundenNamen[i] || 'R'+(i+1)}</td>
                    <td style="text-align: center; color: var(--text-secondary);">-</td>
                    <td style="text-align: center; color: var(--text-secondary);">-</td>
                    <td style="color: var(--text-secondary); font-style: italic;">Ausgesetzt</td>
                    <td style="text-align: center; color: var(--text-secondary);">-</td>
                    <td style="text-align: center;"><span style="color: var(--text-secondary);">-</span></td>
                    <td style="text-align: right; font-weight: 700; color: var(--text-secondary);">${summe}</td>
                `;
            }
        }
        tbody.appendChild(tr);
    }

    zeichneFormkurve(kumuliertArray);
}

function zeichneFormkurve(kumuliert) {
    const canvas = document.getElementById('playerChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartPlayerInstance) chartPlayerInstance.destroy();
    
    const colors = getChartColors();
    
    chartPlayerInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: rundenNamen.slice(0, maxGespielteRunden),
            datasets: [{
                data: kumuliert,
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                borderWidth: 3,
                pointBackgroundColor: colors.textColor,
                pointBorderColor: '#d4af37',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                fill: true,
                tension: 0.3,
                spanGaps: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: colors.gridColor }, 
                    ticks: { stepSize: 0.5, color: colors.secondaryText, font: { family: 'Outfit, sans-serif' } } 
                },
                x: { grid: { display: false }, ticks: { color: colors.textColor, font: { family: 'Outfit, sans-serif', weight: '600' } } }
            }
        }
    });
}

// --- BEGEGNUNGEN & MATCH-CENTER ---
function initBegegnungenFilter() {
    const elRundeSelect = document.getElementById("begegnungRundeSelect");
    if (!elRundeSelect) return;

    const runden = Array.from(new Set(aktuelleSpiele.map(r => parseInt(r.Runde)).filter(n => !isNaN(n)))).sort((a, b) => a - b);
    const currentVal = elRundeSelect.value;
    elRundeSelect.innerHTML = '<option value="alle">Alle Runden anzeigen</option>';

    let latestPlayedRound = null;
    runden.forEach(r => {
        const hasPlayed = aktuelleSpiele.some(m => {
            if (String(m.Runde) !== String(r)) return false;
            const mp = getRowVal(m, 'MP Heim', 'MP_Heim').toString().replace(/[="]/g, '').trim();
            return mp !== '' && mp !== '-';
        });
        if (hasPlayed) latestPlayedRound = r;
    });
    if (latestPlayedRound === null && runden.length > 0) {
        latestPlayedRound = runden[0];
    }

    runden.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = `Runde ${r}`;
        elRundeSelect.appendChild(opt);
    });

    if (currentVal && Array.from(elRundeSelect.options).some(o => String(o.value) === String(currentVal))) {
        elRundeSelect.value = currentVal;
    } else if (latestPlayedRound !== null) {
        elRundeSelect.value = latestPlayedRound;
    }

    renderBegegnungen();
}

function renderBegegnungen() {
    const container = document.getElementById("begegnungenContainer");
    const elRundeSelect = document.getElementById("begegnungRundeSelect");
    const elTeamFilter = document.getElementById("begegnungTeamFilterCheckbox");
    const elTeamSelect = document.getElementById("teamSelect");
    if (!container) return;

    const selectedRunde = elRundeSelect ? elRundeSelect.value : "alle";
    const nurFokusTeam = elTeamFilter ? elTeamFilter.checked : false;
    const fokusTeam = elTeamSelect ? elTeamSelect.value : "";

    let matches = aktuelleSpiele.filter(r => {
        const heim = getRowVal(r, 'Heimteam', 'Heim', 'Team_Heim').toString().trim();
        const gast = getRowVal(r, 'Gastteam', 'Gast', 'Team_Gast').toString().trim();
        if (!heim || !gast || heim === 'Freilos' || gast === 'Freilos') return false;
        if (selectedRunde !== "alle" && String(r.Runde).trim() !== String(selectedRunde).trim()) return false;
        if (nurFokusTeam && fokusTeam && heim !== fokusTeam && gast !== fokusTeam) return false;
        return true;
    });

    if (matches.length === 0) {
        container.innerHTML = `<div style="padding: 2.2rem; text-align: center; color: var(--text-secondary); background: var(--table-bg); border-radius: 12px; border: 1px solid var(--glass-border);">Keine Begegnungen für diese Filterauswahl gefunden.</div>`;
        return;
    }

    matches.sort((a, b) => {
        const rA = parseInt(a.Runde) || 0;
        const rB = parseInt(b.Runde) || 0;
        if (rA !== rB) return rA - rB;
        return getRowVal(a, 'Heimteam', 'Heim').toString().localeCompare(getRowVal(b, 'Heimteam', 'Heim'), 'de');
    });

    let latestPlayedRound = null;
    matches.forEach(m => {
        const mp = getRowVal(m, 'MP Heim', 'MP_Heim').toString().replace(/[="]/g, '').trim();
        if (mp !== '' && mp !== '-') {
            const r = parseInt(m.Runde);
            if (!isNaN(r) && (latestPlayedRound === null || r > latestPlayedRound)) {
                latestPlayedRound = r;
            }
        }
    });
    if (latestPlayedRound === null && matches.length > 0) {
        latestPlayedRound = parseInt(matches[0].Runde);
    }

    container.innerHTML = "";
    let lastRunde = null;
    let currentRoundContainer = container;

    matches.forEach((match, idx) => {
        const rNum = String(match.Runde || '').trim();
        if (rNum !== lastRunde) {
            lastRunde = rNum;
            const startExpanded = (selectedRunde !== "alle");
            const rHeader = document.createElement("div");
            rHeader.className = "round-accordion-header";
            rHeader.onclick = () => toggleRoundAccordion(rNum);
            rHeader.innerHTML = `
                <span>Runde ${rNum}</span>
                <span id="round-icon-${rNum}" style="color: var(--accent-color); font-size: 0.85rem;">${startExpanded ? '▲ Einklappen' : '▼ Ausklappen'}</span>
            `;
            container.appendChild(rHeader);

            const rBody = document.createElement("div");
            rBody.className = `round-accordion-body ${startExpanded ? '' : 'hidden'}`;
            rBody.id = `round-body-${rNum}`;
            container.appendChild(rBody);
            currentRoundContainer = rBody;
        }

        const heim = getRowVal(match, 'Heimteam', 'Heim', 'Team_Heim').toString().trim();
        const gast = getRowVal(match, 'Gastteam', 'Gast', 'Team_Gast').toString().trim();
        const mpHeimRaw = getRowVal(match, 'MP Heim', 'MP_Heim').toString().replace(/[="]/g, '').trim();
        const mpGastRaw = getRowVal(match, 'MP Gast', 'MP_Gast').toString().replace(/[="]/g, '').trim();
        const epHeimRaw = getRowVal(match, 'EP Heim', 'EP_Heim').toString().replace(/[="]/g, '').trim();
        const epGastRaw = getRowVal(match, 'EP Gast', 'EP_Gast').toString().replace(/[="]/g, '').trim();

        const isHeimAktiv = heim === fokusTeam;
        const isGastAktiv = gast === fokusTeam;

        const epDisplay = (epHeimRaw !== '' && epGastRaw !== '' && epHeimRaw !== '-') ? `${epHeimRaw} : ${epGastRaw}` : '- : -';
        
        let mpBadgeStyle = "";
        let mpDisplay = "Offen";
        if (mpHeimRaw !== '' && mpGastRaw !== '' && mpHeimRaw !== '-') {
            mpDisplay = `${mpHeimRaw} : ${mpGastRaw}`;
            const numH = parseFloat(mpHeimRaw);
            const numG = parseFloat(mpGastRaw);
            if (!isNaN(numH) && !isNaN(numG)) {
                if (numH > numG) {
                    mpBadgeStyle = "background: linear-gradient(90deg, rgba(16,185,129,0.3), rgba(239,68,68,0.3));";
                } else if (numH < numG) {
                    mpBadgeStyle = "background: linear-gradient(90deg, rgba(239,68,68,0.3), rgba(16,185,129,0.3));";
                }
            }
        }

        const matchId = `match-card-${idx}`;
        const card = document.createElement("div");
        card.className = "match-card";

        const bretter = aktuelleBretter.filter(br => {
            if (String(br.Runde).trim() !== String(rNum).trim()) return false;
            const tw = getRowVal(br, 'Team_Weiss', 'Team Weiß', 'Team_Weiß', 'Team Weiss', 'Heimteam').toString().trim();
            const ts = getRowVal(br, 'Team_Schwarz', 'Team Schwarz', 'Gastteam').toString().trim();
            return (tw === heim && ts === gast) || (tw === gast && ts === heim);
        });

        bretter.sort((a, b) => (parseInt(a.Brett) || 0) - (parseInt(b.Brett) || 0));

        let brettRowsHtml = "";
        if (bretter.length > 0) {
            bretter.forEach((br, bIdx) => {
                const brettNr = br.Brett || (bIdx + 1);
                const spielerW = getRowVal(br, 'Weiß', 'Weiss').toString().trim() || '-';
                const eloW = getRowVal(br, 'Elo Weiß', 'Elo_Weiss', 'Elo_Weiß', 'Elo Weiss').toString().trim() || '-';
                const teamW = getRowVal(br, 'Team_Weiss', 'Team Weiß', 'Team_Weiß', 'Team Weiss', 'Heimteam').toString().trim() || '';
                const spielerS = getRowVal(br, 'Schwarz').toString().trim() || '-';
                const eloS = getRowVal(br, 'Elo Schwarz', 'Elo_Schwarz').toString().trim() || '-';
                const teamS = getRowVal(br, 'Team_Schwarz', 'Team Schwarz', 'Gastteam').toString().trim() || '';
                
                let resClean = getRowVal(br, 'Ergebnis').toString().replace(/[="]/g, '').trim() || '-';

                const isWeissHeim = (teamW === heim);
                const spielerHeim = isWeissHeim ? spielerW : spielerS;
                const eloHeim = isWeissHeim ? eloW : eloS;
                const pieceHeim = isWeissHeim ? '<span class="color-dot-w" title="Weiß" style="margin-right: 8px;"></span>' : '<span class="color-dot-s" title="Schwarz" style="margin-right: 8px;"></span>';

                const spielerGast = isWeissHeim ? spielerS : spielerW;
                const eloGast = isWeissHeim ? eloS : eloW;
                const pieceGast = isWeissHeim ? '<span class="color-dot-s" title="Schwarz" style="margin-right: 8px;"></span>' : '<span class="color-dot-w" title="Weiß" style="margin-right: 8px;"></span>';

                // Convert raw CSV result to chess notation (Heim : Gast)
                let resDisplay = resClean;
                let isForfait = false;
                const resParts = resClean.replace(/\s/g, '').split('-');
                if (resParts.length === 2) {
                    let wVal = parseInt(resParts[0]);
                    let bVal = parseInt(resParts[1]);
                    if (!isNaN(wVal) && !isNaN(bVal)) {
                        // Forfait detection
                        if (wVal === 6 && bVal === 4) { wVal = 2; bVal = 0; isForfait = true; }
                        else if (wVal === 4 && bVal === 6) { wVal = 0; bVal = 2; isForfait = true; }
                        
                        // Convert internal scores to chess points
                        // 2 = 1 (win), 1 = 0.5 (draw), 0 = 0 (loss)
                        const whitePoints = wVal === 2 ? '1' : wVal === 1 ? '0.5' : '0';
                        const blackPoints = bVal === 2 ? '1' : bVal === 1 ? '0.5' : '0';
                        
                        // Display from Heim:Gast perspective
                        const heimPoints = isWeissHeim ? whitePoints : blackPoints;
                        const gastPoints = isWeissHeim ? blackPoints : whitePoints;
                        resDisplay = `${heimPoints} : ${gastPoints}`;
                        if (isForfait) resDisplay += ' (F)';
                    }
                }

                const safeHeim = heim.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                const safeGast = gast.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                const safeSpHeim = spielerHeim.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
                const safeSpGast = spielerGast.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

                brettRowsHtml += `
                    <tr>
                        <td style="text-align: center; font-weight: 700; color: var(--text-secondary);">${brettNr}</td>
                        <td>
                            <div style="font-weight: 600; color: var(--text-primary); cursor: pointer; transition: color 0.2s;"
                                 onclick="analysiereSpielerAusBestenliste('${safeHeim}', '${safeSpHeim}')"
                                 onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-primary)'"
                                 title="Klicken für Detailansicht">${pieceHeim}${spielerHeim}</div>
                        </td>
                        <td style="text-align: center; color: var(--accent-color); font-weight: 500;">${eloHeim}</td>
                        <td style="text-align: center;"><span class="badge-res-neutral">${resDisplay}</span></td>
                        <td>
                            <div style="font-weight: 600; color: var(--text-primary); cursor: pointer; transition: color 0.2s;"
                                 onclick="analysiereSpielerAusBestenliste('${safeGast}', '${safeSpGast}')"
                                 onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-primary)'"
                                 title="Klicken für Detailansicht">${pieceGast}${spielerGast}</div>
                        </td>
                        <td style="text-align: center; color: var(--text-secondary); font-weight: 500;">${eloGast}</td>
                    </tr>
                `;
            });
        } else {
            brettRowsHtml = `<tr><td colspan="6" style="text-align: center; padding: 1.2rem; color: var(--text-secondary);">Keine Einzelergebnisse (Brett-Details) für dieses Match hinterlegt.</td></tr>`;
        }

        card.innerHTML = `
            <div class="match-header" onclick="toggleBoardDetails('${matchId}')">
                <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
                    <span class="match-team ${isHeimAktiv ? 'highlight-team' : ''}">${heim}</span>
                    <span style="color: var(--text-secondary); font-weight: 400; font-size: 0.88rem;">vs.</span>
                    <span class="match-team ${isGastAktiv ? 'highlight-team' : ''}">${gast}</span>
                </div>
                <div class="match-scores">
                    <span class="match-ep" title="Brett-Punkte (EP)">EP ${epDisplay}</span>
                    <span class="badge-mp-neutral" title="Matchpunkte (MP)" style="${mpBadgeStyle}">MP ${mpDisplay}</span>
                    <button type="button" class="btn-boards-toggle" id="btn-${matchId}">Brett-Details ▼</button>
                </div>
            </div>
            <div class="boards-details hidden" id="boards-${matchId}" onclick="event.stopPropagation()">
                <div style="overflow-x: auto;">
                    <table class="zm-table">
                        <thead>
                            <tr>
                                <th style="width: 55px; text-align: center;">Brett</th>
                                <th>${heim} (Heim)</th>
                                <th style="width: 70px; text-align: center;">Elo</th>
                                <th style="width: 90px; text-align: center;">Ergebnis</th>
                                <th>${gast} (Gast)</th>
                                <th style="width: 70px; text-align: center;">Elo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${brettRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        currentRoundContainer.appendChild(card);
    });
}

function toggleRoundAccordion(rNum) {
    const cleanRNum = String(rNum).trim();
    const body = document.getElementById(`round-body-${cleanRNum}`);
    const icon = document.getElementById(`round-icon-${cleanRNum}`);
    if (!body) return;
    body.classList.toggle("hidden");
    const isHidden = body.classList.contains("hidden");
    if (icon) {
        icon.textContent = isHidden ? "▼ Ausklappen" : "▲ Einklappen";
    }
}

function toggleBoardDetails(matchId) {
    const details = document.getElementById(`boards-${matchId}`);
    const btn = document.getElementById(`btn-${matchId}`);
    if (!details) return;
    details.classList.toggle("hidden");
    if (btn) {
        if (details.classList.contains("hidden")) {
            btn.textContent = "Brett-Details ▼";
        } else {
            btn.textContent = "Brett-Details ▲";
        }
    }
}

// --- SPIELER-BESTENLISTE ---
function initBestenlisteFilter() {
    const elTeamFilter = document.getElementById("bestenlisteTeamFilter");
    if (!elTeamFilter) return;

    const currentVal = elTeamFilter.value;
    elTeamFilter.innerHTML = '<option value="alle">Alle Teams der Liga</option>';

    const teams = Object.keys(teamSpielerDaten).sort((a, b) => a.localeCompare(b, 'de'));
    teams.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        elTeamFilter.appendChild(opt);
    });

    if (currentVal && Array.from(elTeamFilter.options).some(o => o.value === currentVal)) {
        elTeamFilter.value = currentVal;
    }

    renderBestenliste();
}

function toggleAllTopscorers() {
    showAllTopscorers = !showAllTopscorers;
    renderBestenliste();
}

function renderBestenliste() {
    const tbody = document.getElementById("bestenlisteTbody");
    const elTeamFilter = document.getElementById("bestenlisteTeamFilter");
    const elSearch = document.getElementById("bestenlisteSearch");
    const elSort = document.getElementById("bestenlisteSortSelect");
    if (!tbody) return;

    const filterTeam = elTeamFilter ? elTeamFilter.value : "alle";
    const searchVal = elSearch ? elSearch.value.trim().toLowerCase() : "";
    const sortBy = elSort ? elSort.value : "punkte";

    let alleSpieler = [];

    Object.keys(teamSpielerDaten).forEach(team => {
        const spielerObj = teamSpielerDaten[team];
        Object.keys(spielerObj).forEach(sName => {
            const daten = spielerObj[sName];
            let partien = 0;
            let punkte = 0;
            let elo = "-";

            if (daten.runden) {
                daten.runden.forEach(r => {
                    if (r && r.res !== null && r.res !== undefined) {
                        partien++;
                        punkte += r.res;
                        if (r.ownElo && r.ownElo !== "-" && elo === "-") {
                            elo = r.ownElo;
                        }
                    }
                });
            }

            if (partien > 0) {
                const quote = parseFloat(((punkte / partien) * 100).toFixed(1));
                alleSpieler.push({
                    spielerName: sName,
                    teamName: team,
                    elo: elo,
                    partien: partien,
                    punkte: punkte,
                    quote: quote
                });
            }
        });
    });

    alleSpieler.sort((a, b) => {
        if (sortBy === "quote") {
            if (b.quote !== a.quote) return b.quote - a.quote;
            if (b.partien !== a.partien) return b.partien - a.partien;
            return b.punkte - a.punkte;
        } else if (sortBy === "partien") {
            if (b.partien !== a.partien) return b.partien - a.partien;
            if (b.punkte !== a.punkte) return b.punkte - a.punkte;
            return b.quote - a.quote;
        } else {
            if (b.punkte !== a.punkte) return b.punkte - a.punkte;
            if (b.quote !== a.quote) return b.quote - a.quote;
            if (b.partien !== a.partien) return b.partien - a.partien;
            return a.spielerName.localeCompare(b.spielerName, 'de');
        }
    });

    alleSpieler.forEach((p, idx) => {
        p.rang = idx + 1;
    });

    const spielerListe = alleSpieler.filter(p => {
        if (filterTeam !== "alle" && p.teamName !== filterTeam) return false;
        if (searchVal && !p.spielerName.toLowerCase().includes(searchVal) && !p.teamName.toLowerCase().includes(searchVal)) return false;
        return true;
    });

    if (spielerListe.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.2rem; color: var(--text-secondary);">Keine Spielerdaten für diese Auswahl gefunden.</td></tr>`;
        const toggleCont = document.getElementById("bestenlisteToggleContainer");
        if (toggleCont) toggleCont.innerHTML = "";
        return;
    }

    const isFiltered = (filterTeam !== "alle" || searchVal !== "");
    const totalCount = spielerListe.length;
    let anzuzeigendeSpieler = spielerListe;

    if (!isFiltered && !showAllTopscorers && totalCount > 10) {
        anzuzeigendeSpieler = spielerListe.slice(0, 10);
    }

    tbody.innerHTML = "";

    anzuzeigendeSpieler.forEach((p) => {
        const rang = p.rang;
        let rangDisplay = `${rang}.`;

        const safeTeam = p.teamName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const safeSpieler = p.spielerName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="text-align: center; font-weight: 700; color: ${rang <= 3 ? 'var(--accent-color)' : 'var(--text-secondary)'};">${rangDisplay}</td>
            <td style="font-weight: 700; color: var(--text-primary); cursor: pointer; transition: color 0.2s;"
                onclick="analysiereSpielerAusBestenliste('${safeTeam}', '${safeSpieler}')"
                onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-primary)'"
                title="Klicken für Detailansicht">${p.spielerName}</td>
            <td style="color: var(--text-secondary); font-size: 0.9rem;">${p.teamName}</td>
            <td style="text-align: center; color: var(--accent-color); font-weight: 600;">${p.elo}</td>
            <td style="text-align: center; font-weight: 600; color: var(--text-secondary);">${p.partien}</td>
            <td style="text-align: center; font-weight: 800; color: var(--accent-color); font-size: 1.05rem;">${p.punkte}</td>
            <td>
                <div class="score-bar-container">
                    <span style="font-weight: 700; width: 48px; color: var(--text-primary); font-size: 0.88rem;">${p.quote}%</span>
                    <div class="score-bar">
                        <div class="score-bar-fill" style="width: ${Math.min(100, p.quote)}%;"></div>
                    </div>
                </div>
            </td>
            <td style="text-align: center;">
                <button type="button" class="btn-analyze-player" onclick="analysiereSpielerAusBestenliste('${safeTeam}', '${safeSpieler}')">Analyse</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const toggleCont = document.getElementById("bestenlisteToggleContainer");
    if (toggleCont) {
        if (!isFiltered && totalCount > 10) {
            if (!showAllTopscorers) {
                toggleCont.innerHTML = `<button type="button" class="btn-toggle-all" onclick="toggleAllTopscorers()">Alle ${totalCount} Spieler anzeigen ▼</button>`;
            } else {
                toggleCont.innerHTML = `<button type="button" class="btn-toggle-all" onclick="toggleAllTopscorers()">Nur Top 10 anzeigen ▲</button>`;
            }
        } else {
            toggleCont.innerHTML = "";
        }
    }
}

function analysiereSpielerAusBestenliste(teamName, spielerName) {
    if (!teamName && spielerName) {
        Object.keys(teamSpielerDaten).forEach(t => {
            if (teamSpielerDaten[t][spielerName]) {
                teamName = t;
            }
        });
    }

    const elTeamSelect = document.getElementById("teamSelect");
    const elSpielerSelect = document.getElementById("spielerSelect");

    if (elTeamSelect && teamName) {
        elTeamSelect.value = teamName;
        ladeSpielerFuerTeam(teamName);
        updateGesamtAnsicht();
        renderBegegnungen();
    }
    if (elSpielerSelect && spielerName) {
        elSpielerSelect.value = spielerName;
        updateSpielerBereich();
    }

    const zielEl = document.getElementById("spielerTitel");
    if (zielEl) {
        zielEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function toggleAllMatchCenter(expand) {
    document.querySelectorAll(".round-accordion-body").forEach(body => {
        if (expand) body.classList.remove("hidden");
        else body.classList.add("hidden");
    });
    document.querySelectorAll(".round-accordion-header span[id^='round-icon-']").forEach(icon => {
        icon.textContent = expand ? "▲ Einklappen" : "▼ Ausklappen";
    });
    document.querySelectorAll(".boards-details").forEach(details => {
        if (expand) details.classList.remove("hidden");
        else details.classList.add("hidden");
    });
    document.querySelectorAll(".btn-boards-toggle[id^='btn-']").forEach(btn => {
        btn.textContent = expand ? "Brett-Details ▲" : "Brett-Details ▼";
    });
}

window.toggleRoundAccordion = toggleRoundAccordion;
window.toggleBoardDetails = toggleBoardDetails;
window.toggleAllTopscorers = toggleAllTopscorers;
window.analysiereSpielerAusBestenliste = analysiereSpielerAusBestenliste;
window.toggleAllMatchCenter = toggleAllMatchCenter;

document.addEventListener("DOMContentLoaded", () => {
    ladeDaten();
    
    const elTurnierSelect = document.getElementById("turnierSelect");
    const elSaisonSelect = document.getElementById("saisonSelect");
    const elLigaSelect = document.getElementById("ligaSelect");
    const elTeamSelect = document.getElementById("teamSelect");
    const elSpielerSelect = document.getElementById("spielerSelect");
    const elRundeSelect = document.getElementById("rundeSelect");
    const themeToggle = document.getElementById("theme-toggle");

    if (elTurnierSelect) {
        elTurnierSelect.addEventListener("change", () => {
            updateSaisonSelect();
        });
    }
    if (elSaisonSelect) {
        elSaisonSelect.addEventListener("change", () => {
            updateLigaSelect();
        });
    }
    if (elLigaSelect) {
        elLigaSelect.addEventListener("change", () => {
            anwendenFilterUndBerechnen();
        });
    }

    if (elTeamSelect) {
        elTeamSelect.addEventListener("change", () => {
            ladeSpielerFuerTeam(elTeamSelect.value);
            updateGesamtAnsicht();
            renderBegegnungen();
            renderBestenliste();
        });
    }
    if (elSpielerSelect) {
        elSpielerSelect.addEventListener("change", updateSpielerBereich);
    }
    if (elRundeSelect) {
        elRundeSelect.addEventListener("change", updateGesamtAnsicht);
    }

    const elBegRunde = document.getElementById("begegnungRundeSelect");
    const elBegTeamCheck = document.getElementById("begegnungTeamFilterCheckbox");
    if (elBegRunde) elBegRunde.addEventListener("change", renderBegegnungen);
    if (elBegTeamCheck) elBegTeamCheck.addEventListener("change", renderBegegnungen);

    const elBestenSearch = document.getElementById("bestenlisteSearch");
    const elBestenTeam = document.getElementById("bestenlisteTeamFilter");
    const elBestenSort = document.getElementById("bestenlisteSortSelect");
    if (elBestenSearch) elBestenSearch.addEventListener("input", renderBestenliste);
    if (elBestenTeam) elBestenTeam.addEventListener("change", renderBestenliste);
    if (elBestenSort) elBestenSort.addEventListener("change", renderBestenliste);

    if (themeToggle) {
        themeToggle.addEventListener("change", () => {
            setTimeout(() => {
                updateGesamtAnsicht();
            }, 50);
        });
    }

    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});
