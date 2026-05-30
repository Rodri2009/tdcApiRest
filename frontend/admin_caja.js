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
const btnGuardarEvento = getElement('btn-guardar-evento');
const formAbrirCaja = getElement('form-abrir-caja');
const btnCerrarCajaAbierta = getElement('btn-cerrar-caja-abierta');
const cajaStatus = getElement('caja-status');
const statusText = getElement('status-text');
const panelImportarMp = getElement('panel-importar-mp');
const importPanelOriginalHtml = panelImportarMp ? panelImportarMp.innerHTML : '';
const importPanelOriginalClass = panelImportarMp ? panelImportarMp.className : '';

function getRetroactivoInput(id) {
    return getElement(id);
}

function getRetroactivoFechaDesde() {
    return getRetroactivoInput('retroactivo-fecha-desde');
}

function getRetroactivoHoraDesde() {
    return getRetroactivoInput('retroactivo-hora-desde');
}

function getRetroactivoFechaHasta() {
    return getRetroactivoInput('retroactivo-fecha-hasta');
}

function getRetroactivoHoraHasta() {
    return getRetroactivoInput('retroactivo-hora-hasta');
}

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
                    <div class="flex items-center gap-2">
                        <span class="caja-card-number px-2 py-1 rounded text-xs ${badgeClass}">${badgeText}</span>
                        <button type="button" class="btn btn-sm btn-red" onclick="eliminarCaja(event, ${caja.id})" title="Eliminar caja">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
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

