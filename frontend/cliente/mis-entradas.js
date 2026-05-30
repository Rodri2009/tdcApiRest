// ============================================================================
// CLIENTE - MIS ENTRADAS - Lógica de Cliente Logueado
// ============================================================================

let currentUser = null;
let currentTickets = [];

// ============================================================================
// 🔐 AUTENTICACIÓN
// ============================================================================

function getCurrentUser() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('⚠️ No hay token, redirigiendo a login');
            window.location.href = '/login.html';
            return null;
        }

        // Decodificar JWT (sin verificación, solo lectura)
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1]));

        return {
            id: payload.id_usuario,
            email: payload.email,
            nombre: payload.email.split('@')[0],
            rol: payload.rol
        };
    } catch (error) {
        console.error('❌ Error al decodificar token:', error);
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
        return null;
    }
}

function logout() {
    if (confirm('¿Está seguro de que desea cerrar sesión?')) {
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
    }
}

// ============================================================================
// 📊 FUNCIONES PRINCIPALES
// ============================================================================

async function loadUserInfo() {
    try {
        currentUser = getCurrentUser();
        if (!currentUser) return;

        document.getElementById('userName').textContent = currentUser.email;
        document.getElementById('userEmail').textContent = `Usuario: ${currentUser.rol}`;

        console.log('✅ Usuario cargado:', currentUser.email);
    } catch (error) {
        console.error('❌ Error cargando usuario:', error);
        showError('Error al cargar información del usuario');
    }
}

