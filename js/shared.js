/**
 * shared.js - Gemeinsame Logik für alle Seiten (Startseite & Archive)
 */

window.cleanMojibake = function (text) {
    if (!text || typeof text !== 'string') return text;
    text = text
        .replace(/^\uFEFF/, '')
        .replace(/ðŸ–¼ï¸ /g, '🖼️').replace(/ðŸ–¼/g, '🖼️')
        .replace(/Ã¤/g, 'ä').replace(/Ã„/g, 'Ä')
        .replace(/Ã¶/g, 'ö').replace(/Ã–/g, 'Ö')
        .replace(/Ã¼/g, 'ü').replace(/Ãœ/g, 'Ü')
        .replace(/ÃŸ/g, 'ß')
        .replace(/â€“/g, '–').replace(/â€”/g, '—')
        .replace(/â€œ/g, '"').replace(/â€\x9D/g, '"').replace(/â€\x9C/g, '"')
        .replace(/â€™/g, "'").replace(/â€˜/g, "'")
        .replace(/â‚¬/g, '€').replace(/Ã¢â€šÂ¬/g, '€')
        .replace(/Â·/g, '·').replace(/Â /g, ' ')
        .replace(/â€¢/g, '•')
        .replace(/â†’/g, '→').replace(/â†'/g, '→')
        .replace(/â€‚/g, ' ').replace(/â€ƒ/g, ' ')
        .replace(/â€¦/g, '…')
        .replace(/Â°/g, '°')
        .replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ã /g, 'à').replace(/Ã§/g, 'ç')
        .replace(/Ã¢/g, 'â').replace(/Ãª/g, 'ê').replace(/Ã®/g, 'î').replace(/Ã´/g, 'ô').replace(/Ã»/g, 'û');

    try {
        if (/[\u00C2-\u00F4][\u0080-\u00BF]/.test(text) || text.includes('Ã') || text.includes('ð')) {
            const bytes = new Uint8Array(text.length);
            let canConvert = true;
            for (let i = 0; i < text.length; i++) {
                const code = text.charCodeAt(i);
                if (code > 255) { canConvert = false; break; }
                bytes[i] = code;
            }
            if (canConvert) {
                const decoded = new TextDecoder('utf-8').decode(bytes);
                if (decoded && !decoded.includes('�')) {
                    text = decoded;
                }
            }
        }
    } catch (e) { }
    return text;
};

