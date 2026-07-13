
window.parseDate = function(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
        }
    }
    return new Date(dateStr);
};




/**
 * Schach Rheinfelden - No-Database-CMS Logic
 * Alle Daten werden asynchron aus dem /data Ordner geladen.
 */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

let globalNewsData = [];
let globalEventsData = [];
let globalTournamentsData = [];
let globalMembersData = [];
let currentNewsLimit = 3;
let currentCategory = 'Alle';
let currentEventCategory = 'Alle';
let currentMemberCountry = 'Alle';
let showingPastEvents = false;

// Premium Schach-Bilder als Fallback
const fallbackImages = [
    'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1560174038-da43ac74f01b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1610682136054-ff477dcb2d60?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1586165368502-1bad197a6461?auto=format&fit=crop&w=600&q=80'
];

// Theme Initialisierung

// Haupt-Initialisierung
async function initApp() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page');

        // Daten parallel laden
        const [infoData, newsData, eventsData, membersData, pagesData] = await Promise.all([
            fetchInfoCSV('./data/info.csv'),
            fetchDataCSV('./data/news.csv'),
            fetchDataCSV('./data/events.csv'),
            fetchCSV('./data/members.csv'),
            fetchDataCSV('./data/pages.csv').catch(() => [])
        ]);

        // Dynamisches Menü aufbauen wird zentral für alle Seiten durch shared.js (initDynamicMenu) erledigt!


        if (pageParam) {
            // Navigation Links so anpassen, dass sie auf die index.html zurückführen
            document.querySelectorAll('.nav-links a').forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    link.setAttribute('href', 'index.html' + href);
                }
            });

            document.getElementById('home-content').style.display = 'none';
            const dynamicContainer = document.getElementById('dynamic-page');
            dynamicContainer.style.display = 'block';
            
            const pageInfo = pagesData.find(p => p.id === pageParam);
            const contentDiv = document.getElementById('dynamic-page-content');
            
            if (pageInfo) {
                contentDiv.innerHTML = `
                    <div class="glass-card fade-in-up" style="padding: 4rem 2rem;">
                        <h1 class="section-title" style="margin-bottom: 2rem;">${pageInfo.title}</h1>
                        <div class="news-text" style="font-size: 1.1rem;">${window.formatTextContent(pageInfo.content)}</div>
                        <a href="index.html" class="btn btn-secondary" style="margin-top: 3rem;">Zurück zur Startseite</a>
                    </div>
                `;
            } else {
                contentDiv.innerHTML = `
                    <div class="glass-card fade-in-up" style="text-align: center; padding: 4rem 2rem;">
                        <h1>Seite nicht gefunden</h1>
                        <p class="news-text">Die angeforderte Seite existiert nicht.</p>
                        <a href="index.html" class="btn btn-secondary" style="margin-top: 2rem;">Zurück zur Startseite</a>
                    </div>
                `;
            }
            renderInfo(infoData);
            const cyEl = document.getElementById('current-year');
            if (cyEl) cyEl.textContent = new Date().getFullYear();
            initScrollAnimations();
            return;
        }


        // Rendering-Funktionen aufrufen
        globalNewsData = newsData;
        globalEventsData = eventsData;
        renderInfo(infoData);
        initNewsFilter();
        renderNews();
        renderGallery();
        renderTeams();
        renderTournaments();
        initEventsFilter();
        renderEvents();
        renderMembers(membersData);
        
        loadQuote();

        // Footer-Jahr setzen (sofern vorhanden)
        const currentYearEl = document.getElementById('current-year');
        if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();

        // Animationen initialisieren
        initScrollAnimations();

        const newsParam = urlParams.get('news') || urlParams.get('newsId');
        const eventParam = urlParams.get('event') || urlParams.get('eventId');
        const tournamentParam = urlParams.get('tournament');
        if (newsParam) setTimeout(() => window.openNewsModal(parseInt(newsParam)), 100);
        if (eventParam) setTimeout(() => window.openEventModal(parseInt(eventParam)), 100);
        if (tournamentParam) setTimeout(() => window.openTournamentModal(parseInt(tournamentParam)), 100);

    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        alert('Die Inhalte konnten nicht geladen werden (' + (error && error.message ? error.message : error) + '). Bitte stelle sicher, dass du die Seite über einen lokalen Server startest (z.B. VSCode Live Server).');
    }
}

// Hilfsfunktion für Initialien
window.getInitials = function(name) {
    if (!name) return '';
    return name.split(' ').filter(n => n.length > 0).map(n => n[0] + '.').join(' ');
};

window.shareContent = function(title, text, customUrl) {
    const url = customUrl || window.location.href;
    if (navigator.share) {
        navigator.share({ title: title, text: text, url: url }).catch(console.error);
    } else {
        navigator.clipboard.writeText(`${title}\n${url}`).then(() => alert('Link kopiert!'));
    }
};

window.buildShareUrl = function(type, id) {
    const url = new URL(window.location.href);
    url.searchParams.set(type + 'Id', id);
    return url.origin + url.pathname + url.search; // Returns URL without hash
};


function parseCSV(text) {
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
            else if (char === '\n') {
                row.push(current);
                if (row.length > 0 && !(row.length === 1 && row[0].trim() === '')) result.push(row);
                row = []; current = '';
            } else if (char === '\r') {}
            else { current += char; }
        }
    }
    if (current || row.length > 0) { row.push(current); result.push(row); }
    return result;
}

async function fetchDataCSV(url) {
    const response = await (window.fetchCSVSource ? window.fetchCSVSource(url) : fetch(url));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status} fetching ${url}`);
    
    const text = await window.fetchTextWithEncoding(response);
    const rows = parseCSV(text);
    if (rows.length < 2) return [];
    
    const headers = rows[0].map(h => (h || '').trim().replace(/^"|"$/g, ''));
    const data = [];
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;
        const obj = {};
        headers.forEach((header, index) => {
            let val = row[index] !== undefined ? row[index].trim().replace(/^"|"$/g, '') : '';
            if (header === 'gallery' && val) {
                val = window.parseGalleryString ? window.parseGalleryString(val) : val.split(',').map(s => s.trim()).filter(s => s);
            }
            if (header === 'id' && !isNaN(parseInt(val)) && String(parseInt(val)) === val) {
                val = parseInt(val);
            }
            obj[header] = val;
        });
        data.push(obj);
    }
    return data;
}

async function fetchInfoCSV(url) {
    const response = await (window.fetchCSVSource ? window.fetchCSVSource(url) : fetch(url));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status} fetching ${url}`);
    
    const text = await window.fetchTextWithEncoding(response);
    const rows = parseCSV(text);
    
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
                return arr.filter(x => x !== undefined); // Remove holes
            }
            for (let k in obj) {
                obj[k] = convertToArray(obj[k]);
            }
        }
        return obj;
    }
    
    return convertToArray(info);
}

