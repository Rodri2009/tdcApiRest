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
const $totalLabel = document.getElementById('comanda-total-label');
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
const $btnEditPrecios = document.getElementById('btn-edit-precios');

// Modal para editar mesa
const $modalEditMesa = document.getElementById('modal-edit-mesa');
const $modalMesaInput = document.getElementById('modal-mesa-input');
const $btnCancelEdit = document.getElementById('btn-cancel-edit');
const $btnSaveEdit = document.getElementById('btn-save-edit');

// Modal para editar precios
const $modalEditPrecios = document.getElementById('modal-edit-precios');
const $preciosEditor = document.getElementById('precios-editor');
const $btnCancelEditPrecios = document.getElementById('btn-cancel-edit-precios');
const $btnSavePrecios = document.getElementById('btn-save-precios');

let editingComandaId = null;

$btnCrear.addEventListener('click', crearComanda);
$btnLimpiarForm.addEventListener('click', limpiarFormulario);
$btnRefrescar.addEventListener('click', render);
$btnBorrarTodas.addEventListener('click', borrarTodasComandas);
$filterStatus.addEventListener('change', render);
$items.addEventListener('input', actualizarTotalLabel);
$btnEditPrecios.addEventListener('click', openEditPreciosModal);

// Event listeners del modal
$btnCancelEdit.addEventListener('click', closeEditMesaModal);
$btnSaveEdit.addEventListener('click', saveEditMesa);
$modalEditMesa.addEventListener('click', (e) => {
    if (e.target === $modalEditMesa) closeEditMesaModal();
});
$modalMesaInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEditMesa();
});

$btnCancelEditPrecios.addEventListener('click', closeEditPreciosModal);
$btnSavePrecios.addEventListener('click', saveEditPrecios);
$modalEditPrecios.addEventListener('click', (e) => {
    if (e.target === $modalEditPrecios) closeEditPreciosModal();
});

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
                <td class="py-2 text-stone-200">
                    <div class="menu-item-title">${escapeHtml(item.item)}</div>
                    <div class="menu-item-category">${escapeHtml(item.categoria)}</div>
                </td>
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

function openEditPreciosModal() {
    const csvText = menuItems.length ? [
        'categoria,item,precio',
        ...menuItems.map(item => `${item.categoria},${item.item},${item.precio}`)
    ].join('\n') : 'categoria,item,precio';

    $preciosEditor.value = csvText;
    $modalEditPrecios.classList.add('active');
    $preciosEditor.focus();
}

function closeEditPreciosModal() {
    $modalEditPrecios.classList.remove('active');
}

function saveEditPrecios() {
    const text = $preciosEditor.value.trim();
    if (!text) {
        alert('El CSV no puede estar vacío.');
        return;
    }

    const newItems = parseCSV(text);
    if (!newItems.length) {
        alert('Formato de CSV inválido. Debe incluir encabezado y filas con categoría, item y precio.');
        return;
    }

    menuItems = newItems;
    renderMenuItems();
    actualizarTotalLabel();
    closeEditPreciosModal();
    showFeedback('Precios del menú actualizados.', 'success');
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
    actualizarTotalLabel();
    showFeedback(`Agregado: ${itemName}`, 'success');
}

function extraerPreciosDelTexto(texto) {
    // Busca patrones como "- $123" o "- $1.234,56"
    const regex = /-\s*\$([\d.,]+)/g;
    const precios = [];
    let match;
    while ((match = regex.exec(texto)) !== null) {
        const precioStr = match[1].replace(/\./g, '').replace(',', '.');
        const precio = parseFloat(precioStr);
        if (!isNaN(precio)) {
            precios.push(precio);
        }
    }
    return precios;
}

function calcularTotalDesdeItems(itemsText) {
    const precios = extraerPreciosDelTexto(itemsText);
    return precios.reduce((sum, precio) => sum + precio, 0);
}

function actualizarTotalLabel() {
    const total = calcularTotalDesdeItems($items.value);
    $totalLabel.textContent = `$${formatPrice(total)}`;
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
    $totalLabel.textContent = '$0';
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
        const totalComanda = calcularTotalDesdeItems(comanda.items);
        const item = document.createElement('article');
        item.className = 'comanda-item';
        item.innerHTML = `
            <div class="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                    <h3>
                        <span>${formatId(comanda.id)}</span>
                        <span class="badge-pill ${statusBadgeClass(comanda.status)}">${comanda.status}</span>
                    </h3>
                </div>
                <div class="text-right">
                    <div class="text-stone-400 text-sm">${formatDate(comanda.createdAt)}</div>
                    <div class="text-lg font-bold text-neon mt-2">Total: $${formatPrice(totalComanda)}</div>
                </div>
            </div>
            <div class="comanda-mesa-box">
                <div class="comanda-mesa-text">${escapeHtml(comanda.mesa)}</div>
                <button class="btn-edit-mesa" data-action="edit-mesa" title="Editar mesa/cliente">
                    <i class="fas fa-pen"></i>
                </button>
            </div>
            <div class="comanda-meta">
                <div class="text-stone-300"><strong>Items:</strong></div>
                <ul class="comanda-items-list mt-2">${renderItemsList(comanda.items)}</ul>
            </div>
            ${comanda.notas ? `<div class="mt-3 text-stone-400"><strong>Notas:</strong> ${escapeHtml(comanda.notas)}</div>` : ''}
            <div class="comanda-actions">
                ${comanda.status === 'En preparación' ? '<button class="btn btn-warning btn-sm" data-action="set-listo">Marcar Listo</button>' : ''}
                ${comanda.status === 'Listo' ? '<button class="btn btn-success btn-sm" data-action="set-entregado">Marcar Entregado</button>' : ''}
                ${comanda.status !== 'En preparación' ? '<button class="btn btn-secondary btn-sm" data-action="set-en-preparacion">Volver a Preparación</button>' : ''}
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

    if (action === 'edit-mesa') {
        openEditMesaModal(id);
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

function openEditMesaModal(id) {
    const comanda = state.comandas.find(item => item.id === id);
    if (!comanda) return;

    editingComandaId = id;
    $modalMesaInput.value = comanda.mesa;
    $modalEditMesa.classList.add('active');
    $modalMesaInput.focus();
    $modalMesaInput.select();
}

function closeEditMesaModal() {
    editingComandaId = null;
    $modalMesaInput.value = '';
    $modalEditMesa.classList.remove('active');
}

function saveEditMesa() {
    if (!editingComandaId) return;

    const newMesa = $modalMesaInput.value.trim();
    if (!newMesa) {
        alert('Por favor ingresa un valor para mesa/cliente');
        return;
    }

    const comanda = state.comandas.find(item => item.id === editingComandaId);
    if (!comanda) return;

    comanda.mesa = newMesa;
    comanda.updatedAt = new Date().toISOString();
    saveState();
    closeEditMesaModal();
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