// --- Flexible & Dynamic Rating Helpers ---
window.parseCleanNumber = function (val) {
    if (val === null || val === undefined || val === '-' || val === '') return 0;
    const cleaned = val.toString().replace(/[="]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};

window.getPlayerRatingVal = function (player, col) {
    if (!player || !col) return 0;
    const key = col.key || '';
    const rawKey = col.rawKey || '';
    let val = player[rawKey];
    if (val === undefined) val = player[key];
    if (val === undefined && key) val = player[key.toUpperCase()];
    if (val === undefined && col.label) val = player[col.label];
    return window.parseCleanNumber(val);
};

window.getRatingColumns = function (players) {
    if (!players || !players.length) return [];
    const firstP = players[0] || {};
    const globalSettings = players.globalSettings || (firstP._globalSettings || {});

    const allKeys = players.headers || Object.keys(firstP);
    const excludeRegex = /^id$|^teamid$|^teamids$|^team$|^name$|^avatar$|^image$|^role$|^title$|^titel$|^email$|^mail$|^schweiz$|^deutschland$|^telefon$|^phone$|^mobil$|^mobile$|^plz$|^zip$|^ort$|^city$|^adresse$|^address$|^_globalsettings$|^x$|^y$|^vx$|^vy$|^radius$|^isdragging$|^isexpanded$|^ishidden$|^el$|^playerdata$|^enddate$|^endtime$|^locationurl$|jahr|year|geb|birth|alter|age|nr|nummer|number/i;

    const ratingCols = [];
    allKeys.forEach(rawKey => {
        if (!rawKey) return;
        const key = rawKey.toLowerCase();
        if (excludeRegex.test(rawKey) || excludeRegex.test(key)) return;
        if (globalSettings[key] === false || globalSettings[rawKey] === false || globalSettings[rawKey.toLowerCase()] === false) return;

        // Strictly only accept columns whose name explicitly indicates a rating or scoring system
        const isKnownName = /elo|dwz|fide|ssb|rating|wertung|blitz|rapid|classic|zahl|nwz|punkte|score/i.test(rawKey);
        if (!isKnownName) return;

        let numericCount = 0;
        let maxVal = 0;
        players.forEach(p => {
            const val = window.parseCleanNumber(p[rawKey] !== undefined ? p[rawKey] : (p[key] !== undefined ? p[key] : (p[key.toUpperCase()] !== undefined ? p[key.toUpperCase()] : 0)));
            if (val > 0) {
                numericCount++;
                if (val > maxVal) maxVal = val;
            }
        });

        if (numericCount > 0) {
            if (!ratingCols.some(c => c.key === key)) {
                let label = rawKey;
                if (key === 'elo') label = 'ELO';
                else if (key === 'dwz') label = 'DWZ';
                const roundedMax = Math.ceil(Math.max(maxVal, 2000) / 100) * 100;
                ratingCols.push({ key: key, rawKey: rawKey, label: label, max: roundedMax });
            }
        }
    });
    return ratingCols;
};

window.matchesPlayerFilter = function (player) {
    if (!player) return false;
    const anyConnected = Object.values(window.teamConnected || {}).some(v => v);
    const query = (window.teamsSearchQuery || '').trim().toLowerCase();

    // 1. Team Legend Check
    const matchesTeam = !anyConnected ||
        (player.teamIds && player.teamIds.some(tId => window.teamConnected[tId])) ||
        window.teamConnected[player.teamId];
    if (!matchesTeam) return false;

    // 2. Search Query Check
    const matchesSearch = !query ||
        (player.name && player.name.toLowerCase().includes(query)) ||
        (player.Team && player.Team.toLowerCase().includes(query)) ||
        (player.team && player.team.toLowerCase().includes(query));
    if (!matchesSearch) return false;

    // 3. Rating Range Slider Check (Single active rating dropdown + dual thumb slider)
    const filter = window.teamsRatingFilter;
    if (filter && filter.colKey && filter.colKey !== 'none') {
        const col = (window.playersRatingColumns || []).find(c => c.key === filter.colKey);
        if (col) {
            const val = window.getPlayerRatingVal(player, col);
            if (val === 0) {
                if (filter.min > 0) return false;
            } else {
                if (val < filter.min || val > filter.max) return false;
            }
        }
    }

    return true;
};

// --- Flexible Date Parsing ---
// Supports: DD.MM.YYYY, DD.MM.YY, MM.YYYY, MM.YY, YYYY, YYYY-MM-DD, YY-MM-DD, YYYYMMDD, YYMMDD, German month texts, ?, TBD, empty
window.parseFlexDate = function (dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return { date: null, type: 'tbd' };
    const s = dateStr.trim();
    if (s === '?' || s.toLowerCase() === 'tbd' || s.toLowerCase() === 'tba' || s.toLowerCase() === 'offen') {
        return { date: null, type: 'tbd' };
    }

    const toFullYear = (yStr) => {
        const y = parseInt(yStr, 10);
        return y < 100 ? (y < 50 ? 2000 + y : 1900 + y) : y;
    };

    const germanMonths = {
        'januar': 0, 'jan': 0,
        'februar': 1, 'feb': 1,
        'märz': 2, 'maerz': 2, 'mrz': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'mai': 4,
        'juni': 5, 'jun': 5,
        'juli': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8, 'sept': 8,
        'oktober': 9, 'okt': 9,
        'november': 10, 'nov': 10,
        'dezember': 11, 'dez': 11
    };

    // 1. Text match: e.g. "11. September 2026"
    const textFullMatch = s.match(/^(\d{1,2})\.\s*([a-zA-ZäöüÄÖÜ]+)\s+(\d{2,4})$/);
    if (textFullMatch) {
        const day = parseInt(textFullMatch[1], 10);
        const mKey = textFullMatch[2].toLowerCase();
        const year = toFullYear(textFullMatch[3]);
        if (germanMonths[mKey] !== undefined) {
            return { date: new Date(year, germanMonths[mKey], day, 0, 0, 0), type: 'full' };
        }
    }
    // Text match: e.g. "Juni 2026" or "Sep 26"
    const textMonthMatch = s.match(/^([a-zA-ZäöüÄÖÜ]+)\s+(\d{2,4})$/);
    if (textMonthMatch) {
        const mKey = textMonthMatch[1].toLowerCase();
        const year = toFullYear(textMonthMatch[2]);
        if (germanMonths[mKey] !== undefined) {
            return { date: new Date(year, germanMonths[mKey], 1, 0, 0, 0), type: 'month' };
        }
    }

    // 2. DD.MM.YYYY or DD.MM.YY (German dot format)
    if (s.includes('.')) {
        const parts = s.split('.');
        if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && (parts[2].length === 4 || parts[2].length === 2)) {
            const y = toFullYear(parts[2]);
            return { date: new Date(`${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`), type: 'full' };
        }
        if (parts.length === 2 && parts[0].length <= 2 && (parts[1].length === 4 || parts[1].length === 2)) {
            const y = toFullYear(parts[1]);
            return { date: new Date(`${y}-${parts[0].padStart(2, '0')}-01T00:00:00`), type: 'month' };
        }
    }

    // 3. YYYYMMDD (compact 8 digits) -> e.g. 20260911
    if (/^\d{8}$/.test(s)) {
        return { date: new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00`), type: 'full' };
    }

    // 4. YYMMDD (compact 6 digits) -> e.g. 260911
    if (/^\d{6}$/.test(s)) {
        const yy = toFullYear(s.slice(0, 2));
        const mm = s.slice(2, 4);
        const dd = s.slice(4, 6);
        return { date: new Date(`${yy}-${mm}-${dd}T00:00:00`), type: 'full' };
    }

    // 5. YYYY-MM-DD or YY-MM-DD (ISO)
    if (/^\d{2,4}-\d{2}-\d{2}$/.test(s)) {
        const parts = s.split('-');
        const y = toFullYear(parts[0]);
        return { date: new Date(`${y}-${parts[1]}-${parts[2]}T00:00:00`), type: 'full' };
    }

    // 6. YYYY-MM or YY-MM (ISO month)
    if (/^\d{2,4}-\d{2}$/.test(s)) {
        const parts = s.split('-');
        const y = toFullYear(parts[0]);
        return { date: new Date(`${y}-${parts[1]}-01T00:00:00`), type: 'month' };
    }

    // 7. YYYY (year only)
    if (/^\d{4}$/.test(s)) {
        return { date: new Date(`${s}-01-01T00:00:00`), type: 'year' };
    }

    // Fallback: try native parsing
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        return { date: d, type: 'full' };
    }
    return { date: null, type: 'tbd' };
};

function getShortMonthDe(date) {
    if (!date || typeof date.getMonth !== 'function' || isNaN(date.getMonth())) return '';
    const months = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
    return months[date.getMonth()] || '';
}

function getShortMonthTextDe(date) {
    if (!date || typeof date.getMonth !== 'function' || isNaN(date.getMonth())) return '';
    const months = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
    return months[date.getMonth()] || '';
}

window.formatFlexDate = function (dateStr) {
    const parsed = window.parseFlexDate(dateStr);
    if (parsed.type === 'tbd') return { weekday: '', day: '?', month: 'TBD', full: 'Datum noch offen', type: 'tbd' };
    if (parsed.type === 'year') {
        const year = parsed.date.getFullYear();
        return { weekday: '', day: year, month: '', full: String(year), type: 'year' };
    }
    if (parsed.type === 'month') {
        const monthLong = parsed.date.toLocaleDateString('de-DE', { month: 'long' });
        const monthShort = getShortMonthDe(parsed.date);
        const year = parsed.date.getFullYear();
        return { weekday: '', day: monthShort, month: year, full: `${monthLong} ${year}`, type: 'month' };
    }
    // full date
    const d = parsed.date;
    return {
        weekday: d.toLocaleDateString('de-DE', { weekday: 'short' }).replace(/\.$/, '').toUpperCase(),
        day: d.getDate(),
        month: getShortMonthDe(d),
        full: d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }),
        type: 'full'
    };
};

// Get a sortable date (for comparisons), with range start or TBD sorted properly
window.parseDateSortable = function (dateStr) {
    if (!dateStr) return new Date('2099-12-31T00:00:00');
    let s = String(dateStr).trim();
    if (s.includes(' - ') || s.includes('–') || s.includes(' bis ')) {
        s = s.split(/\s+[-–]\s+|\s+bis\s+/i)[0].trim();
    }
    const parsed = window.parseFlexDate(s);
    if (!parsed.date) return new Date('2099-12-31T00:00:00');
    return parsed.date;
};

// Helper to get exact end of a period (day, month, year, or TBD future)
function _resolveDateEnd(dateStr) {
    if (!dateStr) return new Date('2099-12-31T23:59:59');
    const parsed = window.parseFlexDate(dateStr);
    if (!parsed.date || parsed.type === 'tbd') {
        return new Date('2099-12-31T23:59:59');
    }
    const d = parsed.date;
    const year = d.getFullYear();
    const month = d.getMonth();
    if (parsed.type === 'year') {
        return new Date(year, 11, 31, 23, 59, 59);
    }
    if (parsed.type === 'month') {
        return new Date(year, month + 1, 0, 23, 59, 59);
    }
    return new Date(year, month, d.getDate(), 23, 59, 59);
}

// Get end date of range for past/upcoming check
window.getEventEndDate = function (event) {
    if (!event) return new Date('2099-12-31T23:59:59');
    const endRaw = (event.endDate || '').trim();
    const startRaw = (event.date || '').trim();
    let endStr = endRaw;
    if (!endStr && (startRaw.includes(' - ') || startRaw.includes('–') || startRaw.includes(' bis '))) {
        const parts = startRaw.split(/\s+[-–]\s+|\s+bis\s+/i);
        if (parts.length === 2) endStr = parts[1].trim();
    }
    if (endStr) {
        return _resolveDateEnd(endStr);
    }
    return _resolveDateEnd(startRaw);
};

window.formatEventDateBox = function (event) {
    if (!event) return '';
    const startRaw = (event.date || '').trim();
    const endRaw = (event.endDate || '').trim();

    let startStr = startRaw;
    let endStr = endRaw;
    if (!endStr && (startRaw.includes(' - ') || startRaw.includes('–') || startRaw.includes(' bis '))) {
        const parts = startRaw.split(/\s+[-–]\s+|\s+bis\s+/i);
        if (parts.length === 2) {
            startStr = parts[0].trim();
            endStr = parts[1].trim();
        }
    }

    if (endStr) {
        const parsedStart = window.parseFlexDate(startStr);
        const parsedEnd = window.parseFlexDate(endStr);

        if (parsedStart.date && parsedEnd.date) {
            const d1 = parsedStart.date;
            const d2 = parsedEnd.date;
            if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
                const day1 = d1.getDate();
                const day2 = d2.getDate();
                const monthShort = getShortMonthDe(d1);
                return `<span class="event-day" style="font-size: 1.15rem; letter-spacing: -0.5px; white-space: nowrap;">${day1}.–${day2}.</span><span class="event-month">${monthShort}</span>`;
            } else if (d1.getFullYear() !== d2.getFullYear()) {
                const d1Day = d1.getDate();
                const d1Month = getShortMonthDe(d1);
                const y1 = String(d1.getFullYear()).slice(-2);
                const d2Day = d2.getDate();
                const d2Month = getShortMonthDe(d2);
                const y2 = String(d2.getFullYear()).slice(-2);
                return `<span class="event-day" style="font-size: 0.82rem; line-height: 1.2; white-space: nowrap;">${d1Day}. ${d1Month} '${y1}</span><span class="event-weekday" style="font-size: 0.65rem; opacity: 0.75; margin: 2px 0;">BIS</span><span class="event-day" style="font-size: 0.82rem; line-height: 1.2; white-space: nowrap;">${d2Day}. ${d2Month} '${y2}</span>`;
            } else {
                const d1Day = d1.getDate();
                const d1Month = getShortMonthDe(d1);
                const d2Day = d2.getDate();
                const d2Month = getShortMonthDe(d2);
                return `<span class="event-day" style="font-size: 0.88rem; line-height: 1.25; white-space: nowrap;">${d1Day}. ${d1Month}</span><span class="event-weekday" style="font-size: 0.65rem; opacity: 0.75; margin: 2px 0;">BIS</span><span class="event-day" style="font-size: 0.88rem; line-height: 1.25; white-space: nowrap;">${d2Day}. ${d2Month}</span>`;
            }
        } else {
            return `<span class="event-day" style="font-size: 0.8rem; line-height: 1.25;">${startStr}</span><span class="event-weekday" style="font-size: 0.65rem; opacity: 0.75; margin: 2px 0;">BIS</span><span class="event-day" style="font-size: 0.8rem; line-height: 1.25;">${endStr}</span>`;
        }
    }

    const fmt = window.formatFlexDate(startStr);
    if (fmt.type === 'tbd') {
        return `<span class="event-day" style="font-size: 1.8rem;">?</span><span class="event-month">TBD</span>`;
    } else if (fmt.type === 'year') {
        return `<span class="event-day" style="font-size: 1.2rem;">${fmt.day}</span>`;
    } else if (fmt.type === 'month') {
        return `<span class="event-day" style="font-size: 1.1rem;">${fmt.day}</span><span class="event-month">${fmt.month}</span>`;
    } else {
        return `<span class="event-weekday">${fmt.weekday}</span><span class="event-day">${fmt.day}</span><span class="event-month">${fmt.month}</span>`;
    }
};

window.formatEventTimeDisplay = function (event) {
    if (!event) return '';
    const t = (event.time || '').trim();
    const et = (event.endTime || '').trim();
    if (!t && !et) return '';

    const startRaw = (event.date || '').trim();
    const endRaw = (event.endDate || event.end_date || event.enddate || event.bis || '').trim();
    const isMultiDay = endRaw && endRaw !== startRaw;

    const cleanTime = (str) => str.replace(/\s*[Uu]hr\s*$/i, '').trim();

    if (isMultiDay) {
        const parsedStart = window.parseFlexDate(startRaw);
        const parsedEnd = window.parseFlexDate(endRaw);
        const crossesYear = parsedStart.date && parsedEnd.date && parsedStart.date.getFullYear() !== parsedEnd.date.getFullYear();

        const formatShortTag = (p, fallback) => {
            if (p && p.date) {
                const day = p.date.getDate().toString().padStart(2, '0');
                const monthShort = getShortMonthTextDe(p.date);
                const yearStr = crossesYear ? ` '${String(p.date.getFullYear()).slice(-2)}` : '';
                return `${day}. ${monthShort}${yearStr}`;
            }
            return fallback;
        };
        const sTag = formatShortTag(parsedStart, startRaw);
        const eTag = formatShortTag(parsedEnd, endRaw);

        if (t && et) {
            return `🕒 ${sTag} ab ${cleanTime(t)} Uhr – ${eTag} bis ${cleanTime(et)} Uhr`;
        }
        if (t) {
            return `🕒 ${sTag} ab ${cleanTime(t)} Uhr`;
        }
        if (et) {
            return `🕒 ${eTag} bis ${cleanTime(et)} Uhr`;
        }
    }

    if (t && et) {
        return `🕒 ${cleanTime(t)} - ${cleanTime(et)} Uhr`;
    }
    if (t) {
        const suffix = (t.toLowerCase().includes('uhr') || /^[a-zA-Z]/.test(t)) ? '' : ' Uhr';
        return `🕒 ${t}${suffix}`;
    }
    const suffix = (et.toLowerCase().includes('uhr') || /^[a-zA-Z]/.test(et)) ? '' : ' Uhr';
    return `🕒 bis ${et}${suffix}`;
};

window.formatEventModalDateHeader = function (event) {
    if (!event) return '';
    const startRaw = (event.date || '').trim();
    const endRaw = (event.endDate || event.end_date || event.enddate || event.bis || '').trim();

    let startStr = startRaw;
    let endStr = endRaw;
    if (!endStr && (startRaw.includes(' - ') || startRaw.includes('–') || startRaw.includes(' bis '))) {
        const parts = startRaw.split(/\s+[-–]\s+|\s+bis\s+/i);
        if (parts.length === 2) {
            startStr = parts[0].trim();
            endStr = parts[1].trim();
        }
    } else if (!endStr && /^\d{1,2}\.?(\d{1,2}\.?)?\s*[-–]\s*\d{1,2}\.?/.test(startRaw)) {
        const parts = startRaw.split(/\s*[-–]\s*/);
        if (parts.length === 2) {
            startStr = parts[0].trim();
            endStr = parts[1].trim();
        }
    }

    if (endStr) {
        const parsedStart = window.parseFlexDate(startStr);
        const parsedEnd = window.parseFlexDate(endStr);
        if (parsedStart.date && parsedEnd.date) {
            const d1 = parsedStart.date;
            const d2 = parsedEnd.date;
            const m1 = getShortMonthDe(d1);
            const m2 = getShortMonthDe(d2);
            if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()) {
                return `${d1.getDate()}. – ${d2.getDate()}. ${m2} ${d2.getFullYear()}`;
            } else if (d1.getFullYear() === d2.getFullYear()) {
                return `${d1.getDate()}. ${m1} – ${d2.getDate()}. ${m2} ${d2.getFullYear()}`;
            } else {
                return `${d1.getDate()}. ${m1} ${d1.getFullYear()} – ${d2.getDate()}. ${m2} ${d2.getFullYear()}`;
            }
        }
        return `${startStr} – ${endStr}`;
    }

    const parsed = window.parseFlexDate(startStr);
    if (parsed.date) {
        const d = parsed.date;
        return `${d.getDate()}. ${getShortMonthDe(d)} ${d.getFullYear()}`;
    }
    return startRaw;
};

