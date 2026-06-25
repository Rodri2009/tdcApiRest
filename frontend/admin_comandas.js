const STORAGE_KEY = 'tdc-admin-comandas-v1';
const MENU_FILE = 'comandas_items.csv';

const defaultState = {
    nextId: 1,
    comandas: []
};

const state = loadState();
let menuItems = [];

const $mesa = document.getElementById('comanda-mesa');
const $items = document.getElementById('comanda-items');
const $notas = document.getElementById('comanda-notas');
const $feedback = document.getElementById('comanda-feedback');
const $list = document.getElementById('comandas-list');
const $empty = document.getElementById('comandas-empty');
const $countPreparacion = document.getElementById('count-preparacion');
const $countListo = document.getElementById('count-listo');
const $countEntregado = document.getElementById('count-entregado');
const $filterStatus = document.getElementById('filter-status');
const $btnCrear = document.getElementById('btn-crear-comanda');
const $btnLimpiarForm = document.getElementById('btn-borrar-form');
const $btnRefrescar = document.getElementById('btn-refrescar');
const $btnBorrarTodas = document.getElementById('btn-borrar-todas');
const $menuTableBody = document.querySelector('#menu-items-table tbody');

$btnCrear.addEventListener('click', crearComanda);
$btnLimpiarForm.addEventListener('click', limpiarFormulario);
$btnRefrescar.addEventListener('click', render);
$btnBorrarTodas.addEventListener('click', borrarTodasComandas);
$filterStatus.addEventListener('change', render);

