// Estados de vista
let cajaActual = null;
let cajaAbierta = null;
let token = null;

// Elementos del DOM - con validación
function getElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`[admin_caja.js] ⚠️ Elemento no encontrado: ${id}`);
    }
    return el;
}

const viewListado = getElement('view-listado');
const viewDetalle = getElement('view-detalle');
const viewAbrir = getElement('view-abrir');
const bannerCajaAbierta = getElement('banner-caja-abierta');
const cajasList = getElement('cajas-list');
const sinCajas = getElement('sin-cajas');
const banner = getElement('banner');
const btnNuevaCaja = getElement('btn-nueva-caja');
const btnVolver = getElement('btn-volver');
const btnGuardarNombre = getElement('btn-guardar-nombre');
const formAbrirCaja = getElement('form-abrir-caja');
const btnCerrarCajaAbierta = getElement('btn-cerrar-caja-abierta');
const cajaStatus = getElement('caja-status');
const statusText = getElement('status-text');

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

// Cargar caja abierta del usuario actual
async function cargarCajaAbierta() {
    if (!token) {
        await authenticateAndGetToken();
        if (!token) return;
    }

    try {
        console.log('[admin_caja.js] 🔄 Cargando caja abierta...');
        const response = await fetch('/api/cajas/activa', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 404) {
            // No hay caja abierta
            console.log('[admin_caja.js] ℹ️ No hay caja abierta');
            cajaAbierta = null;
            if (bannerCajaAbierta) bannerCajaAbierta.classList.add('hidden');
            return;
        }

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        cajaAbierta = await response.json();
        console.log('[admin_caja.js] ✅ Caja abierta encontrada:', cajaAbierta.numero_caja);

        // Mostrar banner de caja abierta
        mostrarCajaAbierta(cajaAbierta);
    } catch (err) {
        console.error('[admin_caja.js] Error cargando caja abierta:', err);
        cajaAbierta = null;
        if (bannerCajaAbierta) bannerCajaAbierta.classList.add('hidden');
    }
}

// Actualizar banner de caja abierta (sin movimientos)
function mostrarCajaAbierta(caja) {
    if (!caja) {
        if (bannerCajaAbierta) bannerCajaAbierta.classList.add('hidden');
        return;
    }

    const titulo = document.getElementById('caja-abierta-titulo');
    const apertura = document.getElementById('caja-abierta-apertura');
    const saldoInicial = document.getElementById('caja-abierta-saldo-inicial');

    if (titulo) titulo.textContent = `Caja #${caja.numero_caja}`;
    if (apertura) apertura.textContent = formatearFecha(caja.fecha_apertura);
    if (saldoInicial) saldoInicial.textContent = formatearDinero(caja.saldo_inicial);

    if (bannerCajaAbierta) bannerCajaAbierta.classList.remove('hidden');
}