window.formatEventMetaHeader = function (event) {
    if (!event) return '';
    const startRaw = (event.date || '').trim();
    const endRaw = (event.endDate || event.end_date || event.enddate || event.bis || '').trim();
    const isMultiDay = endRaw && endRaw !== startRaw;
    const t = (event.time || '').trim();
    const et = (event.endTime || '').trim();

    const cleanTime = (str) => str.replace(/\s*[Uu]hr\s*$/i, '').trim();

    if (isMultiDay && (t || et)) {
        const parsedStart = window.parseFlexDate(startRaw);
        const parsedEnd = window.parseFlexDate(endRaw);
        const crossesYear = parsedStart.date && parsedEnd.date && parsedStart.date.getFullYear() !== parsedEnd.date.getFullYear();
        const formatShortTag = (p, fallback, incYear) => {
            if (p && p.date) {
                const day = p.date.getDate().toString().padStart(2, '0');
                const monthShort = getShortMonthDe(p.date);
                const yearStr = (incYear || crossesYear) ? ` ${p.date.getFullYear()}` : '';
                return `${day}. ${monthShort}${yearStr}`;
            }
            return fallback;
        };
        const sTag = formatShortTag(parsedStart, startRaw, false);
        const eTag = formatShortTag(parsedEnd, endRaw, true);

        if (t && et) {
            return `🕒 ${sTag} ab ${cleanTime(t)} Uhr – ${eTag} bis ${cleanTime(et)} Uhr`;
        }
        if (t) {
            return `🕒 ${sTag} ab ${cleanTime(t)} Uhr – ${eTag}`;
        }
        if (et) {
            return `🕒 ${sTag} – ${eTag} bis ${cleanTime(et)} Uhr`;
        }
    }

    const dateStr = window.formatEventModalDateHeader ? window.formatEventModalDateHeader(event) : startRaw;
    const timeStr = window.formatEventTimeDisplay ? window.formatEventTimeDisplay(event) : '';
    return [dateStr, timeStr].filter(Boolean).join(' | ');
};

// Backward-compatible parseDate (used everywhere)
window.parseDate = function (dateStr) {
    const parsed = window.parseFlexDate(dateStr);
    return parsed.date || new Date();
};

window.fetchTextWithEncoding = async function (response) {
    if (!response) return '';
    // If already decoded (e.g. from external source), return text directly
    if (response._alreadyDecoded) {
        return await response.text();
    }
    let text = '';
    try {
        const buffer = await response.arrayBuffer();
        try {
            const decoderUTF8 = new TextDecoder('utf-8', { fatal: true });
            text = decoderUTF8.decode(buffer);
        } catch (e) {
            const decoderANSI = new TextDecoder('windows-1252');
            text = decoderANSI.decode(buffer);
        }
    } catch (err) {
        text = await response.text();
    }
    return window.cleanMojibake(text);
};

window.sourcesConfigCache = null;

// parseCSVShared ist weiter unten einmalig definiert (Function Hoisting).

window.loadSourcesConfig = async function () {
    if (window.sourcesConfigCache) return window.sourcesConfigCache;
    window.sourcesConfigCache = {};
    try {
        const res = await fetch('data/sources.csv?t=' + new Date().getTime(), { cache: 'no-store' });
        if (!res.ok) return window.sourcesConfigCache;
        const text = await window.fetchTextWithEncoding(res);
        const rows = parseCSVShared(text);
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row && row.length >= 1) {
                const fname = (row[0] || '').trim();
                const source = row.length >= 2 ? (row[1] || '').trim() : '';
                // Spalte 3 ist in sources.csv die Beschreibung – nur als gid übernehmen, wenn numerisch
                const col3 = row.length >= 3 ? (row[2] || '').trim() : '';
                const gid = /^\d+$/.test(col3) ? col3 : '0';
                if (fname) {
                    window.sourcesConfigCache[fname] = {
                        source: source,
                        gid: gid || '0'
                    };
                }
            }
        }
    } catch (e) {
        console.warn('Could not load sources.csv config:', e);
    }
    return window.sourcesConfigCache;
};

window.fetchCSVSource = async function (localUrl) {
    const cleanPath = localUrl.split('?')[0];
    const parts = cleanPath.split('/');
    const filename = parts[parts.length - 1];

    const sourcesMap = await window.loadSourcesConfig();
    const config = sourcesMap[filename];

    if (config && config.source && config.source.trim() !== '') {
        let remoteUrl = config.source.trim();
        try {
            const sep = remoteUrl.includes('?') ? '&' : '?';
            const fetchUrl = remoteUrl + sep + '_cb=' + Date.now();
            const res = await fetch(fetchUrl, { cache: 'no-store', redirect: 'follow', mode: 'cors' });
            if (res.ok) {
                let text = await res.text();
                text = window.cleanMojibake ? window.cleanMojibake(text) : text;
                if (text && !text.trim().toLowerCase().startsWith('<!doctype html') && !text.trim().toLowerCase().startsWith('<html')) {
                    // Convert comma CSV to semicolon if needed
                    if (text.includes(',') && !text.split('\n')[0].includes(';')) {
                        text = window._convertCommaCsvToSemicolon(text);
                    }
                    return {
                        ok: true,
                        status: 200,
                        _alreadyDecoded: true,
                        text: async () => text,
                        arrayBuffer: async () => new TextEncoder().encode(text).buffer
                    };
                }
            }
        } catch (e) {
            console.warn(`[fetchCSVSource] Error fetching remote source for ${filename}, falling back to local CSV:`, e);
        }
    }

    const separator = localUrl.includes('?') ? '&' : '?';
    const finalLocalUrl = localUrl + (localUrl.includes('t=') ? '' : separator + 't=' + new Date().getTime());
    const fallbackRes = await fetch(finalLocalUrl, { cache: 'no-store' });
    if (!fallbackRes.ok) return fallbackRes;

    // Check if the fallback response is actually an HTML error page
    const contentType = fallbackRes.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
        console.error(`[fetchCSVSource] Expected CSV but received HTML for ${localUrl}`);
        throw new Error(`Expected CSV but received HTML for ${localUrl}`);
    }

    return fallbackRes;
};

