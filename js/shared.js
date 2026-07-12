/**
 * shared.js - Gemeinsame Logik für alle Seiten (Startseite & Archive)
 */

window.cleanMojibake = function(text) {
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
                if (decoded && !decoded.includes('')) {
                    text = decoded;
                }
            }
        }
    } catch(e) {}
    return text;
};

// --- Flexible Date Parsing ---
// Supports: DD.MM.YYYY, DD.MM.YY, MM.YYYY, MM.YY, YYYY, YYYY-MM-DD, YY-MM-DD, YYYYMMDD, YYMMDD, German month texts, ?, TBD, empty
window.parseFlexDate = function(dateStr) {
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
            return { date: new Date(`${y}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}T00:00:00`), type: 'full' };
        }
        if (parts.length === 2 && parts[0].length <= 2 && (parts[1].length === 4 || parts[1].length === 2)) {
            const y = toFullYear(parts[1]);
            return { date: new Date(`${y}-${parts[0].padStart(2,'0')}-01T00:00:00`), type: 'month' };
        }
    }

    // 3. YYYYMMDD (compact 8 digits) -> e.g. 20260911
    if (/^\d{8}$/.test(s)) {
        return { date: new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T00:00:00`), type: 'full' };
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

// Format a date for display based on its flex type
function getShortMonthDe(date) {
    const months = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
    return months[date.getMonth()] || '';
}

window.formatFlexDate = function(dateStr) {
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
window.parseDateSortable = function(dateStr) {
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
window.getEventEndDate = function(event) {
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

window.formatEventDateBox = function(event) {
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

window.formatEventTimeDisplay = function(event) {
    if (!event) return '';
    const t = (event.time || '').trim();
    const et = (event.endTime || '').trim();
    if (!t && !et) return '';
    if (t && et) {
        const suffix = (t.toLowerCase().includes('uhr') || et.toLowerCase().includes('uhr')) ? '' : ' Uhr';
        return `🕒 ${t} - ${et}${suffix}`;
    }
    if (t) {
        const suffix = (t.toLowerCase().includes('uhr') || /^[a-zA-Z]/.test(t)) ? '' : ' Uhr';
        return `🕒 ${t}${suffix}`;
    }
    const suffix = (et.toLowerCase().includes('uhr') || /^[a-zA-Z]/.test(et)) ? '' : ' Uhr';
    return `🕒 bis ${et}${suffix}`;
};

window.formatEventModalDateHeader = function(event) {
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
            const s1 = parsedStart.date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
            const s2 = parsedEnd.date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
            return `${s1} – ${s2}`;
        }
        return `${startStr} – ${endStr}`;
    }

    const parsed = window.formatFlexDate(startStr);
    return parsed.full;
};

// Backward-compatible parseDate (used everywhere)
window.parseDate = function(dateStr) {
    const parsed = window.parseFlexDate(dateStr);
    return parsed.date || new Date();
};

window.fetchTextWithEncoding = async function(response) {
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

window.loadSourcesConfig = async function() {
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
                const gid = row.length >= 3 ? (row[2] || '').trim() : '0';
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

window.fetchCSVSource = async function(localUrl) {
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
    return await fetch(finalLocalUrl, { cache: 'no-store' });
};

// Convert comma-separated CSV to semicolon-separated (for external CSV sources)
window._convertCommaCsvToSemicolon = function(text) {
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

window.formatTextContent = function(text) {
    if (!text) return '';
    text = window.cleanMojibake(text);
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    let formattedText = text.replace(/((?:https?:\/\/|www\.)[^\s]+)/g, function(url) {
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

window.stripHtml = function(html) {
    if (!html) return '';
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
};

window.formatImageUrl = function(imgUrl) {
    if (!imgUrl || typeof imgUrl !== 'string') return '';
    let url = imgUrl.trim().replace(/\\/g, '/');

    if (url.startsWith('/assets/')) {
        url = '.' + url;
    } else if (url.startsWith('assets/')) {
        url = './' + url;
    }
    return encodeURI(url);
};

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle');

    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if(themeToggle) themeToggle.checked = true;
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            if(e.target.checked) {
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
    if(hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
            if (navLinks.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
}

window.globalInfoData = null;

function parseCSVShared(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
    const result = [];
    let row = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i+1] === '"') { current += '"'; i++; }
                else { inQuotes = false; }
            } else { current += char; }
        } else {
            if (char === '"') { inQuotes = true; }
            else if (char === ';') { row.push(current); current = ''; }
            else if (char === '\n' || char === '\r') {
                if (char === '\r' && i + 1 < text.length && text[i+1] === '\n') i++;
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

window.renderGlobalFooter = function(info) {
    if (!info) return;
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

window.loadGlobalInfoAndFooter = async function() {
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
    } catch(e) {
        console.warn('Could not load global info for footer:', e);
    }
};

window.openLegalModal = function(type) {
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
    }
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeLegalModal = function() {
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
});

async function initDynamicMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || navLinks.getAttribute('data-menu-loaded') === 'true') return;
    navLinks.setAttribute('data-menu-loaded', 'true');
    try {
        const response = await window.fetchCSVSource('data/pages.csv');
        if (!response.ok) return;
        const text = await window.fetchTextWithEncoding(response);
        
        // Proper CSV row parser that respects quoted fields
        function parseCSVRow(row) {
            const fields = [];
            let current = '';
            let inQuotes = false;
            for (let c = 0; c < row.length; c++) {
                const ch = row[c];
                if (inQuotes) {
                    if (ch === '"') {
                        if (c + 1 < row.length && row[c + 1] === '"') {
                            current += '"';
                            c++;
                        } else {
                            inQuotes = false;
                        }
                    } else {
                        current += ch;
                    }
                } else {
                    if (ch === '"') {
                        inQuotes = true;
                    } else if (ch === ';') {
                        fields.push(current);
                        current = '';
                    } else {
                        current += ch;
                    }
                }
            }
            fields.push(current);
            return fields;
        }
        
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length <= 1) return;
        const headers = lines[0].split(';').map(h => h.trim());
        
        const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '' || window.location.pathname.split('/').pop().indexOf('.html') === -1;
        
        for (let i = 1; i < lines.length; i++) {
            const parts = parseCSVRow(lines[i]);
            const page = {};
            headers.forEach((h, idx) => {
                page[h] = parts[idx] ? parts[idx].trim() : '';
            });
            
            if (page.id && page.title) {
                const showInMenuClean = page.showInMenu ? page.showInMenu.replace(/["']/g, '').toLowerCase() : '';
                if (showInMenuClean !== 'nein' && showInMenuClean !== 'false') {
                    const existingLinks = Array.from(navLinks.querySelectorAll('a')).map(a => a.textContent.trim());
                    if (!existingLinks.includes(page.title)) {
                        const li = document.createElement('li');
                        let linkUrl = (page.url && page.url.trim() !== '') ? page.url.trim() : `?page=${page.id}`;
                        if (!isIndex && linkUrl.startsWith('?')) {
                            linkUrl = 'index.html' + linkUrl;
                        }
                        li.innerHTML = `<a href="${linkUrl}">${page.title}</a>`;
                        navLinks.appendChild(li);
                    }
                }
            }
        }
    } catch(e) {
        console.error("Fehler beim Laden des dynamischen Menüs:", e);
    }
}

async function initBanner() {
    try {
        const response = await window.fetchCSVSource('data/info.csv');
        const text = await window.fetchTextWithEncoding(response);
        const match = text.match(/announcement;(.*)/);
        if(match && match[1].trim()) {
            const banner = document.getElementById('top-banner');
            if(banner) {
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
                banner.innerHTML = `
                    <div class="container" style="text-align: center; color: #fff; position: relative;">
                        <strong>${formattedBanner}</strong>
                        <span class="close-banner" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 1.5rem; line-height: 1;" title="Schließen">&times;</span>
                    </div>`;
                banner.style.display = 'block';
                const navbar = document.getElementById('navbar');
                if (navbar) navbar.classList.add('has-banner');

                const updateNavbarTop = () => {
                    const nb = document.getElementById('navbar');
                    if (nb && banner.style.display !== 'none') {
                        nb.style.top = banner.offsetHeight + 'px';
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
                });
            }
        }
    } catch(e) {}
}

window.parseGalleryString = function(val) {
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
                items[items.length - 1] += ', ' + chunk;
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

window.renderGalleryHTML = function(gallery, title = '') {
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
                `;}).join('')}
            </div>
        </div>
    `;
};

window.parseEventColor = function(colorRaw) {
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

window.getEventCardColorStyles = function(colorRaw) {
    const color = window.parseEventColor(colorRaw);
    if (!color) return { cardStyle: '', dateBoxStyle: '', badgeStyle: '', color: null };
    return {
        cardStyle: `border-left: 5px solid ${color} !important; background: linear-gradient(135deg, color-mix(in srgb, ${color} 18%, var(--surface-color)), var(--surface-color)) !important; box-shadow: 0 4px 24px -4px color-mix(in srgb, ${color} 25%, transparent);`,
        dateBoxStyle: `border-color: ${color} !important;`,
        badgeStyle: `border-color: ${color} !important; color: ${color} !important;`,
        color: color
    };
};
window.getCardColorStyles = window.getEventCardColorStyles;

window.generateICSFromEvents = function(events, filename) {
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
        let endRaw = (event.endDate || '').trim();
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

                dtStartLine = `DTSTART;TZID=Europe/Berlin:${startYMD}T${startTime}`;

                if (event.endTime && event.endTime.trim()) {
                    dtEndLine = `DTEND;TZID=Europe/Berlin:${endYMD}T${formatHHMMSS(event.endTime.trim())}`;
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