loadMenuItems().then(render);

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState;
        const parsed = JSON.parse(raw);
        return {
            nextId: parsed.nextId || 1,
            comandas: Array.isArray(parsed.comandas) ? parsed.comandas : []
        };
    } catch (error) {
        console.error('Error cargando comandas:', error);
        return defaultState;
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function loadMenuItems() {
    try {
        const response = await fetch(MENU_FILE);
        if (!response.ok) throw new Error(`No se pudo cargar ${MENU_FILE}`);
        const text = await response.text();
        menuItems = parseCSV(text);
        renderMenuItems();
    } catch (error) {
        console.warn('Menú no cargado:', error);
        menuItems = [];
    }
}

function parseCSV(text) {
    return text
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .slice(1)
        .map(line => {
            const [categoria, item, precio] = line.split(',').map(value => value.trim());
            return {
                categoria,
                item,
                precio: Number(precio || 0)
            };
        });
}

function renderMenuItems() {
    if (!menuItems.length) return;
    $menuTableBody.innerHTML = menuItems
        .map(item => `
            <tr class="menu-item-row" data-item="${escapeHtml(item.item)}" data-precio="${item.precio}">
                <td class="py-2 text-stone-200">${escapeHtml(item.categoria)}</td>
                <td class="py-2 text-stone-200">${escapeHtml(item.item)}</td>
                <td class="py-2 text-right text-stone-100">$${formatPrice(item.precio)}</td>
            </tr>
        `)
        .join('');

    document.querySelectorAll('.menu-item-row').forEach(row => {
        row.addEventListener('click', () => {
            const itemName = row.dataset.item;
            const itemPrice = Number(row.dataset.precio);
            agregarItemDesdeMenu(itemName, itemPrice);
        });
    });
}

function crearComanda(event) {
    event.preventDefault();
    const mesa = $mesa.value.trim() || 'Sin indicar';
    const items = $items.value.trim();
    const notas = $notas.value.trim();

    if (!items) {
        showFeedback('Agrega al menos un item para registrar la comanda.', 'danger');
        return;
    }

    const comanda = {
        id: state.nextId,
        mesa,
        items,
        notas,
        status: 'En preparación',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    state.comandas.unshift(comanda);
    state.nextId += 1;
    saveState();
    render();
    limpiarFormulario();
    showFeedback(`Comanda ${formatId(comanda.id)} registrada en preparación.`, 'success');
}

function agregarItemDesdeMenu(itemName, price) {
    const itemText = `${itemName} - $${formatPrice(price)}`;
    if ($items.value.trim()) {
        $items.value += '\n' + itemText;
    } else {
        $items.value = itemText;
    }
    showFeedback(`Agregado: ${itemName}`, 'success');
}

function formatId(id) {
    return `C-${String(id).padStart(3, '0')}`;
}

function renderItemsList(itemsText) {
    return itemsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => `<li class="text-stone-300 list-disc list-inside">${escapeHtml(line)}</li>`)
        .join('');
}

function limpiarFormulario(event) {
    if (event) event.preventDefault();
    $mesa.value = '';
    $items.value = '';
    $notas.value = '';
    $feedback.textContent = '';
}

function render() {
    const statusFiltro = $filterStatus.value;
    const comandasFiltradas = state.comandas.filter(comanda => {
        return statusFiltro === 'all' || comanda.status === statusFiltro;
    });

    renderResumen();
    renderList(comandasFiltradas);
}

function renderResumen() {
    const counts = {
        'En preparación': 0,
        Listo: 0,
        Entregado: 0
    };

    state.comandas.forEach(comanda => {
        if (counts[comanda.status] !== undefined) {
            counts[comanda.status] += 1;
        }
    });

    $countPreparacion.textContent = counts['En preparación'];
    $countListo.textContent = counts['Listo'];
    $countEntregado.textContent = counts['Entregado'];
}

function renderList(comandas) {
    $list.innerHTML = '';
    if (!comandas.length) {
        $empty.classList.remove('hidden');
        return;
    }
    $empty.classList.add('hidden');

    comandas.forEach(comanda => {
        const item = document.createElement('article');
        item.className = 'comanda-item';
        item.innerHTML = `
            <div class="flex flex-wrap justify-between gap-3">
                <div>
                    <h3>
                        <span>${formatId(comanda.id)}</span>
                        <span class="badge-pill ${statusBadgeClass(comanda.status)}">${comanda.status}</span>
                    </h3>
                    <small>${escapeHtml(comanda.mesa)}</small>
                </div>
                <div class="text-stone-400 text-sm">${formatDate(comanda.createdAt)}</div>
            </div>
            <div class="comanda-meta">
                <div class="text-stone-300"><strong>Items:</strong></div>
                <ul class="comanda-items-list mt-2">${renderItemsList(comanda.items)}</ul>
            </div>
            ${comanda.notas ? `<div class="mt-3 text-stone-400"><strong>Notas:</strong> ${escapeHtml(comanda.notas)}</div>` : ''}
            <div class="comanda-actions">
                ${comanda.status === 'En preparación' ? '<button class="btn btn-warning btn-sm" data-action="set-listo">Marcar Listo</button>' : ''}
                ${comanda.status === 'Listo' ? '<button class="btn btn-success btn-sm" data-action="set-entregado">Marcar Entregado</button>' : ''}
                <button class="btn btn-secondary btn-sm" data-action="set-en-preparacion">Volver a Preparación</button>
                <button class="btn btn-danger btn-sm" data-action="delete">Eliminar</button>
            </div>
        `;

        item.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => handleAction(comanda.id, button.dataset.action));
        });

        $list.appendChild(item);
    });
}

function statusBadgeClass(status) {
    if (status === 'En preparación') return 'badge-en-preparacion';
    if (status === 'Listo') return 'badge-listo';
    if (status === 'Entregado') return 'badge-entregado';
    return '';
}

function handleAction(id, action) {
    const comanda = state.comandas.find(item => item.id === id);
    if (!comanda) return;

    if (action === 'delete') {
        state.comandas = state.comandas.filter(item => item.id !== id);
        saveState();
        render();
        return;
    }

    if (action === 'set-listo') {
        comanda.status = 'Listo';
    }

    if (action === 'set-entregado') {
        comanda.status = 'Entregado';
    }

    if (action === 'set-en-preparacion') {
        comanda.status = 'En preparación';
    }

    comanda.updatedAt = new Date().toISOString();
    saveState();
    render();
}

function borrarTodasComandas() {
    if (!confirm('¿Eliminar todas las comandas? Esta acción no se puede deshacer.')) return;
    state.comandas = [];
    state.nextId = 1;
    saveState();
    render();
}

function showFeedback(message, type = 'success') {
    $feedback.textContent = message;
    $feedback.className = type === 'success' ? 'text-green-400 text-sm mt-3' : 'text-red-400 text-sm mt-3';
    setTimeout(() => {
        $feedback.textContent = '';
    }, 4000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatPrice(value) {
    return Number(value).toLocaleString('es-AR');
}

function escapeHtml(str) {
    return str.replace(/[&<>\"]/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
    })[match]);
}
