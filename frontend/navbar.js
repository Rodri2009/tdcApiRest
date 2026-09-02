/**
 * navbar.js - Componente de navegación dinámico y reutilizable
 * Inyecta un navbar en las páginas según el estado de autenticación del usuario
 * Soporta sistema de roles y permisos
 */

console.log('%c[NAVBAR] ✅ navbar.js cargado exitosamente', 'color: green; font-weight: bold; font-size: 14px;');

class NavbarManager {
    constructor() {
        console.log('[NAVBAR_DEBUG] NavbarManager constructor ejecutado');
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userRole = null;
        this.userRoles = [];
        this.userPermisos = [];
        this.userNivel = 0;
        this.jwtToken = localStorage.getItem('authToken') || localStorage.getItem('token');

        console.log('[NAVBAR_DEBUG] JWT Token encontrado:', !!this.jwtToken);

        if (this.jwtToken) {
            const tokenMeta = this.getTokenMeta(this.jwtToken);
            if (tokenMeta.isMpOnlyToken) {
                console.warn('[NAVBAR_DEBUG] Token detectado como MP legacy. Se ignora para la sesión del usuario.');
                this.clearAuth();
                return;
            }

            this.isAuthenticated = true;
            console.log('[NAVBAR_DEBUG] Usuario autenticado');
            // Decodificar el JWT para obtener datos del usuario
            this.decodeJWT();
            // Guardar datos en localStorage para acceso rápido
            localStorage.setItem('userPermisos', JSON.stringify(this.userPermisos));
            localStorage.setItem('userRoles', JSON.stringify(this.userRoles));
            localStorage.setItem('userRole', this.userRole);
            localStorage.setItem('userEmail', this.userEmail);
            localStorage.setItem('userName', this.userName);
            localStorage.setItem('userNivel', this.userNivel);

            // Detectar si estamos en página de admin pero el rol es bajo
            // No se debe limpiar la sesión aquí: si el usuario tiene un token válido pero no
            // tiene acceso de staff, solo debe redirigirse a inicio sin desloguearlo.
            const isStaffPage = /\/(admin\.html|admin_|editar_|config_)/.test(window.location.pathname);
            if (isStaffPage && !this.tieneAccesoStaff()) {
                console.warn('⚠️ Usuario autenticado sin acceso de staff en página admin: nivel=' + this.userNivel + ', role=' + this.userRole);
                console.log('🔄 Redirigiendo a inicio sin borrar la sesión actual');
                window.location.href = '/index.html';
            }
        } else {
            console.log('[NAVBAR_DEBUG] Usuario NO autenticado');
        }
    }