// Convert comma-separated CSV to semicolon-separated (for external CSV sources)
window._convertCommaCsvToSemicolon = function (text) {
    const lines = text.split(/\r?\n/);
    const result = [];
    for (const line of lines) {
        if (!line.trim()) { result.push(''); continue; }
        // Parse comma-separated fields respecting quotes
        const fields = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    fields.push(current);
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        fields.push(current);
        // Re-join with semicolons, quoting fields that contain semicolons
        result.push(fields.map(f => f.includes(';') ? '"' + f.replace(/"/g, '""') + '"' : f).join(';'));
    }
    return result.join('\n');
};

window.formatTextContent = function (text) {
    if (!text) return '';
    text = window.cleanMojibake(text);
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    let formattedText = text.replace(/((?:https?:\/\/|www\.)[^\s]+)/g, function (url) {
        let punctuation = '';
        if (url.match(/[.,;!?)]$/)) {
            punctuation = url.slice(-1);
            url = url.slice(0, -1);
        }
        let href = url;
        if (href.startsWith('www.')) {
            href = 'https://' + href;
        }
        return `<a href="${href}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">${url}</a>${punctuation}`;
    });
    const paragraphs = formattedText.split(/\r?\n\r?\n/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => `<p style="margin-bottom: 1rem;">${p.replace(/\r?\n/g, '<br>')}</p>`).join('');
    }
    return formattedText.replace(/\r?\n/g, '<br>');
};

window.stripHtml = function (html) {
    if (!html) return '';
    const tmp = document.createElement("DIV");
    // Preserve spacing for block elements before extracting textContent
    tmp.innerHTML = html.replace(/<br\s*[\/]?>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, ' ');
    return (tmp.textContent || tmp.innerText || "").trim().replace(/\s+/g, ' ');
};

window.formatImageUrl = function (imgUrl) {
    if (!imgUrl || typeof imgUrl !== 'string') return '';
    let url = imgUrl.trim().replace(/\\/g, '/');

    if (url.startsWith('/assets/')) {
        url = '.' + url;
    } else if (url.startsWith('assets/')) {
        url = './' + url;
    }

    // Vermeide Doppel-Encoding von bereits encodierten URLs (Cloudinary etc.)
    if (url.startsWith('http') || url.includes('%')) {
        return url;
    }

    return encodeURI(url);
};

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle');

    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggle) themeToggle.checked = true;
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
            }
        });
    }
}

function initHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', (e) => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
            if (navLinks.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        navLinks.addEventListener('click', (e) => {
            const anchor = e.target.closest('a');
            if (anchor && !anchor.classList.contains('dropdown-toggle')) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
        // Menü schließen, wenn außerhalb geklickt wird
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && !hamburger.contains(e.target)) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

window.globalInfoData = null;

function parseCSVShared(text) {
    if (!text) return [];
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
    const result = [];
    let row = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') { current += '"'; i++; }
                else { inQuotes = false; }
            } else { current += char; }
        } else {
            if (char === '"') { inQuotes = true; }
            else if (char === ';') { row.push(current); current = ''; }
            else if (char === '\n' || char === '\r') {
                if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
                row.push(current);
                if (row.some(field => field.trim() !== '')) result.push(row);
                row = [];
                current = '';
            } else { current += char; }
        }
    }
    if (current || row.length > 0) {
        row.push(current);
        if (row.some(field => field.trim() !== '')) result.push(row);
    }
    return result;
}

// Liest die Bankverbindungs-Daten aus info.csv (einfache Textzellen bank.ch / bank.de,
// oder – rückwärtskompatibel – das alte HTML-Feld legal.bankverbindung).
window.getBankInfo = function (info) {
    const bank = (info && (info.bank || info.Bank)) || {};
    const legal = (info && (info.legal || info.Legal)) || {};
    return {
        ch: String(bank.ch || bank.CH || '').trim(),
        de: String(bank.de || bank.DE || '').trim(),
        legacy: String(legal.bankverbindung || legal.Bankverbindung || (info && (info.bankverbindung || info.Bankverbindung)) || '').trim()
    };
};

window.renderGlobalFooter = function (info) {
    if (!info) return;

    // Bankverbindungs-Link im Footer nur zeigen, wenn in info.csv Inhalt hinterlegt ist
    const bankInfo = window.getBankInfo(info);
    const hasBank = bankInfo.ch !== '' || bankInfo.de !== '' || bankInfo.legacy !== '';
    const bankSep = document.getElementById('footer-bank-sep');
    if (bankSep) bankSep.style.display = hasBank ? 'inline' : 'none';

    const contactContainer = document.getElementById('footer-contact-container');
    if (contactContainer && info.contact) {
        let emails = info.contact.email ? info.contact.email.split(';').map(e => `<a href="mailto:${e.trim()}">${e.trim()}</a>`).join('<br>') : '';
        let phones = info.contact.phone || '';
        contactContainer.innerHTML = `
            ${emails ? `<p>${emails}</p>` : ''}
            ${phones ? `<p>${phones}</p>` : ''}
        `;
    }

    const copyrightLine = document.getElementById('footer-copyright-line');
    const copyrightText = info?.footer?.copyright || info?.Footer?.copyright || info?.Footer?.Copyright || info?.footer?.Copyright || info?.copyright || info?.Copyright;
    if (copyrightLine && copyrightText && copyrightText.trim() !== '') {
        copyrightLine.innerHTML = copyrightText;
    } else {
        const yearEl = document.getElementById('current-year');
        const nameEl = document.getElementById('footer-club-name');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
        if (nameEl && info.clubName) nameEl.textContent = info.clubName;
    }
};

window.getOrFetchEventsForBadge = async function () {
    if (window.cachedEventsDataForBadge) return window.cachedEventsDataForBadge;
    if (typeof globalEventsData !== 'undefined' && Array.isArray(globalEventsData) && globalEventsData.length > 0) {
        window.cachedEventsDataForBadge = globalEventsData;
        return window.cachedEventsDataForBadge;
    }
    let eventsData = [];
    try {
        const evResp = await window.fetchCSVSource('data/events.csv');
        if (evResp.ok) {
            const evText = await window.fetchTextWithEncoding(evResp);
            const evRows = parseCSVShared(evText);
            if (evRows.length > 1) {
                for (let i = 1; i < evRows.length; i++) {
                    const obj = {};
                    evRows[0].forEach((h, idx) => {
                        const header = (h || '').trim();
                        if (header) {
                            const val = (evRows[i][idx] || '').trim();
                            obj[header] = val;
                            obj[header.toLowerCase()] = val;
                        }
                    });
                    eventsData.push(obj);
                }
            }
        }
    } catch (e) { /* Events optional für Badge */ }
    window.cachedEventsDataForBadge = eventsData;
    return eventsData;
};

window.loadGlobalInfoAndFooter = async function () {
    try {
        const response = await window.fetchCSVSource('data/info.csv');
        if (!response.ok) return;
        const text = await window.fetchTextWithEncoding(response);
        const rows = parseCSVShared(text);
        const info = {};
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length >= 2) {
                const keyPath = (row[0] || '').trim().replace(/^"|"$/g, '');
                const val = (row[1] || '').trim().replace(/^"|"$/g, '');
                if (!keyPath) continue;
                const parts = keyPath.split('.');
                let current = info;
                for (let j = 0; j < parts.length - 1; j++) {
                    const part = parts[j];
                    const partLower = part.toLowerCase();
                    if (!current[part]) current[part] = {};
                    if (!current[partLower]) current[partLower] = current[part];
                    current = current[part];
                }
                const lastPart = parts[parts.length - 1];
                current[lastPart] = val;
                current[lastPart.toLowerCase()] = val;
            }
        }
        window.globalInfoData = info;
        window.renderGlobalFooter(info);

        const eventsData = await window.getOrFetchEventsForBadge();
        window.initTodayStatusBadge(info, eventsData);
    } catch (e) {
        console.warn('Could not load global info for footer:', e);
    }
};

window.formatCompactTodayTime = function (text) {
    if (!text) return '';
    let t = String(text).trim();

    // 1. Zeiträume mit - oder – oder bis formatieren und ungerade/gerade Minuten beachten
    // Nur "Uhr" anhängen, wenn vorher in dem Match auch tatsächlich "Uhr" stand!
    t = t.replace(/(\b\d{1,2}(?::\d{2})?\b)\s*(?:[-–]|bis)\s*(\b\d{1,2}(?::\d{2})?\b)(?:\s*Uhr)?/gi, (full, start, end) => {
        const s = start.replace(/:00$/, '');
        const e = end.replace(/:00$/, '');
        const hasUhr = /uhr/i.test(full);
        return `${s}-${e}${hasUhr ? ' Uhr' : ''}`;
    });

    // 2. Einzelzeiten wie "ab 18:00 Uhr" oder "18:00 Uhr" kappen falls :00
    t = t.replace(/\b(\d{1,2}):00\b(?:\s*Uhr)?/gi, (full, hour) => {
        if (/uhr/i.test(full)) return `${hour} Uhr`;
        return `${hour}`;
    });

    // 3. Doppelte "Uhr & ... Uhr" zusammenfassen zu "17-19 & 20-22 Uhr"
    t = t.replace(/(Uhr\s*&\s*\d{1,2}(?::\d{2})?[-–]\d{1,2}(?::\d{2})?)\s*Uhr/gi, '$1 Uhr');

    return t.trim();
};

// Kanonische Version (einheitlich auf allen Seiten): leer/fehlend = false.
window.isYes = function (val) {
    if (val === undefined || val === null || String(val).trim() === '') return false;
    const str = String(val).trim().toLowerCase();
    return str === 'ja' || str === 'j' || str === 'yes' || str === 'y' || str === '1' || str === 'true' || str === 'x' || str === 'ch' || str === 'de';
};

