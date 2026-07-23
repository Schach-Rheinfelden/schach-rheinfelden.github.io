
(function() {
window.parseDate = window.parseDate || function(dateStr) {
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

let globalNewsData = [];
let currentCategory = 'Alle';
let searchTerm = '';
let dateFrom = '';
let dateTo = '';
let currentNewsLimit = 12;
let savedNewsLimit = 12;
const NEWS_PAGE_STEP = 12;

window.loadMoreNewsArchive = function() {
    currentNewsLimit += NEWS_PAGE_STEP;
    savedNewsLimit = currentNewsLimit;
    renderNews();
};

const fallbackImages = [
    'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1560174038-da43ac74f01b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1610682136054-ff477dcb2d60?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1586165368502-1bad197a6461?auto=format&fit=crop&w=600&q=80'
];

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
    const searchInput = document.getElementById('news-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase().trim();
            if (!searchTerm) {
                currentNewsLimit = savedNewsLimit;
            }
            renderNews();
        });
    }

    const dateFromInput = document.getElementById('news-date-from');
    const dateToInput = document.getElementById('news-date-to');
    const dateResetBtn = document.getElementById('news-date-reset');

    if (dateFromInput) {
        dateFromInput.addEventListener('change', (e) => {
            dateFrom = e.target.value;
            renderNews();
        });
    }

    if (dateToInput) {
        dateToInput.addEventListener('change', (e) => {
            dateTo = e.target.value;
            renderNews();
        });
    }

    if (dateResetBtn) {
        dateResetBtn.addEventListener('click', () => {
            dateFromInput.value = '';
            dateToInput.value = '';
            dateFrom = '';
            dateTo = '';
            renderNews();
        });
    }

    const archiveContainer = document.getElementById('news-archive-container');
    if (!archiveContainer) return;

    try {
        globalNewsData = await fetchDataCSV('./data/news.csv');
        
        initNewsFilter();
        renderNews();

        const urlParams = new URLSearchParams(window.location.search);
        const newsParam = urlParams.get('newsId');
        if (newsParam) setTimeout(() => window.openNewsModal(parseInt(newsParam)), 500);

    } catch (error) {
        console.error('Fehler beim Laden der News:', error);
        if (archiveContainer) archiveContainer.innerHTML = '<p>Fehler beim Laden des Archivs.</p>';
    }
});

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

window.filterNews = function(category) {
    currentCategory = category;
    initNewsFilter();
    renderNews();
};

function renderNews() {
    const container = document.getElementById('news-archive-container');
    
    let filteredNews = currentCategory === 'Alle' 
        ? [...globalNewsData] 
        : globalNewsData.filter(item => {
            if (!item.category) return false;
            const tags = item.category.split(',').map(s => s.trim());
            return tags.includes(currentCategory);
        });

    if (searchTerm) {
        filteredNews = filteredNews.filter(item => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = (item.content || "").replace(/<br\s*[\/]?>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, ' ');
            const textContent = tempDiv.textContent || tempDiv.innerText || "";
            return item.title.toLowerCase().includes(searchTerm) || 
                   textContent.toLowerCase().includes(searchTerm) ||
                   (item.author && item.author.toLowerCase().includes(searchTerm));
        });
    }

    if (dateFrom || dateTo) {
        filteredNews = filteredNews.filter(item => {
            const itemDate = window.parseDate(item.date);
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

    filteredNews.sort((a, b) => window.parseDate(b.date) - window.parseDate(a.date));

    if (filteredNews.length === 0) {
        container.innerHTML = '<p class="loading">Keine News gefunden.</p>';
        const loadMoreEl = document.getElementById('news-archive-load-more');
        if (loadMoreEl) loadMoreEl.innerHTML = '';
        return;
    }

    const isSearching = Boolean(searchTerm);
    const visibleNews = isSearching ? filteredNews : filteredNews.slice(0, currentNewsLimit);

    container.innerHTML = visibleNews.map(item => {
        const dateObj = window.parseDate(item.date);
        const dateString = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const authorHTML = item.author ? ` &middot; 👤 ${item.author}` : '';

        const colorStyles = window.getCardColorStyles ? window.getCardColorStyles(item.color || item.akzentfarbe || item.accentColor) : { cardStyle: '' };

        let imgHTML = '';
        let articleStyle = `cursor: pointer; opacity: 1; transform: none; ${colorStyles.cardStyle}`;
        
        const hasImage = item.image && item.image.trim() !== "";
        const isBackground = String(item.bildAlsHintergrund || '').trim().toLowerCase();
        const asBg = (isBackground === 'ja' || isBackground === 'true' || isBackground === '1' || isBackground === 'yes');

        if (hasImage) {
            if (asBg) {
                const overlayTop = colorStyles.color ? `color-mix(in srgb, ${colorStyles.color} 40%, rgba(11, 18, 32, 0.7))` : `rgba(11, 18, 32, 0.4)`;
                const overlayBottom = colorStyles.color ? `color-mix(in srgb, ${colorStyles.color} 20%, rgba(11, 18, 32, 0.95))` : `rgba(11, 18, 32, 0.95)`;
                
                articleStyle += ` background: linear-gradient(to bottom, ${overlayTop}, ${overlayBottom}), url('${item.image}') center/cover no-repeat !important; text-shadow: 0 2px 10px rgba(0,0,0,0.9); border: 1px solid var(--glass-border);`;
            } else {
                imgHTML = `<div class="news-img" style="background-image: url('${item.image}')"></div>`;
            }
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = window.formatTextContent(item.content).replace(/<br\s*[\/]?>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, ' ');
        const textContent = tempDiv.textContent || tempDiv.innerText || "";

        const tagsHTML = item.category 
            ? `<div style="margin-top: 0.8rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">${item.category.split(',').map(tag => `<span class="tag-badge">🏷️ ${tag.trim()}</span>`).join('')}</div>` 
            : '';

        return `
        <article class="glass-card news-card fade-in-up" onclick="openNewsModal(${item.id})" style="${articleStyle}">
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

    const loadMoreContainer = document.getElementById('news-archive-load-more');
    if (loadMoreContainer) {
        if (!isSearching && currentNewsLimit < filteredNews.length) {
            loadMoreContainer.innerHTML = `<button class="btn btn-secondary" onclick="loadMoreNewsArchive()">Weitere News</button>`;
        } else {
            loadMoreContainer.innerHTML = '';
        }
    }
}

window.openNewsModal = function(id) {
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
    
    const headerImgHTML = window.renderModalHeaderImage ? window.renderModalHeaderImage(article) : '';

    modalBody.innerHTML = `
        ${headerImgHTML}
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
    document.body.style.overflow = 'hidden';
};

window.closeNewsModal = function() {
    document.getElementById('news-modal').classList.add('hidden');
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
};
})();
