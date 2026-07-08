const tg = window.Telegram?.WebApp;
if (tg) tg.ready();

const BASE_URL = "https://kotvovka8-hue.github.io/mm2-shop-webapp/";
let allItems = [];
let activeCategory = 'all';

const RARITY_COLORS = {
    "Rare": "#2ecc71",
    "Legendary": "#e74c3c",
    "Godly": "#ff69b4",
    "Godly-Chroma": "#9b59b6",
    "Ancient": "#9b59b6",
    "Unique": "#e67e22",
    "Vintage": "#f1c40f",
    "Evo": "#3498db"
};

// ---------- Логика авто‑перезагрузки (3 раза) ----------
const MAX_RELOADS = 3;
const RELOAD_KEY = 'mm2_reload_count';

// Получаем текущий счётчик из sessionStorage (обнуляется при закрытии WebView)
let reloadCount = parseInt(sessionStorage.getItem(RELOAD_KEY)) || 0;

if (reloadCount < MAX_RELOADS) {
    // Увеличиваем и сохраняем
    sessionStorage.setItem(RELOAD_KEY, reloadCount + 1);
    // Перезагружаем страницу через полсекунды
    setTimeout(() => {
        location.reload(true);
    }, 500);
    // Прерываем выполнение, чтобы не отрисовывать лишнее
    throw new Error('Reloading...');
} else {
    // Счётчик достиг максимума — удаляем ключ, чтобы при следующем открытии начать заново
    sessionStorage.removeItem(RELOAD_KEY);

    // Фиксируем время последнего обновления в localStorage
    const now = new Date();
    localStorage.setItem('mm2_last_update', now.toISOString());

    // Отображаем время на странице
    const updateEl = document.getElementById('update-time');
    if (updateEl) {
        const formatted = now.toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
        updateEl.textContent = `Последнее обновление страницы: ${formatted}`;
    }
}

// ---------- Основная логика магазина ----------
async function loadData() {
    try {
        const resp = await fetch('data.json');
        allItems = await resp.json();
        renderCategories();
        renderItems();
    } catch (err) {
        document.getElementById('items').innerHTML = '<p style="color:#aaa;">Ошибка загрузки</p>';
    }
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
    const filtered = allItems.filter(item => {
        const matchCat = activeCategory === 'all' || item.category === activeCategory;
        const matchSearch = item.name.toLowerCase().includes(search);
        return matchCat && matchSearch;
    });
    const container = document.getElementById('items');
    container.innerHTML = filtered.map(item => {
        const statusClass = item.quantity > 0 ? '' : 'out';
        const statusText = item.quantity > 0 ? 'В наличии' : 'Под заказ';
        const imgSrc = item.photo_url ? BASE_URL + item.photo_url : '';
        const dotColor = RARITY_COLORS[item.rarity] || '#aaa';
        const rarityDisplay = item.rarity === "Godly-Chroma"
            ? `<span class="rarity-dot" style="background:#9b59b6;"></span> Chroma 🌈`
            : `<span class="rarity-dot" style="background:${dotColor};"></span> ${item.rarity}`;
        return `
            <div class="item-card" data-name="${escapeHtml(item.name)}">
                ${imgSrc ? `<img src="${imgSrc}" alt="${item.name}">` : ''}
                <div class="item-name">${item.name}</div>
                <div class="item-details">
                    ${rarityDisplay} | ${item.price}₽
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

document.getElementById('search').addEventListener('input', renderItems);

// Безопасное добавление кнопки ручного обновления
const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => location.reload(true));
}

// Загружаем данные только после того, как прошли все перезагрузки
loadData();