    getTokenMeta(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            const payload = JSON.parse(jsonPayload);
            const isMpOnlyToken = !!payload.permissions && !payload.id_usuario && !payload.roles && !payload.nivel && !payload.nombre;
            return { payload, isMpOnlyToken };
        } catch (error) {
            return { payload: null, isMpOnlyToken: false };
        }
    }

    /**
     * Decodifica el JWT sin verificar la firma (solo para leer datos en frontend)
     */
    decodeJWT() {
        console.log('[NAVBAR_DEBUG] decodeJWT() iniciado');
        try {
            const base64Url = this.jwtToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            const payload = JSON.parse(jsonPayload);
            if (payload.permissions && !payload.id_usuario && !payload.roles && !payload.nivel && !payload.nombre) {
                console.warn('[NAVBAR_DEBUG] JWT detectado como token MP legacy; se invalida para la sesión app.');
                this.clearAuth();
                return;
            }

            const rawRoles = Array.isArray(payload.roles)
                ? payload.roles
                : Array.isArray(payload.userRoles)
                    ? payload.userRoles
                    : [];
            const legacyRole = payload.role || payload.userRole || payload.rol || '';
            const normalizedRoles = [...rawRoles, legacyRole]
                .filter(Boolean)
                .map(r => String(r).trim())
                .filter((r, index, arr) => arr.findIndex(item => String(item).toLowerCase() === String(r).toLowerCase()) === index);

            this.userEmail = payload.email || payload.id || 'Usuario';
            this.userName = payload.nombre || payload.email || 'Usuario';
            this.clientId = payload.id_cliente || null;
            this.userRole = String(legacyRole || normalizedRoles[0] || 'user').trim();

            console.log('[JWT_DECODE] ===== DECODIFICACION JWT =====');
            console.log('[JWT_DECODE] Payload completo:', JSON.stringify(payload));
            console.log('[JWT_DECODE] id_usuario:', payload.id_usuario);
            console.log('[JWT_DECODE] id_cliente (del JWT):', payload.id_cliente);
            console.log('[JWT_DECODE] id_cliente (asignado this.clientId):', this.clientId);
            console.log('[JWT_DECODE] nombre:', payload.nombre);
            console.log('[JWT_DECODE] email:', payload.email);

            this.userRoles = normalizedRoles;
            this.userPermisos = Array.isArray(payload.permisos)
                ? payload.permisos
                : Array.isArray(payload.permissions)
                    ? payload.permissions
                    : (Array.isArray(payload.userPermisos) ? payload.userPermisos : []);

            const roleLower = String(this.userRole || '').toLowerCase();
            const roleLevelMap = {
                admin: 100,
                super_admin: 100,
                staff: 50,
                staff_readonly: 50,
                cliente: 10,
                client: 10,
                user: 0
            };
            const inferredNivel = Number(payload.nivel ?? payload.userNivel ?? roleLevelMap[roleLower] ?? 0);
            this.userNivel = Number.isFinite(inferredNivel) ? inferredNivel : 0;

            console.log('[NAVBAR_DEBUG] decodeJWT() - userRoles:', this.userRoles);
            console.log('[NAVBAR_DEBUG] decodeJWT() - userNivel:', this.userNivel);
        } catch (error) {
            console.error('Error decodificando JWT:', error);
            console.error('[NAVBAR_DEBUG] Error en decodeJWT:', error.message);
            this.clearAuth();
        }
    }

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    tienePermiso(permiso) {
        // SUPER_ADMIN o admin tienen todos los permisos
        const roles = (this.userRoles || []).map(r => String(r).toLowerCase());
        const role = String(this.userRole || '').toLowerCase();
        if (roles.includes('super_admin') || roles.includes('admin') || role === 'super_admin' || role === 'admin') return true;
        return (this.userPermisos || []).includes(permiso);
    }

    /**
     * Verifica si el usuario tiene alguno de los permisos
     */
    tieneAlgunPermiso(permisos) {
        const roles = (this.userRoles || []).map(r => String(r).toLowerCase());
        const role = String(this.userRole || '').toLowerCase();
        if (roles.includes('super_admin') || roles.includes('admin') || role === 'super_admin' || role === 'admin') return true;
        return (permisos || []).some(p => (this.userPermisos || []).includes(p));
    }

    /**
     * Verifica si el usuario tiene un rol específico
     */
    tieneRol(rol) {
        const target = String(rol || '').toLowerCase();
        const roles = (this.userRoles || []).map(r => String(r).toLowerCase());
        const current = String(this.userRole || '').toLowerCase();
        return roles.includes(target) || current === target;
    }

    /**
     * Verifica si el usuario tiene nivel mínimo
     */
    tieneNivel(nivelMinimo) {
        return Number(this.userNivel || 0) >= Number(nivelMinimo || 0);
    }

    /**
     * Verifica si el usuario tiene acceso de staff/admin
     */
    tieneAccesoStaff() {
        const nivel = Number(this.userNivel || 0);
        const role = String(this.userRole || '').toLowerCase();
        const roles = (this.userRoles || []).map(r => String(r).toLowerCase());
        const staffRoles = ['admin', 'super_admin', 'staff', 'staff_readonly'];

        return nivel >= 50
            || staffRoles.includes(role)
            || roles.some(r => staffRoles.includes(String(r).toLowerCase()));
    }

    /**
     * Limpia los datos de autenticación
     */
    clearAuth() {
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userName = null;
        this.userRole = null;
        this.userRoles = [];
        this.userPermisos = [];
        this.userNivel = 0;
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('userPermisos');
        localStorage.removeItem('userRoles');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userNivel');
    }

    /**
     * Cierra sesión del usuario
     */
    logout() {
        this.clearAuth();
        // Redirigir a login
        window.location.href = '/login.html';
    }

    /**
     * Genera el HTML de la barra de navegación
     */
    generateNavbarHTML() {
        // DEBUG: Logs para depuración
        console.log('[NAVBAR_DEBUG] ===== GENERANDO NAVBAR =====');
        console.log('[NAVBAR_DEBUG] URL actual:', window.location.pathname);
        console.log('[NAVBAR_DEBUG] isAuthenticated:', this.isAuthenticated);
        console.log('[NAVBAR_DEBUG] userEmail:', this.userEmail);
        console.log('[NAVBAR_DEBUG] userRoles:', this.userRoles);

        // Inyectar estilos CSS si no existen
        if (!document.getElementById('navbar-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'navbar-styles';
            styleElement.textContent = `
                :root {
                    --color-primary: #581c87;
                    --color-secondary: #f0abfc;
                    --color-rustic: #44403c;
                }
                
                .text-neon {
                    color: var(--color-secondary);
                    text-shadow: 0 0 5px var(--color-secondary), 0 0 10px var(--color-secondary);
                }
                
                .bg-rustic {
                    background-color: var(--color-rustic);
                }

                /* Navbar positioning - override any conflicting styles */
                header.bg-rustic {
                    position: sticky !important;
                    top: 0;
                    z-index: 1280; /* Tailwind z-50 = z-index: 1280 */
                    margin: 0 !important;
                    padding: 0 !important;
                }

                /* Avatar styles */
                .user-avatar {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    font-weight: bold;
                    font-size: 16px;
                    color: #0c0a09;
                    text-transform: uppercase;
                    box-shadow: 0 2px 8px rgba(240, 171, 252, 0.3);
                    border: 2px solid var(--color-secondary);
                }

                .user-avatar.admin {
                    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
                }

                .user-avatar.staff {
                    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
                }

                .user-avatar.staff-readonly {
                    background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
                    opacity: 0.9;
                    border-width: 3px;
                    border-style: dashed;
                }

                .user-avatar.operador {
                    background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%);
                }

                .user-avatar.viewer {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                }

                .user-avatar.default {
                    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
                }

                .navbar-btn-user {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 0px 16px;
                    border-radius: 50px;
                    background: rgba(240, 171, 252, 0.05);
                    border: 1.5px solid var(--color-secondary);
                    color: var(--color-secondary);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 200ms ease;
                    font-size: 14px;
                }

                .navbar-btn-user:hover {
                    background: rgba(240, 171, 252, 0.15);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(240, 171, 252, 0.25);
                }

                .admin-panel-badge {
                    display: inline-flex;
                    align-items: center;
                    /*gap: 8px;*/
                    padding: 0px 16px;
                    background: linear-gradient(135deg, #f0abfc 0%, #ec4899 100%);
                    color: #0c0a09;
                    border-radius: 50px;
                    font-weight: 700;
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    box-shadow: 0 4px 15px rgba(240, 171, 252, 0.3);
                }
            `;
            document.head.appendChild(styleElement);
        }

        // Detectar si es página de staff (admin.html, admin_, editar_, config_)
        const isStaffPage = /\/(admin\.html|admin_|editar_|config_)/.test(window.location.pathname);

        console.log('[NAVBAR_DEBUG] Regex test para isStaffPage:', /\/(admin\.html|admin_|editar_|config_)/.test(window.location.pathname));
        console.log('[NAVBAR_DEBUG] isStaffPage:', isStaffPage);

        // El botón "Panel Admin" se muestra en todas las páginas de staff
        const isAdminPage = isStaffPage;
        console.log('[NAVBAR_DEBUG] isAdminPage:', isAdminPage);
        console.log('[NAVBAR_DEBUG] Mostrando badge "Panel Admin":', isAdminPage);
        const adminPageBadge = isAdminPage ? `
            <div class="flex items-center gap-3">
                <a href="/index.html" class="hover:opacity-80 transition" title="Ir a inicio">
                    <img src="./img/logo_transparente.png" alt="El Templo de Claypole" class="h-10 w-auto">
                </a>
                <div class="admin-panel-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L15.09 8.26H22L17.55 12.79L19.64 19.04L12 14.77L4.36 19.04L6.45 12.79L2 8.26H8.91L12 2Z"></path>
                    </svg>
                    Panel Admin
                </div>
            </div>
        ` : '';

        console.log('[NAVBAR_DEBUG] adminPageBadge HTML generado:', adminPageBadge ? 'SÍ - Badge visible' : 'NO - Badge oculto');

        const logoHTML = isAdminPage ? adminPageBadge : `
            <a href="/index.html" class="flex items-center space-x-3 hover:opacity-80 transition">
                <img src="./img/logo_transparente.png" alt="El Templo de Claypole" class="h-10 w-auto">
                <span class="text-base font-semibold text-neon tracking-wide hidden sm:block">
                    El Templo de Claypole
                </span>
            </a>
        `;

        let authButtonsHTML;

        if (!this.isAuthenticated) {
            // Botón Login para usuarios no autenticados
            authButtonsHTML = `
                <a href="/login.html" 
                   class="px-4 py-2 rounded-full font-semibold bg-fuchsia-500 text-gray-900 hover:bg-fuchsia-400 transition duration-150">
                    Login
                </a>
            `;
        } else if (isStaffPage) {
            // Menú completo SOLO para páginas de staff (admin_, editar_, config_)
            const menuItems = this.generateMenuItems();

            // Obtener rol principal para mostrar
            const rolPrincipal = this.userRoles[0] || 'Usuario';

            // Obtener iniciales del usuario
            const iniciales = this.userName
                .split(' ')
                .slice(0, 2)
                .map(n => n.charAt(0))
                .join('')
                .toUpperCase();

            // Determinar clase de avatar según rol
            let avatarClass = 'default';
            if (rolPrincipal === 'SUPER_ADMIN' || rolPrincipal === 'ADMIN' || rolPrincipal === 'admin') avatarClass = 'admin';
            else if (rolPrincipal === 'STAFF' || rolPrincipal === 'staff') avatarClass = 'staff';
            else if (rolPrincipal === 'STAFF_READONLY' || rolPrincipal === 'staff_readonly') avatarClass = 'staff-readonly';
            else if (rolPrincipal === 'OPERADOR') avatarClass = 'operador';
            else if (rolPrincipal === 'VIEWER') avatarClass = 'viewer';

            authButtonsHTML = `
                <!-- Botón Admin (Desktop) / Hamburguesa (Mobile) -->
                <div class="flex relative" id="admin-dropdown-container" style="display: none;">
                    <style>
                        @media (min-width: 768px) {
                            #admin-dropdown-container {
                                display: flex !important;
                            }
                        }
                        @media (max-width: 767px) {
                            #admin-dropdown-container {
                                display: none !important;
                            }
                        }
                    </style>
                    <!-- Botón Usuario con Avatar -->
                    <button id="admin-dropdown-btn" class="navbar-btn-user">
                        <div class="user-avatar ${avatarClass}">${iniciales}</div>
                        <div class="flex flex-col items-start">
                            <span class="text-sm font-bold">${this.userName}</span>
                        </div>
                        <!-- <svg id="admin-dropdown-arrow" class="w-4 h-4 transition ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="transform: rotate(0deg) scaleY(0.7);">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                        </svg> -->
                    </button>

                    <!-- Dropdown Menu -->
                    <div id="admin-dropdown-menu" class="absolute right-0 w-64 bg-stone-800 rounded-lg shadow-xl border border-stone-700 transition-all duration-200 z-50" style="top: 100%; padding-top: 8px; display: none; opacity: 0; visibility: hidden;">
                        <div class="p-4 border-b border-stone-700 bg-stone-900 rounded-t-lg">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="user-avatar ${avatarClass}">${iniciales}</div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-bold text-white truncate">${this.userName}</p>
                                    <p class="text-xs text-stone-400 truncate">${this.userEmail}</p>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-1 mt-2">
                                ${this.userRoles.map(rol => `<span class="inline-block px-2 py-1 text-xs font-semibold bg-fuchsia-600 text-white rounded">${this.formatRolName(rol)}</span>`).join('')}
                            </div>
                        </div>

                        <nav class="py-2">
                            ${menuItems}
                        </nav>

                        <div class="border-t border-stone-700 p-2">
                            <button onclick="navbarManager.logout()" 
                                    class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900 hover:text-white transition rounded">
                                🚪 Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Botón Hamburguesa (Móvil) -->
                <button id="mobile-menu-button" 
                        class="md:hidden p-2 rounded-md hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-neon transform transition">
                    <svg class="h-6 w-6 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
                
            `;
        } else {
            // Para páginas de CLIENTE: solo mostrar usuario y botón salir (sin menú de administración)
            const iniciales = this.userName
                .split(' ')
                .slice(0, 2)
                .map(n => n.charAt(0))
                .join('')
                .toUpperCase();

            authButtonsHTML = `
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2">
                        <div class="user-avatar">${iniciales}</div>
                        <span class="hidden sm:inline text-sm font-semibold text-neon">${this.userName}</span>
                    </div>
                    <button onclick="navbarManager.logout()" 
                            class="px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-900 hover:text-white transition rounded">
                        Salir
                    </button>
                </div>
            `;
        }

        return `
            <header class="bg-rustic sticky top-0 z-50 shadow-lg">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        ${logoHTML}
                        ${authButtonsHTML}
                    </div>
                </div>
                <!-- Menú Móvil Desplegable (solo para staff) -->
                ${this.isAuthenticated && isStaffPage ? `
                <div id="mobile-menu" class="hidden">
                    <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-rustic">
                        ${this.generateMenuItems()}
                        <button onclick="navbarManager.logout()" 
                                class="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-red-900 hover:text-white transition">
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </div>
                ` : ''}
            </header>
        `;
    }

    /**
     * Genera los items del menú según permisos del usuario
     */
    generateMenuItems() {
        const items = [];

        // Panel Principal - todos los autenticados
        items.push(this.menuItem('/admin.html', '📋', 'Panel Principal'));

        // Solicitudes
        items.push(this.menuItem('/admin_solicitudes.html', '📝', 'Solicitudes'));

        // Agenda
        items.push(this.menuItem('/admin_agenda.html', '📅', 'Agenda'));

        // Personal
        items.push(this.menuItem('/admin_personal.html', '👥', 'Personal'));

        // Configuración (submenú)
        const configItems = [];
        configItems.push(this.menuItem('/config_alquiler.html', '🏠', 'Alquiler de Salón', true));
        configItems.push(this.menuItem('/config_talleres.html', '🎨', 'Talleres', true));
        configItems.push(this.menuItem('/config_servicios.html', '✨', 'Servicios', true));
        configItems.push(this.menuItem('/config_bandas.html', '🎸', 'Bandas', true));

        if (configItems.length > 0) {
            items.push(`
                <div class="px-4 py-1 text-xs text-stone-500 uppercase tracking-wider">Configuración</div>
                ${configItems.join('')}
            `);
        }

        // Usuarios
        items.push(`<div class="border-t border-stone-700 my-1"></div>`);
        items.push(this.menuItem('/admin_usuarios_clientes.html', '👥', 'Usuarios y Clientes'));

        return items.join('');
    }

    /**
     * Genera HTML de un item de menú
     */
    menuItem(href, emoji, text, isSubitem = false) {
        const padding = isSubitem ? 'pl-8' : 'px-3';
        return `
            <a href="${href}" 
               class="block ${padding} py-2 rounded-md text-base font-medium text-stone-300 hover:bg-stone-700 hover:text-neon transition">
                ${emoji} ${text}
            </a>
        `;
    }

    /**
     * Obtiene emoji para un rol
     */
    getRolEmoji(rol) {
        const emojis = {
            'SUPER_ADMIN': '🔑',
            'ADMIN': '⚙️',
            'OPERADOR': '📋',
            'VIEWER': '👁️'
        };
        return emojis[rol] || '👤';
    }

    /**
     * Formatea nombre del rol
     */
    formatRolName(rol) {
        const nombres = {
            'SUPER_ADMIN': 'Super Admin',
            'ADMIN': 'Admin',
            'OPERADOR': 'Operador',
            'VIEWER': 'Viewer'
        };
        return nombres[rol] || rol;
    }

    /**
     * Inyecta el navbar en la página
     * @param {string} selector - Selector CSS donde inyectar el navbar (ej: 'body')
     */
    injectNavbar(selector = 'body') {
        console.log('[NAVBAR_DEBUG] injectNavbar() - Selector:', selector);
        const container = document.querySelector(selector);
        if (!container) {
            console.error(`No se encontró elemento con selector: ${selector}`);
            return;
        }

        const navbarHTML = this.generateNavbarHTML();
        console.log('[NAVBAR_DEBUG] injectNavbar() - HTML generado, longitud:', navbarHTML.length);
        container.insertAdjacentHTML('afterbegin', navbarHTML);
        console.log('[NAVBAR_DEBUG] injectNavbar() - Navbar inyectado en DOM');

        // Configurar dropdown menu si está autenticado
        if (this.isAuthenticated) {
            console.log('[NAVBAR_DEBUG] injectNavbar() - Configurando dropdown menu');
            this.setupDropdownMenu();
        }
    }

    /**
     * Configura el dropdown menu del admin con event listeners
     */
    setupDropdownMenu() {
        // Configurar dropdown desktop
        const dropdownBtn = document.getElementById('admin-dropdown-btn');
        const dropdownMenu = document.getElementById('admin-dropdown-menu');
        const dropdownArrow = document.getElementById('admin-dropdown-arrow');

        if (dropdownBtn && dropdownMenu) {
            // Toggle del dropdown al hacer click
            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = dropdownMenu.style.display !== 'none';
                if (isVisible) {
                    this.closeDropdown(dropdownMenu, dropdownArrow);
                } else {
                    this.openDropdown(dropdownMenu, dropdownArrow);
                }
            });

            // Cerrar dropdown al hacer click fuera
            document.addEventListener('click', (e) => {
                const container = document.getElementById('admin-dropdown-container');
                if (container && !container.contains(e.target)) {
                    this.closeDropdown(dropdownMenu, dropdownArrow);
                }
            });

            // Cerrar dropdown al hacer click en algún item del menú
            const menuItems = dropdownMenu.querySelectorAll('a');
            menuItems.forEach(item => {
                item.addEventListener('click', () => {
                    this.closeDropdown(dropdownMenu, dropdownArrow);
                });
            });
        }

        // Configurar menú móvil (hamburguesa)
        const mobileMenuBtn = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });

            // Cerrar menú móvil al hacer click en un link
            const mobileLinks = mobileMenu.querySelectorAll('a');
            mobileLinks.forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.add('hidden');
                });
            });

            // Cerrar menú móvil al hacer click en logout
            const logoutBtn = mobileMenu.querySelector('button');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    mobileMenu.classList.add('hidden');
                });
            }
        }
    }

    /**
     * Abre el dropdown menu
     */
    openDropdown(dropdownMenu, dropdownArrow) {
        dropdownMenu.style.display = 'block';
        setTimeout(() => {
            dropdownMenu.style.opacity = '1';
            dropdownMenu.style.visibility = 'visible';
            if (dropdownArrow) {
                dropdownArrow.style.transform = 'rotate(180deg) scaleY(0.7)';
            }
        }, 10);
    }

    /**
     * Cierra el dropdown menu
     */
    closeDropdown(dropdownMenu, dropdownArrow) {
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.visibility = 'hidden';
        if (dropdownArrow) {
            dropdownArrow.style.transform = 'rotate(0deg) scaleY(0.7)';
        }
        setTimeout(() => {
            dropdownMenu.style.display = 'none';
        }, 200);
    }

    /**
     * Verifica si el token JWT ha expirado
     */
    isTokenExpired() {
        if (!this.jwtToken) return true;

        try {
            const base64Url = this.jwtToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            const payload = JSON.parse(jsonPayload);

            // Verificar si tiene campo exp y si ha expirado
            if (payload.exp) {
                const now = Math.floor(Date.now() / 1000);
                return payload.exp < now;
            }
            return false; // Si no tiene exp, asumimos que no expira
        } catch (error) {
            console.error('Error verificando expiración del token:', error);
            return true; // En caso de error, consideramos expirado
        }
    }

    /**
     * Protege una página admin: redirige a login si no está autenticado o token expirado
     */
    protectAdminPage() {
        // Verificar si hay token y si no ha expirado
        if (!this.isAuthenticated || this.isTokenExpired()) {
            console.warn('Acceso denegado: usuario no autenticado o sesión expirada');
            this.clearAuth(); // Limpiar datos de autenticación
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        return true;
    }

    /**
     * Protege una página que requiere un permiso específico
     */
    protectWithPermiso(permiso) {
        if (!this.protectAdminPage()) return false;

        if (!this.tienePermiso(permiso)) {
            console.warn(`Acceso denegado: usuario no tiene permiso '${permiso}'`);
            alert('No tienes permisos para acceder a esta página.');
            window.location.href = '/admin.html';
            return false;
        }
        return true;
    }

    /**
     * Verifica si el usuario es admin (legacy - usar tieneRol o tienePermiso)
     */
    isAdmin() {
        const role = String(this.userRole || '').toLowerCase();
        const roles = (this.userRoles || []).map(r => String(r).toLowerCase());
        return this.isAuthenticated && (role === 'admin' || role === 'super_admin' || roles.includes('admin') || roles.includes('super_admin'));
    }
}

