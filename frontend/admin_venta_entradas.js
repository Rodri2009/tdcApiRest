/**
 * admin_venta_entradas.js
 * Lógica para gestión de venta de entradas por evento
 */

let currentEvento = null;
let currentClientes = [];
let currentEstadisticas = null;

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Cargar eventos
    await loadEventos();

    // Event listeners para tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });

    // Event listener para cambio de evento
    document.getElementById('eventoSelect').addEventListener('change', (e) => {
        const eventoId = e.target.value;
        if (eventoId) {
            selectEvento(eventoId);
        }
    });

    // Si viene con parámetro evento en URL, seleccionarlo
    const params = new URLSearchParams(window.location.search);
    const eventoIdParam = params.get('evento');
    if (eventoIdParam) {
        document.getElementById('eventoSelect').value = eventoIdParam;
        selectEvento(eventoIdParam);
    }
});

// ============================================================================
// CARGAR EVENTOS
// ============================================================================

async function loadEventos() {
    try {
        const response = await fetch('/api/tickets/eventos_confirmados');
        const eventos = await response.json();

        const select = document.getElementById('eventoSelect');
        select.innerHTML = '<option value="">-- Selecciona un evento --</option>';

        eventos.forEach(evento => {
            const option = document.createElement('option');
            option.value = evento.id;
            option.textContent = `${evento.nombreEvento} (${formatDate(evento.fechaEvento)})`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error cargando eventos:', error);
        showError('Error al cargar eventos');
    }
}

// ============================================================================
// SELECCIONAR EVENTO
// ============================================================================

async function selectEvento(eventoId) {
    currentEvento = eventoId;
    showLoader();
    hideError();
    hideMainContent();

    try {
        // Cargar datos en paralelo
        const [clientesRes, estadisticasRes] = await Promise.all([
            fetch(`/api/tickets/evento/${eventoId}/clientes`),
            fetch(`/api/tickets/evento/${eventoId}/resumen`)
        ]);

        const clientesData = await clientesRes.json();
        const estadisticasData = await estadisticasRes.json();

        if (!clientesRes.ok || !estadisticasRes.ok) {
            throw new Error('Error cargando datos del evento');
        }

        currentClientes = clientesData.clientes || [];
        currentEstadisticas = estadisticasData.estadisticas;

        // Renderizar datos
        renderCompradores();
        renderEstadisticas();

        // Mostrar contenido
        hideLoader();
        showMainContent();

        // Por defecto mostrar tab de compradores
        switchTab('compradores');

    } catch (error) {
        console.error('Error seleccionando evento:', error);
        hideLoader();
        showError('Error al cargar datos del evento. Intenta nuevamente.');
    }
}

// ============================================================================
// RENDERIZAR COMPRADORES
// ============================================================================

function renderCompradores() {
    const tbody = document.getElementById('compradoresTbody');
    const emptyState = document.getElementById('compradoresEmpty');

    if (currentClientes.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = currentClientes.map((cliente, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td style="font-weight: 600;">${escapeHtml(cliente.nombre_comprador)}</td>
            <td>${escapeHtml(cliente.email)}</td>
            <td>${cliente.cantidad}</td>
            <td>${cliente.tipo_precio === 'ANTICIPADA' ? '🎟️ Anticipada' : '💳 Puerta'}</td>
            <td>$${formatCurrency(cliente.total)}</td>
            <td>${getBadgeEstado(cliente.estado)}</td>
            <td>${formatDate(cliente.comprado_en)}</td>
        </tr>
    `).join('');
}

// ============================================================================
// RENDERIZAR ESTADÍSTICAS
// ============================================================================

function renderEstadisticas() {
    if (!currentEstadisticas) return;

    const stats = currentEstadisticas;

    // Actualizar KPI cards
    document.getElementById('totalVendidas').textContent = stats.total_entradas_vendidas || 0;
    document.getElementById('entradaspagadas').textContent = stats.entradas_pagadas || 0;
    document.getElementById('porcentajePago').textContent = `${stats.porcentaje_pago || 0}% pagado`;

    document.getElementById('entradaspendientes').textContent = stats.entradas_pendientes || 0;

    document.getElementById('ingresosTotales').textContent = `$${formatCurrency(stats.ingresos_totales || 0)}`;
    document.getElementById('ingresosPagados').textContent = `$${formatCurrency(stats.ingresos_pagados || 0)} pagado`;

    document.getElementById('anticipadas').textContent = stats.anticipadas || 0;
    document.getElementById('puerta').textContent = stats.puerta || 0;

    document.getElementById('utilizadas').textContent = stats.cantidad_utilizada_total || 0;
    document.getElementById('porcentajeUtilizacion').textContent = `${stats.porcentaje_utilizacion || 0}% utilizado`;

    document.getElementById('canceladas').textContent = stats.entradas_canceladas || 0;
    document.getElementById('reembolsos').textContent = `$${formatCurrency(stats.reembolsos_totales || 0)} reembolsos`;

    // Tabla de detalles
    const detalleTbody = document.getElementById('detalleTbody');
    detalleTbody.innerHTML = `
        <tr>
            <td style="font-weight: 600;">Cantidad Total de Entradas</td>
            <td>${stats.cantidad_total_entradas || 0}</td>
            <td>Todas las entradas vendidas</td>
        </tr>
        <tr>
            <td style="font-weight: 600;">Cantidad Pagada</td>
            <td>${stats.cantidad_pagada || 0}</td>
            <td>Entradas vendidas y pagadas</td>
        </tr>
        <tr>
            <td style="font-weight: 600;">Ingresos por Anticipada</td>
            <td>$${formatCurrency((stats.anticipadas || 0) * 3250)}</td>
            <td>Estimado basado en precio</td>
        </tr>
        <tr>
            <td style="font-weight: 600;">Ingresos por Puerta</td>
            <td>$${formatCurrency((stats.puerta || 0) * 3900)}</td>
            <td>Estimado basado en precio</td>
        </tr>
    `;
}

// ============================================================================
// CAMBIAR TABS
// ============================================================================

function switchTab(tabName) {
    // Actualizar botones activos
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Actualizar contenido visible
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });
}

// ============================================================================
// EXPORTAR CSV
// ============================================================================

function exportarCSV() {
    if (currentClientes.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const headers = ['#', 'Nombre', 'Email', 'Cantidad', 'Tipo', 'Monto', 'Estado', 'Comprado'];
    const rows = currentClientes.map((cliente, idx) => [
        idx + 1,
        cliente.nombre_comprador,
        cliente.email,
        cliente.cantidad,
        cliente.tipo_precio,
        cliente.total,
        cliente.estado,
        formatDate(cliente.comprado_en)
    ]);

    // Crear CSV
    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `entradas_${currentEvento}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================================
// HELPERS
// ============================================================================

function getBadgeEstado(estado) {
    const badgeClass = {
        'pagado': 'badge-pagado',
        'pendiente': 'badge-pendiente',
        'cancelado': 'badge-cancelado',
        'utilizado': 'badge-utilizado'
    }[estado] || 'badge-pendiente';

    const labels = {
        'pagado': '✓ Pagado',
        'pendiente': '⏳ Pendiente',
        'cancelado': '✕ Cancelado',
        'utilizado': '✓ Utilizado'
    };

    return `<span class="badge ${badgeClass}">${labels[estado] || estado}</span>`;
}

function formatCurrency(value) {
    return parseFloat(value).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// UI HELPERS
// ============================================================================

function showLoader() {
    document.getElementById('loader').classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}

function showMainContent() {
    document.getElementById('mainContent').classList.remove('hidden');
}

function hideMainContent() {
    document.getElementById('mainContent').classList.add('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorMessage').classList.add('hidden');
}
