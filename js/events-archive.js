
(function() {
// parseDate is now defined globally in shared.js (with flexible date support)

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

let globalEventsData = [];
let currentCategory = 'Alle';
let currentView = 'grid'; // 'grid' or 'timeline'
let searchTerm = '';
let dateFrom = '';
let dateTo = '';
let currentUpcomingLimit = 12;
let savedUpcomingLimit = 12;
let currentPastLimit = 12;
let savedPastLimit = 12;
let pastEventsExpanded = false;
const EVENTS_PAGE_STEP = 12;

window.loadMoreUpcomingEvents = function() {
    currentUpcomingLimit += EVENTS_PAGE_STEP;
    savedUpcomingLimit = currentUpcomingLimit;
    renderEvents();
};

window.toggleView = function(view) {
    if (view === currentView) return;
    currentView = view;
    
    const gridBtn = document.getElementById('view-grid-btn');
    const timeBtn = document.getElementById('view-timeline-btn');
    
    if (view === 'grid') {
        if(gridBtn) {
            gridBtn.classList.remove('btn-secondary');
            gridBtn.classList.add('btn-primary');
        }
        if(timeBtn) {
            timeBtn.classList.remove('btn-primary');
            timeBtn.classList.add('btn-secondary');
        }
    } else {
        if(timeBtn) {
            timeBtn.classList.remove('btn-secondary');
            timeBtn.classList.add('btn-primary');
        }
        if(gridBtn) {
            gridBtn.classList.remove('btn-primary');
            gridBtn.classList.add('btn-secondary');
        }
    }
    
    renderEvents();
};

window.loadMorePastEvents = function() {
    currentPastLimit += EVENTS_PAGE_STEP;
    savedPastLimit = currentPastLimit;
    renderEvents();
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
    return url.href;
};

// Global click listener to close timeline labels when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.timeline-event-range')) {
        document.querySelectorAll('.timeline-event-range.show-label').forEach(node => {
            node.classList.remove('show-label');
        });
    }
});

// Die Balken sind divs mit onclick und waeren ohne das hier per Tastatur nicht
// erreichbar. Zusammen mit tabindex/role/aria-label aus renderTimeline() sind
// sie damit anfokussierbar und mit Enter oder Leertaste ausloesbar.
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const node = e.target && e.target.closest ? e.target.closest('.timeline-event-range') : null;
    if (!node) return;
    e.preventDefault(); // verhindert das Scrollen bei der Leertaste
    node.click();
});

// Escape schliesst ein offenes Label, ohne dass man daneben klicken muss.
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.timeline-event-range.show-label').forEach(node => {
        node.classList.remove('show-label');
    });
});

window.toggleNodeLabel = function(nodeElementId, eventId, event) {
    event.stopPropagation();
    const node = document.getElementById(nodeElementId);
    if (!node) return;
    
    // Auf dem PC (Maus) öffnet ein Klick direkt das Modal, da das Label schon beim Hover erscheint.
    if (window.matchMedia('(hover: hover)').matches) {
        openEventModal(eventId);
        return;
    }
    
    // Auf Mobilgeräten (Touch): Erstes Klicken zeigt Label, zweites Klicken öffnet Modal
    if (node.classList.contains('show-label')) {
        openEventModal(eventId);
    } else {
        document.querySelectorAll('.timeline-event-range.show-label').forEach(n => {
            n.classList.remove('show-label');
        });
        node.classList.add('show-label');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // Theme initialisieren
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

    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Search Input Listener
    const searchInput = document.getElementById('events-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase().trim();
            if (!searchTerm) {
                currentUpcomingLimit = savedUpcomingLimit;
                currentPastLimit = savedPastLimit;
            }
            renderEvents();
        });
    }

    const dateFromInput = document.getElementById('events-date-from');
    const dateToInput = document.getElementById('events-date-to');
    const dateResetBtn = document.getElementById('events-date-reset');

    if (dateFromInput) {
        dateFromInput.addEventListener('change', (e) => {
            dateFrom = e.target.value;
            renderEvents();
        });
    }

    if (dateToInput) {
        dateToInput.addEventListener('change', (e) => {
            dateTo = e.target.value;
            renderEvents();
        });
    }

    if (dateResetBtn) {
        dateResetBtn.addEventListener('click', () => {
            dateFromInput.value = '';
            dateToInput.value = '';
            dateFrom = '';
            dateTo = '';
            renderEvents();
        });
    }

    const archiveContainer = document.getElementById('events-archive-container');
    if (!archiveContainer) return;

    try {
        globalEventsData = await fetchDataCSV('./data/events.csv');
        
        initEventsFilter();
        renderEvents();

        const urlParams = new URLSearchParams(window.location.search);
        const eventParam = urlParams.get('eventId');
        // Ohne parseInt: openEventModal vergleicht inzwischen typtolerant, und
        // parseInt haette bei einer nicht numerischen ID NaN geliefert.
        if (eventParam) setTimeout(() => window.openEventModal(eventParam), 500);

    } catch (error) {
        console.error('Fehler beim Laden der Termine:', error);
        if (archiveContainer) archiveContainer.innerHTML = '<p>Fehler beim Laden des Archivs.</p>';
    }
});

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
        `<button class="filter-btn ${cat === currentCategory ? 'active' : ''}" onclick="filterEvents('${cat}')">${cat}</button>`
    ).join('');
}