// Hilfsfunktion für Fetch
async function fetchJSON(url) {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(url + separator + 't=' + new Date().getTime(), { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} fetching ${url}`);
    }
    return await response.json();
}

async function fetchCSV(url) {
    const response = await (window.fetchCSVSource ? window.fetchCSVSource(url) : fetch(url));
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} fetching ${url}`);
    }
    const text = await window.fetchTextWithEncoding(response);
    const rows = parseCSV(text);
    if (rows.length < 2) return [];
    
    const data = [];
    let rawHeaders = rows[0].map(h => (h || '').trim().replace(/^"|"$/g, ''));
    let headers = [];
    let startIndex = 1;
    let globalSettings = {};

    const hasCombinedSettings = rawHeaders.some(h => /\s+(ja|nein)$/i.test(h));
    if (hasCombinedSettings) {
        headers = rawHeaders.map(h => {
            const match = h.match(/\s+(ja|nein)$/i);
            const cleaned = h.replace(/\s+(ja|nein)$/i, '').trim();
            let key = cleaned.toLowerCase();
            if (cleaned === 'Team') key = 'Team';
            if (cleaned === 'ELO') key = 'elo';
            if (cleaned === 'DWZ') key = 'dwz';
            if (match) {
                globalSettings[key] = match[1].toLowerCase() === 'ja';
            }
            return cleaned;
        });
        startIndex = 1;
    } else {
        headers = rawHeaders;
        if (rows.length > 1) {
            const row2 = rows[1].map(v => (v || '').trim().replace(/^"|"$/g, '').toLowerCase());
            const isSettings = row2.some(v => v === 'ja' || v === 'nein');
            if (isSettings) {
                startIndex = 2;
                headers.forEach((header, index) => {
                    let key = header.toLowerCase();
                    if(header === 'Team') key = 'Team';
                    if(header === 'ELO') key = 'elo';
                    if(header === 'DWZ') key = 'dwz';
                    globalSettings[key] = row2[index] !== 'nein';
                });
            }
        }
    }

    for (let i = startIndex; i < rows.length; i++) {
        const values = rows[i].map(v => (v || '').trim().replace(/^"|"$/g, ''));
        if (values.length === 0 || (values.length === 1 && !values[0])) continue;
        const obj = {};
        headers.forEach((header, index) => {
            let val = values[index] !== undefined ? values[index] : '';
            if (header === 'id' && !isNaN(parseInt(val)) && String(parseInt(val)) === val) {
                val = parseInt(val);
            }
            obj[header] = val;
            obj[header.toLowerCase()] = val;
            if (header.toLowerCase() === 'enddate') obj.endDate = val;
            if (header.toLowerCase() === 'endtime') obj.endTime = val;
            if (header.toLowerCase() === 'locationurl') obj.locationUrl = val;
            if (header === 'Team') obj.Team = val;
            if (header === 'ELO') obj.elo = val;
            if (header === 'DWZ') obj.dwz = val;
        });
        data.push(obj);
    }
    
    data.globalSettings = globalSettings;
    data.headers = headers;
    return data;
}

// 0. Hamburger & Mobile Menu


// 0.5 Zitat laden
async function loadQuote() {
    try {
        const quotes = await fetchDataCSV('./data/quotes.csv');
        if (quotes && quotes.length > 0) {
            const r = quotes[Math.floor(Math.random() * quotes.length)];
            const textEl = document.getElementById('quote-text');
            const authorEl = document.getElementById('quote-author');
            if(textEl && authorEl) {
                textEl.innerHTML = `"${window.formatTextContent(r.text)}"`;
                authorEl.textContent = `- ${r.author}`;
            }
        }
    } catch(e) {
        document.getElementById('quote-container').style.display = 'none';
    }
}

// 1. Allgemeine Infos (Name, Training, Kontakt) rendern
function renderInfo(info) {
    // Header & Hero
    document.getElementById('nav-club-name').textContent = info.clubName;
    
    // Check for custom hero media
    const heroSection = document.querySelector('.hero');
    if (heroSection && info.heroMedia && info.heroMedia.trim() !== '') {
        const mediaUrl = info.heroMedia.trim();
        const isYouTube = mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be');
        const isVimeo = mediaUrl.includes('vimeo.com');
        const isVideoFile = /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(mediaUrl);

        if (isYouTube) {
            let videoId = '';
            if (mediaUrl.includes('v=')) {
                videoId = mediaUrl.split('v=')[1].split('&')[0];
            } else if (mediaUrl.includes('youtu.be/')) {
                videoId = mediaUrl.split('youtu.be/')[1].split('?')[0];
            }
            if (videoId) {
                const iframeHTML = `<iframe class="hero-bg-iframe" 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1&cc_load_policy=3&iv_load_policy=3&rel=0" 
                    frameborder="0" allow="autoplay; fullscreen; compute-pressure"></iframe>`;
                heroSection.insertAdjacentHTML('afterbegin', iframeHTML);
                heroSection.style.background = 'linear-gradient(to right, var(--hero-overlay-1), var(--hero-overlay-2))';
            }
        } else if (isVimeo) {
            const vimeoId = mediaUrl.split('vimeo.com/')[1]?.split('?')[0];
            if (vimeoId) {
                const iframeHTML = `<iframe class="hero-bg-iframe" 
                    src="https://player.vimeo.com/video/${vimeoId}?background=1&autoplay=1&loop=1&byline=0&title=0" 
                    frameborder="0" allow="autoplay; fullscreen"></iframe>`;
                heroSection.insertAdjacentHTML('afterbegin', iframeHTML);
                heroSection.style.background = 'linear-gradient(to right, var(--hero-overlay-1), var(--hero-overlay-2))';
            }
        } else if (isVideoFile) {
            const extMatch = mediaUrl.match(/\.(mp4|webm|mov|m4v|ogg)/i);
            const ext = extMatch ? extMatch[1].toLowerCase() : 'mp4';
            const typeStr = ext === 'webm' ? 'video/webm' : (ext === 'ogg' ? 'video/ogg' : 'video/mp4');
            const videoHTML = `<video id="hero-bg-video" class="hero-bg-video" autoplay loop muted playsinline><source src="${mediaUrl}" type="${typeStr}"></video>`;
            heroSection.insertAdjacentHTML('afterbegin', videoHTML);
            heroSection.style.background = 'linear-gradient(to right, var(--hero-overlay-1), var(--hero-overlay-2))';
            const vid = document.getElementById('hero-bg-video');
            if (vid) {
                vid.muted = true;
                vid.play().catch(e => console.log("Autoplay prevented:", e));
            }
        } else {
            // Check if multiple image URLs are provided for a Slideshow
            let imageUrls = [];
            if (mediaUrl.includes('||')) {
                imageUrls = mediaUrl.split('||').map(item => item.split('|')[0].trim()).filter(u => u);
            } else if (mediaUrl.includes(',')) {
                imageUrls = mediaUrl.split(',').map(item => item.split('|')[0].trim()).filter(u => u);
            } else if (mediaUrl.includes(';')) {
                imageUrls = mediaUrl.split(';').map(item => item.split('|')[0].trim()).filter(u => u);
            } else {
                imageUrls = [mediaUrl];
            }

            if (imageUrls.length > 1) {
                const slideshowHTML = `
                    <div class="hero-slideshow">
                        ${imageUrls.map((url, idx) => `<div class="hero-slide ${idx === 0 ? 'active' : ''}" style="background: linear-gradient(to right, var(--hero-overlay-1), var(--hero-overlay-2)), url('${url}') no-repeat center center/cover;"></div>`).join('')}
                    </div>
                `;
                heroSection.insertAdjacentHTML('afterbegin', slideshowHTML);
                heroSection.style.background = 'transparent';

                // Rotate slides every 5 seconds
                const slides = heroSection.querySelectorAll('.hero-slide');
                let currentSlide = 0;
                setInterval(() => {
                    if (!slides.length) return;
                    slides[currentSlide].classList.remove('active');
                    currentSlide = (currentSlide + 1) % slides.length;
                    slides[currentSlide].classList.add('active');
                }, 5000);
            } else {
                heroSection.style.background = `linear-gradient(to right, var(--hero-overlay-1), var(--hero-overlay-2)), url('${imageUrls[0]}') no-repeat center center/cover`;
            }
        }
    }
    
    const heroTitleEl = document.getElementById('hero-title');
    if (heroTitleEl) heroTitleEl.innerHTML = `Willkommen beim <br><span class="accent">${info.clubName}</span>`;
    const heroSloganEl = document.getElementById('hero-slogan');
    if (heroSloganEl) heroSloganEl.innerHTML = window.formatTextContent(info.slogan);
    const footerClubNameEl = document.getElementById('footer-club-name');
    if (footerClubNameEl) footerClubNameEl.textContent = info.clubName;

    // Training
    const trainingContainer = document.getElementById('training-container');
    if (trainingContainer && Array.isArray(info.training)) {
        trainingContainer.innerHTML = info.training.map(t => `
            <div class="training-item">
                <div class="training-group">${t.group || ''}</div>
                <div class="training-time">${window.formatTextContent(t.time || '')}</div>
            </div>
        `).join('');
    }

    // Location
    const locationContainer = document.getElementById('location-container');
    if (locationContainer && info.location) {
        locationContainer.innerHTML = `
            <p><strong>📍 Spielort:</strong><br>
            ${info.location.name || ''}<br>
            ${info.location.address || ''}</p>
        `;
    }

    // Social Links
    const socialContainer = document.getElementById('social-links-container');
    if (socialContainer && info.socialLinks) {
        let socialHTML = '';
        if (info.socialLinks.lichess) {
            socialHTML += `<a href="${info.socialLinks.lichess}" target="_blank" class="social-btn">♟️ Lichess Team</a>`;
        }
        if (info.socialLinks.chesscom) {
            socialHTML += `<a href="${info.socialLinks.chesscom}" target="_blank" class="social-btn">♟️ Chess.com Team</a>`;
        }
        socialContainer.innerHTML = socialHTML;
    }

    // Kontakt Footer & Copyright (Global via shared helper)
    window.globalInfoData = info;
    if (window.renderGlobalFooter) {
        window.renderGlobalFooter(info);
    }
}

