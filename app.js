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
document.getElementById('refreshBtn').addEventListener('click', () => location.reload(true));
loadData();