async function fetchMyTickets() {
    try {
        showLoader(true);
        const token = localStorage.getItem('authToken');

        const response = await fetch('/api/tickets/me', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        currentTickets = Array.isArray(data) ? data : (data.tickets || []);

        console.log(`✅ ${currentTickets.length} entradas cargadas`);
        showLoader(false);

        if (currentTickets.length === 0) {
            renderEmptyState();
        } else {
            renderTickets();
        }
    } catch (error) {
        console.error('❌ Error cargando entradas:', error);
        showLoader(false);
        showError('No se pudieron cargar tus entradas. Intenta nuevamente.');
        renderEmptyState();
    }
}

// ============================================================================
// 🎨 RENDERIZACIÓN
// ============================================================================

function renderTickets() {
    const container = document.getElementById('entradasContainer');

    if (currentTickets.length === 0) {
        renderEmptyState();
        return;
    }

    let html = `
        <div class="grid gap-4">
            <!-- Resumen -->
            <div class="card">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-xl font-bold mb-2">Tus Entradas</h2>
                        <p class="text-gray-400">Total: <span class="text-secondary font-bold">${currentTickets.length}</span> entrada(s)</p>
                    </div>
                    <i class="fas fa-ticket text-4xl" style="color: var(--secondary); opacity: 0.3;"></i>
                </div>
            </div>

            <!-- Tabla de Entradas -->
            <div class="card overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full table-responsive">
                        <thead class="table-header">
                            <tr>
                                <th class="text-left py-3 px-4 font-semibold">Evento</th>
                                <th class="text-left py-3 px-4 font-semibold">Cantidad</th>
                                <th class="text-left py-3 px-4 font-semibold">Tipo</th>
                                <th class="text-right py-3 px-4 font-semibold">Monto</th>
                                <th class="text-center py-3 px-4 font-semibold">Estado</th>
                                <th class="text-left py-3 px-4 font-semibold">Fecha Compra</th>
                                <th class="text-center py-3 px-4 font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${currentTickets.map((ticket, idx) => `
                                <tr class="table-row border-b border-gray-700">
                                    <td class="py-3 px-4">
                                        <div class="font-semibold">${escapeHtml(ticket.evento_nombre || ticket.nombre_banda || 'Evento')}</div>
                                        <div class="text-xs text-gray-400">${formatDate(ticket.fecha_evento || '')}</div>
                                    </td>
                                    <td class="py-3 px-4 font-semibold">${ticket.cantidad}</td>
                                    <td class="py-3 px-4">
                                        <span class="text-sm font-medium">${ticket.tipo_precio || 'GENERAL'}</span>
                                    </td>
                                    <td class="py-3 px-4 text-right font-semibold">${formatCurrency(ticket.total)}</td>
                                    <td class="py-3 px-4 text-center">
                                        ${getStatusBadge(ticket.estado)}
                                    </td>
                                    <td class="py-3 px-4 text-sm">
                                        ${formatDateTime(ticket.comprado_en)}
                                    </td>
                                    <td class="py-3 px-4 text-center">
                                        <button 
                                            class="btn-secondary" 
                                            onclick="showTicketDetails(${idx})"
                                            title="Ver detalles"
                                        >
                                            <i class="fas fa-info-circle mr-1"></i> Ver
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Nota Importante -->
            <div class="card bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-700/30">
                <div class="flex gap-3">
                    <i class="fas fa-info-circle text-yellow-500 mt-1 flex-shrink-0"></i>
                    <div>
                        <h3 class="font-semibold text-yellow-400 mb-1">Información Importante</h3>
                        <p class="text-sm text-gray-300">
                            Presenta tu código de confirmación en la puerta del evento. El código está en tu email.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderEmptyState() {
    const container = document.getElementById('entradasContainer');
    container.innerHTML = `
        <div class="card">
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h2 class="text-xl font-bold mb-2 mt-4">No tienes entradas aún</h2>
                <p class="text-gray-400 mb-6">
                    Compra entradas para los próximos eventos y aparecerán aquí.
                </p>
                <a href="/checkout_form.html" class="btn-primary inline-block">
                    <i class="fas fa-plus mr-2"></i> Comprar Entradas
                </a>
            </div>
        </div>
    `;
}

function showTicketDetails(index) {
    const ticket = currentTickets[index];

    let detailsHtml = `
        <div style="background: rgba(0,0,0,0.8); position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 1000;" onclick="closeModal(event)">
            <div style="background: var(--dark); border: 1px solid rgba(240,171,252,0.2); border-radius: 12px; padding: 30px; max-width: 500px; width: 90%; box-shadow: 0 0 40px rgba(240,171,252,0.1);" onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: var(--secondary); font-size: 24px; font-weight: bold;">Detalles del Ticket</h2>
                    <button onclick="closeModal()" style="background: none; border: none; color: var(--secondary); font-size: 24px; cursor: pointer;">×</button>
                </div>

                <div style="background: rgba(88,28,135,0.1); border: 1px solid rgba(240,171,252,0.2); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="margin-bottom: 10px;">
                        <label style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Evento</label>
                        <p style="color: white; font-weight: 600; margin-top: 5px;">${escapeHtml(ticket.evento_nombre || ticket.nombre_banda || 'Evento')}</p>
                    </div>

                    <div style="margin-bottom: 10px;">
                        <label style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Código de Confirmación</label>
                        <p style="color: var(--secondary); font-weight: 600; font-family: monospace; margin-top: 5px; font-size: 16px;">${escapeHtml(ticket.codigo_confirmacion || 'N/A')}</p>
                    </div>

                    <div style="margin-bottom: 10px;">
                        <label style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Cantidad</label>
                        <p style="color: white; font-weight: 600; margin-top: 5px;">${ticket.cantidad} entrada(s)</p>
                    </div>

                    <div style="margin-bottom: 10px;">
                        <label style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Tipo</label>
                        <p style="color: white; font-weight: 600; margin-top: 5px;">${ticket.tipo_precio || 'GENERAL'}</p>
                    </div>

                    <div style="margin-bottom: 10px;">
                        <label style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Monto Pagado</label>
                        <p style="color: var(--secondary); font-weight: 600; margin-top: 5px; font-size: 18px;">${formatCurrency(ticket.total)}</p>
                    </div>

                    <div style="margin-bottom: 10px;">
                        <label style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Estado</label>
                        <p style="margin-top: 5px;">${getStatusBadge(ticket.estado)}</p>
                    </div>

                    <div>
                        <label style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Fecha de Compra</label>
                        <p style="color: white; font-weight: 600; margin-top: 5px;">${formatDateTime(ticket.comprado_en)}</p>
                    </div>
                </div>

                <div style="background: rgba(249,115,22,0.1); border-left: 4px solid var(--secondary); padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <p style="color: #9ca3af; font-size: 13px;">
                        <i class="fas fa-lightbulb" style="color: var(--secondary); margin-right: 8px;"></i>
                        Presenta este código en la puerta del evento para confirmar tu asistencia.
                    </p>
                </div>

                <div style="display: grid; gap: 10px;">
                    <button class="btn-primary" onclick="downloadTicket('${escapeHtml(ticket.codigo_confirmacion)}')">
                        <i class="fas fa-download mr-2"></i> Descargar Comprobante
                    </button>
                    <button class="btn-primary" onclick="copyToClipboard('${escapeHtml(ticket.codigo_confirmacion)}')">
                        <i class="fas fa-copy mr-2"></i> Copiar Código
                    </button>
                    ${ticket.estado === 'pagado' ? `
                        <button class="btn-secondary" onclick="requestRefund(${currentTickets.indexOf(ticket)})" style="color: #ef4444; border-color: #ef4444;">
                            <i class="fas fa-undo mr-1"></i> Solicitar Devolución
                        </button>
                    ` : ''}
                    <button class="btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times mr-1"></i> Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', detailsHtml);
}

function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.querySelector('[onclick*="closeModal"]').parentElement;
    modal.parentElement.remove();
}

function downloadTicket(codigo) {
    // Placeholder para descarga
    showSuccess(`Función de descarga disponible próximamente`);
}

function copyToClipboard(codigo) {
    navigator.clipboard.writeText(codigo).then(() => {
        showSuccess('Código copiado al portapapeles');
    }).catch(err => {
        console.error('Error al copiar:', err);
    });
}

function requestRefund(index) {
    showSuccess('Las devoluciones estarán disponibles próximamente. Por favor contacta a soporte.');
    // Integración con FASE 3 en el futuro
}

// ============================================================================
// 🎨 UTILIDADES & HELPERS
// ============================================================================

function getStatusBadge(status) {
    const badges = {
        'pagado': '<span class="badge-pagado px-3 py-1 rounded-full text-xs font-semibold">✓ Pagado</span>',
        'utilizado': '<span class="badge-utilizado px-3 py-1 rounded-full text-xs font-semibold">✓ Utilizado</span>',
        'cancelado': '<span class="badge-cancelado px-3 py-1 rounded-full text-xs font-semibold">✗ Cancelado</span>',
        'pendiente': '<span class="badge-pendiente px-3 py-1 rounded-full text-xs font-semibold">⏳ Pendiente</span>'
    };
    return badges[status] || `<span class="text-gray-400 text-xs">${status}</span>`;
}

function formatCurrency(value) {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    }).format(value);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }) + ' ' + date.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showLoader(show) {
    const loader = document.getElementById('loader');
    if (show) {
        loader.classList.add('active');
    } else {
        loader.classList.remove('active');
    }
}

function showError(message) {
    const banner = document.getElementById('errorBanner');
    const messageEl = document.getElementById('errorMessage');
    messageEl.textContent = message;
    banner.classList.add('active');
    setTimeout(() => banner.classList.remove('active'), 5000);
}

function showSuccess(message) {
    const banner = document.getElementById('successBanner');
    const messageEl = document.getElementById('successMessage');
    messageEl.textContent = message;
    banner.classList.add('active');
    setTimeout(() => banner.classList.remove('active'), 5000);
}

// ============================================================================
// 🚀 INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Mis Entradas...');
    loadUserInfo();
    fetchMyTickets();
});