async function eliminarCaja(event, cajaId) {
    event.stopPropagation();

    if (!confirm('¿Eliminar esta caja y todos sus movimientos? Esta acción no se puede deshacer.')) {
        return;
    }

    if (!token) {
        await authenticateAndGetToken();
        if (!token) {
            mostrarBanner('No se pudo autenticar', 'error');
            return;
        }
    }

    try {
        const response = await fetch(`/api/cajas/${cajaId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `HTTP ${response.status}`);
        }

        mostrarBanner('Caja eliminada correctamente', 'success');
        cargarCajas();
        mostrarListado();
    } catch (err) {
        console.error('[admin_caja.js] ❌ Error eliminando caja:', err);
        mostrarBanner('Error eliminando caja: ' + err.message, 'error');
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

        // Cargar evento asociado si existe
        if (caja.id_evento_confirmado) {
            document.getElementById('id-evento-confirmado').value = caja.id_evento_confirmado;
        } else {
            document.getElementById('id-evento-confirmado').value = '';
        }
        
        // Cargar lista de eventos disponibles
        await cargarEventosDisponibles('id-evento-confirmado');

        // Separar ingresos y egresos POR TIPO DE PAGO
        // EN CUENTA: transferencia, tarjeta, cheque, otro
        // EN EFECTIVO: efectivo
        const ingresosEnCuenta = movimientos.filter(m => m.tipo === 'ingreso' && m.metodo_pago !== 'efectivo');
        const egresosEnCuenta = movimientos.filter(m => m.tipo === 'egreso' && m.metodo_pago !== 'efectivo');
        const ingresosEnEfectivo = movimientos.filter(m => m.tipo === 'ingreso' && m.metodo_pago === 'efectivo');
        const egresosEnEfectivo = movimientos.filter(m => m.tipo === 'egreso' && m.metodo_pago === 'efectivo');

        // Calcular totales GENERALES (todos los movimientos)
        const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
        const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
        const saldoEsperado = parseFloat(caja.saldo_inicial_en_cuenta) + totalIngresos - totalEgresos;
        const diferencia = parseFloat(caja.saldo_final_en_efectivo || 0) - saldoEsperado;

        // Función auxiliar para construir filas
        const buildDetalleRow = (m, isIngreso) => {
            const createdAt = new Date(m.creado_en);
            const fecha = createdAt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const descripcion = String(m.descripcion || '').trim();
            const montoClass = isIngreso ? 'text-green-400' : 'text-red-400';
            return `
            <tr>
                <td>${fecha}</td>
                <td>${descripcion || '-'}</td>
                <td class="${montoClass}">${formatearDinero(m.monto)}</td>
            </tr>
        `;
        };

        // Llenar 4 tablas separadas
        document.getElementById('detalle-ingresos-cuenta').innerHTML = ingresosEnCuenta.length > 0 
            ? ingresosEnCuenta.map(m => buildDetalleRow(m, true)).join('')
            : '<tr><td colspan="3" class="text-center text-stone-500">Sin ingresos en cuenta</td></tr>';

        document.getElementById('detalle-egresos-cuenta').innerHTML = egresosEnCuenta.length > 0
            ? egresosEnCuenta.map(m => buildDetalleRow(m, false)).join('')
            : '<tr><td colspan="3" class="text-center text-stone-500">Sin egresos en cuenta</td></tr>';

        document.getElementById('detalle-ingresos-efectivo').innerHTML = ingresosEnEfectivo.length > 0
            ? ingresosEnEfectivo.map(m => buildDetalleRow(m, true)).join('')
            : '<tr><td colspan="3" class="text-center text-stone-500">Sin ingresos en efectivo</td></tr>';

        document.getElementById('detalle-egresos-efectivo').innerHTML = egresosEnEfectivo.length > 0
            ? egresosEnEfectivo.map(m => buildDetalleRow(m, false)).join('')
            : '<tr><td colspan="3" class="text-center text-stone-500">Sin egresos en efectivo</td></tr>';

        // Llenar totales
        document.getElementById('detalle-saldo-inicial').textContent = formatearDinero(caja.saldo_inicial_en_cuenta);
        document.getElementById('detalle-total-ingresos').textContent = formatearDinero(totalIngresos);
        document.getElementById('detalle-total-egresos').textContent = formatearDinero(totalEgresos);
        document.getElementById('detalle-saldo-esperado').textContent = formatearDinero(saldoEsperado);
        document.getElementById('detalle-saldo-final').textContent = formatearDinero(caja.saldo_final_en_efectivo || 0);
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

// Guardar evento asociado a la caja
async function guardarEvento() {
    if (!cajaActual) return;

    const idEvento = document.getElementById('id-evento-confirmado').value || null;
    
    if (!token) await authenticateAndGetToken();

    try {
        const response = await fetch(`/api/cajas/${cajaActual.id}/evento`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idEventoConfirmado: idEvento ? parseInt(idEvento) : null })
        });

        if (!response.ok) {
            throw new Error('Error guardando evento');
        }

        cajaActual.id_evento_confirmado = idEvento ? parseInt(idEvento) : null;
        const selectEvento = document.getElementById('id-evento-confirmado');
        const selectedText = selectEvento.options[selectEvento.selectedIndex]?.text || 'Sin evento';
        mostrarBanner(`✅ Evento actualizado: ${selectedText}`, 'success');
        cargarCajas();
    } catch (err) {
        console.error('[admin_caja.js] Error guardando evento:', err);
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
        // Cargar automáticamente el saldo disponible de MP y eventos
        cargarSaldoMPAlFormulario();
        cargarEventosDisponibles();
    }
}

// Cargar eventos confirmados en el select (reutilizable para diferentes selectores)
async function cargarEventosDisponibles(selectId = 'id-evento-confirmado') {
    try {
        const selectEvento = document.getElementById(selectId);
        if (!selectEvento) {
            console.warn(`[admin_caja.js] No se encontró select #${selectId}`);
            return;
        }

        if (!token) await authenticateAndGetToken();

        const res = await fetch('/api/cajas/eventos-disponibles', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const eventos = await res.json();
            console.log('[admin_caja.js] ✅ Eventos cargados:', eventos.length);
            
            // Mantener la opción "Sin evento"
            const currentValue = selectEvento.value;
            selectEvento.innerHTML = '<option value="">-- Sin evento asociado --</option>';
            
            eventos.forEach(evento => {
                const option = document.createElement('option');
                option.value = evento.id;
                option.textContent = `${evento.nombre_evento} (${evento.descripcion_corta || 'Sin descripción'})`;
                selectEvento.appendChild(option);
            });
            
            selectEvento.value = currentValue;
        } else {
            console.warn('[admin_caja.js] No se pudieron cargar eventos:', res.status);
        }
    } catch (err) {
        console.warn('[admin_caja.js] Error cargando eventos:', err.message);
    }
}