window.filterEvents = function(category) {
    currentCategory = category;
    initEventsFilter();
    renderEvents();
};

function formatICSDatePart(dateStr) {
    if (!dateStr) return "20260101";
    if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}${month}${day}`;
    } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        return `${parts[0]}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`;
    }
    return dateStr.replace(/[^0-9]/g, '');
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

window.openEventModal = function(id) {
    // Typtoleranter Vergleich: fetchDataCSV wandelt rein numerische IDs in
    // Zahlen um, alle anderen bleiben Strings. Aufrufer liefern mal das eine,
    // mal das andere (Zeitleiste als String, Kacheln als Zahl, Deep-Link aus
    // der URL immer als String). Ein striktes === wuerde je nach Herkunft
    // fehlschlagen, obwohl dieselbe ID gemeint ist.
    const event = globalEventsData.find(e => String(e.id) === String(id));
    if (!event) return;

    const modalBody = document.getElementById('event-modal-body');
    const metaStr = window.formatEventMetaHeader ? window.formatEventMetaHeader(event) : event.date;
    const authorHTML = event.author ? ` | 👤 ${event.author}` : '';
    const metaLine = metaStr + authorHTML;

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

    const headerImgHTML = window.renderModalHeaderImage ? window.renderModalHeaderImage(event) : '';

    modalBody.innerHTML = `
        ${headerImgHTML}
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

window.onclick = function(event) {
    if (event.target.classList.contains('modal') || event.target.classList.contains('close-modal')) {
        document.querySelectorAll('.modal').forEach(m => {
            if(m.classList.contains('hidden') === false) {
                m.classList.add('hidden');
            }
        });
        document.body.style.overflow = '';
    }
}

window.downloadAllEvents = function() {
    let eventsToExport = currentCategory === 'Alle' 
        ? globalEventsData 
        : globalEventsData.filter(item => {
            if (!item.category) return false;
            const tags = item.category.split(',').map(s => s.trim());
            return tags.includes(currentCategory);
        });
        
    if (searchTerm) {
        eventsToExport = eventsToExport.filter(item => {
            const searchString = `${item.title} ${item.location} ${item.date}`.toLowerCase();
            return searchString.includes(searchTerm);
        });
    }

    // Exclude past events by default unless user explicitly set a custom date filter
    if (!dateFrom && !dateTo) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventsToExport = eventsToExport.filter(item => {
            const itemDate = window.parseDateSortable(item.date);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate >= today;
        });
    }

    if (eventsToExport.length === 0) return;
    
    const safeCat = currentCategory === 'Alle' ? 'alle' : currentCategory.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `schach_rheinfelden_termine_${safeCat}.ics`;
    generateICS(eventsToExport, filename);
};

