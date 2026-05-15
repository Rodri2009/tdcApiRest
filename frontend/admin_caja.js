/**
 * admin_caja.js - Gestión de Caja
 * Maneja apertura/cierre de caja y registro de movimientos
 */

const API_BASE = window.location.origin;
let cajaActual = null;
let movimientos = [];

// Elementos del DOM
const panelApertura = document.getElementById('panel-apertura');
const panelMovimientos = document.getElementById('panel-movimientos');
const panelInforme = document.getElementById('panel-informe');
const cajaStatus = document.getElementById('caja-status');
const statusText = document.getElementById('status-text');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('[admin_caja.js] Iniciando...');
    verificarCajaActiva();
    setupEventListeners();
});

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    document.getElementById('btn-abrir-caja').addEventListener('click', abrirCaja);
    document.getElementById('btn-ingreso').addEventListener('click', () => abrirModalMovimiento('ingreso'));
    document.getElementById('btn-egreso').addEventListener('click', () => abrirModalMovimiento('egreso'));
    document.getElementById('btn-cerrar-caja').addEventListener('click', abrirModalCierre);
    document.getElementById('form-movimiento').addEventListener('submit', guardarMovimiento);
    document.getElementById('form-cerrar-caja').addEventListener('submit', cerrarCaja);
    document.getElementById('btn-nueva-caja').addEventListener('click', iniciarNuevaCaja);
    document.getElementById('btn-descargar-pdf').addEventListener('click', descargarInformePDF);
}

/**
 * Verificar si hay caja abierta
 */
async function verificarCajaActiva() {
    try {
        const res = await fetch(`${API_BASE}/api/cajas/activa`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            cajaActual = data;
            movimientos = data.movimientos || [];
            mostrarPanelMovimientos();
            actualizarTotales();
            setCajaStatus('abierta');
        } else {
            mostrarPanelApertura();
            setCajaStatus('cerrada');
        }
    } catch (err) {
        console.error('Error verificando caja:', err);
        mostrarPanelApertura();
        setCajaStatus('error');
    }
}

/**
 * Abrir nueva caja
 */
async function abrirCaja() {
    const saldoInicial = parseFloat(document.getElementById('saldo-inicial').value) || 0;
    const notas = document.getElementById('notas-apertura').value;

    if (saldoInicial < 0) {
        mostrarBanner('El saldo inicial no puede ser negativo', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/cajas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ saldoInicial, notas })
        });

        if (!res.ok) throw new Error(`Error ${res.status}`);

        const data = await res.json();
        cajaActual = data;
        movimientos = [];
        mostrarPanelMovimientos();
        mostrarBanner(`✅ Caja #${data.numero_caja} abierta exitosamente`, 'success');
        setCajaStatus('abierta');
    } catch (err) {
        console.error('Error abriendo caja:', err);
        mostrarBanner(`❌ Error al abrir caja: ${err.message}`, 'error');
    }
}

/**
 * Abrir modal para nuevo movimiento
 */
function abrirModalMovimiento(tipo) {
    document.getElementById('mov-tipo').value = tipo;
    if (tipo === 'ingreso') {
        document.getElementById('modal-title').textContent = 'Nuevo Ingreso';
    } else {
        document.getElementById('modal-title').textContent = 'Nuevo Egreso';
    }
    document.getElementById('modal-movimiento').classList.remove('hidden');
}

/**
 * Guardar movimiento
 */
async function guardarMovimiento(e) {
    e.preventDefault();

    const tipo = document.getElementById('mov-tipo').value;
    const categoria = document.getElementById('mov-categoria').value;
    const subcategoria = document.getElementById('mov-subcategoria').value;
    const descripcion = document.getElementById('mov-descripcion').value;
    const monto = parseFloat(document.getElementById('mov-monto').value);
    const metodo = document.getElementById('mov-metodo').value;
    const comprobante = document.getElementById('mov-comprobante').value;

    if (!tipo || !categoria || !descripcion || monto <= 0) {
        mostrarBanner('⚠️ Completa todos los campos requeridos', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/cajas/${cajaActual.id}/movimientos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                tipo,
                categoria,
                subcategoria,
                descripcion,
                monto,
                metodo,
                comprobante
            })
        });

        if (!res.ok) throw new Error(`Error ${res.status}`);

        const movimiento = await res.json();
        movimientos.push(movimiento);
        actualizarTotales();
        closeModal('modal-movimiento');
        document.getElementById('form-movimiento').reset();
        mostrarBanner(`✅ Movimiento registrado: ${descripcion}`, 'success');
    } catch (err) {
        console.error('Error guardando movimiento:', err);
        mostrarBanner(`❌ Error: ${err.message}`, 'error');
    }
}