// 2. News rendern
function initNewsFilter() {
    const filterContainer = document.getElementById('news-filter');
    if (!filterContainer) return;

    const uniqueTags = [];
    globalNewsData.forEach(item => {
        if (item.category) {
            const tags = item.category.split(',').map(s => s.trim());
            tags.forEach(tag => {
                if (tag && !uniqueTags.includes(tag)) uniqueTags.push(tag);
            });
        }
    });
    uniqueTags.sort((a, b) => a.localeCompare(b, 'de'));
    const categories = ['Alle', ...uniqueTags];

    if (categories.length <= 1) return;

    filterContainer.innerHTML = categories.map(cat => 
        `<button class="filter-btn ${cat === currentCategory ? 'active' : ''}" onclick="filterNews('${cat}')">${cat}</button>`
    ).join('');
}

function filterNews(category) {
    currentCategory = category;
    currentNewsLimit = 3;
    initNewsFilter();
    renderNews();
}

function renderNews() {
    const container = document.getElementById('news-container');
    const news = globalNewsData;
    
    if (!news || news.length === 0) {
        container.innerHTML = '<p class="loading">Keine aktuellen News vorhanden.</p>';
        return;
    }

    const filteredNews = currentCategory === 'Alle' 
        ? [...news] 
        : news.filter(item => {
            if (!item.category) return false;
            const tags = item.category.split(',').map(s => s.trim());
            return tags.includes(currentCategory);
        });

    // Sortiere nach Datum (neueste zuerst)
    filteredNews.sort((a, b) => window.parseDate(b.date) - window.parseDate(a.date));

    const visibleNews = filteredNews.slice(0, currentNewsLimit);

    container.innerHTML = visibleNews.map(item => {
        const dateObj = window.parseDate(item.date);
        const dateString = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const authorHTML = item.author ? ` &middot; 👤 ${item.author}` : '';
        
        const imgHTML = item.image && item.image.trim() !== "" 
            ? `<div class="news-img" style="background-image: url('${item.image}')"></div>` 
            : '';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = window.formatTextContent(item.content);
        const textContent = tempDiv.textContent || tempDiv.innerText || "";

        const colorStyles = window.getCardColorStyles ? window.getCardColorStyles(item.color || item.akzentfarbe || item.accentColor) : { cardStyle: '' };

        const tagsHTML = item.category 
            ? `<div style="margin-top: 0.8rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">${item.category.split(',').map(tag => `<span class="tag-badge">🏷️ ${tag.trim()}</span>`).join('')}</div>` 
            : '';

        return `
        <article class="glass-card news-card fade-in-up" onclick="openNewsModal(${item.id})" style="cursor: pointer; ${colorStyles.cardStyle}">
            ${imgHTML}
            <div class="news-content">
                <span class="news-date" ${colorStyles.color ? `style="color: ${colorStyles.color}; font-weight: 600;"` : ''}>${dateString}${authorHTML}</span>
                <h3 class="news-title">${item.title}</h3>
                <div class="news-text text-truncate">${textContent}</div>
                ${tagsHTML}
            </div>
        </article>
        `;
    }).join('');


    
    // Animiere die neu gerenderten News-Karten
    initScrollAnimations();
}



// 2.5 Galerie rendern (aus News)
function renderGallery() {
    const container = document.getElementById('gallery-container');
    if(!container) return;
    
    let allImages = [];
    globalNewsData.forEach(news => {
        if(news.gallery) {
            const parsed = window.parseGalleryString ? window.parseGalleryString(news.gallery) : (Array.isArray(news.gallery) ? news.gallery : []);
            parsed.forEach(item => {
                const url = typeof item === 'object' ? item.url : item;
                if (url) allImages.push(url);
            });
        }
        if(news.image && news.image.trim() !== "") {
            allImages.push(news.image);
        }
    });

    allImages = [...new Set(allImages)];

    if(allImages.length === 0) {
        document.getElementById('gallery').style.display = 'none';
        return;
    }

    container.innerHTML = allImages.slice(0, 8).map(img => `
        <div class="gallery-item fade-in-up" onclick="window.open('${img}', '_blank')">
            <div style="background-image: url('${img}')"></div>
        </div>
    `).join('');
    
    initScrollAnimations();
}

// 3. Termine rendern
function initEventsFilter() {
    const filterContainer = document.getElementById('events-filter');
    if (!filterContainer) return;

    const uniqueTags = [];
    globalEventsData.forEach(event => {
        if (event.category) {
            const tags = event.category.split(',').map(s => s.trim());
            tags.forEach(tag => {
                if (tag && !uniqueTags.includes(tag)) uniqueTags.push(tag);
            });
        }
    });
    uniqueTags.sort((a, b) => a.localeCompare(b, 'de'));
    const categories = ['Alle', ...uniqueTags];

    if (categories.length <= 1) return;

    filterContainer.innerHTML = categories.map(cat => 
        `<button class="filter-btn ${cat === currentEventCategory ? 'active' : ''}" style="padding: 0.3rem 1rem; font-size: 0.85rem;" onclick="filterEvents('${cat}')">${cat}</button>`
    ).join('');
}

function filterEvents(category) {
    currentEventCategory = category;
    initEventsFilter();
    renderEvents();
}

function renderEvents() {
    const container = document.getElementById('events-container');
    const events = globalEventsData;
    
    if (!events || events.length === 0) {
        container.innerHTML = '<p class="loading">Keine Termine geplant.</p>';
        return;
    }

    const filteredEvents = currentEventCategory === 'Alle' 
        ? [...events] 
        : events.filter(item => {
            if (!item.category) return false;
            const tags = item.category.split(',').map(s => s.trim());
            return tags.includes(currentEventCategory);
        });

    filteredEvents.sort((a, b) => (window.parseDateSortable ? window.parseDateSortable(a.date) : window.parseDate(a.date)) - (window.parseDateSortable ? window.parseDateSortable(b.date) : window.parseDate(b.date)));

    const today = new Date();
    today.setHours(0,0,0,0);

    const upcomingEvents = filteredEvents.filter(e => (window.getEventEndDate ? window.getEventEndDate(e) : window.parseDate(e.date)) >= today);
    const pastEvents = filteredEvents.filter(e => (window.getEventEndDate ? window.getEventEndDate(e) : window.parseDate(e.date)) < today);

    let html = upcomingEvents.slice(0, currentEventsLimit).map(event => createEventHTML(event, false)).join('');

    if (upcomingEvents.length === 0) {
        html = '<p class="loading">Derzeit keine anstehenden Termine.</p>';
    }

    container.innerHTML = html;

    const loadMoreContainer = document.getElementById('events-load-more');
    if (loadMoreContainer) {
        if (currentEventsLimit < upcomingEvents.length) {
            loadMoreContainer.innerHTML = `<button class="btn btn-secondary" onclick="loadMoreEvents()">Alle Termine laden</button>`;
        } else {
            loadMoreContainer.innerHTML = '';
        }
    }


    
    const btn = document.getElementById('download-all-events-btn');
    if (btn) {
        const span = btn.querySelector('span');
        if (span) {
            span.textContent = currentEventCategory === 'Alle'
                ? 'Alle Termine speichern'
                : `Termine '${currentEventCategory}' speichern`;
        }
    }

    initScrollAnimations();
}