function downloadSingleEvent(eventId) {
    const event = globalEventsData.find(e => e.id === eventId);
    if (!event) return;
    generateICS([event], event.title.replace(/\s+/g, '_') + '.ics');
}

window.downloadSingleEvent = downloadSingleEvent;

function renderEvents() {
    const container = document.getElementById('events-archive-container');
    
    let filteredEvents = currentCategory === 'Alle' 
        ? [...globalEventsData] 
        : globalEventsData.filter(item => {
            if (!item.category) return false;
            const tags = item.category.split(',').map(s => s.trim());
            return tags.includes(currentCategory);
        });

      if (searchTerm) {
          filteredEvents = filteredEvents.filter(item => {
              const searchString = `${item.title} ${item.location} ${item.date} ${item.author || ''}`.toLowerCase();
              return searchString.includes(searchTerm);
          });
      }

    if (dateFrom || dateTo) {
        filteredEvents = filteredEvents.filter(item => {
            const itemDate = window.parseDateSortable(item.date);
            itemDate.setHours(0,0,0,0);
            
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                fromDate.setHours(0,0,0,0);
                if (itemDate < fromDate) return false;
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(0,0,0,0);
                if (itemDate > toDate) return false;
            }
            return true;
        });
    }

    const downloadBtn = document.getElementById('download-all-events-btn');
    if (downloadBtn) {
        const svgIcon = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>`;
        if (currentCategory === 'Alle') {
            downloadBtn.innerHTML = `${svgIcon}<span>Alle Termine speichern</span>`;
        } else {
            downloadBtn.innerHTML = `${svgIcon}<span>Termine '${currentCategory}' speichern</span>`;
        }
    }

    const gridContainer = document.getElementById('events-archive-container');
    const timelineContainer = document.getElementById('events-timeline-container');
    
    if (filteredEvents.length === 0) {
        if (gridContainer) gridContainer.innerHTML = '<p class="loading">Keine Termine gefunden.</p>';
        if (timelineContainer) timelineContainer.innerHTML = '';
        return;
    }
    
    if (currentView === 'timeline') {
        if (gridContainer) gridContainer.classList.add('hidden');
        if (timelineContainer) timelineContainer.classList.remove('hidden');
        renderTimeline(filteredEvents);
        return;
    } else {
        if (gridContainer) gridContainer.classList.remove('hidden');
        if (timelineContainer) timelineContainer.classList.add('hidden');
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    // Split into upcoming and past
    const upcoming = filteredEvents.filter(e => {
        const parsed = window.parseFlexDate(e.date);
        if (parsed.type === 'tbd') return true; // TBD counts as upcoming
        const endD = window.getEventEndDate ? window.getEventEndDate(e) : parsed.date;
        return endD >= today;
    });
    const past = filteredEvents.filter(e => {
        const parsed = window.parseFlexDate(e.date);
        if (parsed.type === 'tbd') return false;
        const endD = window.getEventEndDate ? window.getEventEndDate(e) : parsed.date;
        return endD < today;
    });

    // Upcoming: ascending (nearest first), TBD at end
    upcoming.sort((a, b) => window.parseDateSortable(a.date) - window.parseDateSortable(b.date));
    // Past: descending (most recent first)
    past.sort((a, b) => window.parseDateSortable(b.date) - window.parseDateSortable(a.date));

    function renderEventCard(event, isPast) {
        const pastClass = isPast ? 'event-past' : '';

        const timeDisplay = window.formatEventTimeDisplay ? window.formatEventTimeDisplay(event) : (event.time ? `🕒 ${event.time} Uhr` : '');
        const authorHTML = event.author ? `<span style="margin-left: 1rem;">👤 ${event.author}</span>` : '';

        let imageHTML = '';
        if (event.image) {
            imageHTML = `<div class="event-img-thumbnail" style="background-image: url('${event.image}'); width: 100%; height: 140px; background-size: cover; background-position: center; border-radius: 8px 8px 0 0; margin: -1.5rem -1.5rem 1rem -1.5rem; width: calc(100% + 3rem);"></div>`;
        }

        const colorStyles = window.getEventCardColorStyles ? window.getEventCardColorStyles(event.color || event.akzentfarbe || event.accentColor) : { cardStyle: '', dateBoxStyle: '' };

        const dateBoxContent = window.formatEventDateBox ? window.formatEventDateBox(event) : '';

        const timeRowHTML = (timeDisplay || authorHTML) ? `<div>${timeDisplay}${authorHTML}</div>` : '';

        return `
        <div class="event-card ${pastClass}" style="cursor: pointer; display: flex; flex-direction: column; align-items: stretch; ${colorStyles.cardStyle}" onclick="openEventModal(${event.id})">
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
                        <div style="margin-top: 0.25rem;">📍 ${event.location}</div>
                    </div>
                    <div style="margin-top: 0.6rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
                        ${event.category ? event.category.split(',').map(tag => `<span class="tag-badge">🏷️ ${tag.trim()}</span>`).join('') : ''}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    const isSearching = Boolean(searchTerm);
    let html = '';

    const visibleUpcoming = isSearching ? upcoming : upcoming.slice(0, currentUpcomingLimit);

    if (visibleUpcoming.length > 0) {
        html += visibleUpcoming.map(e => renderEventCard(e, false)).join('');
        if (!isSearching && currentUpcomingLimit < upcoming.length) {
            html += `
            <div style="grid-column: 1 / -1; text-align: center; margin: 1.5rem 0;">
                <button class="btn btn-secondary" onclick="loadMoreUpcomingEvents()">Weitere Termine</button>
            </div>`;
        }
    }

    if (past.length > 0) {
        const showPast = isSearching || pastEventsExpanded;
        const iconRot = showPast ? 'rotate(180deg)' : 'rotate(0deg)';
        const btnText = showPast ? 'Vergangene Termine ausblenden' : `Vergangene Termine anzeigen (${past.length})`;

        html += `
        <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; margin: 3rem 0 1.5rem 0; position: relative;">
            <div style="position: absolute; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--glass-border), transparent); z-index: 1;"></div>
            <button class="past-toggle-btn" onclick="togglePastEvents()" id="past-toggle-btn" style="position: relative; z-index: 2; background: var(--bg-color); border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 0.65rem 1.5rem; border-radius: 50px; font-size: 0.9rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.6rem; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.25);">
                <span>${btnText}</span>
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="transition: transform 0.3s ease; transform: ${iconRot};"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
            </button>
        </div>`;

        if (showPast) {
            const visiblePast = isSearching ? past : past.slice(0, currentPastLimit);
            html += visiblePast.map(e => renderEventCard(e, true)).join('');
            if (!isSearching && currentPastLimit < past.length) {
                html += `
                <div style="grid-column: 1 / -1; text-align: center; margin: 1.5rem 0;">
                    <button class="btn btn-secondary" onclick="loadMorePastEvents()">Weitere vergangene Termine</button>
                </div>`;
            }
        }
    }

    if (upcoming.length === 0 && past.length === 0) {
        html = '<p class="loading" style="grid-column: 1 / -1;">Keine Termine gefunden.</p>';
    } else if (upcoming.length === 0) {
        html = '<p class="loading" style="grid-column: 1 / -1; margin-bottom: 1rem;">Aktuell keine kommenden Termine geplant.</p>' + html;
    }

    container.innerHTML = html;
}

