/**
 * navbar.js - Componente de navegación dinámico y reutilizable
 * Inyecta un navbar en las páginas según el estado de autenticación del usuario
 * Soporta sistema de roles y permisos
 */

class NavbarManager {
    constructor() {
        this.isAuthenticated = false;
        this.userEmail = null;
        this.userRole = null;
        this.userRoles = [];
        this.userPermisos = [];
        this.userNivel = 0;
        this.jwtToken = localStorage.getItem('authToken');

        if (this.jwtToken) {
            this.isAuthenticated = true;
            // Decodificar el JWT para obtener datos del usuario
            this.decodeJWT();
            // Guardar datos en localStorage para acceso rápido
            localStorage.setItem('userPermisos', JSON.stringify(this.userPermisos));
            localStorage.setItem('userRoles', JSON.stringify(this.userRoles));
            localStorage.setItem('userRole', this.userRole);
            localStorage.setItem('userEmail', this.userEmail);
            localStorage.setItem('userName', this.userName);
            localStorage.setItem('userNivel', this.userNivel);
        }
    }

    /**
     * Decodifica el JWT sin verificar la firma (solo para leer datos en frontend)
     */
    decodeJWT() {
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
            this.userEmail = payload.email || payload.id || 'Usuario';
            this.userName = payload.nombre || payload.email || 'Usuario';
            this.userRole = payload.role || 'user';
            this.userRoles = payload.roles || [];
            this.userPermisos = payload.permisos || [];
            this.userNivel = payload.nivel || 0;
        } catch (error) {
            console.error('Error decodificando JWT:', error);
            this.clearAuth();
        }
    }

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    tienePermiso(permiso) {
        // SUPER_ADMIN o admin tienen todos los permisos
        if (this.userRoles.includes('SUPER_ADMIN') || this.userRoles.includes('admin')) return true;
        return this.userPermisos.includes(permiso);
    }

    /**
     * Verifica si el usuario tiene alguno de los permisos
     */
    tieneAlgunPermiso(permisos) {
        if (this.userRoles.includes('SUPER_ADMIN') || this.userRoles.includes('admin')) return true;
        return permisos.some(p => this.userPermisos.includes(p));
    }

    /**
     * Verifica si el usuario tiene un rol específico
     */
    tieneRol(rol) {
        return this.userRoles.includes(rol);
    }

    /**
     * Verifica si el usuario tiene nivel mínimo
     */
    tieneNivel(nivelMinimo) {
        return this.userNivel >= nivelMinimo;
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

        // Determinar si estamos en admin.html
        const isAdminPage = window.location.pathname.includes('admin.html');

        // Detectar si es página de staff (admin.html, admin_, editar_, config_)
        const isStaffPage = /\/(admin\.html|admin_|editar_|config_)/.test(window.location.pathname);
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
                <!-- Botón Admin (Desktop) -->
                <div class="hidden md:flex relative" id="admin-dropdown-container">
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
        items.push(this.menuItem('/admin_usuarios.html', '🔑', 'Usuarios'));

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
        const container = document.querySelector(selector);
        if (!container) {
            console.error(`No se encontró elemento con selector: ${selector}`);
            return;
        }

        const navbarHTML = this.generateNavbarHTML();
        container.insertAdjacentHTML('afterbegin', navbarHTML);

        // Configurar dropdown menu si está autenticado
        if (this.isAuthenticated) {
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
        return this.isAuthenticated && (this.userRole === 'admin' || this.userRoles.includes('SUPER_ADMIN') || this.userRoles.includes('ADMIN'));
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

// Rutas que requieren rol de staff (nivel >= 50)
const STAFF_ROUTES = [
    '/admin_',
    '/editar_',
    '/config_',
    '/admin.html'
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
    // Proteger rutas de staff (admin_, editar_, config_)
    if (isStaffRoute()) {
        if (!navbarManager || !navbarManager.isAuthenticated) {
            // Guardar la página solicitada para redirigir después del login
            sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
            // Redirigir al registro/login
            window.location.href = '/registro.html';
            return;
        }

        // Verificar que el usuario tenga nivel >= 50 (staff o superior)
        if ((navbarManager.userNivel || 0) < 50) {
            console.warn(`Acceso denegado: Usuario nivel ${navbarManager.userNivel} intenta acceder a ${window.location.pathname}`);
            // Redirigir a página de inicio
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
    // Instanciar NavbarManager globalmente
    if (!navbarManager) {
        navbarManager = new NavbarManager();
        window.navbarManager = navbarManager;
    }

    // Inyectar navbar en la página SOLO si no existe ya una navbar
    if (!document.querySelector('header.bg-rustic')) {
        navbarManager.injectNavbar('body');
    }

    // Aplicar restricciones de permisos UI
    aplicarPermisosUI();

    // Proteger rutas que requieren autenticación
    protectRoutesAutomatically();
});