// Cargar saldo disponible de MP al formulario
async function cargarSaldoMPAlFormulario() {
    try {
        const inputSaldo = document.getElementById('saldo-inicial');
        const infoText = document.getElementById('saldo-info');

        if (!inputSaldo) return;

        if (!token) await authenticateAndGetToken();

        const res = await fetch('/api/mercadopago/balance', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            // data puede ser { success: true, data: { available: ... } } o directamente { available: ... }
            let available = 0;
            if (data && data.success && data.data && typeof data.data.available === 'number') {
                available = data.data.available;
            } else if (data && typeof data.available === 'number') {
                available = data.available;
            }

            if (available > 0) {
                inputSaldo.value = available.toFixed(2);
                if (infoText) {
                    infoText.textContent = `✅ Saldo cargado de Mercado Pago: $${available.toFixed(2)}`;
                }
                console.log('[admin_caja.js] ✅ Saldo de MP cargado:', available);
            }
        }
    } catch (err) {
        console.warn('[admin_caja.js] No se pudo cargar saldo de MP:', err.message);
    }
}

// Conectar botón "Cargar de MP"
const btnCargarSaldoMP = document.getElementById('btn-cargar-saldo-mp');
if (btnCargarSaldoMP) {
    btnCargarSaldoMP.addEventListener('click', async (e) => {
        e.preventDefault();
        await cargarSaldoMPAlFormulario();
    });
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

        const nombreCaja = document.getElementById('nombre-caja').value.trim();
        const saldoInicial = parseFloat(document.getElementById('saldo-inicial').value);
        const efectivoInicial = parseFloat(document.getElementById('efectivo-inicial').value) || 0;
        const idEvento = document.getElementById('id-evento-confirmado').value || null;
        const notas = document.getElementById('notas-apertura').value;

        if (!nombreCaja) {
            mostrarBanner('⚠️ Ingresa un nombre para la caja', 'warning');
            return;
        }

        if (Number.isNaN(saldoInicial) || saldoInicial < 0) {
            mostrarBanner('⚠️ Ingresa un saldo inicial válido', 'warning');
            return;
        }

        if (!token) await authenticateAndGetToken();

        try {
            const response = await fetch('/api/cajas', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: nombreCaja,
                    saldoInicial: parseFloat(saldoInicial),
                    saldoInicialEnEfectivo: efectivoInicial,
                    idEventoConfirmado: idEvento ? parseInt(idEvento) : null,
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
    const linea = document.createElement('div');
    linea.textContent = mensaje;
    logsDiv.appendChild(linea);
    logsDiv.scrollTop = logsDiv.scrollHeight;
    console.log(`[admin_caja.js] ${mensaje}`);
}

function restaurarPanelImportacion() {
    if (!panelImportarMp) return;
    panelImportarMp.innerHTML = importPanelOriginalHtml;
    panelImportarMp.className = importPanelOriginalClass;
    attachImportPanelListeners();
    inicializarFechasRetroactivas();
}

function inicializarFechasRetroactivas() {
    const fechaDesdeEl = getRetroactivoFechaDesde();
    const horaDesdeEl = getRetroactivoHoraDesde();
    const fechaHastaEl = getRetroactivoFechaHasta();
    const horaHastaEl = getRetroactivoHoraHasta();
    if (!fechaDesdeEl || !horaDesdeEl || !fechaHastaEl || !horaHastaEl) return;

    const now = new Date();
    now.setSeconds(0, 0);
    const antes = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    fechaHastaEl.value = formatDateLocal(now);
    horaHastaEl.value = formatTimeLocal(now);
    fechaDesdeEl.value = formatDateLocal(antes);
    horaDesdeEl.value = formatTimeLocal(antes);
}

function formatDateLocal(date) {
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return `${year}-${month}-${day}`;
}

function formatTimeLocal(date) {
    const pad = (value) => String(value).padStart(2, '0');
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${hours}:${minutes}`;
}

function formatTimeLocal(date) {
    const pad = (value) => String(value).padStart(2, '0');
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${hours}:${minutes}`;
}

function mostrarImportPanelComoCajaCard({ numeroCaja, cajaNombre, imported, failed, filtered, pagesScraped, totalInMP, fechaDesde, fechaHasta, nombreImportacion }) {
    if (!panelImportarMp) return;
    panelImportarMp.className = 'caja-card mb-4';
    const titulo = cajaNombre || 'Importación MP';
    const periodo = `${formatearFecha(fechaDesde)} → ${formatearFecha(fechaHasta)}`;
    panelImportarMp.innerHTML = `
        <div class="caja-card-header">
            <div>
                <div class="caja-card-title">${titulo}</div>
                <div class="text-stone-400 text-xs mt-1">
                    Caja #${numeroCaja}${periodo ? ` · ${periodo}` : ''}
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="caja-card-number px-2 py-1 rounded text-xs bg-purple-700 text-purple-100">⬇ Importación MP</span>
            </div>
        </div>
        <div class="caja-card-body">
            <div class="caja-card-item">
                <span class="caja-card-label">Movimientos importados</span>
                <span class="caja-card-value">${imported}</span>
            </div>
            <div class="caja-card-item">
                <span class="caja-card-label">Fallidos</span>
                <span class="caja-card-value">${failed}</span>
            </div>
            <div class="caja-card-item">
                <span class="caja-card-label">Filtradas</span>
                <span class="caja-card-value">${filtered}</span>
            </div>
            <div class="caja-card-item">
                <span class="caja-card-label">Páginas</span>
                <span class="caja-card-value">${pagesScraped}</span>
            </div>
        </div>
        <div class="caja-card-footer">
            <button type="button" id="btn-restaurar-importacion" class="btn btn-sm btn-purple">Nueva importación</button>
            <button type="button" class="btn btn-sm btn-stone" onclick="cargarCajas();">Ver historial</button>
        </div>
    `;
    setTimeout(() => {
        const btn = document.getElementById('btn-restaurar-importacion');
        if (btn) {
            btn.onclick = () => {
                restaurarPanelImportacion();
                if (btnToggleImportar) {
                    panelImportarMp.classList.remove('hidden');
                    btnToggleImportar.innerHTML = '<i class="fas fa-chevron-up mr-1"></i> Ocultar importación';
                }
            };
        }
    }, 0);
}

function attachImportPanelListeners() {
    const btnImportarRetroactivos = document.getElementById('btn-importar-retroactivos');
    if (btnImportarRetroactivos) {
        btnImportarRetroactivos.onclick = importarMovimientosRetroactivos;
    }
    const btnPausarRefresh = document.getElementById('btn-pausar-refresh-mp');
    if (btnPausarRefresh) {
        btnPausarRefresh.onclick = pausarRefreshMP;
    }
}

// Importar movimientos retroactivos con período elegido (auto-crea y cierra la caja)
let _sseSource = null; // Referencia global al EventSource activo

async function importarMovimientosRetroactivos() {
    if (!token) await authenticateAndGetToken();

    const fechaDesdeEl = getRetroactivoFechaDesde();
    const horaDesdeEl = getRetroactivoHoraDesde();
    const fechaHastaEl = getRetroactivoFechaHasta();
    const horaHastaEl = getRetroactivoHoraHasta();
    const nombreImportacion = document.getElementById('retroactivo-nombre')?.value.trim() || '';
    const maxPaginas = 20;

    const fechaDesde = fechaDesdeEl?.value && horaDesdeEl?.value ? `${fechaDesdeEl.value}T${horaDesdeEl.value}` : '';
    const fechaHasta = fechaHastaEl?.value && horaHastaEl?.value ? `${fechaHastaEl.value}T${horaHastaEl.value}` : '';

    // Validar formato HH:mm
    const timePattern = /^[0-2][0-9]:[0-5][0-9]$/;
    if (!timePattern.test(horaDesdeEl?.value || '')) {
        mostrarBanner('⚠️ Formato de hora inválido en Desde. Usa HH:mm (ej: 06:30)', 'warning');
        return;
    }
    if (!timePattern.test(horaHastaEl?.value || '')) {
        mostrarBanner('⚠️ Formato de hora inválido en Hasta. Usa HH:mm (ej: 06:30)', 'warning');
        return;
    }

    if (!fechaDesde || !fechaHasta) {
        mostrarBanner('⚠️ Selecciona fecha y hora de Desde y Hasta', 'warning');
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
    if (nombreImportacion) {
        params.append('nombreCaja', nombreImportacion);
    }
    const url = `/api/cajas/importar-auto-stream?${params}`;

    const source = new EventSource(url);
    let sseEnded = false;
    let cajaCerrada = false;
    let doneReceived = false;
    _sseSource = source;

    source.onopen = () => {
        sseEnded = false;
    };

    source.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'status') {
                agregarLogRetroactivo(data.message);
                if (/^📦 Caja #[0-9]+ cerrada/.test(data.message)) {
                    cajaCerrada = true;
                }

            } else if (data.type === 'warning') {
                agregarLogRetroactivo(`⚠️ ${data.message}`);

            } else if (data.type === 'page_duplicate') {
                agregarLogRetroactivo(`\n🛑 ${data.message}`);
                agregarLogRetroactivo(`   ↳ Las transacciones de páginas anteriores se conservan.`);
                mostrarBanner('⚠️ Scraping detenido: MP redirigió al inicio', 'warning');

            } else if (data.type === 'page_start') {
                const pageLabel = data.maxPages ? `${data.page}/${data.maxPages}` : `${data.page}`;
                agregarLogRetroactivo(`\n━━━ Página ${pageLabel} ━━━`);

            } else if (data.type === 'page_done') {
                const pageLabel = data.maxPages ? `${data.page}/${data.maxPages}` : `${data.page}`;
                let pageMessage = `📄 Página ${pageLabel}: ${data.count} transacciones (total: ${data.total})`;
                if (data.firstTransaction || data.lastTransaction) {
                    const firstDate = data.firstTransaction?.dateTime ? formatearFecha(data.firstTransaction.dateTime) : '';
                    const lastDate = data.lastTransaction?.dateTime ? formatearFecha(data.lastTransaction.dateTime) : '';
                    const firstTitle = (data.firstTransaction?.title || '').substring(0, 30);
                    const lastTitle = (data.lastTransaction?.title || '').substring(0, 30);
                    pageMessage += ` | desde ${firstDate} (${firstTitle}) hasta ${lastDate} (${lastTitle})`;
                }
                agregarLogRetroactivo(pageMessage);

                // Mostrar cada transacción escaneada si el backend las envía
                if (data.transactions && data.transactions.length > 0) {
                    data.transactions.forEach(tx => {
                        const monto = tx.amount;
                        const signo = (typeof monto === 'number' && monto < 0) ? '' : '+';
                        const montoStr = typeof monto === 'number' ? `${signo}$${Math.abs(monto).toLocaleString('es-AR')}` : (monto || '');
                        const fecha = tx.dateTime ? formatearFecha(tx.dateTime) : '';
                        agregarLogRetroactivo(`  ↳ ${fecha} | ${(tx.title || '').substring(0, 35)} | ${montoStr}`);
                    });
                }

            } else if (data.type === 'imported') {
                const signo = data.tx.tipo === 'egreso' ? '-' : '+';
                const fechaImportado = data.tx.createdAt ? formatearFecha(data.tx.createdAt) : '';
                agregarLogRetroactivo(`✅ IMPORTADO: ${signo}$${Math.abs(data.tx.monto).toLocaleString('es-AR')} — ${(data.tx.title || '').substring(0, 40)} ${fechaImportado ? `| ${fechaImportado}` : ''}`);

            } else if (data.type === 'scraping_done') {
                agregarLogRetroactivo(`\n📦 Scraping terminado: ${data.total} tx, ${data.pages} páginas, ${data.navigationErrors} errores`);

            } else if (data.type === 'error') {
                agregarLogRetroactivo(`❌ ERROR: ${data.message}`);
                mostrarBanner('❌ Error: ' + data.message, 'error');
                source.close();
                _sseSource = null;
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download mr-1"></i> Iniciar Importación'; }

            } else if (data.type === 'done') {
                doneReceived = true;
                cajaCerrada = true;
                agregarLogRetroactivo(`\n🎉 ═══════════════════════════════`);
                agregarLogRetroactivo(`   ✅ Importados: ${data.imported}`);
                agregarLogRetroactivo(`   ❌ Fallidos:   ${data.failed}`);
                agregarLogRetroactivo(`   🔍 Filtradas:  ${data.filtered}/${data.totalInMP}`);
                agregarLogRetroactivo(`   📄 Páginas:    ${data.pagesScraped}`);
                if (data.cajaNombre) agregarLogRetroactivo(`   📦 Caja:       ${data.cajaNombre}`);
                agregarLogRetroactivo(`🎉 ═══════════════════════════════`);
                mostrarBanner(`✅ ${data.imported} movimientos importados`, 'success');
                sseEnded = true;
                if (data.cajaId) {
                    mostrarImportPanelComoCajaCard({
                        numeroCaja: data.numeroCaja,
                        cajaNombre: data.cajaNombre,
                        imported: data.imported,
                        failed: data.failed,
                        filtered: data.filtered,
                        pagesScraped: data.pagesScraped,
                        totalInMP: data.totalInMP,
                        fechaDesde,
                        fechaHasta,
                        nombreImportacion
                    });
                }
                source.onerror = null;
                source.onmessage = null;
                source.onopen = null;
                setTimeout(() => {
                    try { source.close(); } catch (e) { }
                    _sseSource = null;
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download mr-1"></i> Iniciar Importación'; }
                }, 150);
                // Recargar listado para mostrar la nueva caja
                setTimeout(() => {
                    if (panelImportarMp) panelImportarMp.classList.add('hidden');
                    if (btnToggleImportar) {
                        btnToggleImportar.innerHTML = '<i class="fas fa-download mr-1"></i> Importar desde MP';
                    }
                    cargarCajas();
                }, 1500);
            }
        } catch (e) {
            console.error('[admin_caja.js] SSE parse error:', e);
        }
    };

    source.onerror = (err) => {
        const isClosed = source.readyState === EventSource.CLOSED || err?.target?.readyState === EventSource.CLOSED;
        if (sseEnded || isClosed) return;

        if (cajaCerrada || doneReceived) {
            agregarLogRetroactivo('✅ Importación completada en el backend. Recargando historial de cajas...');
            mostrarBanner('✅ Importación completada', 'success');
            try { source.close(); } catch (e) { }
            _sseSource = null;
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download mr-1"></i> Iniciar Importación'; }
            setTimeout(() => cargarCajas(), 1500);
            return;
        }

        setTimeout(() => {
            if (sseEnded) return;
            agregarLogRetroactivo('❌ Conexión SSE perdida');
            mostrarBanner('❌ Conexión perdida', 'error');
            try { source.close(); } catch (e) { }
            _sseSource = null;
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download mr-1"></i> Iniciar Importación'; }
        }, 200);
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
if (btnGuardarEvento) btnGuardarEvento.addEventListener('click', guardarEvento);
if (btnCerrarCajaAbierta) btnCerrarCajaAbierta.addEventListener('click', cerrarCajaAbierta);

// Toggle panel de importación MP
const btnToggleImportar = document.getElementById('btn-toggle-importar');
if (btnToggleImportar && panelImportarMp) {
    btnToggleImportar.addEventListener('click', () => {
        panelImportarMp.classList.toggle('hidden');
        btnToggleImportar.innerHTML = panelImportarMp.classList.contains('hidden')
            ? '<i class="fas fa-download mr-1"></i> Importar desde MP'
            : '<i class="fas fa-chevron-up mr-1"></i> Ocultar importación';
    });
}

// Evento para botones dentro del panel de importación MP
attachImportPanelListeners();

// Inicializar
async function inicializar() {
    try {
        console.log('[admin_caja.js] 🚀 Iniciando...');
        inicializarFechasRetroactivas();
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