// Cerrar caja abierta
async function cerrarCajaAbierta() {
    if (!cajaAbierta) return;

    const saldoFinal = prompt('¿Cuál es el saldo final de la caja?\n\n(Dejar en blanco para que se calcule automáticamente)', '');
    if (saldoFinal === null) return; // Usuario canceló

    if (!token) await authenticateAndGetToken();

    try {
        // Si no ingresó saldo, calcularlo automáticamente
        let finalAmount = null;
        if (saldoFinal.trim() !== '') {
            finalAmount = parseFloat(saldoFinal.replace('$', '').replace('.', '').replace(',', '.'));
        } else {
            // Calcular automáticamente
            const movimientos = cajaAbierta.movimientos || [];
            const totalIngresos = movimientos
                .filter(m => m.tipo === 'ingreso')
                .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
            const totalEgresos = movimientos
                .filter(m => m.tipo === 'egreso')
                .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
            finalAmount = parseFloat(cajaAbierta.saldo_inicial) + totalIngresos - totalEgresos;
            console.log(`[admin_caja.js] 📊 Saldo final calculado: ${formatearDinero(finalAmount)}`);
        }

        const response = await fetch(`/api/cajas/${cajaAbierta.id}/cerrar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                saldoFinal: finalAmount,
                notas: 'Cerrada desde interfaz web'
            })
        });

        if (!response.ok) {
            throw new Error('Error cerrando caja');
        }

        mostrarBanner('Caja cerrada correctamente', 'success');

        // Preguntar si desea importar movimientos de MP
        const importarMP = confirm('¿Desea importar los movimientos de Mercado Pago para esta caja?\n\nEsto paginará por todas las transacciones desde que se abrió la caja.');

        if (importarMP) {
            console.log('[admin_caja.js] 🔄 Iniciando importación de MP...');
            console.log(`[admin_caja.js] 📅 Rango: ${cajaAbierta.fecha_apertura} → ${new Date().toISOString()}`);
            mostrarBanner('⏳ Importando movimientos de MP... esto puede tomar 1-2 minutos', 'info');

            try {
                // Llamar endpoint de importación
                console.log(`[admin_caja.js] 📡 POST /api/cajas/${cajaAbierta.id}/importar-mp`);
                const importResponse = await fetch(`/api/cajas/${cajaAbierta.id}/importar-mp`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log(`[admin_caja.js] 📥 Respuesta recibida: ${importResponse.status} ${importResponse.statusText}`);

                if (importResponse.ok) {
                    const importResult = await importResponse.json();
                    console.log('[admin_caja.js] ✅ Resultado importación:', importResult);

                    const mensaje = `✅ MP: ${importResult.imported} importados, ${importResult.failed || 0} fallos, ${importResult.pagesScraped || '?'} páginas`;
                    mostrarBanner(mensaje, 'success');
                    console.log(`[admin_caja.js] ${mensaje}`);
                } else {
                    const errorText = await importResponse.text();
                    console.error('[admin_caja.js] ❌ Error en importación MP (status ' + importResponse.status + '):', errorText);
                    mostrarBanner('⚠️ Error importando de MP - verificar logs (F12)', 'error');
                }
            } catch (importErr) {
                console.error('[admin_caja.js] ❌ Exception en importación MP:', importErr);
                mostrarBanner('❌ Error: ' + importErr.message, 'error');
            }
        }

        localStorage.removeItem('cajaAbiertaActual');
        cajaAbierta = null;
        if (bannerCajaAbierta) bannerCajaAbierta.classList.add('hidden');

        setTimeout(() => {
            cargarCajaAbierta();
            cargarCajas();
            mostrarListado();
        }, 2000);
    } catch (err) {
        console.error('[admin_caja.js] Error cerrando caja:', err);
        mostrarBanner('Error: ' + err.message, 'error');
    }
}

// Cargar cajas (abiertas + cerradas)
async function cargarCajas() {
    if (!token) {
        await authenticateAndGetToken();
        if (!token) {
            mostrarBanner('No se pudo autenticar', 'error');
            console.error('[admin_caja.js] No hay token disponible');
            return;
        }
    }

    console.log('[admin_caja.js] 🔄 Cargando historial de cajas...');

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
        cajasList.innerHTML = cajas.map(caja => {
            const esAbierta = caja.estado === 'abierta';
            const esImportacion = (caja.nombre || '').startsWith('Importación MP');

            // Título: nombre personalizado, o período si no hay nombre
            let titulo;
            if (caja.nombre) {
                titulo = caja.nombre;
            } else if (caja.fecha_cierre) {
                titulo = `${formatearFecha(caja.fecha_apertura)} → ${formatearFecha(caja.fecha_cierre)}`;
            } else {
                titulo = `Abierta el ${formatearFecha(caja.fecha_apertura)}`;
            }

            const badgeClass = esAbierta ? 'bg-green-700 text-green-100' : esImportacion ? 'bg-purple-700 text-purple-100' : 'bg-stone-600 text-stone-200';
            const badgeText = esAbierta ? '⚡ Abierta' : esImportacion ? '⬇ Importación MP' : '✓ Cerrada';

            return `
            <div class="caja-card${esAbierta ? ' caja-card-abierta' : ''}" onclick="verDetalle(${caja.id})">
                <div class="caja-card-header">
                    <div>
                        <div class="caja-card-title">${titulo}</div>
                        <div class="text-stone-400 text-xs mt-1">
                            Caja #${caja.numero_caja}
                            ${caja.usuario_apertura ? ' · ' + caja.usuario_apertura : ''}
                        </div>
                    </div>
                    <span class="caja-card-number px-2 py-1 rounded text-xs ${badgeClass}">${badgeText}</span>
                </div>
                <div class="caja-card-body">
                    <div class="caja-card-item">
                        <span class="caja-card-label">Saldo Inicial</span>
                        <span class="caja-card-value">${formatearDinero(caja.saldo_inicial)}</span>
                    </div>
                    <div class="caja-card-item">
                        <span class="caja-card-label">Saldo Final</span>
                        <span class="caja-card-value">${esAbierta ? '—' : formatearDinero(caja.saldo_final)}</span>
                    </div>
                    <div class="caja-card-item">
                        <span class="caja-card-label">Total Movimientos</span>
                        <span class="caja-card-value">${formatearDinero(caja.total_movimientos || 0)}</span>
                    </div>
                    <div class="caja-card-item">
                        <span class="caja-card-label">${esAbierta ? 'Estado' : 'Cierre'}</span>
                        <span class="caja-card-value">${esAbierta ? '<span class="text-green-400">En curso</span>' : formatearFecha(caja.fecha_cierre)}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
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

    if (vista === 'listado') {
        viewListado.classList.remove('hidden');
        console.log('[admin_caja.js] 👁️ Mostrando listado');
    }
    else if (vista === 'detalle') {
        viewDetalle.classList.remove('hidden');
        console.log('[admin_caja.js] 👁️ Mostrando detalle');
    }
    else if (vista === 'abrir') {
        viewAbrir.classList.remove('hidden');
        console.log('[admin_caja.js] 👁️ Mostrando formulario abrir caja');
    }
}

function mostrarListado() {
    mostrarVista('listado');
}

// Actualizar estado de conexión
function actualizarEstadoConexion(estado, mensaje) {
    if (!cajaStatus || !statusText) return;

    statusText.textContent = mensaje;

    // Remover todas las clases de estado
    cajaStatus.classList.remove('ss-connecting', 'ss-connected', 'ss-error');

    // Agregar la clase según el estado
    if (estado === 'conectado') {
        cajaStatus.classList.add('ss-connected');
    } else if (estado === 'cargando') {
        cajaStatus.classList.add('ss-connecting');
    } else if (estado === 'error') {
        cajaStatus.classList.add('ss-error');
    }
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
if (formAbrirCaja) {
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
                cargarCajaAbierta();
                cargarCajas();
                mostrarListado();
            }, 1000);
        } catch (err) {
            console.error('[admin_caja.js] Error abriendo caja:', err);
            mostrarBanner('Error: ' + err.message, 'error');
        }
    });
}