// Variable global para que el botón de logout funcione
let navbarManager = null;

/**
 * IMPORTANTE: Este archivo NO se auto-inicializa.
 * Cada página debe instanciar NavbarManager explícitamente.
 * 
 * Uso en páginas admin:
 *   <script src="/navbar.js"></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', () => {
 *       navbarManager = new NavbarManager();
 *       navbarManager.protectAdminPage();
 *       navbarManager.injectNavbar('body');
 *     });
 *   </script>
 * 
 * Para proteger con permiso específico:
 *   navbarManager.protectWithPermiso('usuarios.ver');
 * 
 * Para verificar permisos en código:
 *   if (navbarManager.tienePermiso('solicitudes.editar')) { ... }
 */

// ============================================================
// FUNCIONES HELPER GLOBALES PARA PERMISOS
// ============================================================

/**
 * Verifica si el usuario tiene un permiso específico
 * @param {string} permiso - El permiso a verificar (ej: 'config.alquiler')
 * @returns {boolean}
 */
function tienePermiso(permiso) {
    return navbarManager && navbarManager.tienePermiso(permiso);
}

/**
 * Verifica si el usuario tiene alguno de los permisos
 * @param {string[]} permisos - Array de permisos
 * @returns {boolean}
 */
function tieneAlgunPermiso(permisos) {
    return navbarManager && navbarManager.tieneAlgunPermiso(permisos);
}

