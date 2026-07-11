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