window.resolveStatusOrColor = function (statusRaw, textRaw) {
    const s = String(statusRaw || '').trim();
    const sLower = s.toLowerCase();
    const tLower = String(textRaw || '').trim().toLowerCase();

    if (sLower === 'rot' || sLower === 'red' || sLower === 'closed' || sLower === 'nein' || sLower === 'geschlossen' || sLower === 'ausfall') {
        return { isClosed: true, customColor: null };
    }
    if (sLower === 'grün' || sLower === 'green' || sLower === 'open' || sLower === 'ja' || sLower === 'geöffnet') {
        return { isClosed: false, customColor: null };
    }

    if (s !== '') {
        const parsedColor = window.parseEventColor ? window.parseEventColor(s) : s;
        if (parsedColor) {
            const isRedColor = /^(#f00|#ff0000|#ef4444|#dc2626|#b91c1c|#f43f5e|#e11d48|#e11|#c00|#900|crimson|darkred|firebrick|tomato|rgb\(\s*25[0-5]\s*,\s*\d+\s*,\s*\d+\s*\))$/i.test(parsedColor) ||
                (sLower.includes('red') && !sLower.includes('green'));

            const isGreenColor = /^(#0f0|#00ff00|#10b981|#059669|#22c55e|#16a34a|#15803d|rgb\(\s*\d+\s*,\s*(?:1[0-9]{2}|2[0-5][0-9]|[5-9][0-9])\s*,\s*\d+\s*\)|lime|forestgreen)$/i.test(parsedColor) ||
                (sLower.includes('green') && !sLower.includes('red'));

            let isClosed = isRedColor;
            if (!isRedColor && !isGreenColor) {
                isClosed = /geschlossen|fällt aus|kein schach|sommerpause|ferien|abgesagt/i.test(tLower);
            }

            return {
                isClosed: isClosed,
                customColor: parsedColor
            };
        }
    }

    const isClosedText = /geschlossen|fällt aus|kein schach|sommerpause|ferien|abgesagt/i.test(tLower);
    return { isClosed: isClosedText, customColor: null };
};

// Hilfsfunktion: Prüft ob ein "kein Schach"-Event aus events.csv heute eine Trainingsgruppe betrifft
window.findClosingEvent = function (training, eventsData) {
    if (!eventsData || !Array.isArray(eventsData) || eventsData.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const trainingCountry = (training.country || '').trim().toUpperCase();

    for (const event of eventsData) {
        const color = (event.color || '').trim().toLowerCase();
        const title = (event.title || '').toLowerCase();

        // 1. Ist es ein Ausfall-Event?
        //    Primär: rote Farbe (red, rot, oder roter Hex-Code)
        const isRed = color === 'red' || color === 'rot' ||
            /^#(f00|ff0000|ef4444|dc2626|b91c1c|f43f5e|e11d48|e11|c00|900)$/i.test(event.color || '');
        //    Fallback (nur ohne Color): Titel enthält "kein" UND "schach"
        const isTextClosed = !color && title.includes('kein') && title.includes('schach');

        if (!isRed && !isTextClosed) continue;

        // 2. Betrifft es heute? (date <= heute <= endDate)
        const startStr = (event.date || '').trim();
        if (!startStr) continue;
        const start = window.parseDate(startStr);
        start.setHours(0, 0, 0, 0);
        const endStr = (event.endDate || event.enddate || '').trim();
        const end = endStr ? window.parseDate(endStr) : new Date(start);
        end.setHours(0, 0, 0, 0);
        if (today < start || today > end) continue;

        // 3. Land-Matching: Event-Category vs. Training-Country
        const categories = (event.category || '').split(',').map(c => c.trim().toUpperCase());
        const eventCountry = categories.find(c => c === 'DE' || c === 'CH') || '';

        // Kein Land im Event → betrifft ALLE Gruppen
        // Land im Event → nur Gruppen mit gleichem Land
        if (eventCountry && trainingCountry && eventCountry !== trainingCountry) continue;

        return event; // Treffer!
    }
    return null;
};

window.initTodayStatusBadge = function (info, eventsData) {
    const badge = document.getElementById('nav-today-badge');
    if (!badge || !info) return;

    const eventsList = eventsData || window.cachedEventsDataForBadge || (typeof globalEventsData !== 'undefined' ? globalEventsData : []);
    if (eventsList && eventsList.length > 0) window.cachedEventsDataForBadge = eventsList;

    let showFlag = info.showTodayStatus !== undefined ? info.showTodayStatus : (info.showtodaystatus !== undefined ? info.showtodaystatus : (info.show_today_status !== undefined ? info.show_today_status : 'ja'));
    if (showFlag === undefined || showFlag === null || String(showFlag).trim() === '') showFlag = 'ja'; // leer = Badge anzeigen (Default)
    if (!window.isYes(showFlag)) {
        badge.classList.add('hidden');
        return;
    }

    const overrideRaw = (
        info.todayOverrideText !== undefined ? info.todayOverrideText :
            (info.todayoverridetext !== undefined ? info.todayoverridetext :
                (info.todayOverride !== undefined ? info.todayOverride :
                    (info.todayoverride !== undefined ? info.todayoverride :
                        (info.today_override !== undefined ? info.today_override : ''))))
    ).trim();

    if (overrideRaw !== '') {
        let overrideText = window.formatTextContent ? window.stripHtml(window.formatTextContent(overrideRaw)) : overrideRaw;
        const statusRaw = (
            info.todayOverrideStatus !== undefined ? info.todayOverrideStatus :
                (info.todayoverridestatus !== undefined ? info.todayoverridestatus :
                    (info.todayOverrideColor !== undefined ? info.todayOverrideColor : ''))
        ).trim();

        const statusRes = window.resolveStatusOrColor(statusRaw, overrideText);
        const isClosed = statusRes.isClosed;
        const colorStyle = statusRes.customColor ? ` style="color: ${statusRes.customColor} !important;"` : '';

        badge.className = `nav-today-badge ${isClosed ? 'closed' : 'open'}`;
        if (overrideText.toLowerCase().startsWith('heute:')) {
            overrideText = overrideText.substring(6).trim();
        }
        const compactStatus = window.formatCompactTodayTime(overrideText);
        badge.innerHTML = `<span class="today-label">Heute:</span> <span class="today-time ${isClosed ? 'closed' : 'open'}"${colorStyle}>${compactStatus}</span>`;
        badge.classList.remove('hidden');
        return;
    }

    const trainings = [];
    if (info.training) {
        if (Array.isArray(info.training)) {
            trainings.push(...info.training);
        } else if (typeof info.training === 'object') {
            Object.values(info.training).forEach(t => {
                if (t && typeof t === 'object') trainings.push(t);
            });
        }
    }

    const daysMap = {
        0: /sonntag|sonntags|\bso\b/i,
        1: /montag|montags|\bmo\b/i,
        2: /dienstag|dienstags|\bdi\b/i,
        3: /mittwoch|mittwochs|\bmi\b/i,
        4: /donnerstag|donnerstags|\bdo\b/i,
        5: /freitag|freitags|\bfr\b/i,
        6: /samstag|samstags|\bsa\b/i
    };
    const todayDayNum = new Date().getDay();
    const todayRegex = daysMap[todayDayNum];

    const matchedTimes = [];
    let hasOverrideForToday = false;
    let isClosedOverride = false;
    let overrideCustomColor = null;

    trainings.forEach(t => {
        const str = `${t.group || ''} ${t.time || ''}`;
        if (todayRegex && todayRegex.test(str)) {
            const tOverride = (
                t.overridetext !== undefined ? t.overridetext :
                    (t.overrideText !== undefined ? t.overrideText :
                        (t.override !== undefined ? t.override : ''))
            ).trim();

            if (tOverride !== '') {
                hasOverrideForToday = true;
                const tStatusRaw = (
                    t.overridestatus !== undefined ? t.overridestatus :
                        (t.overrideStatus !== undefined ? t.overrideStatus :
                            (t.overridecolor !== undefined ? t.overridecolor :
                                (t.status !== undefined ? t.status : '')))
                ).trim();

                const cleanedOverride = window.stripHtml ? window.stripHtml(window.formatTextContent(tOverride)) : tOverride;
                const statusRes = window.resolveStatusOrColor(tStatusRaw, cleanedOverride);
                if (statusRes.isClosed) isClosedOverride = true;
                if (statusRes.customColor && !overrideCustomColor) overrideCustomColor = statusRes.customColor;

                let oText = cleanedOverride;
                if (oText.toLowerCase().startsWith('heute:')) {
                    oText = oText.substring(6).trim();
                }
                matchedTimes.push(oText);
            } else {
                // NEU: Prüfe ob ein Event aus events.csv diese Trainingsgruppe heute als geschlossen markiert
                const closingEvent = window.findClosingEvent(t, eventsList);
                if (closingEvent) {
                    hasOverrideForToday = true;
                    isClosedOverride = true;
                    matchedTimes.push('kein Schach');
                } else {
                    const timeStr = t.time || '';
                    const cleanedTime = window.stripHtml ? window.stripHtml(window.formatTextContent(timeStr)) : timeStr;
                    const timeMatch = cleanedTime.match(/(\d{1,2}(?::\d{2})?\s*(?:[-–]|bis)\s*\d{1,2}(?::\d{2})?(?:\s*Uhr)?|ab\s*\d{1,2}(?::\d{2})?(?:\s*Uhr)?)/i);
                    if (timeMatch) {
                        matchedTimes.push(timeMatch[1].replace(/bis/i, '-').trim());
                    } else {
                        matchedTimes.push(cleanedTime.split('\n')[0].trim());
                    }
                }
            }
        }
    });

    if (matchedTimes.length > 0) {
        const colorStyle = overrideCustomColor ? ` style="color: ${overrideCustomColor} !important;"` : '';
        if (hasOverrideForToday && isClosedOverride) {
            badge.className = 'nav-today-badge closed';
            const compactStatus = window.formatCompactTodayTime(matchedTimes.join(' & '));
            badge.innerHTML = `<span class="today-label">Heute:</span> <span class="today-time closed"${colorStyle}>${compactStatus}</span>`;
        } else {
            badge.className = 'nav-today-badge open';
            const compactStatus = window.formatCompactTodayTime(matchedTimes.join(' & '));
            badge.innerHTML = `<span class="today-label">Heute:</span> <span class="today-time open"${colorStyle}>${compactStatus}</span>`;
        }
    } else {
        badge.className = 'nav-today-badge closed';
        badge.innerHTML = `<span class="today-label">Heute:</span> <span class="today-time closed">kein Schach</span>`;
    }
    badge.classList.remove('hidden');
};

// Baut die Bankverbindungs-Anzeige (2 Umschalt-Knöpfe CH/DE) aus einfachen Textzellen.
// Jede Zelle: 1. Zeile = Überschrift, weitere Zeilen = je eine Angabe (z. B. "IBAN: ...").
window.buildBankHtml = function (info) {
    const bankInfo = window.getBankInfo ? window.getBankInfo(info) : { ch: '', de: '', legacy: '' };
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const parseBlock = (raw) => {
        if (!raw) return null;
        const lines = String(raw).split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
        if (lines.length === 0) return null;
        const title = esc(lines[0]);
        const body = lines.slice(1).map(l => {
            const idx = l.indexOf(':');
            if (idx > 0) return `<strong>${esc(l.slice(0, idx + 1))}</strong> ${esc(l.slice(idx + 1).trim())}`;
            return esc(l);
        }).join('<br>');
        return { title, body };
    };

    // Rückwärtskompatibel: altes HTML-Feld legal.bankverbindung direkt ausgeben
    if (!bankInfo.ch && !bankInfo.de && bankInfo.legacy) {
        return window.formatTextContent ? window.formatTextContent(bankInfo.legacy) : bankInfo.legacy;
    }

    const ch = parseBlock(bankInfo.ch);
    const de = parseBlock(bankInfo.de);
    if (!ch && !de) return '<p style="color: var(--text-secondary);">Zurzeit keine Bankverbindung hinterlegt.</p>';

    const style = "<style>"
        + ".bankbox input.bk-radio{position:absolute;left:-9999px;opacity:0;}"
        + ".bankbox .bk-tabs{display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;}"
        + ".bankbox .bk-tab{flex:1;min-width:120px;text-align:center;cursor:pointer;padding:0.6rem 0.9rem;border-radius:10px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.03);color:var(--text-secondary);font-weight:600;font-size:0.95rem;transition:all 0.2s;}"
        + ".bankbox .bk-tab:hover{color:var(--text-primary);}"
        + ".bankbox .bk-panel{display:none;background:rgba(255,255,255,0.03);border:1px solid var(--glass-border);border-radius:12px;padding:1.1rem 1.25rem;}"
        + ".bankbox #bk-ch:checked ~ .bk-tabs label[for=bk-ch],.bankbox #bk-de:checked ~ .bk-tabs label[for=bk-de]{background:var(--accent-color);color:#0b1220;border-color:var(--accent-color);}"
        + ".bankbox #bk-ch:checked ~ .bk-panel.bk-ch,.bankbox #bk-de:checked ~ .bk-panel.bk-de{display:block;}"
        + ".bankbox .bk-single{display:block;background:rgba(255,255,255,0.03);border:1px solid var(--glass-border);border-radius:12px;padding:1.1rem 1.25rem;}"
        + ".bankbox h3{margin:0 0 0.6rem 0;color:var(--accent-color);font-size:1.1rem;}"
        + ".bankbox p{margin:0;line-height:1.75;font-size:0.98rem;color:var(--text-primary);}"
        + "</style>";

    // Nur ein Land hinterlegt -> kein Umschalter nötig
    if (ch && !de) return `<div class="bankbox">${style}<div class="bk-single"><h3>${ch.title}</h3><p>${ch.body}</p></div></div>`;
    if (de && !ch) return `<div class="bankbox">${style}<div class="bk-single"><h3>${de.title}</h3><p>${de.body}</p></div></div>`;

    // Beide Länder -> Umschalt-Knöpfe (CSS-only, Standard: Schweiz)
    return `<div class="bankbox">${style}`
        + `<input class="bk-radio" type="radio" name="bkland" id="bk-ch" checked>`
        + `<input class="bk-radio" type="radio" name="bkland" id="bk-de">`
        + `<div class="bk-tabs"><label class="bk-tab" for="bk-ch">🇨🇭 Schweiz</label><label class="bk-tab" for="bk-de">🇩🇪 Deutschland</label></div>`
        + `<div class="bk-panel bk-ch"><h3>${ch.title}</h3><p>${ch.body}</p></div>`
        + `<div class="bk-panel bk-de"><h3>${de.title}</h3><p>${de.body}</p></div>`
        + `</div>`;
};

window.openLegalModal = function (type) {
    const modal = document.getElementById('legal-modal');
    const title = document.getElementById('legal-modal-title');
    const body = document.getElementById('legal-modal-body');

    if (!modal || !title || !body) return;

    const info = window.globalInfoData || {};
    const legal = info.legal || {};

    if (type === 'impressum') {
        title.textContent = 'Impressum';
        if (legal.impressum && legal.impressum.trim() !== '') {
            body.innerHTML = window.formatTextContent ? window.formatTextContent(legal.impressum) : legal.impressum;
        } else {
            body.innerHTML = `
                <p><strong>Schach - Rheinfelden e.V.</strong></p>
                <p>"Gambrinus im Alten Rathaus"<br>
                Friedrichstr. 6<br>
                79618 Rheinfelden Baden<br>
                Deutschland</p>
                <p><strong>Kontakt:</strong><br>
                E-Mail: aktuell@schachclub-rhy.ch<br>
                Telefon: +49 1525 696 2772</p>
                <p><strong>Vertretungsberechtigter Vorstand:</strong><br>
                Jörg Hostettler (Präsident)</p>
            `;
        }
    } else if (type === 'datenschutz') {
        title.textContent = 'Datenschutzerklärung';
        if (legal.datenschutz && legal.datenschutz.trim() !== '') {
            body.innerHTML = window.formatTextContent ? window.formatTextContent(legal.datenschutz) : legal.datenschutz;
        } else {
            body.innerHTML = `
                <p>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.</p>
                <p>Die Nutzung unserer Website ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf unseren Seiten personenbezogene Daten erhoben werden, erfolgt dies stets auf freiwilliger Basis.</p>
                <p><strong>Veröffentlichung von Mannschaftsdaten & Fotos:</strong><br>
                Die Nennung von Namen, sportlichen Werten (wie ELO/DWZ) sowie die Veröffentlichung von Bildmaterial (Portrait- oder Mannschaftsfotos) der Vereins- und Mannschaftsmitglieder erfolgt im Rahmen der üblichen Vereinsberichterstattung und der Organisation des Spielbetriebs. Bei Portraitfotos setzen wir in der Regel die Einwilligung der abgebildeten Personen voraus. Sollten Sie als Mitglied die Entfernung Ihrer Daten oder Bilder wünschen, kontaktieren Sie uns bitte formlos. Diese werden dann umgehend gelöscht.</p>
                <p><strong>Cookies & Tracking:</strong><br>
                Diese Website nutzt keine Tracking-Tools. Lediglich Ihre Design-Einstellung (Hell-/Dunkel-Modus) wird lokal in Ihrem Browser (Local Storage) gespeichert.</p>
            `;
        }
    } else if (type === 'bankverbindung') {
        title.textContent = 'Bankverbindung';
        body.innerHTML = window.buildBankHtml ? window.buildBankHtml(info) : '';
    }
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeLegalModal = function () {
    const modal = document.getElementById('legal-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
};

// Auto-Init UI functions when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initHamburger();
    initBanner();
    initDynamicMenu();
    initSharedInfo();
});

async function initSharedInfo() {
    try {
        const response = await window.fetchCSVSource('data/info.csv');
        if (!response.ok) return;
        const text = await window.fetchTextWithEncoding(response);
        const rows = parseCSVShared(text);
        if (rows.length < 2) return;

        const info = {};
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length >= 2) {
                const keyPath = (row[0] || '').trim().replace(/^"|"$/g, '');
                const val = (row[1] || '').trim().replace(/^"|"$/g, '');
                if (!keyPath) continue;

                const parts = keyPath.split('.');
                let current = info;
                for (let j = 0; j < parts.length - 1; j++) {
                    const part = parts[j];
                    const partLower = part.toLowerCase();
                    if (!current[part]) current[part] = {};
                    if (!current[partLower]) current[partLower] = current[part];
                    current = current[part];
                }
                const lastPart = parts[parts.length - 1];
                current[lastPart] = val;
                current[lastPart.toLowerCase()] = val;
            }
        }

        function convertToArray(obj) {
            if (typeof obj === 'object' && obj !== null) {
                const keys = Object.keys(obj);
                if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k)))) {
                    const arr = [];
                    for (let k in obj) {
                        arr[parseInt(k) - 1] = convertToArray(obj[k]);
                    }
                    return arr.filter(x => x !== undefined);
                }
                for (let k in obj) {
                    obj[k] = convertToArray(obj[k]);
                }
            }
            return obj;
        }
        const cleanInfo = convertToArray(info);
        window.globalInfoData = cleanInfo;

        // Gästebuch-Hauptschalter auch auf Unterseiten beachten:
        // Steht guestbook.show auf nein, den "Stimmen"-Menülink überall entfernen.
        const gbCfg = cleanInfo.guestbook || cleanInfo.Guestbook || {};
        const gbShow = String(gbCfg.show !== undefined && String(gbCfg.show).trim() !== '' ? gbCfg.show : 'ja').trim().toLowerCase();
        if (gbShow === 'nein' || gbShow === 'false' || gbShow === 'no' || gbShow === '0') {
            document.querySelectorAll('.nav-links a[href$="#guestbook"]').forEach(a => {
                const li = a.closest('li');
                if (li) li.remove(); else a.remove();
            });
        }

        const clubEl = document.getElementById('nav-club-name');
        if (clubEl && cleanInfo.clubName && !clubEl.textContent.trim()) {
            clubEl.textContent = cleanInfo.clubName;
        }

        if (window.initTodayStatusBadge) {
            const evData = window.getOrFetchEventsForBadge ? await window.getOrFetchEventsForBadge() : [];
            window.initTodayStatusBadge(cleanInfo, evData);
        }
    } catch (e) { }
}

