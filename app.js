const tg = window.Telegram?.WebApp;
if (tg) tg.ready();

const BASE_URL = "https://kotvovka8-hue.github.io/mm2-shop-webapp/";
let allItems = [];
let activeCategory = 'all';
let sortPrice = 'none';      // 'none', 'asc', 'desc'
let filterRarity = 'all';    // 'all' или конкретная редкость

const RARITY_COLORS = {
    "Rare": "#2ecc71",
    "Legendary": "#e74c3c",
    "Godly": "#ff69b4",
    "Godly-Chroma": "chroma",
    "Ancient": "#9b59b6",
    "Unique": "#e67e22",
    "Vintage": "#f1c40f",
    "Evo": "#3498db"
};

// Авто‑перезагрузка (3 раза)
const MAX_RELOADS = 3;
const RELOAD_KEY = 'mm2_reload_count';
let reloadCount = 0;
try { reloadCount = parseInt(sessionStorage.getItem(RELOAD_KEY)) || 0; } catch (e) {}

if (reloadCount < MAX_RELOADS) {
    try { sessionStorage.setItem(RELOAD_KEY, reloadCount + 1); } catch (e) {}
    setTimeout(() => { location.reload(true); }, 500);
    throw new Error('Reloading...');
} else {
    try { sessionStorage.removeItem(RELOAD_KEY); } catch (e) {}
    const now = new Date();
    try { localStorage.setItem('mm2_last_update', now.toISOString()); } catch (e) {}
    const updateEl = document.getElementById('update-time');
    if (updateEl) {
        const formatted = now.toLocaleString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZoneName: 'short'
        });
        updateEl.textContent = `🕒 Последнее обновление: ${formatted}`;
    }
}

// Загрузка данных
async function loadData() {
    try {
        const resp = await fetch('data.json');
        allItems = await resp.json();
        // Заполняем выпадающий список редкостей
        populateRarityFilter();
        renderCategories();
        renderItems();
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        document.getElementById('items').innerHTML = '<p style="color:#aaa;">Ошибка загрузки</p>';
    }
}

// Заполнение select редкостей
function populateRarityFilter() {
    const rarities = [...new Set(allItems.map(i => i.rarity))].sort();
    const select = document.getElementById('filterRarity');
    // Оставляем первый пункт "Все редкости"
    select.innerHTML = '<option value="all">Все редкости</option>';
    rarities.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        select.appendChild(opt);
    });
}

function renderCategories() {
    const categories = ['all', ...new Set(allItems.map(i => i.category))];
    const container = document.getElementById('categories');
    container.innerHTML = categories.map(cat => {
        const cls = cat === activeCategory ? 'cat-btn active' : 'cat-btn';
        const label = cat === 'all' ? 'Все' : cat;
        return `<button class="${cls}" data-cat="${cat}">${label}</button>`;
    }).join('');
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeCategory = e.target.dataset.cat;
            renderCategories();
            renderItems();
        });
    });
}

function renderItems() {
    const search = document.getElementById('search').value.toLowerCase();
    // Фильтрация
    let filtered = allItems.filter(item => {
        const matchCat = activeCategory === 'all' || item.category === activeCategory;
        const matchSearch = item.name.toLowerCase().includes(search);
        const matchRarity = filterRarity === 'all' || item.rarity === filterRarity;
        return matchCat && matchSearch && matchRarity;
    });

    // Сортировка по цене
    if (sortPrice === 'asc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortPrice === 'desc') {
        filtered.sort((a, b) => b.price - a.price);
    }

    const container = document.getElementById('items');
    if (filtered.length === 0) {
        container.innerHTML = '<p style="color:#aaa; text-align:center; padding:20px;">Ничего не найдено</p>';
        return;
    }

    container.innerHTML = filtered.map(item => {
        const statusClass = item.quantity > 0 ? '' : 'out';
        const statusText = item.quantity > 0 ? 'В наличии' : 'Под заказ';
        const imgSrc = item.photo_url ? BASE_URL + item.photo_url : '';

        let rarityBadge = '';
        if (item.rarity === 'Godly-Chroma') {
            rarityBadge = '<span class="rarity-badge chroma">Godly-Chroma</span>';
        } else {
            const bgColor = RARITY_COLORS[item.rarity] || '#aaa';
            rarityBadge = `<span class="rarity-badge" style="background:${bgColor};">${item.rarity}</span>`;
        }

        return `
            <div class="item-card" data-name="${escapeHtml(item.name)}">
                ${imgSrc ? `<img src="${imgSrc}" alt="${item.name}">` : ''}
                <div class="item-name">${item.name}</div>
                <div class="item-details">
                    ${rarityBadge}
                    <span>${item.price}₽</span>
                </div>
                <div class="item-status ${statusClass}">${statusText}</div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', () => {
            const name = card.dataset.name;
            navigator.clipboard.writeText(name).then(() => {
                if (tg) tg.showPopup({ message: `Предмет "${name}" скопирован, отправь его боту` });
                else alert(`Предмет "${name}" скопирован, отправь его боту`);
            });
        });
    });
}

function escapeHtml(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Обработчики событий
document.getElementById('search').addEventListener('input', renderItems);

document.getElementById('sortPrice').addEventListener('change', (e) => {
    sortPrice = e.target.value;
    renderItems();
});

document.getElementById('filterRarity').addEventListener('change', (e) => {
    filterRarity = e.target.value;
    renderItems();
});

document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    document.getElementById('sortPrice').value = 'none';
    document.getElementById('filterRarity').value = 'all';
    document.getElementById('search').value = '';
    sortPrice = 'none';
    filterRarity = 'all';
    activeCategory = 'all';
    renderCategories();
    renderItems();
});

document.getElementById('refreshBtn').addEventListener('click', () => location.reload(true));

loadData();