/**
 * Abrir modal de cierre
 */
function abrirModalCierre() {
    document.getElementById('resumen-cierre').classList.remove('hidden');
    actualizarResumenCierre();
    document.getElementById('modal-cerrar').classList.remove('hidden');
}

/**
 * Actualizar resumen en modal de cierre
 */
function actualizarResumenCierre() {
    const totalIngresos = movimientos
        .filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + m.monto, 0);
    const totalEgresos = movimientos
        .filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + m.monto, 0);
    const esperado = cajaActual.saldo_inicial + totalIngresos - totalEgresos;

    document.getElementById('cierre-inicial').textContent = `$${cajaActual.saldo_inicial.toFixed(2)}`;
    document.getElementById('cierre-ingresos').textContent = `$${totalIngresos.toFixed(2)}`;
    document.getElementById('cierre-egresos').textContent = `$${totalEgresos.toFixed(2)}`;
    document.getElementById('cierre-esperado').textContent = `$${esperado.toFixed(2)}`;
}

/**
 * Cerrar caja
 */
async function cerrarCaja(e) {
    e.preventDefault();

    const saldoFinal = parseFloat(document.getElementById('saldo-final').value);
    const notas = document.getElementById('notas-cierre').value;

    if (isNaN(saldoFinal) || saldoFinal < 0) {
        mostrarBanner('Ingresa un saldo final válido', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/cajas/${cajaActual.id}/cerrar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ saldoFinal, notas })
        });

        if (!res.ok) throw new Error(`Error ${res.status}`);

        const data = await res.json();
        cajaActual = data;
        mostrarInformeCierre();
        closeModal('modal-cerrar');
        mostrarBanner('✅ Caja cerrada exitosamente', 'success');
        setCajaStatus('cerrada');
    } catch (err) {
        console.error('Error cerrando caja:', err);
        mostrarBanner(`❌ Error: ${err.message}`, 'error');
    }
}

/**
 * Mostrar informe de cierre
 */
function mostrarInformeCierre() {
    panelMovimientos.classList.add('hidden');
    panelInforme.classList.remove('hidden');

    const totalIngresos = movimientos
        .filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + m.monto, 0);
    const totalEgresos = movimientos
        .filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + m.monto, 0);

    const ingresosDetalle = movimientos.filter(m => m.tipo === 'ingreso');
    const egresosDetalle = movimientos.filter(m => m.tipo === 'egreso');

    let html = `
        <div class="bg-stone-800 p-6 rounded border border-stone-700">
            <h3 class="text-xl font-bold text-neon mb-4">Caja #${cajaActual.numero_caja} - ${new Date(cajaActual.fecha_apertura).toLocaleDateString('es-AR')}</h3>
            
            <h4 class="text-lg font-bold text-green-400 mt-6 mb-3">INGRESOS</h4>
            <table class="w-full text-sm mb-4">
                <tbody>
    `;

    ingresosDetalle.forEach(m => {
        html += `
            <tr class="border-b border-stone-600">
                <td class="py-2">${m.descripcion}</td>
                <td class="py-2 text-right font-bold">$${m.monto.toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            <div class="text-right mb-4 p-2 bg-stone-700 rounded">
                <p class="text-green-400">TOTAL INGRESOS: <span class="text-xl font-bold">$${totalIngresos.toFixed(2)}</span></p>
            </div>

            <h4 class="text-lg font-bold text-red-400 mt-6 mb-3">EGRESOS</h4>
            <table class="w-full text-sm mb-4">
                <tbody>
    `;

    egresosDetalle.forEach(m => {
        html += `
            <tr class="border-b border-stone-600">
                <td class="py-2">${m.descripcion}</td>
                <td class="py-2 text-right font-bold">$${m.monto.toFixed(2)}</td>
            </tr>
        `;
    });

    const esperado = cajaActual.saldo_inicial + totalIngresos - totalEgresos;
    const diferencia = cajaActual.saldo_final - esperado;
    const diferenciaCls = diferencia === 0 ? 'text-green-400' : 'text-yellow-400';

    html += `
                </tbody>
            </table>
            <div class="text-right mb-4 p-2 bg-stone-700 rounded">
                <p class="text-red-400">TOTAL EGRESOS: <span class="text-xl font-bold">$${totalEgresos.toFixed(2)}</span></p>
            </div>

            <div class="grid grid-cols-2 gap-4 mt-6 p-4 bg-stone-900 rounded border border-stone-600">
                <div>Saldo Inicial</div>
                <div class="text-right font-bold">$${cajaActual.saldo_inicial.toFixed(2)}</div>
                <div>(+) Ingresos</div>
                <div class="text-right font-bold">$${totalIngresos.toFixed(2)}</div>
                <div>(-) Egresos</div>
                <div class="text-right font-bold">-$${totalEgresos.toFixed(2)}</div>
                <div class="font-bold border-t border-stone-600 pt-2">Esperado en caja</div>
                <div class="text-right font-bold border-t border-stone-600 pt-2">$${esperado.toFixed(2)}</div>
                <div class="font-bold">Saldo Final (Contado)</div>
                <div class="text-right font-bold">$${cajaActual.saldo_final.toFixed(2)}</div>
                <div class="font-bold">Diferencia</div>
                <div class="text-right font-bold ${diferenciaCls}">$${diferencia.toFixed(2)}</div>
            </div>
        </div>
    `;

    document.getElementById('contenido-informe').innerHTML = html;
}

/**
 * Actualizar totales
 */
function actualizarTotales() {
    const totalIngresos = movimientos
        .filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + m.monto, 0);
    const totalEgresos = movimientos
        .filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + m.monto, 0);
    const saldoEsperado = cajaActual.saldo_inicial + totalIngresos - totalEgresos;

    document.getElementById('total-ingresos').textContent = `$${totalIngresos.toFixed(2)}`;
    document.getElementById('total-egresos').textContent = `$${totalEgresos.toFixed(2)}`;
    document.getElementById('saldo-esperado').textContent = `$${saldoEsperado.toFixed(2)}`;

    // Actualizar tabla de movimientos
    renderizarMovimientos();
}

