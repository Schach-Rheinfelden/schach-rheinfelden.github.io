let globalMediaData = [];
let currentCategory = 'all';
let currentType = 'all';

// Utilities
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
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const text = await window.fetchTextWithEncoding(response);
    const rows = parseCSV(text);
    if (rows.length < 2) return [];
    
    const headers = rows[0].map(h => (h || '').trim().replace(/^"|"$/g, '').toLowerCase());
    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            let val = row[index] !== undefined ? row[index].trim().replace(/^"|"$/g, '') : '';
            if (val === '-' || val.toLowerCase() === 'null') val = '';
            val = window.cleanMojibake ? window.cleanMojibake(val) : val;
            obj[header] = val;
        });
        
        if (obj.id) obj.id = parseInt(obj.id);
        
        return obj;
    });
}

// App Logic
document.addEventListener('DOMContentLoaded', async () => {
    // Theme setup
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.className = savedTheme + '-theme';
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'light';
        themeToggle.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'light' : 'dark';
            document.documentElement.className = newTheme + '-theme';
            localStorage.setItem('theme', newTheme);
        });
    }
    
    // Load data
    try {
        globalMediaData = await fetchDataCSV('./data/media.csv');
        // Sort descending by date
        globalMediaData.sort((a, b) => window.parseDate(b.date) - window.parseDate(a.date));
        
        buildFilters();
        renderMedia();
        setupListeners();

        const urlParams = new URLSearchParams(window.location.search);
        const mediaParam = urlParams.get('media');
        if (mediaParam) setTimeout(() => window.openMedia(parseInt(mediaParam)), 100);

    } catch(e) {
        console.error("Fehler beim Laden der Mediathek:", e);
        document.getElementById('media-container').innerHTML = '<p>Konnte Mediathek nicht laden.</p>';
    }
});

function buildFilters() {
    const categories = new Set();
    const types = new Set();
    globalMediaData.forEach(item => {
        if (item.category) {
            item.category.split(',').forEach(c => categories.add(c.trim()));
        }
        if (item.type) {
            types.add(item.type.trim());
        }
    });

    // Category Filter
    const filterContainer = document.getElementById('media-filter');
    let filterHTML = '<button class="filter-btn active" data-filter="all">Alle Kategorien</button>';
    Array.from(categories).sort((a, b) => a.localeCompare(b, 'de')).forEach(cat => {
        if(cat) filterHTML += `<button class="filter-btn" data-filter="${cat}">${cat}</button>`;
    });
    filterContainer.innerHTML = filterHTML;

    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.filter;
            renderMedia();
        });
    });

    // Type Filter
    const typeFilterContainer = document.getElementById('media-type-filter');
    if (typeFilterContainer) {
        let typeFilterHTML = '<button class="filter-btn active" data-filter="all">Alle Typen</button>';
        Array.from(types).sort((a, b) => a.localeCompare(b, 'de')).forEach(t => {
            if(t) {
                const label = t.charAt(0).toUpperCase() + t.slice(1);
                typeFilterHTML += `<button class="filter-btn" data-filter="${t}">${label}</button>`;
            }
        });
        typeFilterContainer.innerHTML = typeFilterHTML;

        typeFilterContainer.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                typeFilterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentType = e.target.dataset.filter;
                renderMedia();
            });
        });
    }
}

function setupListeners() {
    const searchInput = document.getElementById('media-search');
    const dateFrom = document.getElementById('media-date-from');
    const dateTo = document.getElementById('media-date-to');
    const dateReset = document.getElementById('media-date-reset');
    
    [searchInput, dateFrom, dateTo].forEach(el => {
        if(el) el.addEventListener('input', renderMedia);
    });
    
    if(dateReset) {
        dateReset.addEventListener('click', () => {
            if(dateFrom) dateFrom.value = '';
            if(dateTo) dateTo.value = '';
            renderMedia();
        });
    }
}