/**
 * Verifica si el usuario puede editar (tiene permisos de escritura)
 * @param {string} modulo - El módulo (config, solicitudes, personal, etc)
 * @returns {boolean}
 */
function puedeEditar(modulo) {
    if (!navbarManager) return false;
    // SUPER_ADMIN, ADMIN, admin pueden editar todo
    if (navbarManager.tieneRol('SUPER_ADMIN') || navbarManager.tieneRol('ADMIN') || navbarManager.tieneRol('admin')) return true;
    // Para otros roles, verificar permiso específico
    const permisosEscritura = {
        'config': ['config.alquiler', 'config.talleres', 'config.servicios', 'config.bandas', 'configuracion.editar'],
        'alquiler': ['config.alquiler', 'configuracion.editar'],
        'talleres': ['config.talleres', 'configuracion.editar'],
        'servicios': ['config.servicios', 'configuracion.editar'],
        'bandas': ['config.bandas', 'configuracion.editar'],
        'solicitudes': ['solicitudes.crear', 'solicitudes.editar'],
        'personal': ['personal.gestionar'],
        'usuarios': ['usuarios.crear', 'usuarios.editar']
    };
    const permisos = permisosEscritura[modulo] || [];
    return permisos.some(p => navbarManager.tienePermiso(p));
}