// Agregar log en panel de logs retroactivo
function agregarLogRetroactivo(mensaje) {
    const logsDiv = document.getElementById('retroactivo-logs');
    if (!logsDiv) return;
    logsDiv.classList.remove('hidden');
    const timestamp = new Date().toLocaleTimeString('es-AR');
    const linea = document.createElement('div');
    linea.textContent = `[${timestamp}] ${mensaje}`;
    logsDiv.appendChild(linea);
    logsDiv.scrollTop = logsDiv.scrollHeight;
    console.log(`[admin_caja.js] ${mensaje}`);
}

// Importar movimientos retroactivos con período elegido (auto-crea y cierra la caja)
let _sseSource = null; // Referencia global al EventSource activo

async function importarMovimientosRetroactivos() {
    if (!token) await authenticateAndGetToken();

    const fechaDesde = document.getElementById('retroactivo-fecha-desde').value;
    const fechaHasta = document.getElementById('retroactivo-fecha-hasta').value;
    const maxPaginas = parseInt(document.getElementById('retroactivo-max-paginas').value) || 20;

    if (!fechaDesde || !fechaHasta) {
        mostrarBanner('⚠️ Selecciona las fechas (desde y hasta)', 'warning');
        return;
    }

    // Cerrar SSE anterior si existe
    if (_sseSource) {
        _sseSource.close();
        _sseSource = null;
    }

    // Limpiar logs previos
    const logsDiv = document.getElementById('retroactivo-logs');
    if (logsDiv) {
        logsDiv.innerHTML = '';
        logsDiv.classList.remove('hidden');
    }

    // Deshabilitar botón durante importación
    const btn = document.getElementById('btn-importar-retroactivos');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Importando...'; }

    agregarLogRetroactivo('🔄 Iniciando importación (SSE)...');
    mostrarBanner('⏳ Importando... recibiendo datos en tiempo real', 'info');

    // Usar el nuevo endpoint que auto-crea y cierra la caja
    const params = new URLSearchParams({ fechaDesde, fechaHasta, maxPaginas, token });
    const url = `/api/cajas/importar-auto-stream?${params}`;

    const source = new EventSource(url);
    _sseSource = source;

    source.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'status') {
                agregarLogRetroactivo(data.message);

            } else if (data.type === 'warning') {
                agregarLogRetroactivo(`⚠️ ${data.message}`);

            } else if (data.type === 'page_duplicate') {
                agregarLogRetroactivo(`\n🛑 ${data.message}`);
                agregarLogRetroactivo(`   ↳ Las transacciones de páginas anteriores se conservan.`);
                mostrarBanner('⚠️ Scraping detenido: MP redirigió al inicio', 'warning');

            } else if (data.type === 'page_start') {
                agregarLogRetroactivo(`\n━━━ Página ${data.page}/${data.maxPages} ━━━`);

            } else if (data.type === 'page_done') {
                agregarLogRetroactivo(`📄 Página ${data.page}: ${data.count} transacciones (total: ${data.total})`);
                // Mostrar cada transacción escaneada
                if (data.transactions && data.transactions.length > 0) {
                    data.transactions.forEach(tx => {
                        const monto = tx.amount;
                        const signo = (typeof monto === 'number' && monto < 0) ? '' : '+';
                        const montoStr = typeof monto === 'number' ? `${signo}$${Math.abs(monto).toLocaleString('es-AR')}` : (monto || '');
                        const fecha = tx.dateTime ? new Date(tx.dateTime).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
                        agregarLogRetroactivo(`  ↳ ${fecha} | ${(tx.title || '').substring(0, 35)} | ${montoStr}`);
                    });
                }

            } else if (data.type === 'imported') {
                const signo = data.tx.tipo === 'egreso' ? '-' : '+';
                agregarLogRetroactivo(`✅ IMPORTADO: ${signo}$${Math.abs(data.tx.monto).toLocaleString('es-AR')} — ${(data.tx.title || '').substring(0, 40)}`);

            } else if (data.type === 'scraping_done') {
                agregarLogRetroactivo(`\n📦 Scraping terminado: ${data.total} tx, ${data.pages} páginas, ${data.navigationErrors} errores`);

            } else if (data.type === 'error') {
                agregarLogRetroactivo(`❌ ERROR: ${data.message}`);
                mostrarBanner('❌ Error: ' + data.message, 'error');
                source.close();
                _sseSource = null;
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download mr-1"></i> Iniciar Importación'; }

            } else if (data.type === 'done') {
                agregarLogRetroactivo(`\n🎉 ═══════════════════════════════`);
                agregarLogRetroactivo(`   ✅ Importados: ${data.imported}`);
                agregarLogRetroactivo(`   ❌ Fallidos:   ${data.failed}`);
                agregarLogRetroactivo(`   🔍 Filtradas:  ${data.filtered}/${data.totalInMP}`);
                agregarLogRetroactivo(`   📄 Páginas:    ${data.pagesScraped}`);
                if (data.cajaNombre) agregarLogRetroactivo(`   📦 Caja:       ${data.cajaNombre}`);
                agregarLogRetroactivo(`🎉 ═══════════════════════════════`);
                mostrarBanner(`✅ ${data.imported} movimientos importados`, 'success');
                source.close();
                _sseSource = null;
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download mr-1"></i> Iniciar Importación'; }
                // Recargar listado para mostrar la nueva caja
                setTimeout(() => cargarCajas(), 1500);
            }
        } catch (e) {
            console.error('[admin_caja.js] SSE parse error:', e);
        }
    };

    source.onerror = (err) => {
        agregarLogRetroactivo('❌ Conexión SSE perdida');
        mostrarBanner('❌ Conexión perdida', 'error');
        source.close();
        _sseSource = null;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download mr-1"></i> Iniciar Importación'; }
    };
}