/**
 * Renderizar tabla de movimientos
 */
function renderizarMovimientos() {
    const tbody = document.getElementById('movimientos-list');
    tbody.innerHTML = '';

    movimientos.forEach((m, idx) => {
        const row = tbody.insertRow();
        const tipoCls = m.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400';
        const montoCls = m.tipo === 'ingreso' ? '+' : '-';

        row.innerHTML = `
            <td><span class="px-2 py-1 rounded text-xs font-bold ${tipoCls}">${m.tipo.toUpperCase()}</span></td>
            <td>${m.categoria}</td>
            <td>${m.descripcion}</td>
            <td class="text-right font-bold">${montoCls}$${m.monto.toFixed(2)}</td>
            <td class="text-sm text-stone-400">${new Date(m.creado_en).toLocaleTimeString('es-AR')}</td>
            <td>
                <button class="btn-small" onclick="eliminarMovimiento(${m.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
    });
}

/**
 * Eliminar movimiento
 */
async function eliminarMovimiento(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este movimiento?')) return;

    try {
        const res = await fetch(`${API_BASE}/api/cajas/movimientos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (!res.ok) throw new Error(`Error ${res.status}`);

        movimientos = movimientos.filter(m => m.id !== id);
        actualizarTotales();
        mostrarBanner('✅ Movimiento eliminado', 'success');
    } catch (err) {
        console.error('Error eliminando movimiento:', err);
        mostrarBanner(`❌ Error: ${err.message}`, 'error');
    }
}

/**
 * Descargar informe en PDF
 */
function descargarInformePDF() {
    // TODO: Implementar descarga de PDF con librería como jsPDF
    mostrarBanner('📄 Función de PDF en desarrollo', 'info');
}

/**
 * Iniciar nueva caja
 */
function iniciarNuevaCaja() {
    cajaActual = null;
    movimientos = [];
    panelInforme.classList.add('hidden');
    mostrarPanelApertura();
    setCajaStatus('cerrada');
}

// Utilidades UI
function mostrarPanelApertura() {
    panelApertura.classList.remove('hidden');
    panelMovimientos.classList.add('hidden');
    panelInforme.classList.add('hidden');
}

function mostrarPanelMovimientos() {
    panelApertura.classList.add('hidden');
    panelMovimientos.classList.remove('hidden');
    panelInforme.classList.add('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function mostrarBanner(mensaje, tipo) {
    const banner = document.getElementById('banner');
    banner.textContent = mensaje;
    banner.className = `banner ${tipo === 'error' ? 'error' : tipo === 'success' ? 'success' : 'info'}`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 4000);
}

function setCajaStatus(estado) {
    const status = document.getElementById('caja-status');
    const text = document.getElementById('status-text');
    if (estado === 'abierta') {
        status.classList.remove('ss-connecting', 'ss-error');
        status.classList.add('ss-connected');
        text.textContent = 'Caja Abierta';
    } else if (estado === 'cerrada') {
        status.classList.remove('ss-connected', 'ss-error');
        status.classList.add('ss-connecting');
        text.textContent = 'Sin caja abierta';
    } else {
        status.classList.remove('ss-connected');
        status.classList.add('ss-error');
        text.textContent = 'Error';
    }
}

console.log('[admin_caja.js] Cargado');
