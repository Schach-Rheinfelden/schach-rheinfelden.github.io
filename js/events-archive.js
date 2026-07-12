
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
let searchTerm = '';
let dateFrom = '';
let dateTo = '';

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
            searchTerm = e.target.value.toLowerCase();
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

    try {
        globalEventsData = await fetchDataCSV('./data/events.csv');
        
        initEventsFilter();
        renderEvents();

        const urlParams = new URLSearchParams(window.location.search);
        const eventParam = urlParams.get('eventId');
        if (eventParam) setTimeout(() => window.openEventModal(parseInt(eventParam)), 500);

    } catch (error) {
        console.error('Fehler beim Laden der Termine:', error);
        document.getElementById('events-archive-container').innerHTML = '<p>Fehler beim Laden des Archivs.</p>';
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
    const event = globalEventsData.find(e => e.id === id);
    if (!event) return;

    const modalBody = document.getElementById('event-modal-body');
    const dateString = window.formatEventModalDateHeader ? window.formatEventModalDateHeader(event) : event.date;
    const timeDisplay = window.formatEventTimeDisplay ? window.formatEventTimeDisplay(event) : (event.time ? `${event.time} Uhr` : '');
    const authorHTML = event.author ? ` | 👤 ${event.author}` : '';
    const metaLine = [dateString, timeDisplay].filter(Boolean).join(' | ') + authorHTML;

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

    if (filteredEvents.length === 0) {
        container.innerHTML = '<p class="loading">Keine Termine gefunden.</p>';
        return;
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

    let html = '';

    // Render upcoming event cards directly in the grid
    if (upcoming.length > 0) {
        html += upcoming.map(e => renderEventCard(e, false)).join('');
    }

    // Toggle button and past event cards (hidden by default)
    if (past.length > 0) {
        html += `
        <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; margin: 3rem 0 1.5rem 0; position: relative;">
            <div style="position: absolute; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--glass-border), transparent); z-index: 1;"></div>
            <button class="past-toggle-btn" onclick="togglePastEvents(${past.length})" id="past-toggle-btn" style="position: relative; z-index: 2; background: var(--bg-color); border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 0.65rem 1.5rem; border-radius: 50px; font-size: 0.9rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.6rem; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.25);">
                <span>Vergangene Termine anzeigen (${past.length})</span>
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="transition: transform 0.3s ease;"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
            </button>
        </div>`;
        html += past.map(e => {
            const cardHtml = renderEventCard(e, true);
            // Inject past-event-card class and display: none style
            return cardHtml.replace('class="event-card ', 'class="event-card past-event-card ').replace('style="cursor: pointer; display: flex;', 'style="cursor: pointer; display: none;');
        }).join('');
    }

    if (upcoming.length === 0 && past.length === 0) {
        html = '<p class="loading" style="grid-column: 1 / -1;">Keine Termine gefunden.</p>';
    } else if (upcoming.length === 0) {
        html = '<p class="loading" style="grid-column: 1 / -1; margin-bottom: 1rem;">Aktuell keine kommenden Termine geplant.</p>' + html;
    }

    container.innerHTML = html;
}

// Toggle past events visibility
function togglePastEvents(count) {
    const cards = document.querySelectorAll('.past-event-card');
    const btn = document.getElementById('past-toggle-btn');
    if (!cards.length) return;
    
    const isHidden = cards[0].style.display === 'none';
    cards.forEach(card => {
        card.style.display = isHidden ? 'flex' : 'none';
    });

    if (btn) {
        const textSpan = btn.querySelector('span');
        const icon = btn.querySelector('svg');
        if (textSpan) {
            textSpan.textContent = isHidden ? 'Vergangene Termine ausblenden' : `Vergangene Termine anzeigen (${count})`;
        }
        if (icon) {
            icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}
