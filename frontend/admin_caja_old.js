// Estados de vista
let cajaActual = null;
let token = null;

// Elementos del DOM
const viewListado = document.getElementById('view-listado');
const viewDetalle = document.getElementById('view-detalle');
const viewAbrir = document.getElementById('view-abrir');
const cajasList = document.getElementById('cajas-list');
const sinCajas = document.getElementById('sin-cajas');
const banner = document.getElementById('banner');
const btnNuevaCaja = document.getElementById('btn-nueva-caja');
const btnVolver = document.getElementById('btn-volver');
const btnGuardarNombre = document.getElementById('btn-guardar-nombre');
const formAbrirCaja = document.getElementById('form-abrir-caja');

// Formatea fecha a formato legible
function formatearFecha(fecha) {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Formatea dinero
function formatearDinero(monto) {
    if (!monto) return '$0.00';
    return '$' + parseFloat(monto).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Calcula duración entre dos fechas
function calcularDuracion(inicio, fin) {
    if (!inicio || !fin) return '-';
    const start = new Date(inicio);
    const end = new Date(fin);
    const diff = Math.floor((end - start) / 1000 / 60); // en minutos
    const horas = Math.floor(diff / 60);
    const minutos = diff % 60;
    return `${horas}h ${minutos}m`;
}

// Obtiene token de localStorage o intenta hacer login
async function authenticateAndGetToken() {
    try {
        // Primero intenta obtener token de localStorage (del navbar)
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            token = storedToken;
            console.log('[admin_caja.js] ✅ Token obtenido de localStorage');
            return token;
        }

        // Si no hay token guardado, intenta login sin credenciales (endpoint especial MP)
        const loginResponse = await fetch('/api/mercadopago/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!loginResponse.ok) {
            throw new Error('Error en login');
        }

        const loginResult = await loginResponse.json();
        token = loginResult.accessToken;
        console.log('[admin_caja.js] ✅ Token obtenido por login');
        return token;
    } catch (err) {
        console.error('[admin_caja.js] Error autenticando:', err);
        return null;
    }
}

// Cargar cajas cerradas
async function cargarCajas() {
    if (!token) {
        await authenticateAndGetToken();
        if (!token) {
            mostrarBanner('No se pudo autenticar', 'error');
            console.error('[admin_caja.js] No hay token disponible');
            return;
        }
    }

    console.log('[admin_caja.js] Token a usar:', token.substring(0, 20) + '...');

    try {
        console.log('[admin_caja.js] 🔄 Iniciando fetch a /api/cajas/history');
        const response = await fetch('/api/cajas/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('[admin_caja.js] ✅ Respuesta recibida:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[admin_caja.js] Error HTTP:', response.status, errorText);
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        console.log('[admin_caja.js] 🔄 Parseando JSON...');
        const cajas = await response.json();
        console.log('[admin_caja.js] ✅ JSON parseado:', cajas.length, 'cajas');

        if (cajas.length === 0) {
            console.log('[admin_caja.js] ✅ Sin cajas, mostrando mensaje');
            cajasList.innerHTML = '';
            sinCajas.classList.remove('hidden');
            return;
        }

        console.log('[admin_caja.js] 🔄 Renderizando', cajas.length, 'cajas');
        sinCajas.classList.add('hidden');
        cajasList.innerHTML = cajas.map(caja => `
            <div class="caja-card" onclick="verDetalle(${caja.id})">
                <div class="caja-card-header">
                    <div>
                        <div class="caja-card-title">${caja.nombre || 'Caja sin nombre'}</div>
                        <div class="text-stone-400 text-sm mt-1">${formatearFecha(caja.fecha_apertura)}</div>
                    </div>
                    <div class="caja-card-number">Caja #${caja.numero_caja}</div>
                </div>
                <div class="caja-card-body">
                    <div class="caja-card-item">
                        <span class="caja-card-label">Saldo Inicial</span>
                        <span class="caja-card-value">${formatearDinero(caja.saldo_inicial)}</span>
                    </div>
                    <div class="caja-card-item">
                        <span class="caja-card-label">Saldo Final</span>
                        <span class="caja-card-value">${formatearDinero(caja.saldo_final)}</span>
                    </div>
                    <div class="caja-card-item">
                        <span class="caja-card-label">Total Movimientos</span>
                        <span class="caja-card-value">${formatearDinero(caja.total_movimientos || 0)}</span>
                    </div>
                    <div class="caja-card-item">
                        <span class="caja-card-label">Diferencia</span>
                        <span class="caja-card-value ${(caja.saldo_final - caja.saldo_inicial - (caja.total_movimientos || 0)) === 0 ? 'text-green-400' : 'text-yellow-400'}">
                            ${formatearDinero(caja.saldo_final - caja.saldo_inicial - (caja.total_movimientos || 0))}
                        </span>
                    </div>
                </div>
                <div class="caja-card-footer">
                    <span>Cierre: ${formatearFecha(caja.fecha_cierre)}</span>
                    <span>${caja.usuario_cierre || '-'}</span>
                </div>
            </div>
        `).join('');
        console.log('[admin_caja.js] ✅ Renderizado completado');
    } catch (err) {
        console.error('[admin_caja.js] ❌ Error en cargarCajas:', err.message, err.stack);
        mostrarBanner('Error cargando cajas: ' + err.message, 'error');
    }
}

// Ver detalle de caja
async function verDetalle(cajaId) {
    if (!token) await authenticateAndGetToken();

    try {
        const [cajaResponse, movResponse] = await Promise.all([
            fetch(`/api/cajas/${cajaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`/api/cajas/${cajaId}/movimientos`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!cajaResponse.ok || !movResponse.ok) {
            throw new Error('Error cargando detalles');
        }

        const caja = await cajaResponse.json();
        const movimientos = await movResponse.json();

        cajaActual = { ...caja, movimientos };

        // Llenar información de la caja
        document.getElementById('detalle-titulo').textContent = caja.nombre || `Caja #${caja.numero_caja}`;
        document.getElementById('detalle-numero').textContent = `#${caja.numero_caja}`;
        document.getElementById('detalle-apertura').textContent = formatearFecha(caja.fecha_apertura);
        document.getElementById('detalle-cierre').textContent = formatearFecha(caja.fecha_cierre);
        document.getElementById('detalle-duracion').textContent = calcularDuracion(caja.fecha_apertura, caja.fecha_cierre);
        document.getElementById('detalle-nombre').value = caja.nombre || '';

        // Separar ingresos y egresos
        const ingresos = movimientos.filter(m => m.tipo === 'ingreso');
        const egresos = movimientos.filter(m => m.tipo === 'egreso');

        const totalIngresos = ingresos.reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
        const totalEgresos = egresos.reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
        const saldoEsperado = parseFloat(caja.saldo_inicial) + totalIngresos - totalEgresos;
        const diferencia = parseFloat(caja.saldo_final) - saldoEsperado;

        // Llenar tablas
        document.getElementById('detalle-ingresos').innerHTML = ingresos.map(m => `
            <tr>
                <td>${m.descripcion}</td>
                <td>${m.categoria}</td>
                <td class="text-green-400">${formatearDinero(m.monto)}</td>
                <td>${new Date(m.creado_en).toLocaleTimeString('es-AR')}</td>
            </tr>
        `).join('');

        document.getElementById('detalle-egresos').innerHTML = egresos.map(m => `
            <tr>
                <td>${m.descripcion}</td>
                <td>${m.categoria}</td>
                <td class="text-red-400">${formatearDinero(m.monto)}</td>
                <td>${new Date(m.creado_en).toLocaleTimeString('es-AR')}</td>
            </tr>
        `).join('');

        // Llenar totales
        document.getElementById('detalle-saldo-inicial').textContent = formatearDinero(caja.saldo_inicial);
        document.getElementById('detalle-total-ingresos').textContent = formatearDinero(totalIngresos);
        document.getElementById('detalle-total-egresos').textContent = formatearDinero(totalEgresos);
        document.getElementById('detalle-saldo-esperado').textContent = formatearDinero(saldoEsperado);
        document.getElementById('detalle-saldo-final').textContent = formatearDinero(caja.saldo_final);
        document.getElementById('detalle-diferencia').textContent = formatearDinero(diferencia);

        // Color de diferencia
        const diferenciEl = document.getElementById('detalle-diferencia');
        if (diferencia === 0) {
            diferenciEl.className = 'text-2xl font-bold text-green-400';
        } else if (diferencia < 0) {
            diferenciEl.className = 'text-2xl font-bold text-red-400';
        } else {
            diferenciEl.className = 'text-2xl font-bold text-yellow-400';
        }

        mostrarVista('detalle');
    } catch (err) {
        console.error('[admin_caja.js] Error en verDetalle:', err);
        mostrarBanner('Error cargando detalles: ' + err.message, 'error');
    }
}

// Guardar nombre de caja
async function guardarNombre() {
    if (!cajaActual) return;

    const nombre = document.getElementById('detalle-nombre').value.trim();
    if (!nombre) {
        mostrarBanner('El nombre no puede estar vacío', 'error');
        return;
    }

    if (!token) await authenticateAndGetToken();

    try {
        const response = await fetch(`/api/cajas/${cajaActual.id}/nombre`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre })
        });

        if (!response.ok) {
            throw new Error('Error guardando nombre');
        }

        cajaActual.nombre = nombre;
        document.getElementById('detalle-titulo').textContent = nombre;
        mostrarBanner('Nombre guardado correctamente', 'success');
        cargarCajas();
    } catch (err) {
        console.error('[admin_caja.js] Error guardando nombre:', err);
        mostrarBanner('Error: ' + err.message, 'error');
    }
}

// Mostrar vista específica
function mostrarVista(vista) {
    viewListado.classList.add('hidden');
    viewDetalle.classList.add('hidden');
    viewAbrir.classList.add('hidden');

    if (vista === 'listado') viewListado.classList.remove('hidden');
    else if (vista === 'detalle') viewDetalle.classList.remove('hidden');
    else if (vista === 'abrir') viewAbrir.classList.remove('hidden');
}

function mostrarListado() {
    mostrarVista('listado');
}

// Mostrar banner
function mostrarBanner(mensaje, tipo = 'info') {
    banner.textContent = mensaje;
    banner.className = `banner ${tipo === 'error' ? 'bg-red-900 text-red-100' : tipo === 'success' ? 'bg-green-900 text-green-100' : 'bg-blue-900 text-blue-100'}`;
    banner.classList.remove('hidden');

    setTimeout(() => {
        banner.classList.add('hidden');
    }, 4000);
}

// Abrir nueva caja
formAbrirCaja.addEventListener('submit', async (e) => {
    e.preventDefault();

    const saldoInicial = document.getElementById('saldo-inicial').value;
    const notas = document.getElementById('notas-apertura').value;

    if (!token) await authenticateAndGetToken();

    try {
        const response = await fetch('/api/cajas', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                saldoInicial: parseFloat(saldoInicial),
                notas
            })
        });

        if (!response.ok) {
            throw new Error('Error abriendo caja');
        }

        mostrarBanner('Caja abierta correctamente', 'success');
        formAbrirCaja.reset();
        setTimeout(() => {
            cargarCajas();
            mostrarListado();
        }, 1000);
    } catch (err) {
        console.error('[admin_caja.js] Error abriendo caja:', err);
        mostrarBanner('Error: ' + err.message, 'error');
    }
});

// Event listeners
btnNuevaCaja.addEventListener('click', () => mostrarVista('abrir'));
btnVolver.addEventListener('click', mostrarListado);
btnGuardarNombre.addEventListener('click', guardarNombre);

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    await authenticateAndGetToken();
    await cargarCajas();
    mostrarListado();
});