window.togglePastEvents = function() {
    pastEventsExpanded = !pastEventsExpanded;
    renderEvents();
};

function renderTimeline(events) {
    const container = document.getElementById('events-timeline-container');
    if (!container) return;
    
    // 1. Valid events that have a parseable date
    const validEvents = events.filter(e => {
        const parsed = window.parseFlexDate(e.date);
        return parsed.date && parsed.type !== 'tbd';
    });
    
    if (validEvents.length === 0) {
        // Die Hoehe stammt sonst noch vom vorherigen Rendering und die Meldung
        // stuende in einem mehrere hundert Pixel hohen leeren Kasten.
        container.style.minHeight = '';
        container.innerHTML = '<p class="loading" style="text-align: center;">Für die gewählten Termine kann keine Zeitleiste generiert werden (fehlende oder ungenaue Daten).</p>';
        return;
    }
    
    // Sort chronologically
    validEvents.sort((a, b) => window.parseDateSortable(a.date) - window.parseDateSortable(b.date));
    
    // 2. Determine bounds (Start / End)
    let minDate, maxDate;
    if (dateFrom && dateTo) {
        minDate = new Date(dateFrom).getTime();
        maxDate = new Date(dateTo).getTime();
    } else {
        minDate = window.parseDateSortable(validEvents[0].date).getTime();
        maxDate = window.parseDateSortable(validEvents[validEvents.length - 1].date).getTime();
    }
    
    // If only one event or range is 0, pad it
    if (maxDate <= minDate) {
        minDate -= 86400000 * 7; // -1 week
        maxDate += 86400000 * 7; // +1 week
    } else {
        // Add 5% padding on both sides
        const range = maxDate - minDate;
        minDate -= range * 0.05;
        maxDate += range * 0.05;
    }
    
    const totalDuration = maxDate - minDate;
    
    // 3. Collect all valid timeline items (points and ranges)
    const timelineItems = [];
    
    validEvents.forEach(evt => {
        const time = window.parseDateSortable(evt.date).getTime();
        
        const rangeInfo = window.parseDateRange ? window.parseDateRange(evt.date) : { isRange: false };
        let isRange = rangeInfo.isRange;
        let endTime = rangeInfo.end ? rangeInfo.end.getTime() : null;
        
        if (!isRange && evt.endDate && evt.endDate.trim() !== '') {
            const endParsed = window.parseFlexDate(evt.endDate);
            if (endParsed.date && endParsed.date.getTime() > time) {
                isRange = true;
                endTime = endParsed.date.getTime();
            }
        }
        
        // Ein als Zeitraum erkannter Termin ohne verwertbares Enddatum wird wie
        // ein Punkt behandelt. Ohne diese Korrektur waere endTime null, und
        // "null < minDate" ergaebe "0 < minDate" - der Termin verschwaende
        // kommentarlos aus der Zeitleiste.
        if (isRange && endTime === null) {
            isRange = false;
        }

        // If the event starts after maxDate or ends before minDate, skip
        if (time > maxDate || (isRange && endTime < minDate) || (!isRange && time < minDate)) {
            return;
        }
        
        let startPercent = ((time - minDate) / totalDuration) * 100;
        let endPercent = startPercent;
        
        if (isRange && endTime) {
            // Add 1 day to endTime to make the range inclusive of the last day
            let adjustedEndTime = endTime + (86400000 * 0.99); // almost 1 day
            endPercent = ((adjustedEndTime - minDate) / totalDuration) * 100;
        }
        
        // Clamp bounds
        if (startPercent < 0) startPercent = 0;
        if (endPercent > 100) endPercent = 100;
        
        let widthPercent = endPercent - startPercent;

        const isPoint = !isRange || widthPercent <= 0;

        // Zwei getrennte Breiten, weil sie zwei verschiedene Aufgaben haben:
        //
        // renderWidth  - die zeitlich korrekte Breite. Ein eintaegiger Termin
        //   belegt genau einen Tag, kein fester Prozentwert. Frueher bekamen
        //   Punkte pauschal 0.8%, was ihren Mittelpunkt je nach Zeitraum um
        //   einen Bruchteil eines Tages nach hinten verschob. Da renderTimeline
        //   ueber die Mitte positioniert, wanderte damit der ganze Punkt.
        //
        // collisionWidth - die Breite fuer die Spurverteilung. Hier ist ein
        //   Mindestwert noetig: Zwei Termine wenige Tage auseinander liegen in
        //   einem mehrjaehrigen Zeitraum rechnerisch kaum auseinander, wuerden
        //   dieselbe Spur bekommen und sich am Bildschirm trotzdem ueberdecken.
        const dayWidthPercent = ((86400000 * 0.99) / totalDuration) * 100;
        const renderWidth = isPoint ? dayWidthPercent : widthPercent;
        const collisionWidth = Math.max(renderWidth, 0.8);

        timelineItems.push({
            evt,
            isRange: !isPoint,
            startPercent,
            endPercent: startPercent + collisionWidth, // fuer die Spurverteilung
            widthPercent: renderWidth                  // fuer die Darstellung
        });
    });
    
    // 4. Color Swimlanes & Pyramid Sorting
    
    // Determine color for each item
    timelineItems.forEach(item => {
        item.color = (window.parseEventColor && window.parseEventColor(item.evt.color || item.evt.akzentfarbe || item.evt.accentColor)) || '#64748b';
    });
    
    // Sort items for Pyramid packing:
    // 1. Duration (longest first)
    // 2. Start Date (earliest first)
    timelineItems.sort((a, b) => {
        const durA = a.endPercent - a.startPercent;
        const durB = b.endPercent - b.startPercent;
        if (Math.abs(durA - durB) > 0.01) return durB - durA; // Longest first
        return a.startPercent - b.startPercent;
    });
    
    // Group by color
    const colorGroups = {};
    timelineItems.forEach(item => {
        if (!colorGroups[item.color]) colorGroups[item.color] = [];
        colorGroups[item.color].push(item);
    });
    
    // Determine the maximum duration within each color group
    const colorMaxDurations = {};
    Object.keys(colorGroups).forEach(color => {
        let maxDur = 0;
        colorGroups[color].forEach(item => {
            const dur = item.endPercent - item.startPercent;
            if (dur > maxDur) maxDur = dur;
        });
        colorMaxDurations[color] = maxDur;
    });
    
    // Sort color swimlanes dynamically: 
    // The color with the absolute longest bar goes to the very bottom.
    const colorOrder = Object.keys(colorGroups).sort((a, b) => {
        const diff = colorMaxDurations[b] - colorMaxDurations[a];
        if (Math.abs(diff) > 0.01) return diff;
        return a.localeCompare(b);
    });
    
    let currentTrackOffset = 0;
    
    colorOrder.forEach(color => {
        const items = colorGroups[color];
        // Pro Spur die Liste der bereits belegten Intervalle statt nur des
        // letzten Endzeitpunkts. Das ist entscheidend, weil die Termine nach
        // Dauer sortiert verarbeitet werden und damit NICHT chronologisch
        // ankommen: Ein mehrtaegiger Balken belegt eine Spur als Erster und
        // setzte frueher deren Endmarke weit in die Zukunft. Jeder spaeter
        // gepruefte, aber frueher startende Termin fiel dann durch die
        // Bedingung "Spur-Ende <= Termin-Start" - obwohl die Spur zu seinem
        // Zeitpunkt frei war. Er landete unnoetig eine Stufe hoeher und riss
        // eine sichtbare Luecke in den Stapel.
        const tracks = [];

        items.forEach(item => {
            let assignedLocalTrack = -1;

            for (let i = 0; i < tracks.length; i++) {
                // Passt der Termin, wenn er sich mit keinem Intervall dieser
                // Spur ueberschneidet? Beruehrende Termine (Ende 14., Start
                // 15.) gelten bewusst als vertraeglich und teilen sich eine Spur.
                const fits = tracks[i].every(iv =>
                    item.endPercent <= iv.start || item.startPercent >= iv.end
                );
                if (fits) {
                    assignedLocalTrack = i;
                    break;
                }
            }

            if (assignedLocalTrack === -1) {
                assignedLocalTrack = tracks.length;
                tracks.push([]);
            }

            tracks[assignedLocalTrack].push({ start: item.startPercent, end: item.endPercent });
            item.track = currentTrackOffset + assignedLocalTrack;
        });
        
        // No extra gap between color swimlanes to keep it compact
        currentTrackOffset += tracks.length;
    });

    // 4. Render HTML

    // Geometrie der Zeitleiste. Muss vor dem Rendern stehen, da sowohl die
    // Balkenposition als auch die Containerhoehe darauf aufbauen.
    const TRACK_HEIGHT = 12;   // vertikaler Abstand zweier Spuren in px
    const LINE_POSITION = 0.75; // Lage der Zeitachse als Anteil der Containerhoehe

    let html = '<div class="timeline-line"></div>';
    
    // Zeitmarker erzeugen. Die Schrittweite richtet sich nach der Gesamtdauer:
    // Bei jedem Monat einen Marker zu setzen funktioniert nur bei kurzen
    // Zeitraeumen. Ein Label ist rund 55px breit - ueber etwa 18 Monaten
    // ueberlappen sie zu einem unlesbaren Band. Deshalb wird ab dort auf
    // Quartale und ab 5 Jahren auf Jahre ausgeduennt.
    const totalMonths = Math.max(1, Math.round(totalDuration / (86400000 * 30.44)));
    let monthStep = 1;
    if (totalMonths > 60) monthStep = 12;
    else if (totalMonths > 36) monthStep = 6;
    else if (totalMonths > 18) monthStep = 3;

    const startDate = new Date(minDate);
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    if (currentMonth.getTime() < minDate) {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Bei Quartals- und Jahresschritten auf ein glattes Raster einrasten,
    // damit die Marker auf Jan/Apr/Jul/Okt bzw. auf den Jahreswechsel fallen
    // statt auf einen zufaelligen Startmonat.
    if (monthStep > 1) {
        while (currentMonth.getMonth() % monthStep !== 0) {
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
    }

    while (currentMonth.getTime() <= maxDate) {
        const time = currentMonth.getTime();
        const percent = ((time - minDate) / totalDuration) * 100;
        // Bei Jahresschritten reicht die Jahreszahl allein.
        const monthName = monthStep >= 12
            ? String(currentMonth.getFullYear())
            : currentMonth.toLocaleString('de-CH', { month: 'short', year: 'numeric' });

        html += `
            <div class="timeline-month-marker" style="left: ${percent}%;">
                <div class="timeline-month-tick"></div>
                <div class="timeline-month-label">${monthName}</div>
            </div>
        `;

        currentMonth.setMonth(currentMonth.getMonth() + monthStep);
    }

    // "Heute"-Marker. Wichtigster Orientierungspunkt einer Zeitleiste, die
    // Vergangenes und Kommendes zeigt - man sucht als Erstes danach.
    // Wird nur gezeichnet, wenn der heutige Tag im dargestellten Zeitraum liegt.
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayTime = todayDate.getTime();

    if (todayTime >= minDate && todayTime <= maxDate) {
        const todayPercent = ((todayTime - minDate) / totalDuration) * 100;
        // Nahe am Rand wuerde die zentrierte Beschriftung aus dem Container
        // ragen, deshalb dort auf die Innenseite ausrichten.
        let todayCls = '';
        if (todayPercent < 5) todayCls = 'align-right';
        else if (todayPercent > 95) todayCls = 'align-left';

        html += `
            <div class="timeline-today-marker ${todayCls}" style="left: ${todayPercent}%;">
                <div class="timeline-today-label">Heute</div>
                <div class="timeline-today-line"></div>
            </div>
        `;
    }
    
    // Render timeline items (points and ranges as bars)
    // Attributwerte absichern: Titel und IDs stammen aus der CSV und koennen
    // Anfuehrungszeichen enthalten, die sonst das umgebende Attribut sprengen.
    const escapeAttr = (val) => String(val == null ? '' : val)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Fuer Werte, die in einem onclick-Attribut als JS-String landen, reicht
    // escapeAttr NICHT: Der Browser dekodiert &#39; zurueck zu einem echten
    // Apostroph, und genau das ist der Begrenzer des JS-Strings. Eine ID wie
    // "O'Brien Cup" wuerde den String aufbrechen. Deshalb erst fuer JavaScript
    // maskieren (Backslash), danach fuer HTML - in dieser Reihenfolge bleibt
    // aus dem Apostroph ein \' und der String haelt.
    const escapeJsInAttr = (val) => escapeAttr(
        String(val == null ? '' : val)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
    );

    timelineItems.forEach((item, index) => {
        const evt = item.evt;
        const dateStr = window.formatEventDateBox ? window.formatEventDateBox(evt).replace(/<[^>]+>/g, ' ') : evt.date;
        // Farbe wurde bereits fuer die Swimlane-Gruppierung ermittelt.
        const parsedColor = item.color;
        const nodeId = `timeline-item-${index}`;
        // Die ID gehoert in Anfuehrungszeichen: Ohne sie wuerde eine nicht
        // numerische ID wie "sommerfest" als Variablenname interpretiert und
        // beim Klick einen ReferenceError ausloesen.
        const onClickFn = `window.toggleNodeLabel(&#39;${nodeId}&#39;, &#39;${escapeJsInAttr(evt.id)}&#39;, event)`;

        // Calculate vertical offset based on track
        // All events stack UPWARDS.
        // Timeline line is 4px (2px half). Gap = 4px. Bar = 8px (4px half).
        // Center of track 0 is 10px above center of line.
        let offsetPx = -10 - (item.track * TRACK_HEIGHT);

        // Label-Ausrichtung in drei Zonen statt der bisherigen Haelften-Logik.
        // Nur Balken nahe am Rand werden verankert, alles dazwischen bleibt
        // zentriert - sonst kippt schon ein Termin bei 45% unnoetig zur Seite.
        const centerPercent = item.startPercent + item.widthPercent / 2;
        let positionCls = '';
        if (centerPercent < 15) positionCls = 'align-right';
        else if (centerPercent > 85) positionCls = 'align-left';

        const ariaLabel = escapeAttr(`${evt.title}, ${String(dateStr).trim()}`);

        // Mehrtaegige Termine bekommen eine eigene Klasse und darueber eine
        // groessere Mindestbreite. Ohne sie schrumpft ein dreitaegiger Termin
        // auf schmalen Displays unter die gemeinsame Mindestbreite von 8px und
        // ist von einem eintaegigen Punkt nicht mehr zu unterscheiden.
        const shapeCls = item.isRange ? 'is-range' : 'is-point';

        // Positioniert wird ueber die MITTE des Zeitraums, nicht ueber die
        // linke Kante (das CSS zieht das Element mit translateX(-50%) zurueck).
        // Grund: Beide Mindestbreiten - 8px fuer Punkte, 12px fuer Balken -
        // wachsen nur nach rechts. Bei linker Verankerung erscheint ein Termin
        // dadurch spaeter und laenger, als er ist. Ein Punkt am 12. reichte so
        // fast bis ans Ende eines Balkens vom 11. bis 13. Um die Mitte gezeichnet
        // verteilt sich die Aufweitung gleichmaessig auf beide Seiten, der
        // Mittelpunkt bleibt zeitlich korrekt und die Reihenfolge stimmt.
        html += `
            <div class="timeline-event-range ${shapeCls} ${positionCls}" id="${nodeId}" style="left: ${centerPercent}%; width: ${item.widthPercent}%; top: calc(75% + ${offsetPx}px); background-color: ${parsedColor};" onclick="${onClickFn}" tabindex="0" role="button" aria-label="${ariaLabel}">
                <div class="timeline-label">
                    <div class="timeline-date">${dateStr}</div>
                    <div class="timeline-title">${evt.title}</div>
                    <div class="timeline-tooltip-hint">Klick für Details</div>
                </div>
            </div>
        `;
    });
    
    // Hoehe aus dem tatsaechlichen Platzbedarf ableiten statt aus einer festen
    // Formel. Die Balken stapeln nach oben ab der Linie bei 75% der Hoehe -
    // pro Spur waechst der verfuegbare Platz also nur um 75% des Zuwachses.
    // Die fruehere Formel (150 + 12 * Spuren) gab pro Spur 9px Platz bei 12px
    // Bedarf und lief ab etwa 37 Spuren oben aus dem Container heraus.
    // Oberkante des obersten Balkens: Grundabstand 10px + Stapel + halbe Balkenhoehe.
    const stackHeight = 10 + (currentTrackOffset * TRACK_HEIGHT) + 6;
    const requiredHeight = Math.max(250, Math.ceil(stackHeight / LINE_POSITION) + 40);
    container.style.minHeight = requiredHeight + 'px';
    
    container.innerHTML = html;
}

})();