async function initDynamicMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || navLinks.getAttribute('data-menu-loaded') === 'true') return;
    navLinks.setAttribute('data-menu-loaded', 'true');

    // Determine if we're on the index page or a subpage
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    const isIndex = !filename || filename === '' || filename === 'index.html' || filename.indexOf('.html') === -1;
    const prefix = isIndex ? '' : 'index.html';

    // Clear any existing static menu items
    navLinks.innerHTML = '';

    // Define the complete menu structure with base items
    const menuStructure = [
        {
            category: 'Aktuelles',
            items: [
                { title: 'News', href: prefix + '#news' },
                { title: 'Termine', href: prefix + '#events' },
                { title: 'Trainingszeiten', href: prefix + '#training' }
            ]
        },
        {
            category: 'Verein',
            items: [
                { title: 'Jugend', href: 'youth.html' },
                { title: 'Mannschaften', href: prefix + '#teams' },
                { title: 'Stimmen', href: prefix + '#guestbook' },
                { title: 'Vorstand', href: prefix + '#members' }
            ]
        },
        {
            category: 'Turniere',
            items: [
                { title: 'Turnier-Übersicht', href: prefix + '#tournaments' }
            ]
        },
        {
            category: 'Mediathek',
            isSingle: true,
            href: 'mediathek.html'
        }
    ];

    // Build the menu DOM
    menuStructure.forEach(group => {
        const li = document.createElement('li');

        if (group.isSingle) {
            // Single link, no dropdown
            li.innerHTML = `<a href="${group.href}">${group.category}</a>`;
        } else {
            // Dropdown
            li.className = 'dropdown';
            li.setAttribute('data-category', group.category);
            const itemsHTML = group.items.map(item =>
                `<li><a href="${item.href}">${item.title}</a></li>`
            ).join('');
            li.innerHTML = `
                <a href="javascript:void(0)" class="dropdown-toggle">${group.category} <span class="dropdown-arrow">▼</span></a>
                <ul class="dropdown-menu">${itemsHTML}</ul>
            `;
        }
        navLinks.appendChild(li);
    });

    // Attach click listeners for dropdown toggles (mobile support)
    const attachDropdownListener = (toggle) => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = toggle.parentElement;
            // Close other dropdowns
            navLinks.querySelectorAll('.dropdown.open').forEach(d => {
                if (d !== parent) d.classList.remove('open');
            });
            parent.classList.toggle('open');
        });
    };
    navLinks.querySelectorAll('.dropdown-toggle').forEach(attachDropdownListener);

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            navLinks.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
        }
    });

    // Close mobile menu when a regular link (not a dropdown toggle) is clicked
    navLinks.querySelectorAll('a:not(.dropdown-toggle)').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const hamburger = document.getElementById('hamburger');
            if (hamburger) hamburger.classList.remove('active');
        });
    });

    // Load pages.csv to inject dynamic pages into the appropriate category dropdowns
    try {
        const response = await window.fetchCSVSource('data/pages.csv');
        if (!response || !response.ok) return;
        const text = await window.fetchTextWithEncoding(response);
        const rows = parseCSVShared(text);
        if (rows.length <= 1) return;

        const headers = rows[0].map(h => (h || '').trim().replace(/^"|"$/g, ''));

        for (let i = 1; i < rows.length; i++) {
            const parts = rows[i];
            const page = {};
            headers.forEach((h, idx) => {
                page[h] = parts[idx] !== undefined ? parts[idx].trim().replace(/^"|"$/g, '') : '';
            });

            if (!page.id || !page.title) continue;

            const showInMenuClean = page.showInMenu ? page.showInMenu.replace(/["']/g, '').toLowerCase() : '';
            if (showInMenuClean === 'nein' || showInMenuClean === 'false') continue;

            let linkUrl = (page.url && page.url.trim() !== '') ? page.url.trim() : `index.html?page=${page.id}`;
            // On subpages, prefix relative ?page= links
            if (!isIndex && linkUrl.startsWith('?')) {
                linkUrl = 'index.html' + linkUrl;
            }

            // Check if this link or title already exists in the menu
            let alreadyExists = false;
            navLinks.querySelectorAll('a').forEach(a => {
                const href = a.getAttribute('href');
                const linkText = a.textContent.trim().replace(/ ▼$/, '');
                if (href === linkUrl || linkText === page.title) {
                    alreadyExists = true;
                }
            });
            if (alreadyExists) continue;

            const li = document.createElement('li');
            li.innerHTML = `<a href="${linkUrl}">${page.title}</a>`;

            // Close mobile menu on link click
            li.querySelector('a').addEventListener('click', () => {
                navLinks.classList.remove('active');
                const hamburger = document.getElementById('hamburger');
                if (hamburger) hamburger.classList.remove('active');
            });

            const category = page.kategorie ? page.kategorie.trim() : '';
            if (category) {
                let dropdown = navLinks.querySelector(`.dropdown[data-category="${category}"]`);
                if (!dropdown) {
                    // Create a new dropdown for this category
                    dropdown = document.createElement('li');
                    dropdown.className = 'dropdown';
                    dropdown.setAttribute('data-category', category);
                    dropdown.innerHTML = `
                        <a href="javascript:void(0)" class="dropdown-toggle">${category} <span class="dropdown-arrow">▼</span></a>
                        <ul class="dropdown-menu"></ul>
                    `;
                    // Insert before Mediathek (last item) if possible
                    const mediathekItem = navLinks.lastElementChild;
                    if (mediathekItem) {
                        navLinks.insertBefore(dropdown, mediathekItem);
                    } else {
                        navLinks.appendChild(dropdown);
                    }
                    attachDropdownListener(dropdown.querySelector('.dropdown-toggle'));
                }
                const menu = dropdown.querySelector('.dropdown-menu');
                if (menu) menu.appendChild(li);
            } else {
                const mediathekItem = Array.from(navLinks.children).find(el => el.querySelector('a') && el.querySelector('a').getAttribute('href') === 'mediathek.html');
                if (mediathekItem) {
                    navLinks.insertBefore(li, mediathekItem);
                } else {
                    navLinks.appendChild(li);
                }
            }
        }
    } catch (e) {
        console.error("Fehler beim Laden des dynamischen Menüs:", e);
    }
}

async function initBanner() {
    try {
        const response = await window.fetchCSVSource('data/info.csv');
        const text = await window.fetchTextWithEncoding(response);
        const match = text.match(/announcement;(.*)/);
        if (match && match[1].trim()) {
            const banner = document.getElementById('top-banner');
            if (banner) {
                let rawVal = match[1].trim();
                if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
                    rawVal = rawVal.slice(1, -1).replace(/""/g, '"');
                }

                // Prüfe, ob sich der Announcement-Text seit dem letzten Besuch geändert hat
                const lastSeenText = localStorage.getItem('last_seen_announcement');
                if (lastSeenText !== rawVal) {
                    // Text hat sich geändert -> Merkzustand zurücksetzen und neuen Text merken
                    localStorage.setItem('last_seen_announcement', rawVal);
                    localStorage.removeItem('is_banner_dismissed');
                } else if (localStorage.getItem('is_banner_dismissed') === 'true') {
                    // Text ist unverändert und wurde bereits geschlossen
                    banner.style.display = 'none';
                    return;
                }

                const formattedBanner = window.formatTextContent(rawVal);

                // Farbverlauf steuern
                const colorMatch = text.match(/announcement_color;(.*)/);
                let bannerBg = 'var(--gold-gradient)'; // Standard
                let textColor = '#333'; // Standard (dunkel für Gold)
                if (colorMatch && colorMatch[1].trim()) {
                    const cStr = colorMatch[1].trim().toLowerCase();
                    if (cStr === 'red' || cStr === 'rot') {
                        bannerBg = 'linear-gradient(to right, #dc2626, #991b1b)';
                        textColor = '#fff';
                    } else if (cStr === 'blue' || cStr === 'blau') {
                        bannerBg = 'linear-gradient(to right, #2563eb, #1e40af)';
                        textColor = '#fff';
                    } else if (cStr === 'green' || cStr === 'grün' || cStr === 'gruen') {
                        bannerBg = 'linear-gradient(to right, #16a34a, #166534)';
                        textColor = '#fff';
                    } else if (cStr === 'gold' || cStr === 'gelb') {
                        bannerBg = 'var(--gold-gradient)';
                        textColor = '#333';
                    } else if (cStr.includes('gradient')) {
                        bannerBg = colorMatch[1].trim();
                        textColor = '#fff';
                    } else {
                        // Jeder andere gültige Farbwert (z.B. Hex, 'purple', 'lightblue')
                        const customColor = colorMatch[1].trim();
                        bannerBg = `linear-gradient(to right, ${customColor}, color-mix(in srgb, ${customColor}, black 40%))`;
                        textColor = '#fff';
                    }
                }
                banner.style.background = bannerBg;

                banner.innerHTML = `
                    <div class="container" style="text-align: center; color: ${textColor}; font-weight: 500; font-family: var(--font-main); font-size: 1.05rem; position: relative;">
                        <span>${formattedBanner}</span>
                        <span class="close-banner" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 1.5rem; line-height: 1; color: ${textColor};" title="Schließen">&times;</span>
                    </div>`;
                banner.style.display = 'block';
                const navbar = document.getElementById('navbar');
                if (navbar) navbar.classList.add('has-banner');

                const updateNavbarTop = () => {
                    const nb = document.getElementById('navbar');
                    if (nb && banner.style.display !== 'none') {
                        nb.style.top = banner.offsetHeight + 'px';
                        document.body.style.paddingTop = banner.offsetHeight + 'px';
                    }
                };
                updateNavbarTop();
                window.addEventListener('resize', updateNavbarTop);

                banner.querySelector('.close-banner').addEventListener('click', () => {
                    banner.style.display = 'none';
                    localStorage.setItem('is_banner_dismissed', 'true');
                    const nb = document.getElementById('navbar');
                    if (nb) {
                        nb.classList.remove('has-banner');
                        nb.style.top = '';
                    }
                    document.body.style.paddingTop = '';
                });
            }
        }
    } catch (e) { }
}