function createEventHTML(event, isPast) {
    const pastClass = isPast ? 'event-past' : '';

    const timeDisplay = window.formatEventTimeDisplay ? window.formatEventTimeDisplay(event) : (event.time ? `🕒 ${event.time} Uhr` : '');
    const authorHTML = event.author ? `<span style="margin-left: 1rem;">👤 ${event.author}</span>` : '';

    let imageHTML = '';
    if (event.image) {
        imageHTML = `<div class="event-img-thumbnail" style="background-image: url('${event.image}'); width: 100%; height: 160px; background-size: cover; background-position: center; border-radius: 8px 8px 0 0; margin: -1.5rem -1.5rem 1rem -1.5rem; width: calc(100% + 3rem);"></div>`;
    }

    const locationDisplay = event.locationUrl 
        ? `<a href="${event.locationUrl}" target="_blank" onclick="event.stopPropagation()" style="color: inherit; text-decoration: underline;">${event.location}</a>` 
        : event.location;

    const colorStyles = window.getEventCardColorStyles ? window.getEventCardColorStyles(event.color || event.akzentfarbe || event.accentColor) : { cardStyle: '', dateBoxStyle: '' };

    const dateBoxContent = window.formatEventDateBox ? window.formatEventDateBox(event) : '';

    const timeRowHTML = (timeDisplay || authorHTML) ? `<div>${timeDisplay}${authorHTML}</div>` : '';

    return `
    <li class="event-item fade-in-up ${pastClass}" style="cursor: pointer; display: flex; flex-direction: column; align-items: stretch; ${colorStyles.cardStyle}" onclick="openEventModal(${event.id})">
        ${imageHTML}
        <div style="display: flex; align-items: flex-start; gap: 1rem; width: 100%;">
            <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0; gap: 0.4rem; width: 80px;">
                <div class="event-date-box" style="margin: 0; width: 100%; ${colorStyles.dateBoxStyle}">
                    ${dateBoxContent}
                </div>
                <button class="btn btn-secondary" style="padding: 0.35rem 0; width: 100%; display: flex; justify-content: center; align-items: center; border-radius: 6px; border-color: var(--glass-border); color: var(--accent-color);" title="In Kalender speichern (.ics)" onclick="event.stopPropagation(); downloadSingleEvent(${event.id})">
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </button>
            </div>
            <div style="flex: 1; min-width: 0;">
                <h3 style="font-size: 1.2rem; margin-bottom: 0.3rem; color: var(--accent-color);">${event.title}</h3>
                <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">
                    ${timeRowHTML}
                    <div style="margin-top: 0.25rem;">📍 ${locationDisplay}</div>
                </div>
                <div style="margin-top: 0.6rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
                    ${event.category ? event.category.split(',').map(tag => `<span class="tag-badge">🏷️ ${tag.trim()}</span>`).join('') : ''}
                </div>
            </div>
        </div>
    </li>
    `;
}

// --- Globale Variablen für Events ---
currentEventCategory = 'Alle';
showingPastEvents = false;
let currentEventsLimit = 5;



function downloadSingleEvent(id) {
    const event = globalEventsData.find(e => e.id === id);
    if (event) {
        generateICS([event], event.title.replace(/\\s+/g, '_') + '.ics');
    }
}

function downloadAllEvents() {
    let filteredEvents = currentEventCategory === 'Alle' 
        ? globalEventsData 
        : globalEventsData.filter(item => {
            if (!item.category) return false;
            const tags = item.category.split(',').map(s => s.trim());
            return tags.includes(currentEventCategory);
        });
        
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filteredEvents = filteredEvents.filter(item => {
        const itemDate = window.parseDateSortable(item.date);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate >= today;
    });

    if (filteredEvents.length > 0) {
        const safeCat = currentEventCategory === 'Alle' ? 'alle' : currentEventCategory.toLowerCase().replace(/[^a-z0-9]/g, '_');
        generateICS(filteredEvents, `schach_rheinfelden_termine_${safeCat}.ics`);
    }
}

function formatICSDatePart(dateStr) {
    if (!dateStr) return "20260101";
    let s = String(dateStr).trim();
    if (s.includes(' - ') || s.includes('–') || s.includes(' bis ')) {
        s = s.split(/\s+[-–]\s+|\s+bis\s+/i)[0].trim();
    }
    if (s.includes('.')) {
        const parts = s.split('.');
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}${month}${day}`;
    } else if (s.includes('-')) {
        const parts = s.split('-');
        return `${parts[0]}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`;
    }
    return s.replace(/[^0-9]/g, '');
}

function cleanICSDescription(content) {
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

function generateICS(events, filename) {
    if (window.generateICSFromEvents) {
        window.generateICSFromEvents(events, filename);
    }
}

window.isYes = function(val) {
    if (!val) return false;
    const v = String(val).trim().toLowerCase();
    return v === 'ja' || v === 'j' || v === 'yes' || v === 'y' || v === '1' || v === 'true' || v === 'x' || v === 'ch' || v === 'de';
};

function initMembersFilter(members) {
    const filterContainer = document.getElementById('members-filter');
    if (!filterContainer || !members || members.length === 0) return;

    const settings = members.globalSettings || {};
    const showCH = settings.schweiz !== false && members.some(m => window.isYes(m.schweiz));
    const showDE = settings.deutschland !== false && members.some(m => window.isYes(m.deutschland));

    if (!showCH && !showDE) {
        filterContainer.innerHTML = '';
        return;
    }

    const categories = [{ id: 'Alle', label: 'Alle' }];
    if (showCH) categories.push({ id: 'Schweiz', label: '🇨🇭 Schweiz' });
    if (showDE) categories.push({ id: 'Deutschland', label: '🇩🇪 Deutschland' });

    filterContainer.innerHTML = categories.map(cat => 
        `<button class="filter-btn ${cat.id === currentMemberCountry ? 'active' : ''}" onclick="filterMembers('${cat.id}')">${cat.label}</button>`
    ).join('');
}

window.filterMembers = function(country) {
    currentMemberCountry = country;
    initMembersFilter(globalMembersData);
    renderMembers(globalMembersData);
};

// 4. Mitglieder rendern
function renderMembers(members) {
    const container = document.getElementById('members-container');
    
    if (!members || members.length === 0) {
        if (container) container.innerHTML = '<p class="loading">Keine Mitgliederdaten gefunden.</p>';
        return;
    }

    globalMembersData = members;
    initMembersFilter(members);

    const settings = members.globalSettings || {};

    const filteredMembers = currentMemberCountry === 'Alle'
        ? members
        : members.filter(m => {
            if (currentMemberCountry === 'Schweiz') return settings.schweiz !== false && window.isYes(m.schweiz);
            if (currentMemberCountry === 'Deutschland') return settings.deutschland !== false && window.isYes(m.deutschland);
            return true;
        });

    if (filteredMembers.length === 0) {
        container.innerHTML = '<p class="loading">Keine Vorstandsmitglieder in diesem Bereich gefunden.</p>';
        return;
    }

    const reservedCols = ['name', 'role', 'email', 'image', 'avatar', 'schweiz', 'deutschland'];

    container.innerHTML = filteredMembers.map((member, index) => {
        const isOffen = member.name && (member.name.trim().toLowerCase() === 'offen' || member.name.trim().toLowerCase() === 'vakant');
        const cleanImage = window.formatImageUrl ? window.formatImageUrl(member.image) : (member.image ? member.image.replace(/\\/g, '/') : '');
        // Avatar bestimmen
        const avatar = cleanImage && cleanImage !== ""
            ? cleanImage
            : (isOffen 
                ? `https://ui-avatars.com/api/?name=%3F&background=334155&color=d4af37&size=200`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=fbbf24&color=000&size=200`);

        const useFullName = settings.name !== false;
        const displayName = useFullName ? member.name : window.getInitials(member.name);

        const showCH = settings.schweiz !== false && window.isYes(member.schweiz);
        const showDE = settings.deutschland !== false && window.isYes(member.deutschland);
        const badges = [];
        if (showCH) badges.push('<span class="country-badge badge-ch">🇨🇭 Schweiz</span>');
        if (showDE) badges.push('<span class="country-badge badge-de">🇩🇪 Deutschland</span>');
        const countryBadgesHtml = badges.length > 0
            ? `<div class="member-countries" style="display: flex; gap: 0.4rem; justify-content: center; flex-wrap: wrap; margin-bottom: 0.8rem;">${badges.join('')}</div>`
            : '';

        // Dynamische Rückseite: Alle benutzerdefinierten Spalten (sowie ELO etc.), die in Zeile 2 nicht "nein" sind
        const customHeaders = members.headers || Object.keys(member);
        let backDetailsHtml = '';
        customHeaders.forEach(headerName => {
            const key = headerName.toLowerCase();
            if (reservedCols.includes(key)) return;
            if (settings[key] === false) return;

            const val = member[key] !== undefined ? member[key] : member[headerName];
            if (val && String(val).trim() !== '') {
                backDetailsHtml += `<strong>${headerName}:</strong> <p>${String(val).trim()}</p>`;
            }
        });

        const emailFrontHtml = member.email ? `<a href="mailto:${member.email}" class="member-email">${member.email}</a>` : '';
        const contactBtnHtml = member.email ? `<a href="mailto:${member.email}" class="btn btn-secondary" style="margin-top: 1rem; padding: 0.5rem 1rem; font-size: 0.8rem;">Kontaktieren</a>` : '';

        return `
        <div class="member-card-wrapper fade-in-up visible">
            <div class="member-flip-inner">
                <div class="member-flip-front glass-card" style="width: 100%; height: 100%;">
                    <div class="member-avatar" style="background-image: url('${avatar}')"></div>
                    <h3 class="member-name">${displayName}</h3>
                    <div class="member-role">${member.role || ''}</div>
                    ${countryBadgesHtml}
                    ${emailFrontHtml}
                </div>
                <div class="member-flip-back">
                    <h3 class="member-name" style="margin-bottom: 0.5rem;">${displayName}</h3>
                    <div class="member-role" style="margin-bottom: 0.8rem;">${member.role || ''}</div>
                    ${countryBadgesHtml}
                    ${backDetailsHtml}
                    ${contactBtnHtml}
                </div>
            </div>
        </div>
        `;
    }).join('');

    if (typeof initScrollAnimations === 'function') {
        setTimeout(() => initScrollAnimations(), 50);
    }
}