function getPlatformIcon(type, url) {
    const t = (type || '').toLowerCase().trim();
    if(t === 'galerie' || t === 'gallery' || t === 'bilder' || t === 'bildergalerie') return '🖼️ Galerie';
    if(t === 'webseite' || t === 'website' || t === 'link' || t === 'extern' || t === 'tool') return '🌐 Webseite';
    if(t === 'pdf' || t === 'dokument' || t === 'doc') return '📄 Dokument';
    if(t === 'bild' || t === 'image' || t === 'foto') return '🖼️ Bild';
    if(t === 'taktik' || t === 'puzzle' || t === 'training') return '♟️ Taktik';
    if(t === 'youtube') return '▶️ YouTube';
    if(t === 'vimeo') return '🟦 Vimeo';
    if(t === 'gdrive' || t === 'drive') return '📁 G-Drive';
    if(t === 'lichess') return '♘ Lichess';
    if(t === 'dropbox') return '📦 Dropbox';

    if(!url) return '🎬 Medien';
    const lowerUrl = url.toLowerCase();
    if(lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return '▶️ YouTube';
    if(lowerUrl.includes('vimeo.com')) return '🟦 Vimeo';
    if(lowerUrl.includes('drive.google.com')) return '📁 G-Drive';
    if(lowerUrl.includes('lichess.org')) return '♘ Lichess';
    if(lowerUrl.includes('dropbox.com')) return '📦 Dropbox';
    return '🌐 Webseite';
}

function getEmbedUrl(url) {
    if(!url) return null;
    const lowerUrl = url.toLowerCase();
    
    // YouTube
    if(lowerUrl.includes('youtube.com/watch')) {
        try {
            const urlObj = new URL(url);
            const v = urlObj.searchParams.get('v');
            if(v) return `https://www.youtube.com/embed/${v}`;
        } catch(e) {}
    } else if (lowerUrl.includes('youtu.be/')) {
        try {
            const id = url.split('youtu.be/')[1].split('?')[0];
            if(id) return `https://www.youtube.com/embed/${id}`;
        } catch(e) {}
    }
    
    // Vimeo
    if(lowerUrl.includes('vimeo.com/')) {
        try {
            const id = url.split('vimeo.com/')[1].split('?')[0];
            if(id) return `https://player.vimeo.com/video/${id}`;
        } catch(e) {}
    }
    
    return null;
}

function openMedia(id) {
    const item = globalMediaData.find(m => m.id === id);
    if(!item || (!item.url && !item.gallery)) return;
    
    const t = (item.type || '').toLowerCase().trim();
    const isGallery = t === 'galerie' || t === 'gallery' || t === 'bilder' || t === 'bildergalerie' || (item.gallery && item.gallery.trim() !== '');
    if (isGallery) {
        const gallerySource = (item.gallery && item.gallery.trim() !== '') ? item.gallery : item.url;
        const modal = document.getElementById('video-modal');
        const modalBody = document.getElementById('video-modal-body');
        modalBody.style.height = 'auto';
        modalBody.style.maxHeight = '80vh';
        modalBody.style.overflowY = 'auto';
        modalBody.innerHTML = `
            <div style="padding: 0.5rem;">
                <h2 style="color: var(--accent-color); margin-bottom: 0.5rem; font-size: 1.8rem; margin-top: 0;">${item.title}</h2>
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">📅 ${window.parseDate(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}${item.author ? ` &middot; 👤 ${item.author}` : ''}</div>
                ${item.description ? `<p style="color: var(--text-primary); margin-bottom: 1.5rem; font-size: 1.05rem; line-height: 1.6;">${window.formatTextContent(item.description)}</p>` : ''}
                ${window.renderGalleryHTML(gallerySource, '')}
            </div>
        `;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        return;
    }

    if (!item.url) return;

    const isSingleImage = t === 'bild' || t === 'image' || t === 'foto' || /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(item.url);
    if (isSingleImage && !isGallery) {
        const modal = document.getElementById('video-modal');
        const modalBody = document.getElementById('video-modal-body');
        modalBody.style.height = 'auto';
        modalBody.style.maxHeight = '85vh';
        modalBody.style.overflowY = 'auto';
        modalBody.innerHTML = `
            <div style="padding: 0.5rem; text-align: center;">
                <h2 style="color: var(--accent-color); margin-bottom: 0.5rem; font-size: 1.6rem; margin-top: 0;">${item.title}</h2>
                ${item.description ? `<p style="color: var(--text-primary); margin-bottom: 1rem; font-size: 1rem;">${window.formatTextContent(item.description)}</p>` : ''}
                <img src="${item.url}" alt="${item.title}" style="max-width: 100%; max-height: 65vh; border-radius: 8px; border: 1px solid var(--border-color); object-fit: contain;">
            </div>
        `;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        return;
    }

    const embedUrl = getEmbedUrl(item.url);
    if(embedUrl) {
        // Open Modal for YouTube/Vimeo
        const modal = document.getElementById('video-modal');
        const modalBody = document.getElementById('video-modal-body');
        modalBody.style.height = '500px';
        modalBody.style.maxHeight = 'none';
        modalBody.style.overflowY = 'hidden';
        modalBody.innerHTML = `<iframe width="100%" height="100%" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 12px; border: 1px solid var(--accent-color);"></iframe>`;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        // Open in new tab
        window.open(item.url, '_blank');
    }
}

function renderMedia() {
    const container = document.getElementById('media-container');
    const searchVal = document.getElementById('media-search')?.value.toLowerCase() || '';
    const dateFromVal = document.getElementById('media-date-from')?.value;
    const dateToVal = document.getElementById('media-date-to')?.value;

    const filtered = globalMediaData.filter(item => {
        // Search
        const textMatch = (item.title?.toLowerCase().includes(searchVal)) || 
                          (item.description?.toLowerCase().includes(searchVal)) ||
                          (item.author?.toLowerCase().includes(searchVal));
        if (!textMatch) return false;

        // Category
        if (currentCategory !== 'all') {
            if (!item.category) return false;
            const cats = item.category.split(',').map(c => c.trim());
            if (!cats.includes(currentCategory)) return false;
        }

        // Type
        if (currentType !== 'all') {
            if (!item.type) return false;
            if (item.type.toLowerCase().trim() !== currentType.toLowerCase().trim()) return false;
        }

        // Date
        const itemDate = window.parseDate(item.date);
        itemDate.setHours(0,0,0,0);
        if (dateFromVal) {
            const from = new Date(dateFromVal);
            from.setHours(0,0,0,0);
            if (itemDate < from) return false;
        }
        if (dateToVal) {
            const to = new Date(dateToVal);
            to.setHours(0,0,0,0);
            if (itemDate > to) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 2rem;">Keine passenden Medien gefunden.</div>';
        return;
    }

    container.innerHTML = filtered.map(item => {
        const dateString = window.parseDate(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const platformLabel = (item.emoji && item.emoji.trim() !== '') ? item.emoji.trim() : getPlatformIcon(item.type, item.url);
        
        let thumbHTML = '';
        if (item.thumbnail && item.thumbnail.trim() !== '') {
            thumbHTML = `<img src="${item.thumbnail}" class="media-thumbnail" alt="${item.title}" onerror="this.outerHTML='<div class=\\'media-thumbnail\\'>${platformLabel}</div>'">`;
        } else {
            thumbHTML = `<div class="media-thumbnail">${platformLabel.split(' ')[0]}</div>`;
        }

        let authorHTML = '';
        if (item.author) {
            authorHTML = `<div style="font-size: 0.85rem; color: var(--accent-color); margin-bottom: 0.5rem;">👤 ${item.author}</div>`;
        }

        const colorStyles = window.getCardColorStyles ? window.getCardColorStyles(item.color || item.akzentfarbe || item.accentColor) : { cardStyle: '', badgeStyle: '', color: null };

        const tagsHTML = item.category 
            ? `<div style="margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">${item.category.split(',').map(tag => `<span class="tag-badge">🏷️ ${tag.trim()}</span>`).join('')}</div>` 
            : '';

        return `
        <div class="glass-card media-card fade-in-up" onclick="openMedia(${item.id})" style="cursor: pointer; ${colorStyles.cardStyle}">
            ${thumbHTML}
            <div class="media-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span class="media-type-badge" ${colorStyles.badgeStyle ? `style="${colorStyles.badgeStyle}"` : ''}>${item.type || 'Media'}</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${dateString}</span>
                </div>
                <h3 style="margin-bottom: 0.5rem; color: var(--text-primary); font-size: 1.25rem; word-break: break-word;">${item.title}</h3>
                ${authorHTML}
                <div style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1rem; flex-grow: 1;">${window.formatTextContent(item.description)}</div>
                ${tagsHTML}
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--glass-border); padding-top: 1rem; margin-top: auto;">
                    <span style="font-size: 0.9rem; font-weight: 600; ${colorStyles.color ? `color: ${colorStyles.color};` : 'color: var(--accent-color);'} display: flex; align-items: center; gap: 0.4rem;">
                        ${platformLabel}
                    </span>
                    <span style="font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.3rem;">
                        Öffnen 
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </span>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    // Trigger scroll animations for new elements
    setTimeout(() => {
        document.querySelectorAll('.fade-in-up').forEach(el => el.classList.add('visible'));
    }, 50);
}