window.parseGalleryString = function (val) {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.map(item => {
            if (typeof item === 'object' && item !== null) return item;
            const str = String(item).trim();
            if (!str) return null;
            const idx = str.indexOf('|');
            if (idx !== -1) {
                return { url: str.substring(0, idx).trim(), caption: str.substring(idx + 1).trim() };
            }
            return { url: str, caption: '' };
        }).filter(Boolean);
    }
    if (typeof val !== 'string') return [];

    let items = [];
    if (val.includes('||')) {
        items = val.split('||');
    } else {
        const rawChunks = val.split(',');
        for (let i = 0; i < rawChunks.length; i++) {
            let chunk = rawChunks[i].trim();
            if (!chunk) continue;
            if (/^(https?:\/\/|\.\/|\/|data:image|[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp|svg))/i.test(chunk) || items.length === 0) {
                items.push(chunk);
            } else {
                items[items.length - 1] += ',' + rawChunks[i];
            }
        }
    }

    return items.map(item => {
        if (typeof item === 'object' && item !== null) return item;
        const str = String(item).trim();
        if (!str) return null;
        const idx = str.indexOf('|');
        if (idx !== -1) {
            return {
                url: str.substring(0, idx).trim(),
                caption: str.substring(idx + 1).trim()
            };
        }
        return { url: str, caption: '' };
    }).filter(Boolean);
};