// 4.5 Mannschaften rendern (Floating Field)
async function renderTeams() {
    const container = document.getElementById('floating-field');
    const legendContainer = document.getElementById('teams-legend');
    if(!container || !legendContainer) return;

    try {
        const [teams, playersRaw] = await Promise.all([
            fetchDataCSV('./data/teams.csv'),
            fetchCSV('./data/players.csv')
        ]);

        // Spieler den Teams zuordnen
        teams.forEach(team => {
            team.players = playersRaw
                .filter(p => p.Team && p.Team.split(',').map(t=>t.trim()).includes(team.name))
                .map(p => {
                    const newP = { ...p, teamId: team.id, _globalSettings: playersRaw.globalSettings || {} };
                    if (newP.elo !== undefined) { newP.ELO = newP.elo; delete newP.elo; }
                    if (newP.dwz !== undefined) { newP.DWZ = newP.dwz; delete newP.dwz; }
                    return newP;
                });
        });

        // Build legend toggles
        legendContainer.innerHTML = teams
            .filter(team => team.id !== 'ohne-team')
            .map(team => `
            <button class="btn btn-secondary toggle-team" data-team="${team.id}" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                ${team.name}
            </button>
        `).join('');

        // Listeners for legend (Toggle Team Connection)
        window.teamConnected = {};
        document.querySelectorAll('.toggle-team').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                target.classList.toggle('btn-secondary');
                target.classList.toggle('btn-primary');
                const teamId = target.dataset.team;
                const isConnected = target.classList.contains('btn-primary');
                window.teamConnected[teamId] = isConnected;
                if (window.updateTeamsListView) window.updateTeamsListView();
            });
            // Init default state
            window.teamConnected[btn.dataset.team] = btn.classList.contains('btn-primary');
        });

        // Collect unique players across teams for floating view (keine Doppelungen in der Raumansicht)
        const uniquePlayersMap = new Map();
        teams.forEach(team => {
            team.players.forEach(p => {
                const key = (p.name || '').trim().toLowerCase();
                if (!key) return;
                if (!uniquePlayersMap.has(key)) {
                    uniquePlayersMap.set(key, {
                        ...p,
                        id: p.id || ('player_' + Math.random().toString(36).substr(2, 9)),
                        teamId: team.id,
                        teamIds: [team.id]
                    });
                } else {
                    const existing = uniquePlayersMap.get(key);
                    if (!existing.teamIds.includes(team.id)) {
                        existing.teamIds.push(team.id);
                    }
                }
            });
        });
        let allPlayers = Array.from(uniquePlayersMap.values());

        window.allTeamsData = teams;
        window.allPlayersData = allPlayers;
        window.teamsSearchQuery = '';
        window.teamsViewMode = 'floating';

        const searchInput = document.getElementById('teams-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                window.teamsSearchQuery = e.target.value.trim().toLowerCase();
                if (window.updateTeamsListView) window.updateTeamsListView();
            });
        }

        const floatBtn = document.getElementById('view-floating-btn');
        const listBtn = document.getElementById('view-list-btn');
        const floatingContainer = document.getElementById('floating-field');
        const listContainer = document.getElementById('teams-list-view');

        const switchView = (mode) => {
            window.teamsViewMode = mode;
            if (mode === 'floating') {
                floatBtn?.classList.replace('btn-secondary', 'btn-primary');
                listBtn?.classList.replace('btn-primary', 'btn-secondary');
                if (floatingContainer) floatingContainer.style.display = 'block';
                if (listContainer) listContainer.style.display = 'none';
            } else {
                listBtn?.classList.replace('btn-secondary', 'btn-primary');
                floatBtn?.classList.replace('btn-primary', 'btn-secondary');
                if (floatingContainer) floatingContainer.style.display = 'none';
                if (listContainer) listContainer.style.display = 'block';
                if (window.updateTeamsListView) window.updateTeamsListView();
            }
        };

        floatBtn?.addEventListener('click', () => switchView('floating'));
        listBtn?.addEventListener('click', () => switchView('list'));

        window.updateTeamsListView = function() {
            const container = document.getElementById('teams-list-view');
            if (!container) return;

            const anyConnected = Object.values(window.teamConnected).some(v => v);
            const query = (window.teamsSearchQuery || '').trim().toLowerCase();

            const svgStr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e2e8f0" /><circle cx="50" cy="38" r="18" fill="#94a3b8" /><path d="M -20 120 C -20 60, 120 60, 120 120 Z" fill="#94a3b8" /></svg>';
            const mysteryAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;

            let html = '';

            window.allTeamsData.forEach(team => {
                if (anyConnected && !window.teamConnected[team.id]) return;

                const matchingPlayers = (team.players || []).filter(p => {
                    if (!query) return true;
                    const nameMatch = p.name && p.name.toLowerCase().includes(query);
                    const teamMatch = (p.Team || p.team || '').toLowerCase().includes(query);
                    return nameMatch || teamMatch;
                });

                if (matchingPlayers.length === 0) return;

                // Alphabetisch nach Name sortieren
                matchingPlayers.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));

                html += `
                    <div class="team-list-section" style="margin-bottom: 2.5rem; text-align: left;">
                        <h3 style="font-size: 1.45rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1.25rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.6rem; display: flex; align-items: center; gap: 0.75rem;">
                            <span style="width: 4px; height: 22px; background: var(--accent-color); border-radius: 2px; display: inline-block;"></span>
                            <span style="color: var(--accent-color);">${team.name}</span>
                            <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 400; margin-left: 0.2rem;">(${matchingPlayers.length} ${matchingPlayers.length === 1 ? 'Spieler' : 'Spieler'})</span>
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
                            ${matchingPlayers.map(player => {
                                const avatarUrl = player.avatar || mysteryAvatar;
                                const settings = player._globalSettings || {};
                                const useFullName = settings.name !== false;
                                const displayName = useFullName ? player.name : window.getInitials(player.name);
                                const eloStr = player.ELO || player.elo ? `ELO ${player.ELO || player.elo}` : '';
                                const dwzStr = player.DWZ || player.dwz ? `DWZ ${player.DWZ || player.dwz}` : '';

                                return `
                                    <div class="glass-card player-list-card" style="display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; cursor: pointer; transition: transform 0.2s, border-color 0.2s; border-radius: 12px; background: rgba(255,255,255,0.03);" onclick="openPlayerModalFromList('${player.id}')" onmouseover="this.style.transform='translateY(-3px)'; this.style.borderColor='var(--accent-color)';" onmouseout="this.style.transform='none'; this.style.borderColor='var(--glass-border)';">
                                        <img src="${avatarUrl}" alt="${displayName}" style="width: 62px; height: 62px; border-radius: 50%; border: 2px solid var(--accent-color); object-fit: cover; flex-shrink: 0; box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);">
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.15rem;">${displayName}</div>
                                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.4rem;">${player.title || 'Spieler'}</div>
                                            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                                ${eloStr ? `<span style="font-size: 0.75rem; background: rgba(212, 175, 55, 0.18); color: var(--accent-color); padding: 0.15rem 0.55rem; border-radius: 999px; font-weight: 600;">${eloStr}</span>` : ''}
                                                ${dwzStr ? `<span style="font-size: 0.75rem; background: rgba(255, 255, 255, 0.1); color: var(--text-primary); padding: 0.15rem 0.55rem; border-radius: 999px; font-weight: 600;">${dwzStr}</span>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            });

            if (!html) {
                html = '<div class="glass-card" style="padding: 3rem; text-align: center; color: var(--text-secondary);">Keine Spieler für diese Suche oder Filterung gefunden.</div>';
            }

            container.innerHTML = html;
        };

        window.openPlayerModalFromList = function(playerId) {
            const player = (window.allPlayersData || []).find(p => p.id === playerId);
            if (player && window.showPlayerModal) {
                window.showPlayerModal(player);
            }
        };

        const canvas = document.getElementById('tether-canvas');
        if (canvas) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        }
        
        const loading = container.querySelector('.loading');
        if (loading) loading.remove();

        const world = container.querySelector('#physics-world');

        const cardsData = [];
        const svgStr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e2e8f0" /><circle cx="50" cy="38" r="18" fill="#94a3b8" /><path d="M -20 120 C -20 60, 120 60, 120 120 Z" fill="#94a3b8" /></svg>';
        const mysteryAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
        
        allPlayers.forEach(player => {
            const avatarUrl = player.avatar || mysteryAvatar;
            
            const settings = player._globalSettings || {};
            // Name is full if setting is not explicitly 'nein' (initials), and we reverse the logic if needed. 
            // Wait, default should be initials if we want stringency? No, setting says "ja" for full name, "nein" for initials.
            const useFullName = settings.name !== false; 
            const displayName = useFullName ? player.name : window.getInitials(player.name);

            const el = document.createElement('div');
            el.className = 'floating-player-card';
            el.dataset.team = player.teamId;
            el.dataset.id = player.id;
            el.style.zIndex = '10';
            
            el.innerHTML = `
                <div class="player-avatar" style="background-image: url('${avatarUrl}');"></div>
                <div class="player-name">${displayName}</div>
            `;
            if (world) world.appendChild(el);

            cardsData.push({
                id: player.id,
                teamId: player.teamId,
                playerData: player, // save full player data for modal
                el: el,
                x: Math.random() * (container.clientWidth - 100),
                y: Math.random() * (container.clientHeight - 100),
                vx: 0,
                vy: 0,
                radius: 35,
                isDragging: false,
                isExpanded: false
            });
        });

        initPhysicsEngine(cardsData, container, canvas);

    } catch(e) {
        console.error("Could not load teams", e);
        container.innerHTML = '<p>Keine Teamdaten gefunden.</p>';
    }
}

// Physik-Engine für fliegende Karten mit Zoom & Pan
function initPhysicsEngine(cardsData, container, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = container.clientWidth;
    let height = container.clientHeight;
    const world = container.querySelector('#physics-world');
    
    window.addEventListener('resize', () => {
        width = container.clientWidth;
        height = container.clientHeight;
        canvas.width = width;
        canvas.height = height;
    });

    let draggedCard = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let pointerDownTime = 0;
    
    // Zoom & Pan State
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;

    function applyTransform() {
        if (world) world.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    function zoomAt(x, y, newScale) {
        newScale = Math.max(0.3, Math.min(newScale, 3));
        panX = x - (x - panX) * (newScale / scale);
        panY = y - (y - panY) * (newScale / scale);
        scale = newScale;
        applyTransform();
    }

    container.addEventListener('pointerdown', (e) => {
        if (e.target === container || e.target === world || e.target.classList.contains('loading')) {
            isPanning = true;
            startPanX = e.clientX - panX;
            startPanY = e.clientY - panY;
            container.style.cursor = 'grabbing';
            try { container.setPointerCapture(e.pointerId); } catch(err){}
        }
    });

    cardsData.forEach(card => {
        card.el.addEventListener('pointerdown', (e) => {
            if (card.isHidden) return;
            e.preventDefault();
            draggedCard = card;
            card.isDragging = true;
            card.el.style.zIndex = '50';
            try { card.el.setPointerCapture(e.pointerId); } catch(err){}
            
            const rect = card.el.getBoundingClientRect();
            // Adjust offset by scale!
            dragOffsetX = (e.clientX - rect.left) / scale;
            dragOffsetY = (e.clientY - rect.top) / scale;
            pointerDownTime = Date.now();
        });
    });

    container.addEventListener('pointermove', (e) => {
        if (isPanning) {
            panX = e.clientX - startPanX;
            panY = e.clientY - startPanY;
            applyTransform();
            return;
        }

        if (!draggedCard) return;
        
        const containerRect = container.getBoundingClientRect();
        let logicalClientX = (e.clientX - containerRect.left - panX) / scale;
        let logicalClientY = (e.clientY - containerRect.top - panY) / scale;
        
        let newX = logicalClientX - dragOffsetX;
        let newY = logicalClientY - dragOffsetY;
        
        // Keine unsichtbare Grenze mehr!
        
        draggedCard.x = newX;
        draggedCard.y = newY;
        draggedCard.vx = 0;
        draggedCard.vy = 0;

        // Keine Collision-Tethers mehr beim Ziehen
    });

    const releaseDrag = (e) => {
        if (isPanning) {
            isPanning = false;
            container.style.cursor = 'default';
            if (e && e.pointerId) try { container.releasePointerCapture(e.pointerId); } catch(err){}
        }
        if (draggedCard) {
            if (e && e.pointerId) try { draggedCard.el.releasePointerCapture(e.pointerId); } catch(err){}
            draggedCard.isDragging = false;
            draggedCard.el.style.zIndex = '10';
            
            if (Date.now() - pointerDownTime < 200) {
                // Open Player Modal instead of expanding card
                const p = draggedCard.playerData;
                const modal = document.getElementById('player-modal');
                const modalBody = document.getElementById('player-modal-body');
                if (modal && modalBody) {
                    const svgStr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e2e8f0" /><circle cx="50" cy="38" r="18" fill="#94a3b8" /><path d="M -20 120 C -20 60, 120 60, 120 120 Z" fill="#94a3b8" /></svg>';
                    const mysteryAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
                    const avatarUrl = p.avatar || mysteryAvatar;
                    const settings = p._globalSettings || {};
                    const useFullName = settings.name !== false;
                    const displayName = useFullName ? p.name : window.getInitials(p.name);

                    const teamStr = p.Team || p.team || '';
                    const teamsList = teamStr.split(',').map(t => t.trim()).filter(Boolean);
                    const teamPinsHTML = teamsList.length > 0 ? `
                        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6rem; margin: -0.5rem 0 1.5rem 0;">
                            ${teamsList.map(t => `
                                <span style="display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.4rem 1rem; border-radius: 999px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.08)); border: 1px solid var(--accent-color); color: var(--accent-color); font-weight: 700; font-size: 0.95rem; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.25); letter-spacing: 0.5px;">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/></svg>
                                    ${t}
                                </span>
                            `).join('')}
                        </div>
                    ` : '';

                    const seenKeys = new Set();
                    const gridItems = Object.entries(p).filter(([key, value]) => {
                        const lowerKey = key.toLowerCase();
                        // Interne Keys und Team ausblenden (Team wird oben als Pins angezeigt)
                        if (['id', 'teamid', 'teamids', 'name', 'avatar', 'title', '_globalsettings', 'team'].includes(lowerKey) || lowerKey.startsWith('_')) return false;
                        if (settings[lowerKey] === false) return false;
                        if (value === null || value === undefined || value.toString().trim() === '') return false;
                        if (seenKeys.has(lowerKey)) return false;
                        seenKeys.add(lowerKey);
                        return true;
                    });

                    const gridHTML = gridItems.length > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; text-align: left; background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                            ${gridItems.map(([key, value]) => `
                            <div>
                                <span style="display: block; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">${key}</span>
                                <strong style="font-size: 1.2rem; color: var(--text-primary);">${value}</strong>
                            </div>
                            `).join('')}
                        </div>
                    ` : '';

                    modalBody.innerHTML = `
                        <img src="${avatarUrl}" alt="${displayName}" style="width: 120px; height: 120px; border-radius: 50%; border: 3px solid var(--accent-color); object-fit: cover; margin-bottom: 1rem; box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);">
                        <h3 style="font-size: 2rem; color: var(--accent-color); margin-bottom: 0.5rem;">${displayName}</h3>
                        <p style="color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 1.5rem;">${p.title || 'Spieler'}</p>
                        ${teamPinsHTML}
                        ${gridHTML}
                    `;
                    modal.classList.remove('hidden');
                    // Add global close fn if not exists
                    if (!window.closePlayerModal) {
                        window.closePlayerModal = () => {
                            document.getElementById('player-modal').classList.add('hidden');
                        }
                    }
                }
            }
            draggedCard = null;
        }
    };

    container.addEventListener('pointerup', releaseDrag);
    container.addEventListener('pointercancel', releaseDrag);

    // Mouse Wheel Zoom
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity);
        
        const containerRect = container.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;
        
        zoomAt(mouseX, mouseY, scale * zoom);
    }, { passive: false });

    // Touch Pinch to Zoom
    let initialPinchDistance = null;
    let initialPinchScale = 1;
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialPinchScale = scale;
        }
    });
    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const containerRect = container.getBoundingClientRect();
            
            zoomAt(centerX - containerRect.left, centerY - containerRect.top, initialPinchScale * (dist / initialPinchDistance));
        }
    }, { passive: false });

    // Button Zoom Controls
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
        zoomAt(container.clientWidth / 2, container.clientHeight / 2, scale * 1.2);
    });
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
        zoomAt(container.clientWidth / 2, container.clientHeight / 2, scale / 1.2);
    });

    // Listener wurde entfernt, window.teamConnected übernimmt das.

        function updatePhysics() {
        // Handle window resizes
        if (container.clientWidth !== canvas.width || container.clientHeight !== canvas.height) {
            width = container.clientWidth;
            height = container.clientHeight;
            canvas.width = width;
            canvas.height = height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5 / scale; // Keep lines crisp regardless of zoom
        ctx.beginPath();
        
        // Render Team Tethers as a SINGLE CHAIN across all activated teams
        const activePlayers = cardsData.filter(c => (c.playerData.teamIds && c.playerData.teamIds.some(tId => window.teamConnected[tId])) || window.teamConnected[c.teamId]);
        
        for (let i = 0; i < activePlayers.length - 1; i++) {
            const card = activePlayers[i];
            const other = activePlayers[i + 1];

            const cx1 = card.x + 35; // radius is roughly 35 (avatar is 60px diameter + gap)
            const cy1 = card.y + 35; 
            const cx2 = other.x + 35;
            const cy2 = other.y + 35;
            
            ctx.moveTo(cx1, cy1);
            ctx.lineTo(cx2, cy2);

            const dx = cx2 - cx1;
            const dy = cy2 - cy1;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const restLength = 100; // how close they cluster
            
            if (dist > restLength) {
                const force = (dist - restLength) * 0.005; // Gentle pull
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                
                if (!card.isDragging) {
                    card.vx += fx;
                    card.vy += fy;
                }
                if (!other.isDragging) {
                    other.vx -= fx;
                    other.vy -= fy;
                }
            }
        }
        ctx.stroke();
        ctx.restore();

        for (let i = 0; i < cardsData.length; i++) {
            const card = cardsData[i];
            if (card.isHidden) continue;

            if (!card.isDragging) {
                card.x += card.vx;
                card.y += card.vy;
                
                // Lots of friction so they stop moving when not pulled
                card.vx *= 0.85;
                card.vy *= 0.85;

                // Stop bounding logic - allow zooming out/panning to infinity!
            }

            for (let j = i + 1; j < cardsData.length; j++) {
                const other = cardsData[j];
                if (other.isHidden) continue;

                const cx1 = card.x + 35;
                const cy1 = card.y + 35;
                const cx2 = other.x + 35;
                const cy2 = other.y + 35;
                const dx = cx2 - cx1;
                const dy = cy2 - cy1;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const minRadius = card.radius + other.radius + 10; // Extra padding

                if (dist < minRadius && dist > 0) {
                    const overlap = minRadius - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    if (!card.isDragging) {
                        card.x -= nx * overlap * 0.5;
                        card.y -= ny * overlap * 0.5;
                        card.vx -= nx * 0.1;
                        card.vy -= ny * 0.1;
                    }
                    if (!other.isDragging) {
                        other.x += nx * overlap * 0.5;
                        other.y += ny * overlap * 0.5;
                        other.vx += nx * 0.1;
                        other.vy += ny * 0.1;
                    }
                }
            }
        }

        const anyConnected = Object.values(window.teamConnected).some(v => v);
        const query = (window.teamsSearchQuery || '').trim().toLowerCase();

        cardsData.forEach(card => {
            card.el.style.transform = `translate(${card.x}px, ${card.y}px)`;
            
            const matchesTeam = !anyConnected || (card.playerData.teamIds && card.playerData.teamIds.some(tId => window.teamConnected[tId])) || window.teamConnected[card.teamId];
            const matchesSearch = !query || 
                (card.playerData.name && card.playerData.name.toLowerCase().includes(query)) ||
                (card.playerData.Team && card.playerData.Team.toLowerCase().includes(query));
            
            if (!matchesTeam || !matchesSearch) {
                card.el.style.opacity = '0.2';
                card.el.style.filter = 'grayscale(100%)';
                card.el.style.pointerEvents = 'none';
            } else {
                card.el.style.opacity = '1';
                card.el.style.filter = 'none';
                card.el.style.pointerEvents = 'auto';
            }
        });

        requestAnimationFrame(updatePhysics);
    }

    updatePhysics();
}