/**
 * Pausar el refresh automático de MP
 */
async function pausarRefreshMP() {
    if (!token) await authenticateAndGetToken();

    const btn = document.getElementById('btn-pausar-refresh-mp');
    const icon = document.getElementById('icon-pausar-refresh');
    const label = document.getElementById('label-pausar-refresh');

    try {
        agregarLogRetroactivo('\n⏳ Cambiando estado del refresh de MP...');
        if (btn) btn.disabled = true;

        const response = await fetch('/api/cajas/pausar-refresh', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (response.ok) {
            const data = await response.json();
            if (data.action === 'paused') {
                agregarLogRetroactivo('🔒 Watch service PAUSADO — refresh de MP detenido');
                mostrarBanner('⏸️ Refresh de MP pausado', 'info');
                if (icon) { icon.className = 'fas fa-play'; }
                if (label) { label.textContent = 'Reanudar'; }
                if (btn) { btn.className = btn.className.replace('btn-red', 'btn-green'); }
            } else {
                agregarLogRetroactivo('▶️ Watch service REANUDADO — refresh de MP activo');
                mostrarBanner('▶️ Refresh de MP reanudado', 'success');
                if (icon) { icon.className = 'fas fa-pause'; }
                if (label) { label.textContent = 'Pausar'; }
                if (btn) { btn.className = btn.className.replace('btn-green', 'btn-red'); }
            }
        } else {
            agregarLogRetroactivo(`❌ Error: ${response.status}`);
            mostrarBanner('⚠️ No se pudo cambiar estado del refresh', 'error');
        }
    } catch (err) {
        console.error('[admin_caja.js] ❌ Error toggle refresh:', err);
        agregarLogRetroactivo(`❌ Exception: ${err.message}`);
        mostrarBanner('❌ Error: ' + err.message, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Event listeners - con validación
if (btnNuevaCaja) btnNuevaCaja.addEventListener('click', () => mostrarVista('abrir'));
if (btnVolver) btnVolver.addEventListener('click', mostrarListado);
if (btnGuardarNombre) btnGuardarNombre.addEventListener('click', guardarNombre);
if (btnCerrarCajaAbierta) btnCerrarCajaAbierta.addEventListener('click', cerrarCajaAbierta);

// Toggle panel de importación MP
const btnToggleImportar = document.getElementById('btn-toggle-importar');
const panelImportarMp = document.getElementById('panel-importar-mp');
if (btnToggleImportar && panelImportarMp) {
    btnToggleImportar.addEventListener('click', () => {
        panelImportarMp.classList.toggle('hidden');
        btnToggleImportar.innerHTML = panelImportarMp.classList.contains('hidden')
            ? '<i class="fas fa-download mr-1"></i> Importar desde MP'
            : '<i class="fas fa-chevron-up mr-1"></i> Ocultar importación';
    });
}

// Evento para botón de importación retroactiva
const btnImportarRetroactivos = document.getElementById('btn-importar-retroactivos');
if (btnImportarRetroactivos) {
    btnImportarRetroactivos.addEventListener('click', importarMovimientosRetroactivos);
}

// Evento para botón de pausar refresh de MP
const btnPausarRefresh = document.getElementById('btn-pausar-refresh-mp');
if (btnPausarRefresh) {
    btnPausarRefresh.addEventListener('click', pausarRefreshMP);
}

// Inicializar
async function inicializar() {
    try {
        console.log('[admin_caja.js] 🚀 Iniciando...');
        actualizarEstadoConexion('cargando', 'cargando…');

        await authenticateAndGetToken();
        console.log('[admin_caja.js] ✅ Autenticado');

        await cargarCajaAbierta();
        console.log('[admin_caja.js] ✅ Caja abierta cargada');

        await cargarCajas();
        console.log('[admin_caja.js] ✅ Cajas cargadas');

        // Siempre mostrar el listado
        mostrarListado();
        actualizarEstadoConexion('conectado', cajaAbierta ? '⚡ Caja abierta' : '✓ Conectado');

        console.log('[admin_caja.js] ✅ Inicialización completada');
    } catch (err) {
        console.error('[admin_caja.js] ❌ Error en inicialización:', err);
        actualizarEstadoConexion('error', '✗ Error');
        mostrarBanner('Error: ' + err.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', inicializar);