/**
 * Oculta elementos que requieren permisos de escritura
 * Busca elementos con data-requiere-permiso y los oculta si no tiene el permiso
 */
function aplicarPermisosUI() {
    if (!navbarManager) return;

    // Ocultar elementos con data-requiere-permiso
    document.querySelectorAll('[data-requiere-permiso]').forEach(el => {
        const permiso = el.dataset.requierePermiso;
        if (!navbarManager.tienePermiso(permiso)) {
            el.style.display = 'none';
        }
    });

    // Ocultar elementos con data-requiere-edicion
    document.querySelectorAll('[data-requiere-edicion]').forEach(el => {
        const modulo = el.dataset.requiereEdicion;
        if (!puedeEditar(modulo)) {
            el.style.display = 'none';
        }
    });
}

/**
 * Lista de rutas que requieren autenticación
 * Las rutas se protegen automáticamente durante la inicialización
 */
const PROTECTED_ROUTES = [
    '/solicitud_banda.html',
    '/solicitud_servicio.html',
    '/solicitud_taller_actividad.html',
    '/solicitud_fecha_bandas.html'
];

const CLIENT_ONLY_PAGES = [
    '/seccion_bandas.html',
    '/solicitud_banda.html',
    '/solicitud_fecha_bandas.html',
    '/seccion_alquiler.html',
    '/solicitud_alquiler.html'
];