// 4.6 Turniere (Ligen) rendern
async function renderTournaments() {
    const container = document.getElementById('tournaments-container');
    if(!container) return;

    try {
        const tournaments = await fetchDataCSV('./data/tournaments.csv');
        globalTournamentsData = tournaments;
        
        container.innerHTML = tournaments.map(t => {
            let buttonHTML = '';
            if (t.link && t.link.trim() !== '') {
                const linkText = t.linkText || 'Tabelle ansehen';
                buttonHTML = `<a href="${t.link}" target="_blank" class="btn btn-secondary" style="font-size: 0.9rem;" onclick="event.stopPropagation()">${linkText}</a>`;
            }

            return `
            <div class="flip-card" style="cursor: pointer;" onclick="openTournamentModal(${t.id})">
                <div class="flip-card-inner">
                    <!-- Vorderseite -->
                    <div class="flip-card-front" style="border: 1px solid var(--glass-border); border-radius: 12px; background: var(--surface-color);">
                        <h3 style="color: var(--accent-color); font-size: 1.5rem; word-break: break-word; hyphens: auto; padding: 0 1rem; text-align: center; margin: 0;">${t.name}</h3>
                    </div>
                    <!-- Rückseite -->
                    <div class="flip-card-back" style="background: var(--surface-color); border: 1px solid var(--accent-color); border-radius: 12px; padding: 1rem;">
                        <p style="color: var(--text-primary); font-weight: 600; font-size: 1.1rem; margin-bottom: 1.5rem; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;">${window.stripHtml(t.description)}</p>
                        ${buttonHTML}
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        // Re-init animations for new dynamic elements
        setTimeout(() => initScrollAnimations(), 100);

        // Init carousel buttons
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                container.scrollBy({ left: -274, behavior: 'smooth' });
            });
            nextBtn.addEventListener('click', () => {
                container.scrollBy({ left: 274, behavior: 'smooth' });
            });
        }
    } catch(e) {
        console.error("Could not load tournaments", e);
        container.innerHTML = '<p>Keine Turnierdaten gefunden.</p>';
    }
}

// 5. Scroll-Animationen
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    const elementsToAnimate = document.querySelectorAll('.glass-card, .section-title, .event-item, .hero-content, .member-card-wrapper, .gallery-item, .team-card, .flip-card');
    elementsToAnimate.forEach(el => {
        el.classList.add('fade-in-up');
        observer.observe(el);
    });
}

// 6. Modal Logik
function openNewsModal(id) {
    const article = globalNewsData.find(n => n.id === id);
    if (!article) return;
    
    const modalBody = document.getElementById('modal-body');
    const dateString = window.parseDate(article.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const authorHTML = article.author ? ` &middot; 👤 ${article.author}` : '';
    
    const galleryHTML = window.renderGalleryHTML ? window.renderGalleryHTML(article.gallery, '') : '';
    
    let tagsHTML = '';
    if (article.category) {
        const tags = article.category.split(',').map(s => s.trim());
        tagsHTML = `<div style="margin-top: 1rem; margin-bottom: 1.5rem;">${tags.map(tag => `<span class="tag-badge">🏷️ ${tag}</span>`).join('')}</div>`;
    }
    
    modalBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <span class="news-date">${dateString}${authorHTML}</span>
                <h2 style="margin-bottom: 0.5rem; font-size: 2rem;">${article.title}</h2>
            </div>
            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; display: flex; align-items: center; gap: 0.4rem; border-color: var(--accent-color); color: var(--accent-color);" onclick="window.shareContent('${article.title.replace(/'/g, "\\'")}', 'Lies diese News auf unserer Website!', window.buildShareUrl('news', ${article.id}))">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                Teilen
            </button>
        </div>
        ${tagsHTML}
        <div class="news-text" style="font-size: 1.1rem;">${window.formatTextContent(article.content)}</div>
        ${galleryHTML}
    `;
    
    document.getElementById('news-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Scrollen des Hintergrunds verhindern
}

function closeNewsModal() {
    document.getElementById('news-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

window.openEventModal = function(id) {
    const event = globalEventsData.find(e => e.id === id);
    if (!event) return;

    const modalBody = document.getElementById('event-modal-body');
    const dateString = window.formatEventModalDateHeader ? window.formatEventModalDateHeader(event) : event.date;
    const timeDisplay = window.formatEventTimeDisplay ? window.formatEventTimeDisplay(event) : (event.time ? `${event.time} Uhr` : '');
    const authorHTML = event.author ? ` | 👤 ${event.author}` : '';



    const locationDisplay = event.locationUrl 
        ? `<a href="${event.locationUrl}" target="_blank" style="color: inherit; text-decoration: underline;">${event.location}</a>` 
        : event.location;

    let tagsHTML = '';
    if (event.category) {
        const tags = event.category.split(',').map(s => s.trim());
        tagsHTML = `<div style="margin-bottom: 1.5rem;">${tags.map(tag => `<span class="tag-badge">🏷️ ${tag}</span>`).join('')}</div>`;
    }

    const galleryHTML = window.renderGalleryHTML ? window.renderGalleryHTML(event.gallery, '') : '';

    const parsedColor = window.parseEventColor ? window.parseEventColor(event.color || event.akzentfarbe || event.accentColor) : null;
    const accentCol = parsedColor || 'var(--accent-color)';
    const modalContentEl = modalBody.closest('.modal-content');
    if (modalContentEl) {
        modalContentEl.style.borderTop = parsedColor ? `4px solid ${parsedColor}` : '';
    }

    const metaStr = window.formatEventMetaHeader ? window.formatEventMetaHeader(event) : event.date;
    const authorHTML = event.author ? ` | 👤 ${event.author}` : '';
    const metaLine = metaStr + authorHTML;

    modalBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <div style="font-size: 0.9rem; color: ${accentCol}; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
                    ${metaLine}
                </div>
                <h2 style="margin-bottom: 0.5rem; font-size: 2rem;">${event.title}</h2>
            </div>
            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; display: flex; align-items: center; gap: 0.4rem; border-color: var(--accent-color); color: var(--accent-color);" onclick="window.shareContent('${event.title.replace(/'/g, "\\'")}', 'Sieh dir diesen Termin auf unserer Website an!', window.buildShareUrl('event', ${event.id}))">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                Teilen
            </button>
        </div>
        ${tagsHTML}
        <div style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            📍 ${locationDisplay}
        </div>

        ${event.content ? `<div class="news-text" style="font-size: 1.1rem; line-height: 1.6;">${window.formatTextContent(event.content)}</div>` : ''}
        ${galleryHTML}
        
        <div style="margin-top: 2rem;">
            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem; justify-content: center; width: 100%; border-color: var(--accent-color); color: var(--accent-color);" onclick="downloadSingleEvent(${event.id})">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Termin speichern
            </button>
        </div>
    `;

    document.getElementById('event-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeEventModal = function() {
    document.getElementById('event-modal').classList.add('hidden');
    document.body.style.overflow = '';
};

window.openTournamentModal = function(id) {
    const tournament = globalTournamentsData.find(t => t.id === id);
    if (!tournament) return;

    const modalBody = document.getElementById('tournament-modal-body');
    
    let contentHTML = tournament.content && tournament.content.trim() !== '' ? window.formatTextContent(tournament.content) : '';

    let linkButtonHTML = '';
    if (tournament.link && tournament.link.trim() !== '') {
        const linkText = tournament.linkText || 'Zur offiziellen Tabelle / Webseite';
        linkButtonHTML = `
        <div style="margin-top: auto;">
            <a href="${tournament.link}" target="_blank" class="btn btn-secondary" style="display: block; text-align: center; width: 100%; border-color: var(--accent-color); color: var(--accent-color);">
                ${linkText}
            </a>
        </div>
        `;
    }

    modalBody.innerHTML = `
        <div style="font-size: 0.9rem; color: var(--accent-color); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">
            Turnier
        </div>
        <h2 style="margin-bottom: 0.5rem; font-size: 2rem;">${tournament.name}</h2>
        <div style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 1.5rem; font-weight: 600;">
            ${window.formatTextContent(tournament.description)}
        </div>
        <div class="news-text" style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem;">
            ${contentHTML}
        </div>
        
        ${linkButtonHTML}
    `;

    document.getElementById('tournament-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeTournamentModal = function() {
    document.getElementById('tournament-modal').classList.add('hidden');
    document.body.style.overflow = '';
};

// 7. Global Window Click Handler für alle Modals
window.onclick = function(event) {
    if (event.target.classList.contains('modal') || event.target.classList.contains('close-modal')) {
        document.querySelectorAll('.modal').forEach(m => {
            m.style.display = 'none';
            if(m.classList.contains('hidden') === false && m.id !== 'team-modal') {
                m.classList.add('hidden');
            }
        });
        document.body.style.overflow = '';
    }
}