window.renderGalleryHTML = function (gallery, title = '') {
    const items = window.parseGalleryString(gallery);
    if (!items || items.length === 0) return '';

    return `
        <div class="news-gallery-container" style="margin-top: 1.5rem;">
            ${title ? `<h3 style="color: var(--accent-color); margin-bottom: 1rem; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem;">🖼️ ${title}</h3>` : ''}
            <div class="news-gallery">
                ${items.map(item => {
        const cleanUrl = window.formatImageUrl(item.url);
        return `
                    <div class="gallery-figure">
                        <img src="${cleanUrl}" class="gallery-img" alt="${item.caption || 'Galerie Bild'}" onclick="window.open('${cleanUrl}', '_blank')">
                        ${item.caption ? `<div class="gallery-caption">${item.caption}</div>` : ''}
                    </div>
                `;
    }).join('')}
            </div>
        </div>
    `;
};

window.parseEventColor = function (colorRaw) {
    if (!colorRaw) return null;
    let c = String(colorRaw).trim();
    if (!c || c === '-' || c.toLowerCase() === 'none') return null;
    if (/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(c)) {
        return `rgb(${c})`;
    }
    if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(c)) {
        return `#${c}`;
    }
    return c;
};

window.getEventCardColorStyles = function (colorRaw) {
    const color = window.parseEventColor(colorRaw);
    if (!color) return { cardStyle: '', dateBoxStyle: '', badgeStyle: '', color: null };
    return {
        cardStyle: `border-left: 5px solid ${color} !important; background: linear-gradient(135deg, color-mix(in srgb, ${color} 18%, var(--surface-color)), var(--surface-color)) !important; box-shadow: 0 4px 24px -4px color-mix(in srgb, ${color} 25%, transparent);`,
        dateBoxStyle: '',
        badgeStyle: `border-color: ${color} !important; color: ${color} !important;`,
        color: color
    };
};
window.getCardColorStyles = window.getEventCardColorStyles;

window.generateICSFromEvents = function (events, filename) {
    function formatYMD(d) {
        if (!d || isNaN(d.getTime())) return "20991231";
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${day}`;
    }

    function formatHHMMSS(timeStr) {
        if (!timeStr) return "000000";
        const parts = timeStr.split(':');
        const h = (parts[0] || "00").padStart(2, '0');
        const m = (parts[1] || "00").padStart(2, '0');
        return `${h}${m}00`;
    }

    function cleanICSDesc(content) {
        if (!content) return "";
        let text = content
            .replace(/<br\s*[\/]?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
        text = text.trim();
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\r?\n/g, '\\n');
    }

    let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Schach Rheinfelden//NONSGML v1.0//EN\r\n";

    events.forEach(event => {
        let startRaw = (event.date || '').trim();
        let endRaw = (event.endDate || event.enddate || '').trim();
        if (!endRaw && (startRaw.includes(' - ') || startRaw.includes('–') || startRaw.includes(' bis '))) {
            const parts = startRaw.split(/\s+[-–]\s+|\s+bis\s+/i);
            if (parts.length === 2) {
                startRaw = parts[0].trim();
                endRaw = parts[1].trim();
            }
        }

        const parsedStart = window.parseFlexDate(startRaw);
        const parsedEnd = endRaw ? window.parseFlexDate(endRaw) : parsedStart;

        let dtStartLine = '';
        let dtEndLine = '';

        // Case 4: TBD (?) -> Ganztägig am 31.12. des aktuellen Jahres
        if (parsedStart.type === 'tbd' || !parsedStart.date) {
            const y = new Date().getFullYear();
            dtStartLine = `DTSTART;VALUE=DATE:${y}1231`;
            dtEndLine = `DTEND;VALUE=DATE:${y + 1}0101`;
        }
        // Case 3: Jahr -> Ganztägiger Balken fürs gesamte Jahr
        else if (parsedStart.type === 'year') {
            const y = parsedStart.date.getFullYear();
            dtStartLine = `DTSTART;VALUE=DATE:${y}0101`;
            dtEndLine = `DTEND;VALUE=DATE:${y + 1}0101`;
        }
        // Case 3: Monat -> Ganztägiger Balken fürs gesamte Monat
        else if (parsedStart.type === 'month') {
            const y = parsedStart.date.getFullYear();
            const m = parsedStart.date.getMonth();
            const d1 = new Date(y, m, 1);
            const d2 = new Date(y, m + 1, 1);
            dtStartLine = `DTSTART;VALUE=DATE:${formatYMD(d1)}`;
            dtEndLine = `DTEND;VALUE=DATE:${formatYMD(d2)}`;
        }
        // Case 1 & 2: Konkrete Tage (Ein oder mehrere Tage)
        else {
            const hasTime = !!(event.time && event.time.trim());
            // Wenn KEINE Uhrzeit vorhanden ist -> Ganztägig (VALUE=DATE)
            if (!hasTime) {
                const d1 = parsedStart.date;
                const d2Base = (parsedEnd && parsedEnd.date) ? parsedEnd.date : d1;
                const d2 = new Date(d2Base.getTime() + 86400000); // +1 Tag exklusiv nach RFC 5545
                dtStartLine = `DTSTART;VALUE=DATE:${formatYMD(d1)}`;
                dtEndLine = `DTEND;VALUE=DATE:${formatYMD(d2)}`;
            }
            // Wenn Uhrzeit vorhanden ist -> Mit Uhrzeit (TZID=Europe/Berlin)
            else {
                const startYMD = formatYMD(parsedStart.date);
                const endYMD = (parsedEnd && parsedEnd.date) ? formatYMD(parsedEnd.date) : startYMD;
                const startTime = formatHHMMSS(event.time.trim());
                const endTimeRaw = (event.endTime || event.endtime || '').trim();

                dtStartLine = `DTSTART;TZID=Europe/Berlin:${startYMD}T${startTime}`;

                if (endTimeRaw) {
                    dtEndLine = `DTEND;TZID=Europe/Berlin:${endYMD}T${formatHHMMSS(endTimeRaw)}`;
                } else {
                    // Regel 1: wenn nur Startzeit angegeben, dann bis Mitternacht (235900) am Enddatum/Startdatum
                    dtEndLine = `DTEND;TZID=Europe/Berlin:${endYMD}T235900`;
                }
            }
        }

        const description = cleanICSDesc(event.content);

        icsContent += "BEGIN:VEVENT\r\n";
        icsContent += `${dtStartLine}\r\n`;
        icsContent += `${dtEndLine}\r\n`;
        icsContent += `SUMMARY:${event.title}\r\n`;
        icsContent += `LOCATION:${event.location || ''}\r\n`;
        if (description) {
            icsContent += `DESCRIPTION:${description}\r\n`;
        }
        icsContent += "END:VEVENT\r\n";
    });
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.renderModalHeaderImage = function (item, title) {
    if (!item || !item.image || String(item.image).trim() === '') return '';
    const val = String(item.bildImModal || item.showImageInModal || item.showModalImage || item.imageInModal || item.modalImage || '').trim().toLowerCase();
    if (val === 'ja' || val === 'true' || val === '1' || val === 'yes') {
        const imgUrl = String(item.image).trim();
        const altText = (title || item.title || 'Vorschaubild').replace(/"/g, '&quot;');
        return `
            <div class="modal-hero-header" onclick="window.open('${imgUrl}', '_blank')" title="Bild vergrößern">
                <img src="${imgUrl}" alt="${altText}">
            </div>
        `;
    }
    return '';
};

document.addEventListener('DOMContentLoaded', () => {
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) {
        heroTitle.style.cursor = 'pointer';
        heroTitle.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    window.loadGlobalInfoAndFooter();
});