const CLIENT_ACCESS_PARAM = 'acceso';
const CLIENT_ACCESS_VALUE = 'cliente';

function hasClientAccess() {
    const params = new URLSearchParams(window.location.search);
    return params.get(CLIENT_ACCESS_PARAM) === CLIENT_ACCESS_VALUE;
}

function isRestrictedClientPage() {
    const currentPath = window.location.pathname;
    return CLIENT_ONLY_PAGES.some(route => currentPath.includes(route));
}

function hideClientOnlyUiLinks() {
    const restrictedLinks = document.querySelectorAll('a[href]');
    restrictedLinks.forEach(link => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        if ((href.includes('seccion_bandas.html') || href.includes('solicitud_fecha_bandas.html') || href.includes('solicitud_banda.html') || href.includes('seccion_alquiler.html') || href.includes('solicitud_alquiler.html')) && !hasClientAccess()) {
            link.style.display = 'none';
        }
    });
}

// Rutas que requieren rol de staff (nivel >= 50)
const STAFF_ROUTES = [
    '/admin_',
    '/editar_',
    '/config_',
    '/admin.html',
    '/admin_transacciones.html' // acceso restringido a transacciones también
];

/**
 * Verifica si la ruta actual requiere autenticación
 * @returns {boolean}
 */
function isProtectedRoute() {
    const currentPath = window.location.pathname;
    return PROTECTED_ROUTES.some(route => currentPath.includes(route));
}

/**
 * Verifica si la ruta actual requiere rol de staff
 * @returns {boolean}
 */
function isStaffRoute() {
    const currentPath = window.location.pathname;
    return STAFF_ROUTES.some(route => currentPath.includes(route));
}

/**
 * Protege las rutas que requieren autenticación y nivel de staff
 * Se ejecuta automáticamente durante la inicialización
 */
function protectRoutesAutomatically() {
    if (isRestrictedClientPage() && !hasClientAccess()) {
        const tieneAccesoStaff = !!(navbarManager && navbarManager.tieneAccesoStaff && navbarManager.tieneAccesoStaff());
        if (!tieneAccesoStaff) {
            console.warn('Acceso bloqueado a página de cliente desde UI: redirigiendo a inicio.', window.location.pathname);
            window.location.href = '/index.html';
            return;
        }
    }

    // Proteger rutas de staff (admin_, editar_, config_)
    if (isStaffRoute()) {
        if (!navbarManager || !navbarManager.isAuthenticated) {
            // Guardar la página solicitada para redirigir después del login
            sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
            // Redirigir al registro/login
            window.location.href = '/registro.html';
            return;
        }

        // Verificar que el token no esté expirado
        if (navbarManager.isTokenExpired && navbarManager.isTokenExpired()) {
            console.warn('Sesión expirada. Redirigiendo al login...');
            navbarManager.clearAuth();
            sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        // Verificar que el usuario tenga nivel >= 50 (staff o superior) O rol de admin/staff
        const nivel = Number(navbarManager.userNivel || 0);
        const role = String(navbarManager.userRole || '').toLowerCase();
        const roles = (navbarManager.userRoles || []).map(r => String(r).toLowerCase());
        const staffRoles = ['admin', 'super_admin', 'staff', 'staff_readonly'];
        const tieneAcceso = nivel >= 50 || staffRoles.includes(role) || roles.some(r => staffRoles.includes(r));

        if (!tieneAcceso) {
            console.warn(`Acceso denegado: Usuario nivel=${nivel} rol=${role} intenta acceder a ${window.location.pathname}`);
            // No borrar el token para evitar logout accidental al navegar entre paneles.
            window.location.href = '/index.html';
            return;
        }
    }

    // Proteger rutas de solicitud (requieren autenticación)
    if (isProtectedRoute()) {
        if (!navbarManager || !navbarManager.isAuthenticated) {
            // Guardar la página solicitada para redirigir después del login
            sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
            // Redirigir al registro/login
            window.location.href = '/registro.html';
            return;
        }

        // Verificar que el token no esté expirado
        if (navbarManager.isTokenExpired && navbarManager.isTokenExpired()) {
            navbarManager.clearAuth();
            sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
            window.location.href = '/registro.html';
        }
    }
}

// ============================================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================================

/**
 * Inicializa NavbarManager automáticamente cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('[NAVBAR_DEBUG] ===== INICIALIZANDO NAVBAR =====');
    console.log('[NAVBAR_DEBUG] DOMContentLoaded ejecutado');

    // Instanciar NavbarManager globalmente
    if (!navbarManager) {
        console.log('[NAVBAR_DEBUG] Instanciando NavbarManager...');
        navbarManager = new NavbarManager();
        window.navbarManager = navbarManager;
        console.log('[NAVBAR_DEBUG] NavbarManager instanciado');
    }

    // Inyectar navbar en la página SOLO si no existe ya una navbar
    if (!document.querySelector('header.bg-rustic')) {
        console.log('[NAVBAR_DEBUG] Inyectando navbar en body...');
        navbarManager.injectNavbar('body');
    } else {
        console.log('[NAVBAR_DEBUG] Navbar ya existe en el DOM, no se inyecta');
    }

    // Ocultar enlaces internos a páginas de clientes no autorizadas
    console.log('[NAVBAR_DEBUG] Ocultando enlaces de cliente no autorizados...');
    hideClientOnlyUiLinks();

    // Aplicar restricciones de permisos UI
    console.log('[NAVBAR_DEBUG] Aplicando permisos UI...');
    aplicarPermisosUI();

    // Proteger rutas que requieren autenticación
    console.log('[NAVBAR_DEBUG] Protegiendo rutas...');
    protectRoutesAutomatically();

    console.log('[NAVBAR_DEBUG] ===== FIN INICIALIZACIÓN NAVBAR =====');
});
